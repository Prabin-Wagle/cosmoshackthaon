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

// Get token from header
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$token = str_replace('Bearer ', '', $authHeader);

$userData = validateJWT($token);

if (!$userData) {
    echo json_encode(["status" => "error", "message" => "Unauthorized access"]);
    exit;
}

$user_id = $userData['user_id'];
$subject = $_POST['subject'] ?? '';
$message = $_POST['message'] ?? '';

if (empty($subject) || empty($message)) {
    echo json_encode(["status" => "error", "message" => "Subject and message are required"]);
    exit;
}

$stmt = $conSupport->prepare("INSERT INTO tickets (user_id, subject, message, status) VALUES (?, ?, ?, 'pending')");

if (!$stmt) {
    echo json_encode(["status" => "error", "message" => "Database prepare error: " . $conSupport->error]);
    exit;
}

$stmt->bind_param("iss", $user_id, $subject, $message);

if ($stmt->execute()) {
    echo json_encode([
        "status" => "success", 
        "message" => "Ticket submitted successfully",
        "ticket_id" => $conSupport->insert_id
    ]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to submit ticket: " . $stmt->error]);
}

$stmt->close();
$conSupport->close();
?>
