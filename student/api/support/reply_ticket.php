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

$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$token = str_replace('Bearer ', '', $authHeader);

$userData = validateJWT($token);

if (!$userData) {
    echo json_encode(["status" => "error", "message" => "Unauthorized access"]);
    exit;
}

$user_id = $userData['user_id'];
$ticket_id = $_POST['ticket_id'] ?? '';
$message = $_POST['message'] ?? '';

if (empty($ticket_id) || empty($message)) {
    echo json_encode(["status" => "error", "message" => "Ticket ID and message are required"]);
    exit;
}

// Verify Ticket Exists & Not Closed
$stmt = $conSupport->prepare("SELECT status FROM tickets WHERE id = ?");
$stmt->bind_param("i", $ticket_id);
$stmt->execute();
$stmt->bind_result($status);
if (!$stmt->fetch()) {
    echo json_encode(["status" => "error", "message" => "Ticket not found"]);
    exit;
}
$stmt->close();

if ($status === 'closed') {
    echo json_encode(["status" => "error", "message" => "Cannot reply to a closed ticket"]);
    exit;
}

// Insert Reply
$stmt = $conSupport->prepare("INSERT INTO ticket_replies (ticket_id, user_id, message) VALUES (?, ?, ?)");
$stmt->bind_param("iis", $ticket_id, $user_id, $message);

if ($stmt->execute()) {
    // Update ticket timestamp
    $upStmt = $conSupport->prepare("UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    $upStmt->bind_param("i", $ticket_id);
    $upStmt->execute();
    $upStmt->close();

    echo json_encode(["status" => "success", "message" => "Reply sent successfully"]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to send reply: " . $stmt->error]);
}

$stmt->close();
$conSupport->close();
?>
