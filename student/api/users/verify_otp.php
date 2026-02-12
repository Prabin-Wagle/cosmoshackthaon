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

$email = $_POST['email'] ?? '';
$otp_input = $_POST['otp'] ?? '';

if (empty($email) || empty($otp_input)) {
    echo json_encode(["status" => "error", "message" => "Email and OTP are required."]);
    exit;
}

// Prepare statement to find user by email and OTP
$stmt = $conUser->prepare("SELECT id, email, role, class, faculty, competition FROM users WHERE email = ? AND otp = ?");
$stmt->bind_param("ss", $email, $otp_input);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    // OTP is correct, get user data
    $stmt->bind_result($user_id, $user_email, $user_role, $user_class, $user_faculty, $user_comp);
    $stmt->fetch();
    $stmt->close();
    
    // Set otp to NULL and is_verified to true
    $update_stmt = $conUser->prepare("UPDATE users SET otp = NULL, is_verified = 1 WHERE email = ?");
    $update_stmt->bind_param("s", $email);
    
    if ($update_stmt->execute()) {
        // Generate JWT token
        $payload = [
            'user_id' => $user_id,
            'email' => $user_email,
            'role' => $user_role,
            'class' => $user_class,
            'faculty' => $user_faculty,
            'competition' => $user_comp
        ];
        $token = generateJWT($payload, 86400); // 24 hours
        
        echo json_encode(["status" => "success", "message" => "Email verified successfully. You can now log in.", "token" => $token]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to update your account. Please try again."]);
    }
    $update_stmt->close();
} else {
    // Invalid OTP or email
    echo json_encode(["status" => "error", "message" => "Invalid OTP or email."]);
    $stmt->close();
}

$conUser->close();
$con->close();
$conTest->close();
?>