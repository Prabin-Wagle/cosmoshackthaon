<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../db.php';
require_once '../jwt.php';

// Get token from header
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$token = str_replace('Bearer ', '', $authHeader);

$userData = validateJWT($token);

if (!$userData) {
    echo json_encode(["status" => "error", "message" => "Unauthorized access"]);
    exit;
}

$user_id = $userData['user_id'];

$stmt = $conSupport->prepare("SELECT id, subject, message, admin_reply, status, created_at, updated_at FROM tickets WHERE user_id = ? ORDER BY created_at DESC");

if (!$stmt) {
    echo json_encode(["status" => "error", "message" => "Database prepare error: " . $conSupport->error]);
    exit;
}

$stmt->bind_param("i", $user_id);
$stmt->execute();

$stmt->bind_result($id, $subject, $message, $admin_reply, $status, $created_at, $updated_at);

$tickets = [];
while ($stmt->fetch()) {
    $tickets[] = [
        'id' => $id,
        'subject' => $subject,
        'message' => $message,
        'admin_reply' => $admin_reply,
        'status' => $status,
        'created_at' => $created_at,
        'updated_at' => $updated_at
    ];
}

echo json_encode([
    "status" => "success",
    "tickets" => $tickets
]);

$stmt->close();
$conSupport->close();
?>
