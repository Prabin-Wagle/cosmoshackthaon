<?php
include('../db.php');
include('../jwt.php');
include('../encrypt_helper.php');
header('Content-Type:application/json');

// --- CORS ---
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = ['http://localhost:5173', 'http://localhost:3000', 'https://notelibraryapp.com'];
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: https://notelibraryapp.com');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. Validate Token
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['status' => 'false', 'message' => 'Unauthorized']);
    exit();
}

$token = $matches[1];
$payload = validateJWT($token);
if (!$payload || !isset($payload['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'false', 'message' => 'Invalid token']);
    exit();
}

$user_id = $payload['user_id'];

// 2. Ensure Tables Exist
$createSummaryTable = "CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    quiz_id INT NOT NULL,
    collection_id INT DEFAULT NULL,
    attempt_number INT DEFAULT 1,
    score FLOAT DEFAULT 0,
    total_questions INT DEFAULT 0,
    correct_count INT DEFAULT 0,
    incorrect_count INT DEFAULT 0,
    attempt_json MEDIUMTEXT DEFAULT NULL,
    analytics_json MEDIUMTEXT DEFAULT NULL,
    attempt_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
$conPrem->query($createSummaryTable);

// Alter existing table if necessary
$conPrem->query("ALTER TABLE quiz_attempts MODIFY COLUMN attempt_json MEDIUMTEXT DEFAULT NULL");
$conPrem->query("ALTER TABLE quiz_attempts MODIFY COLUMN analytics_json MEDIUMTEXT DEFAULT NULL");

$createDetailsTable = "CREATE TABLE IF NOT EXISTS quiz_attempt_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attempt_id INT NOT NULL,
    question_index INT NOT NULL,
    selected_option INT DEFAULT -1,
    is_bookmarked TINYINT(1) DEFAULT 0,
    is_correct TINYINT(1) DEFAULT 0,
    time_spent INT DEFAULT 0,
    INDEX (attempt_id)
)";
$conPrem->query($createDetailsTable);

$createMistakesTable = "CREATE TABLE IF NOT EXISTS user_mistakes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    quiz_id INT NOT NULL,
    question_index INT NOT NULL,
    marks FLOAT DEFAULT 1,
    unit_id VARCHAR(255) DEFAULT NULL,
    incorrect_count INT DEFAULT 1,
    last_attempted TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, quiz_id, question_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
$conPrem->query($createMistakesTable);

$createBookmarksTable = "CREATE TABLE IF NOT EXISTS user_bookmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    quiz_id INT NOT NULL,
    question_index INT NOT NULL,
    marks FLOAT DEFAULT 1,
    unit_id VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, quiz_id, question_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
$conPrem->query($createBookmarksTable);

// Ensure marks/unit_id columns exist (for existing installs)
$conPrem->query("ALTER TABLE user_mistakes ADD COLUMN marks FLOAT DEFAULT 1 AFTER question_index");
$conPrem->query("ALTER TABLE user_mistakes ADD COLUMN unit_id VARCHAR(255) DEFAULT NULL AFTER marks");

// 3. Get POST data
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['quiz_id'])) {
    echo json_encode(['status' => 'false', 'message' => 'Invalid data']);
    exit();
}

$quiz_id = intval($data['quiz_id']);
$collection_id = isset($data['collection_id']) ? intval($data['collection_id']) : null;
$quiz_session_id = isset($data['quiz_session_id']) ? $data['quiz_session_id'] : '';
$total_questions = intval($data['total_questions']);
$responses = isset($data['responses']) ? $data['responses'] : []; // Array of {index, selected, bookmarked, time_spent}

// 3.2 Fetch the quiz JSON from the secure session (server-side source of truth)
$sessionQuery = "SELECT quiz_json FROM quiz_sessions WHERE session_id = ? AND user_id = ?";
$sessStmt = $conPrem->prepare($sessionQuery);
if (!$sessStmt) {
    // Fall back to fetching directly from test_series
    $sessionQuery = "SELECT quiz_json FROM test_series WHERE id = ?";
    $sessStmt = $conPrem->prepare($sessionQuery);
    $sessStmt->bind_param("i", $quiz_id);
} else {
    $sessStmt->bind_param("si", $quiz_session_id, $user_id);
}
$sessStmt->execute();
$sessStmt->store_result();
$sessStmt->bind_result($raw_quiz_json);
if (!$sessStmt->fetch()) {
    // Fallback to test_series table
    $sessStmt->close();
    $qDataQuery = "SELECT quiz_json FROM test_series WHERE id = ?";
    $qStmt = $conPrem->prepare($qDataQuery);
    $qStmt->bind_param("i", $quiz_id);
    $qStmt->execute();
    $qStmt->store_result();
    $qStmt->bind_result($raw_quiz_json);
    $qStmt->fetch();
    $qStmt->close();
} else {
    $sessStmt->close();
}

