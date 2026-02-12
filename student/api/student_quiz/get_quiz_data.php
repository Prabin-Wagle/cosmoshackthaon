<?php
include('../db.php');
include('../jwt.php');
include('../encrypt_helper.php');
header('Content-Type:application/json');

// --- CORS ---
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = ['http://localhost:5173', 'http://localhost:3000', 'https://notelibraryapp.com', 'https://student.notelibraryapp.com'];
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: https://notelibraryapp.com');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Function to verify Turnstile token
function verifyTurnstileToken($token) {
    if (empty($token)) {
        return false;
    }
    
    $url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    $data = [
        'secret' => TURNSTILE_SECRET_KEY,
        'response' => $token,
        'remoteip' => $_SERVER['REMOTE_ADDR'] ?? ''
    ];
    
    $options = [
        'http' => [
            'header' => "Content-type: application/x-www-form-urlencoded\r\n",
            'method' => 'POST',
            'content' => http_build_query($data)
        ]
    ];
    
    $context = stream_context_create($options);
    $result = @file_get_contents($url, false, $context);
    
    if ($result === false) {
        // If verification fails, try with cURL as fallback
        if (function_exists('curl_init')) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            $result = curl_exec($ch);
            curl_close($ch);
        }
    }
    
    if ($result === false) {
        return false;
    }
    
    $response = json_decode($result, true);
    return isset($response['success']) && $response['success'] === true;
}

// 1. Validate Token
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['data' => [], 'status' => 'false', 'message' => 'Unauthorized']);
    exit();
}

$token = $matches[1];
$payload = validateJWT($token);
if (!$payload || !isset($payload['user_id'])) {
    http_response_code(401);
    echo json_encode(['data' => [], 'status' => 'false', 'message' => 'Invalid token']);
    exit();
}

$user_id = $payload['user_id'];

// --- Memory Safety Migration ---
// Some PHP environments try to allocate 4GiB when binding LONGTEXT results. 
// Using MEDIUMTEXT (16MB) solves this.
$conPrem->query("ALTER TABLE quiz_sessions MODIFY COLUMN quiz_json MEDIUMTEXT NOT NULL");
$quiz_id = isset($_GET['quiz_id']) ? intval($_GET['quiz_id']) : 0;
$turnstile_token = isset($_GET['turnstile_token']) ? $_GET['turnstile_token'] : '';
$page = isset($_GET['page']) ? intval($_GET['page']) : 1;
$active_session_id = isset($_GET['session_id']) ? $_GET['session_id'] : '';
if ($page < 1) $page = 1;

if ($quiz_id <= 0) {
    echo json_encode(['status' => 'false', 'message' => 'Invalid quiz ID']);
    exit();
}

// 2. Verify Turnstile CAPTCHA
if (!verifyTurnstileToken($turnstile_token)) {
    echo json_encode(['status' => 'false', 'message' => 'CAPTCHA verification failed. Please try again.']);
    exit();
}

// 3. Get Collection ID and Competitive Exam for this Quiz to check access
$colQuery = "SELECT ts.collection_id, tsc.competitive_exam 
             FROM test_series ts
             JOIN test_series_collections tsc ON ts.collection_id = tsc.id
             WHERE ts.id = ?";
$stmtCol = $conPrem->prepare($colQuery);
$stmtCol->bind_param("i", $quiz_id);
$stmtCol->execute();
$stmtCol->bind_result($collection_id, $competitive_exam);
if (!$stmtCol->fetch()) {
    echo json_encode(['status' => 'false', 'message' => 'Quiz not found']);
    exit();
}
$stmtCol->close();

// 4. Check User Access to this Collection
$accessQuery = "SELECT id FROM user_series_access WHERE user_id = ? AND collection_id = ?";
$stmtAccess = $conPrem->prepare($accessQuery);
$stmtAccess->bind_param("ii", $user_id, $collection_id);
$stmtAccess->execute();
$stmtAccess->store_result();

if ($stmtAccess->num_rows === 0) {
    echo json_encode(['status' => 'false', 'message' => 'Access denied']);
    exit();
}
$stmtAccess->close();

// 5. Check previous attempts for this quiz
$attemptQuery = "SELECT COUNT(*) FROM quiz_attempts WHERE user_id = ? AND quiz_id = ?";
$stmtAtt = $conPrem->prepare($attemptQuery);
$stmtAtt->bind_param("ii", $user_id, $quiz_id);
$stmtAtt->execute();
$stmtAtt->bind_result($attempt_count);
$stmtAtt->fetch();
$stmtAtt->close();

// 6. Fetch Quiz JSON and other metadata
$query = "SELECT id, quiz_title, quiz_json, time_limit, negative_marking, mode, start_time, end_time, total_questions, total_marks FROM test_series WHERE id = ?";
$stmt = $conPrem->prepare($query);

if (!$stmt) {
    echo json_encode(['status' => 'false', 'message' => 'Database error: ' . $conPrem->error]);
    exit();
}
$stmt->bind_param("i", $quiz_id);
$stmt->execute();
$stmt->store_result();
$stmt->bind_result($id, $quiz_title, $quiz_json, $time_limit, $negative_marking, $mode, $start_time, $end_time, $t_q, $t_m);

