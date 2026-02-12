<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../db.php';
require_once '../jwt.php';

function respond($success, $message, $extra = []) {
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra));
    exit();
}

// Validate Token
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    respond(false, 'No token provided');
}

$token = $matches[1];
$payload = validateJWT($token);
if (!$payload || $payload['role'] !== 'admin') {
    http_response_code(403);
    respond(false, 'Access denied');
}

$data = json_decode(file_get_contents("php://input"));

if (empty($data->filename)) {
    http_response_code(400);
    respond(false, 'Filename is required');
}

$filename = basename($data->filename); // Security: prevent directory traversal
$filepath = '../../uploads/notice_resources/' . $filename;

if (file_exists($filepath)) {
    if (unlink($filepath)) {
        respond(true, 'File delete successfully');
    } else {
        http_response_code(503);
        respond(false, 'Unable to delete file');
    }
} else {
    http_response_code(404);
    respond(false, 'File not found');
}
?>
