<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include '../db.php';
include '../jwt.php';

// Validate JWT token
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "No token provided."]);
    exit;
}

$token = $matches[1];
$payload = validateJWT($token);
if (!$payload) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Invalid or expired token."]);
    exit;
}

$old_password = $_POST['old_password'] ?? '';
$new_password = $_POST['new_password'] ?? '';
$email = $payload['email']; // Get email from JWT token

if (empty($old_password) || empty($new_password) || empty($email)) {
    echo json_encode(["status" => "error", "message" => "Email, old password, and new password are required."]);
    exit;
}

// Get current password from DB
$stmt = $conUser->prepare("SELECT password FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows === 0) {
    echo json_encode(["status" => "error", "message" => "User not found."]);
    $stmt->close();
    exit;
}

$stmt->bind_result($hashed_password_from_db);
$stmt->fetch();
$stmt->close();

// Verify old password
if (!password_verify($old_password, $hashed_password_from_db)) {
    echo json_encode(["status" => "error", "message" => "Incorrect old password."]);
    exit;
}

// Hash new password and update DB
$new_hashed_password = password_hash($new_password, PASSWORD_DEFAULT);

$update_stmt = $conUser->prepare("UPDATE users SET password = ? WHERE email = ?");
$update_stmt->bind_param("ss", $new_hashed_password, $email);

if ($update_stmt->execute()) {
    echo json_encode(["status" => "success", "message" => "Password changed successfully."]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to update password. Please try again."]);
}

$update_stmt->close();
$conUser->close();
$con->close();
$conTest->close();
?>