<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../db.php';
require_once '../../jwt.php';

$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$token = str_replace('Bearer ', '', $authHeader);
$userData = validateJWT($token);

if (!$userData || $userData['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Unauthorized access. Admin privileges required."]);
    exit;
}

$ticket_id = $_POST['ticket_id'] ?? '';
$admin_reply = $_POST['admin_reply'] ?? '';
$status = $_POST['status'] ?? 'answered';

if (empty($ticket_id) || empty($admin_reply)) {
    echo json_encode(["success" => false, "message" => "Ticket ID and admin reply are required"]);
    exit;
}

// Start Transaction
$conSupport->begin_transaction();

try {
    // 1. Insert into ticket_replies
    $stmt = $conSupport->prepare("INSERT INTO ticket_replies (ticket_id, user_id, message) VALUES (?, ?, ?)");
    $stmt->bind_param("iis", $ticket_id, $userData['user_id'], $admin_reply);
    $stmt->execute();
    $stmt->close();

    // 2. Update Ticket Status and Latest Message Shadow (for legacy)
    $stmt = $conSupport->prepare("UPDATE tickets SET admin_reply = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    $stmt->bind_param("ssi", $admin_reply, $status, $ticket_id);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        $conSupport->commit();
        echo json_encode(["success" => true, "message" => "Admin reply added and status updated"]);
    } else {
        $conSupport->rollback();
        echo json_encode(["success" => false, "message" => "Ticket not found or no changes made"]);
    }
    $stmt->close();
} catch (Exception $e) {
    $conSupport->rollback();
    echo json_encode(["success" => false, "message" => "Failed to update ticket: " . $e->getMessage()]);
}

$conSupport->close();
?>