if ($stmt->fetch()) {
    // Decode quiz JSON (handle both Base64 and plain JSON)
    $questions = json_decode($quiz_json);
    if ($questions === null && json_last_error() !== JSON_ERROR_NONE) {
        $decoded = base64_decode($quiz_json, true);
        if ($decoded !== false) {
            $questions = json_decode($decoded);
        }
    }
    
    // Generate or verify quiz session ID
    $session_expired = true;
    $shuffled_json = null;
    $quiz_session_id = $active_session_id;

    if (!empty($quiz_session_id)) {
        $checkSession = "SELECT created_at, quiz_json FROM quiz_sessions WHERE session_id = ? AND user_id = ?";
        $stmtCheck = $conPrem->prepare($checkSession);
        $stmtCheck->bind_param("si", $quiz_session_id, $user_id);
        $stmtCheck->execute();
        $stmtCheck->bind_result($created_at, $stored_json);
        if ($stmtCheck->fetch()) {
            $created_time = strtotime($created_at);
            if (time() - $created_time < 600) { // 10 minutes
                $session_expired = false;
                $shuffled_json = $stored_json;
            }
        }
        $stmtCheck->close();
    }

    if ($session_expired) {
        $quiz_session_id = bin2hex(random_bytes(16));
        
        // --- SHUFFLING LOGIC START ---
        if (is_array($questions)) {
            if ($competitive_exam === 'IOE') {
                // Separate questions into 1-mark and 2-mark groups
                $group1 = [];
                $group2 = [];
                foreach ($questions as $q) {
                    $m = isset($q->marks) ? intval($q->marks) : 1;
                    if ($m === 2) {
                        $group2[] = $q;
                    } else {
                        $group1[] = $q;
                    }
                }
                
                // Shuffle each group
                shuffle($group1);
                shuffle($group2);
                
                // Reassemble: 1-mark questions (1-60) then 2-mark questions (61-100)
                $questions = array_merge($group1, $group2);
            } else {
                shuffle($questions);
            }

            foreach ($questions as $qIdx => $q) {
                if (isset($q->options) && is_array($q->options)) {
                    // Identify the correct option text before shuffling
                    $correct_idx = isset($q->correctOption) ? intval($q->correctOption) : -1;
                    $correct_text = ($correct_idx >= 0 && isset($q->options[$correct_idx])) ? $q->options[$correct_idx] : null;
                    
                    // Shuffle the options
                    shuffle($q->options);
                    
                    // Find the new index of the correct option
                    if ($correct_text !== null) {
                        $new_correct_idx = array_search($correct_text, $q->options);
                        if ($new_correct_idx !== false) {
                            $q->correctOption = $new_correct_idx;
                        }
                    }
                }
            }
        }
        $shuffled_json = json_encode($questions);
        // --- SHUFFLING LOGIC END ---
    } else {
        // Reuse stored shuffled JSON
        $questions = json_decode($shuffled_json);
    }
    
    // Ensure quiz_sessions table exists
    $createSessionsTable = "CREATE TABLE IF NOT EXISTS quiz_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL UNIQUE,
        user_id INT NOT NULL,
        quiz_id INT NOT NULL,
        quiz_json LONGTEXT NOT NULL,
        created_at DATETIME NOT NULL,
        INDEX idx_session_user (session_id, user_id),
        INDEX idx_user_quiz (user_id, quiz_id),
        INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    $conPrem->query($createSessionsTable);
    
    // Store/Update session in database
    $sessionQuery = "INSERT INTO quiz_sessions (session_id, user_id, quiz_id, quiz_json, created_at) VALUES (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE quiz_json = VALUES(quiz_json), created_at = NOW()";
    $stmtSession = $conPrem->prepare($sessionQuery);
    if ($stmtSession) {
        $stmtSession->bind_param("siis", $quiz_session_id, $user_id, $quiz_id, $shuffled_json);
        $stmtSession->execute();
        $stmtSession->close();
    }
    
    // SECURITY: Strip correctOption and explanation from questions
    // These will only be revealed via verify_answer.php
    $safe_questions = [];
    $total_all_questions = is_array($questions) ? count($questions) : 0;
    
    if (is_array($questions)) {
        foreach ($questions as $real_idx => $q) {
            $safe_q = new stdClass();
            $safe_q->questionId = isset($q->questionId) ? $q->questionId : $real_idx;
            $safe_q->questionNo = ($real_idx + 1);
            $safe_q->question = isset($q->question) ? $q->question : (isset($q->questionText) ? $q->questionText : '');
            $safe_q->options = isset($q->options) ? $q->options : [];
            $safe_q->marks = isset($q->marks) ? $q->marks : 1;
            $safe_q->imageLink = isset($q->imageLink) ? $q->imageLink : null;
            $safe_q->unitId = isset($q->unitId) ? $q->unitId : null;
            $safe_q->chapterId = isset($q->chapterId) ? $q->chapterId : null;
            $safe_q->originalIndex = $real_idx;
            // DO NOT include: correctOption, explanation
            $safe_questions[] = $safe_q;
        }
    }
    
    send_encrypted_response([
        'status' => 'true',
        'data' => [
            'id' => $id,
            'title' => $quiz_title,
            'questions' => $safe_questions,
            'total_questions' => $total_all_questions,
            'current_page' => 1,
            'questions_per_page' => $total_all_questions,
            'time_limit' => $time_limit,
            'negative_marking' => $negative_marking,
            'mode' => $mode,
            'start_time' => $start_time,
            'end_time' => $end_time,
            'server_time' => date('Y-m-d H:i:s'),
            'attempt_count' => $attempt_count,
            'total_marks' => $t_m,
            'quiz_session_id' => $quiz_session_id
        ]
    ]);
} else {
    echo json_encode(['status' => 'false', 'message' => 'Failed to fetch quiz data']);
}
?>
