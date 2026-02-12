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

if (empty($user_id)) {
    echo json_encode(["success" => false, "message" => "User ID is required"]);
    exit;
}

// Start transaction to delete user and related data
mysqli_begin_transaction($conUser);

try {
    // Note: If you have other databases, you'd need to handle them too.
    // Assuming for now we just delete from users table.
    $stmt = $conUser->prepare("DELETE FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    
    if ($stmt->execute()) {
        mysqli_commit($conUser);
        echo json_encode(["success" => true, "message" => "User deleted successfully"]);
    } else {
        throw new Exception($stmt->error);
    }
    $stmt->close();
} catch (Exception $e) {
    mysqli_rollback($conUser);
    echo json_encode(["success" => false, "message" => "Failed to delete user: " . $e->getMessage()]);
}

$conUser->close();
?>
