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
$ticket_id = $_POST['ticket_id'] ?? '';

if (empty($ticket_id)) {
    echo json_encode(["status" => "error", "message" => "Ticket ID is required"]);
    exit;
}

// Verify ticket belongs to user (or admin, if we were adding admin support here)
$checkStmt = $conSupport->prepare("SELECT user_id, status FROM tickets WHERE id = ?");
$checkStmt->bind_param("i", $ticket_id);
$checkStmt->execute();
$checkStmt->store_result();

if ($checkStmt->num_rows === 0) {
    echo json_encode(["status" => "error", "message" => "Ticket not found"]);
    $checkStmt->close();
    exit;
}

$checkStmt->bind_result($owner_id, $current_status);
$checkStmt->fetch();
$checkStmt->close();

if ($owner_id !== $user_id) {
    echo json_encode(["status" => "error", "message" => "You don't have permission to close this ticket"]);
    exit;
}

if ($current_status === 'closed') {
    echo json_encode(["status" => "error", "message" => "Ticket is already closed"]);
    exit;
}

// Update status to closed
$stmt = $conSupport->prepare("UPDATE tickets SET status = 'closed' WHERE id = ?");
$stmt->bind_param("i", $ticket_id);

if ($stmt->execute()) {
    echo json_encode([
        "status" => "success", 
        "message" => "Ticket closed successfully"
    ]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to close ticket: " . $stmt->error]);
}

$stmt->close();
$conSupport->close();
?>
