<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include '../db.php';
include '../jwt.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit();
}

$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';

if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No token provided']);
    exit();
}

$token = $matches[1];
$payload = validateJWT($token);

if (!$payload) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
    exit();
}

if (!isset($payload['role']) || $payload['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access denied. Admin privileges required.']);
    exit();
}

// Auto-unblock expired bans
$current_time = date('Y-m-d H:i:s');
$unblock_query = "UPDATE users SET blocked = 0, banned_until = NULL WHERE blocked = 1 AND banned_until IS NOT NULL AND banned_until < '$current_time'";
mysqli_query($conUser, $unblock_query);

$query = "SELECT id, name, username, email, phNo, province, district, city, class, faculty, competition, is_verified, role, blocked, banned_until, profile_picture, createdAt FROM users WHERE role != 'admin' ORDER BY id DESC";
$result = mysqli_query($conUser, $query);

if (!$result) {
    echo json_encode(['success' => false, 'message' => 'Database error']);
    exit();
}

$users = [];
while ($row = mysqli_fetch_assoc($result)) {
    $users[] = $row;
}

echo json_encode([
    'success' => true,
    'users' => $users
]);
?>