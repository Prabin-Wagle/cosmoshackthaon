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

// 2. Get session ID
$input = json_decode(file_get_contents('php://input'), true);
$session_id = isset($input['session_id']) ? $input['session_id'] : '';

if (empty($session_id)) {
    echo json_encode(['status' => 'false', 'message' => 'Missing session ID']);
    exit();
}

// 3. Delete session
$deleteQuery = "DELETE FROM quiz_sessions WHERE session_id = ? AND user_id = ?";
$stmt = $conPrem->prepare($deleteQuery);
if ($stmt) {
    $stmt->bind_param("si", $session_id, $user_id);
    $stmt->execute();
    $stmt->close();
}

echo json_encode(['status' => 'true', 'message' => 'Session deleted']);
?>
