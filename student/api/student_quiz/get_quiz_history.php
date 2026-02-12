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
$quiz_id = isset($_GET['quiz_id']) ? intval($_GET['quiz_id']) : 0;

if ($quiz_id <= 0) {
    echo json_encode(['status' => 'false', 'message' => 'Invalid Quiz ID']);
    exit();
}

// 2. Fetch History Summaries
$historyQuery = "SELECT id, attempt_number, score, total_questions, correct_count, incorrect_count, attempt_date 
                 FROM quiz_attempts 
                 WHERE user_id = ? AND quiz_id = ? 
                 ORDER BY attempt_date DESC";
$hStmt = $conPrem->prepare($historyQuery);
$hStmt->bind_param("ii", $user_id, $quiz_id);
$hStmt->execute();
$hStmt->bind_result($att_id, $att_num, $sc, $t_q, $c_c, $i_c, $a_d);

$history = [];
$highScore = 0;

while ($hStmt->fetch()) {
    $row = [
        'id' => $att_id,
        'attempt_number' => $att_num,
        'score' => $sc,
        'total_questions' => $t_q,
        'correct_count' => $c_c,
        'incorrect_count' => $i_c,
        'attempt_date' => $a_d
    ];
    $history[] = $row;
    if ($sc > $highScore) {
        $highScore = $sc;
    }
}

echo json_encode([
    'status' => 'true',
    'data' => [
        'history' => $history,
        'highScore' => $highScore,
        'attempts' => count($history)
    ]
]);

$hStmt->close();
?>
