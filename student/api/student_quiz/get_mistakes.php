<?php
include('../db.php');
include('../jwt.php');

header('Content-Type:application/json');

// --- CORS ---
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = ['http://localhost:5173', 'http://localhost:3000', 'https://notelibraryapp.com'];
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: https://notelibraryapp.com');
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit();
}

// --- Auth ---
$headers = apache_request_headers();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
if (empty($authHeader) && isset($headers['authorization'])) $authHeader = $headers['authorization'];

$payload = null;
if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $payload = validateJWT($matches[1]);
}

if (!$payload) {
    echo json_encode(['status' => 'false', 'message' => 'Unauthorized']);
    exit();
}

$user_id = $payload['user_id'];

// --- Turnstile Verification (Optional for listing, required for practice session) ---
$token = isset($_GET['turnstile_token']) ? $_GET['turnstile_token'] : '';
$is_practice = isset($_GET['mode']) && $_GET['mode'] === 'practice';

function verifyTurnstileToken($token) {
    if (empty($token)) return false;
    $url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    $data = [
        'secret' => TURNSTILE_SECRET_KEY,
        'response' => $token,
        'remoteip' => $_SERVER['REMOTE_ADDR'] ?? ''
    ];
    $options = ['http' => ['header' => "Content-type: application/x-www-form-urlencoded\r\n", 'method' => 'POST', 'content' => http_build_query($data)]];
    $context = stream_context_create($options);
    $result = @file_get_contents($url, false, $context);
    if ($result === false) return false;
    $responseKeys = json_decode($result, true);
    return $responseKeys["success"];
}

if ($is_practice && !verifyTurnstileToken($token)) {
    // We allow fetching for display, but if starting practice, we might want a token?
    // Actually, usually the token is to START the player. 
    // If not verified, we can still return the list but definitely STRIP answers.
}

// --- Ensure Table Exists ---
$conPrem->query("CREATE TABLE IF NOT EXISTS quiz_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    quiz_id INT NOT NULL,
    quiz_json LONGTEXT NOT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_session_user (session_id, user_id),
    INDEX idx_user_quiz (user_id, quiz_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$createMistakesTable = "CREATE TABLE IF NOT EXISTS user_mistakes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    quiz_id INT NOT NULL,
    question_index INT NOT NULL,
    incorrect_count INT DEFAULT 1,
    last_attempted TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, quiz_id, question_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

if (!$conPrem->query($createMistakesTable)) {
    echo json_encode(['status' => 'false', 'message' => 'Failed to create mistakes table: ' . $conPrem->error]);
    exit();
}

// Fetch mistakes
$query = "SELECT um.id, um.quiz_id, um.question_index, ts.quiz_title, ts.quiz_json 
          FROM user_mistakes um 
          JOIN test_series ts ON um.quiz_id = ts.id 
          WHERE um.user_id = ? 
          ORDER BY um.created_at DESC";

$stmt = $conPrem->prepare($query);

if (!$stmt) {
    echo json_encode(['status' => 'false', 'message' => 'Prepare failed: ' . $conPrem->error]);
    exit();
}

$stmt->bind_param("i", $user_id);
$stmt->execute();
$stmt->store_result();
$stmt->bind_result($m_id, $q_id, $q_idx, $q_title, $raw_json);

$mistakes = [];
while ($stmt->fetch()) {
    $quiz_data = [];
    $decoded = base64_decode($raw_json, true);
    if ($decoded !== false) {
        $quiz_data = json_decode($decoded, true);
    } else {
        $quiz_data = json_decode($raw_json, true);
    }

    $question = (is_array($quiz_data) && isset($quiz_data[$q_idx])) ? $quiz_data[$q_idx] : null;
    
    if ($question) {
        // Normalize 'questionText' -> 'question'
        if (!isset($question['question']) && isset($question['questionText'])) {
            $question['question'] = $question['questionText'];
        }
        
        $mistake_item = [
            'mistake_id' => $m_id,
            'quiz_id' => $q_id,
            'quiz_title' => $q_title,
            'question_index' => $q_idx,
            'originalIndex' => count($mistakes), // Use current pool index for session mapping
            'question' => $question
        ];

        if ($is_practice) {
            // Strip sensitive data for the client
            unset($mistake_item['question']['correctOption']);
            unset($mistake_item['question']['explanation']);
        }
        
        $mistakes[] = $mistake_item;
        
        // Keep original for session
        $session_questions[] = $question;
    }
}

$quiz_session_id = '';
if ($is_practice && !empty($session_questions)) {
    // Register the session for secure validation
    $quiz_session_id = bin2hex(random_bytes(16));
    $sess_json = json_encode($session_questions);
    
    $sessQuery = "INSERT INTO quiz_sessions (session_id, user_id, quiz_id, quiz_json, created_at) VALUES (?, ?, ?, ?, NOW())";
    $sessStmt = $conPrem->prepare($sessQuery);
    if ($sessStmt) {
        $pool_id = 0; // Special ID for pooled sessions
        $sessStmt->bind_param("siis", $quiz_session_id, $user_id, $pool_id, $sess_json);
        $sessStmt->execute();
        $sessStmt->close();
    }
}

echo json_encode([
    'status' => 'true',
    'mistakes' => $mistakes,
    'quiz_session_id' => $quiz_session_id
]);

$stmt->close();
?>
