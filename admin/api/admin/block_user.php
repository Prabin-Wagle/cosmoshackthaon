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
$payload = validateJWT($token);

if (!$payload || $payload['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Unauthorized access. Admin privileges required."]);
    exit;
}

$user_id = $_POST['user_id'] ?? '';
$action = $_POST['action'] ?? ''; // 'block' or 'unblock'
$duration = $_POST['duration'] ?? 'permanent'; // '1h', '24h', '7d', '30d', 'permanent'

if (empty($user_id) || empty($action)) {
    echo json_encode(["success" => false, "message" => "User ID and action are required"]);
    exit;
}

if ($action === 'unblock') {
    $stmt = $conUser->prepare("UPDATE users SET blocked = 0, banned_until = NULL WHERE id = ?");
    $stmt->bind_param("i", $user_id);
} else {
    $banned_until = null;
    if ($duration !== 'permanent') {
        $time_map = [
            '1h' => '+1 hour',
            '24h' => '+1 day',
            '7d' => '+7 days',
            '30d' => '+30 days'
        ];
        if (isset($time_map[$duration])) {
            $banned_until = date('Y-m-d H:i:s', strtotime($time_map[$duration]));
        }
    }
    
    $stmt = $conUser->prepare("UPDATE users SET blocked = 1, banned_until = ? WHERE id = ?");
    $stmt->bind_param("si", $banned_until, $user_id);
}

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "User " . $action . "ed successfully"]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to " . $action . " user: " . $stmt->error]);
}

$stmt->close();
$conUser->close();
?>
