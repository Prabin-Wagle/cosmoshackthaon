<?php
include('../db.php');
include('../jwt.php');
header('Content-Type:application/json');

// --- CORS ---
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = ['http://localhost:5173', 'http://localhost:3000', 'https://notelibraryapp.com', 'https://student.notelibraryapp.com'];
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

// 2. Get request body
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(['status' => 'false', 'message' => 'Invalid request body']);
    exit();
}

$quiz_session_id = isset($input['quiz_session_id']) ? $input['quiz_session_id'] : '';
$question_index = isset($input['question_index']) ? intval($input['question_index']) : -1;
$selected_option = isset($input['selected_option']) ? intval($input['selected_option']) : -1;

if (empty($quiz_session_id) || $question_index < 0) {
    echo json_encode(['status' => 'false', 'message' => 'Missing required parameters']);
    exit();
}

// 3. Fetch quiz session
// EXTRA SAFETY: Ensure table exists here as well
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

$sessionQuery = "SELECT quiz_id, quiz_json, created_at FROM quiz_sessions WHERE session_id = ? AND user_id = ?";
$stmtSession = $conPrem->prepare($sessionQuery);

if (!$stmtSession) {
    echo json_encode(['status' => 'false', 'message' => 'Database error: Prepare failed. Please ensure the quiz_sessions table exists. Error: ' . $conPrem->error]);
    exit();
}

$stmtSession->bind_param("si", $quiz_session_id, $user_id);
$stmtSession->execute();
$stmtSession->store_result();
$stmtSession->bind_result($quiz_id, $quiz_json, $created_at);

if (!$stmtSession->fetch()) {
    echo json_encode(['status' => 'false', 'message' => 'Invalid or expired session']);
    exit();
}

// Check session age (10 minutes)
if (time() - strtotime($created_at) > 600) {
    echo json_encode(['status' => 'false', 'message' => 'Session expired. Please refresh the quiz.']);
    exit();
}
$stmtSession->close();

// 4. Decode quiz JSON and get the question
$questions = json_decode($quiz_json);
if ($questions === null && json_last_error() !== JSON_ERROR_NONE) {
    $decoded = base64_decode($quiz_json, true);
    if ($decoded !== false) {
        $questions = json_decode($decoded);
    }
}

if (!is_array($questions) || !isset($questions[$question_index])) {
    echo json_encode(['status' => 'false', 'message' => 'Question not found']);
    exit();
}

$question = $questions[$question_index];
$correct_option = isset($question->correctOption) ? intval($question->correctOption) : -1;
$explanation = isset($question->explanation) ? $question->explanation : 'No explanation available.';
$marks = isset($question->marks) ? intval($question->marks) : 1;

// 5. Check if answer is correct
$is_correct = ($selected_option === $correct_option);

// 6. Return result
echo json_encode([
    'status' => 'true',
    'data' => [
        'is_correct' => $is_correct,
        'correct_option' => $correct_option,
        'explanation' => $explanation,
        'marks' => $marks,
        'question_index' => $question_index,
        'selected_option' => $selected_option
    ]
]);
?>
