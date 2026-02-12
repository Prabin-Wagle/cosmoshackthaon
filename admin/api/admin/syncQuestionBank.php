<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../db.php';
require_once '../jwt.php';
require_once 'bankHelper.php';

// Auth check
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No token provided']);
    exit;
}
$token = $matches[1];
$payload = validateJWT($token);
if (!$payload || !isset($payload['role']) || $payload['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access denied']);
    exit;
}

// Logic
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input) || !isset($input['questions'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON body, "questions" field is required']);
    exit;
}

$questions = $input['questions'];
if (empty($questions) || !is_array($questions)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No questions provided']);
    exit;
}

// Sync
try {
    $stats = syncQuestionsToBank($conPrem, $questions);
    echo json_encode(['success' => true, 'message' => 'Questions synced to bank successfully', 'stats' => $stats]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error syncing questions: ' . $e->getMessage()]);
}
?>
