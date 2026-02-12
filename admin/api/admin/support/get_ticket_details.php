<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

$ticket_id = $_GET['ticket_id'] ?? '';

if (empty($ticket_id)) {
    echo json_encode(["success" => false, "message" => "Ticket ID is required"]);
    exit;
}

// 1. Fetch Ticket Metadata
$stmt = $conSupport->prepare("SELECT id, user_id, subject, message, admin_reply, status, created_at, updated_at FROM tickets WHERE id = ?");
$stmt->bind_param("i", $ticket_id);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Ticket not found"]);
    exit;
}

$stmt->bind_result($t_id, $t_user_id, $t_subject, $t_message, $t_admin_reply, $t_status, $t_created_at, $t_updated_at);
$stmt->fetch();
$stmt->close();

// 2. Fetch Replies
$replies = [];
$r_stmt = $conSupport->prepare("SELECT id, user_id, message, created_at FROM ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC");
$r_stmt->bind_param("i", $ticket_id);
$r_stmt->execute();
$r_stmt->bind_result($r_id, $r_user_id, $r_message, $r_created_at);

while ($r_stmt->fetch()) {
    $replies[] = [
        'id' => $r_id,
        'user_id' => $r_user_id,
        'message' => $r_message,
        'created_at' => $r_created_at,
        'is_admin' => ($r_user_id !== $t_user_id) 
    ];
}
$r_stmt->close();

// Prepend legacy admin reply if it exists
if (!empty($t_admin_reply)) {
    array_unshift($replies, [
        'id' => 0, 
        'user_id' => 0, 
        'message' => $t_admin_reply,
        'created_at' => $t_updated_at,
        'is_admin' => true,
        'is_legacy' => true
    ]);
}

echo json_encode([
    "success" => true,
    "ticket" => [
        'id' => $t_id,
        'user_id' => $t_user_id,
        'subject' => $t_subject,
        'message' => $t_message,
        'status' => $t_status,
        'created_at' => $t_created_at,
        'updated_at' => $t_updated_at
    ],
    "replies" => $replies
]);

$conSupport->close();
?>