// Fetch negative marking value from test_series
$negQuery = "SELECT negative_marking FROM test_series WHERE id = ?";
$negStmt = $conPrem->prepare($negQuery);
$negStmt->bind_param("i", $quiz_id);
$negStmt->execute();
$negStmt->bind_result($negative_marking);
$negStmt->fetch();
$negative_marking = floatval($negative_marking ?? 0);
$negStmt->close();

// Decode quiz JSON
$original_questions = [];
$decoded = base64_decode($raw_quiz_json, true);
if ($decoded !== false) {
    $original_questions = json_decode($decoded, true);
} else {
    $original_questions = json_decode($raw_quiz_json, true);
}

// === SERVER-SIDE SCORE CALCULATION ===
$score = 0;
$correct_count = 0;
$incorrect_count = 0;

// Map existing responses by index for quick lookup
$responses_by_index = [];
foreach ($responses as $r) {
    if (isset($r['index'])) {
        $responses_by_index[intval($r['index'])] = $r;
    }
}

$full_responses = [];
// Process every question in the quiz to ensure full history
foreach ($original_questions as $q_idx => $orig_q) {
    if (isset($responses_by_index[$q_idx])) {
        $resp = $responses_by_index[$q_idx];
    } else {
        // Create an unattempted response entry
        $resp = [
            'index' => $q_idx,
            'selected' => -1,
            'bookmarked' => false,
            'time_spent' => 0
        ];
    }

    $selected = intval($resp['selected']);
    
    if ($orig_q && $selected !== -1) {
        $correct_option = intval($orig_q['correctOption'] ?? -1);
        $marks = floatval($orig_q['marks'] ?? 1);
        
        if ($selected === $correct_option) {
            $resp['correct'] = true;
            $score += $marks;
            $correct_count++;
        } else {
            $resp['correct'] = false;
            $score -= $negative_marking;
            $incorrect_count++;
        }
    } else {
        $resp['correct'] = false;
    }
    
    $full_responses[] = $resp;
}
$responses = $full_responses;

// 3.5 Calculate Attempt Number
$attemptQuery = "SELECT COUNT(*) as attempt_count FROM quiz_attempts WHERE user_id = ? AND quiz_id = ?";
$aStmt = $conPrem->prepare($attemptQuery);
$aStmt->bind_param("ii", $user_id, $quiz_id);
$aStmt->execute();
$aStmt->bind_result($attempt_count);
$aStmt->fetch();
$attempt_number = intval($attempt_count) + 1;
$aStmt->close();

// 5. Calculate Analytics and detailed response JSON
$analytics = [
    'units' => [],
    'chapters' => []
];

// Initialize analytics structure
foreach ($original_questions as $q) {
    $uId = $q['unitId'] ?? 'Uncategorized';
    $cId = $q['chapterId'] ?? 'General';
    
    if (!isset($analytics['units'][$uId])) {
        $analytics['units'][$uId] = ['total' => 0, 'attempted' => 0, 'correct' => 0, 'wrong' => 0];
    }
    if (!isset($analytics['chapters'][$cId])) {
        $analytics['chapters'][$cId] = ['total' => 0, 'attempted' => 0, 'correct' => 0, 'wrong' => 0];
    }
    
    $analytics['units'][$uId]['total']++;
    $analytics['chapters'][$cId]['total']++;
}

