<?php
// --- CORS Configuration ---
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = [
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'https://student.notelibraryapp.com',
    'https://notelibraryapp.com'
];

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}

header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include '../db.php';

// Get JSON input or POST data
$action = $_POST['action'] ?? '';
$email = $_POST['email'] ?? '';

if (empty($action) || empty($email)) {
    echo json_encode(["status" => "error", "message" => "Action and email are required."]);
    exit;
}

// --- ACTION 1: SEND OTP ---
if ($action === 'send_otp') {
    // Check if email exists
    $stmt = $conUser->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows === 0) {
        echo json_encode(["status" => "error", "message" => "No account found with that email address."]);
        exit;
    }
    $stmt->close();

    // Generate 6-digit OTP
    $otp = rand(100000, 999999);

    // Save OTP to database
    $update = $conUser->prepare("UPDATE users SET otp = ? WHERE email = ?");
    $update->bind_param("ss", $otp, $email);
    
    if ($update->execute()) {
        // Send Email
        $subject = "Password Reset OTP - Student Portal";
        $message = "Your OTP for password reset is: " . $otp;
        $headers = "From: no-reply@student.notelibraryapp.com";

        // Attempt to send mail
        $mailSent = mail($email, $subject, $message, $headers);

        // For Localhost Development: Send OTP in response
        $isLocal = strpos($origin, 'localhost') !== false;
        
        echo json_encode([
            "status" => "success", 
            "message" => "OTP sent to your email.",
            // REMOVE "debug_otp" IN PRODUCTION
            "debug_otp" => $isLocal ? $otp : null 
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to generate OTP. Try again."]);
    }
    $update->close();
}

// --- ACTION 2: VERIFY OTP & RESET PASSWORD ---
elseif ($action === 'reset') {
    $otpInput = $_POST['otp'] ?? '';
    $newPassword = $_POST['password'] ?? '';

    if (empty($otpInput) || empty($newPassword)) {
        echo json_encode(["status" => "error", "message" => "OTP and new password are required."]);
        exit;
    }

    // 1. Verify Email and OTP, AND fetch the current hashed password
    $stmt = $conUser->prepare("SELECT id, password FROM users WHERE email = ? AND otp = ?");
    $stmt->bind_param("ss", $email, $otpInput);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows === 0) {
        echo json_encode(["status" => "error", "message" => "Invalid OTP or Email."]);
        exit;
    }

    $stmt->bind_result($id, $currentHash);
    $stmt->fetch();
    $stmt->close();

    // 2. CHECK: Is the new password same as the old one?
    if (password_verify($newPassword, $currentHash)) {
        echo json_encode(["status" => "error", "message" => "New password cannot be the same as your current password."]);
        exit;
    }

    // 3. Hash the new password
    $hashed_password = password_hash($newPassword, PASSWORD_DEFAULT);

    // 4. Update password and clear OTP
    $update = $conUser->prepare("UPDATE users SET password = ?, otp = NULL WHERE email = ?");
    $update->bind_param("ss", $hashed_password, $email);

    if ($update->execute()) {
        echo json_encode(["status" => "success", "message" => "Password changed successfully. You can now login."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to update password."]);
    }
    $update->close();
}

else {
    echo json_encode(["status" => "error", "message" => "Invalid action."]);
}

$conUser->close();
?>