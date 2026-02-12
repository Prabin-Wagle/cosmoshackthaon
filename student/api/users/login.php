<?php
include '../cors.php';

include '../db.php';
include '../jwt.php';

// Frontend sends "email" field, but it can contain username or email
$loginInput = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';

if (empty($loginInput) || empty($password)) {
    echo json_encode(["status" => "error", "message" => "Username/Email and password are required."]);
    exit;
}

// Prepare SQL to find user by Email OR Username
// We also fetch 'province' and 'blocked' based on your new table data
$stmt = $conUser->prepare("SELECT id, name, username, email, phNo, province, district, city, password, class, faculty, competition, is_verified, role, blocked, profile_picture, banned_until FROM users WHERE email = ? OR username = ?");

if (!$stmt) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $conUser->error]);
    exit;
}

$stmt->bind_param("ss", $loginInput, $loginInput);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows === 0) {
    echo json_encode(["status" => "error", "message" => "No account found with that username or email."]);
    $stmt->close();
    exit;
}

// Bind results to variables matching your table structure
$stmt->bind_result(
    $id, 
    $name, 
    $username, 
    $email_res, 
    $phNo, 
    $province, // Added based on your table
    $district, 
    $city, 
    $hashed_password, 
    $class, 
    $faculty, 
    $competition, 
    $is_verified, 
    $role, 
    $blocked,   // Added based on your table
    $profile_picture,
    $banned_until // Fetch banned_until column
);

$stmt->fetch();

// Create user array
$user = [
    'id' => $id,
    'name' => $name,
    'username' => $username,
    'email' => $email_res,
    'phNo' => $phNo,
    'province' => $province,
    'district' => $district,
    'city' => $city,
    'password' => $hashed_password,
    'class' => $class,
    'faculty' => $faculty,
    'competition' => $competition,
    'is_verified' => $is_verified,
    'role' => $role,
    'blocked' => $blocked,
    'profile_picture' => $profile_picture,
    'banned_until' => $banned_until
];
$stmt->close();

// 1. Check if Blocked
// 1. Check if Blocked
if ($user['blocked'] == 1) {
    $is_banned = true;
    
    // Check if it's a temporary ban and if time has passed
    if (!empty($user['banned_until'])) {
        $banned_until_time = strtotime($user['banned_until']);
        $current_time = time();
        
        if ($current_time > $banned_until_time) {
            // Ban has expired - Unblock user
            $updateStmt = $conUser->prepare("UPDATE users SET blocked = 0, banned_until = NULL WHERE id = ?");
            $updateStmt->bind_param("i", $user['id']);
            $updateStmt->execute();
            $updateStmt->close();
            
            $is_banned = false; // User is no longer banned
        } else {
             // Still banned - Format date for message
             $date_str = date('F j, Y, g:i a', $banned_until_time);
             echo json_encode(["status" => "error", "message" => "Your account is temporarily banned until " . $date_str]);
             exit;
        }
    } else {
        // Permanent ban (banned_until is null but blocked is 1)
        echo json_encode(["status" => "error", "message" => "Your account has been permanently blocked. Please contact administration."]);
        exit;
    }
    
    if ($is_banned) {
         // Should recall checks above, but just in case
         exit;
    }
}

// 2. Verify Password
if (!password_verify($password, $user['password'])) {
    echo json_encode(["status" => "error", "message" => "Invalid password."]);
    exit;
}

// 3. Check Verification
if ($user['is_verified'] == 0) {
    echo json_encode([
        "status" => "verification_needed", 
        "message" => "Please verify your email before logging in.",
        "email" => $user['email']
    ]);
    exit;
}

// Login Successful - Clean up sensitive data
unset($user['password']);
unset($user['is_verified']);
unset($user['blocked']);

// Generate JWT Token
$payload = [
    'user_id' => $user['id'],
    'email' => $user['email'],
    'username' => $user['username'],
    'role' => $user['role'],
    'class' => $user['class'],
    'faculty' => $user['faculty'],
    'competition' => $user['competition']
];

$token = generateJWT($payload, 604800); // 7 days expiry

echo json_encode([
    "status" => "success", 
    "message" => "Login successful.", 
    "user" => $user, 
    "token" => $token
]);

$conUser->close();
// Close other connections if they were opened in db.php
if(isset($con)) $con->close();
if(isset($conTest)) $conTest->close();
?>