foreach ($responses as &$resp) {
    $q_idx = intval($resp['index']);
    $orig_q = $original_questions[$q_idx] ?? null;
    
    if ($orig_q) {
        $uId = $orig_q['unitId'] ?? 'Uncategorized';
        $cId = $orig_q['chapterId'] ?? 'General';
        
        $isAttempted = intval($resp['selected']) !== -1;
        $isCorrect = isset($resp['correct']) && $resp['correct'];
        
        if ($isAttempted) {
             $analytics['units'][$uId]['attempted']++;
             $analytics['chapters'][$cId]['attempted']++;
             if ($isCorrect) {
                 $analytics['units'][$uId]['correct']++;
                 $analytics['chapters'][$cId]['correct']++;
             } else {
                 $analytics['units'][$uId]['wrong']++;
                 $analytics['chapters'][$cId]['wrong']++;
                 
                 // --- Track Mistake with marks and unit ---
                 $qMarks = floatval($orig_q['marks'] ?? 1);
                 $upsertMistake = "INSERT INTO user_mistakes (user_id, quiz_id, question_index, marks, unit_id, incorrect_count) 
                                   VALUES (?, ?, ?, ?, ?, 1) 
                                   ON DUPLICATE KEY UPDATE incorrect_count = incorrect_count + 1, marks = VALUES(marks), unit_id = VALUES(unit_id)";
                 $mStmt = $conPrem->prepare($upsertMistake);
                 if ($mStmt) {
                     $mStmt->bind_param("iiids", $user_id, $quiz_id, $q_idx, $qMarks, $uId);
                     $mStmt->execute();
                     $mStmt->close();
                 }
             }
        }
        
        // --- Track Bookmark ---
        $isBookmarked = isset($resp['bookmarked']) && $resp['bookmarked'];
        if ($isBookmarked && $orig_q) {
            $qMarks = floatval($orig_q['marks'] ?? 1);
            $upsertBookmark = "INSERT INTO user_bookmarks (user_id, quiz_id, question_index, marks, unit_id) 
                               VALUES (?, ?, ?, ?, ?) 
                               ON DUPLICATE KEY UPDATE marks = VALUES(marks), unit_id = VALUES(unit_id)";
            $bStmt = $conPrem->prepare($upsertBookmark);
            if ($bStmt) {
                $bStmt->bind_param("iiids", $user_id, $quiz_id, $q_idx, $qMarks, $uId);
                $bStmt->execute();
                $bStmt->close();
            }
        }
        
        // Add question data to response for easier list rendering
        $resp['question'] = $orig_q['question'] ?? ($orig_q['questionText'] ?? '');
        $resp['imageLink'] = $orig_q['imageLink'] ?? null;
        $resp['options'] = $orig_q['options'] ?? [];
        $resp['correctOption'] = $orig_q['correctOption'] ?? -1;
        $resp['explanation'] = $orig_q['explanation'] ?? null;
    }
}

$attempt_json = json_encode($responses, JSON_UNESCAPED_UNICODE);
$analytics_json = json_encode($analytics, JSON_UNESCAPED_UNICODE);

// 6. Insert Summary
$insertSummary = "INSERT INTO quiz_attempts (user_id, quiz_id, collection_id, attempt_number, score, total_questions, correct_count, incorrect_count, attempt_json, analytics_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
$sStmt = $conPrem->prepare($insertSummary);

if (!$sStmt) {
    echo json_encode(['status' => 'false', 'message' => 'Database error: ' . $conPrem->error . '. Please ensure you have run the manual SQL migration.']);
    exit();
}
$sStmt->bind_param("iiiidiiiss", $user_id, $quiz_id, $collection_id, $attempt_number, $score, $total_questions, $correct_count, $incorrect_count, $attempt_json, $analytics_json);

if ($sStmt->execute()) {
    $attempt_id = $sStmt->insert_id;
    $sStmt->close();

    // 5. Insert Details (Snapshots)
    if (!empty($responses)) {
        $insertDetail = "INSERT INTO quiz_attempt_details (attempt_id, question_index, selected_option, is_bookmarked, is_correct, time_spent) VALUES (?, ?, ?, ?, ?, ?)";
        $dStmt = $conPrem->prepare($insertDetail);
        
        if (!$dStmt) {
            send_encrypted_response(['status' => 'false', 'message' => 'Database error: ' . $conPrem->error]);
            exit();
        }
        
        foreach ($responses as $resp) {
            $q_idx = isset($resp['index']) ? intval($resp['index']) : -1;
            $s_opt = isset($resp['selected']) ? intval($resp['selected']) : -1;
            $is_bmk = isset($resp['bookmarked']) && $resp['bookmarked'] ? 1 : 0;
            $is_cor = isset($resp['correct']) && $resp['correct'] ? 1 : 0;
            $time_spent = isset($resp['time_spent']) ? intval($resp['time_spent']) : 0;
            
            $dStmt->bind_param("iiiiii", $attempt_id, $q_idx, $s_opt, $is_bmk, $is_cor, $time_spent);
            $dStmt->execute();
        }
        $dStmt->close();
    }

    // Delete session after successful storage
    if (!empty($quiz_session_id)) {
        $deleteSess = "DELETE FROM quiz_sessions WHERE session_id = ? AND user_id = ?";
        $dsStmt = $conPrem->prepare($deleteSess);
        if ($dsStmt) {
            $dsStmt->bind_param("si", $quiz_session_id, $user_id);
            $dsStmt->execute();
            $dsStmt->close();
        }
    }

    echo json_encode(['status' => 'true', 'message' => 'Result stored successfully', 'attempt' => $attempt_number, 'attempt_id' => $attempt_id]);
} else {
    echo json_encode(['status' => 'false', 'message' => 'Failed to store summary', 'error' => $sStmt->error, 'sql_error' => $conPrem->error]);
}
?>
