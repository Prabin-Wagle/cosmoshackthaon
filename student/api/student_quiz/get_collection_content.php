<?php
include('../db.php');
include('../jwt.php');
include('../encrypt_helper.php');
header('Content-Type:application/json');

include '../cors.php';

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
$collection_id = isset($_GET['collection_id']) ? intval($_GET['collection_id']) : 0;

if ($collection_id <= 0) {
    echo json_encode(['status' => 'false', 'message' => 'Invalid collection ID']);
    exit();
}

// 2. Check Access
$accessQuery = "SELECT id FROM user_series_access WHERE user_id = ? AND collection_id = ?";
$stmtAccess = $conPrem->prepare($accessQuery);
$stmtAccess->bind_param("ii", $user_id, $collection_id);
$stmtAccess->execute();
$stmtAccess->store_result();
$has_access = ($stmtAccess->num_rows > 0);
$stmtAccess->close();

// 3. Fetch Quizzes with Attempt Count for current user
$query = "
    SELECT 
        ts.id, 
        ts.quiz_title, 
        ts.competitive_exam, 
        ts.time_limit, 
        ts.negative_marking, 
        ts.mode, 
        ts.start_time, 
        ts.end_time,
        (SELECT COUNT(*) FROM quiz_attempts WHERE user_id = ? AND quiz_id = ts.id) as user_attempt_count,
        (SELECT id FROM quiz_attempts WHERE user_id = ? AND quiz_id = ts.id ORDER BY id DESC LIMIT 1) as latest_attempt_id
    FROM test_series ts
    WHERE ts.collection_id = ?
";
$stmt = $conPrem->prepare($query);
$stmt->bind_param("iii", $user_id, $user_id, $collection_id);
$stmt->execute();
$stmt->bind_result($id, $quiz_title, $competitive_exam, $time_limit, $negative_marking, $mode, $start_time, $end_time, $user_attempt_count, $latest_attempt_id);

$quizzes = [];
while ($stmt->fetch()) {
    $quizzes[] = [
        'id' => $id,
        'quiz_title' => $quiz_title,
        'competitive_exam' => $competitive_exam,
        'time_limit' => $time_limit,
        'negative_marking' => $negative_marking,
        'mode' => $mode,
        'start_time' => $start_time,
        'end_time' => $end_time,
        'user_attempt_count' => $user_attempt_count,
        'latest_attempt_id' => $latest_attempt_id
    ];
}

send_encrypted_response(['data' => $quizzes, 'has_access' => $has_access, 'status' => 'true']);
?>
