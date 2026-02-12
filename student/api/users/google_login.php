<?php
include '../cors.php';

include '../db.php';
include '../jwt.php';

$email = $_POST['email'] ?? '';
$name = $_POST['name'] ?? '';

if (empty($email)) {
    echo json_encode(["status" => "error", "message" => "Email is required."]);
    exit;
}

// Check if user exists
$stmt = $conUser->prepare("SELECT id, name, username, email, phNo, province, district, city, password, class, faculty, competition, is_verified, role, blocked, profile_picture, banned_until FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    // User exists
    $stmt->bind_result(
        $id, 
        $db_name, 
        $username, 
        $db_email, 
        $phNo, 
        $province, 
        $district, 
        $city, 
        $hashed_password, 
        $class, 
        $faculty, 
        $competition, 
        $is_verified, 
        $role, 
        $blocked,
        $profile_picture,
        $banned_until
    );
    $stmt->fetch();
    
    // Check if account is fully registered (has password)
    if (empty($hashed_password)) {
        // Account exists but incomplete (likely from a previous Google attempt that wasn't finished)
        echo json_encode(["status" => "registration_needed", "message" => "Please complete registration."]);
        exit;
    }

    if ($blocked == 1) {
        $is_banned = true;
    
        // Check if it's a temporary ban and if time has passed
        if (!empty($banned_until)) {
            $banned_until_time = strtotime($banned_until);
            $current_time = time();
            
            if ($current_time > $banned_until_time) {
                // Ban has expired - Unblock user
                $updateStmt = $conUser->prepare("UPDATE users SET blocked = 0, banned_until = NULL WHERE id = ?");
                $updateStmt->bind_param("i", $id);
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
             exit;
        }
    }

    // Login Successful
    $user = [
        'id' => $id,
        'name' => $db_name,
        'username' => $username,
        'email' => $db_email,
        'phNo' => $phNo,
        'province' => $province,
        'district' => $district,
        'city' => $city,
        'class' => $class,
        'faculty' => $faculty,
        'competition' => $competition,
        'role' => $role,
        'profile_picture' => $profile_picture
    ];

    $payload = [
        'user_id' => $user['id'],
        'email' => $user['email'],
        'username' => $user['username'],
        'role' => $user['role'],
        'class' => $user['class'],
        'faculty' => $user['faculty'],
        'competition' => $user['competition']
    ];

    $token = generateJWT($payload, 86400);

    echo json_encode([
        "status" => "success", 
        "message" => "Login successful.", 
        "user" => $user, 
        "token" => $token
    ]);

} else {
    // User does not exist - Return registration needed
    // We do NOT create the user here. We wait for them to fill the form.
    echo json_encode(["status" => "registration_needed", "message" => "Please complete registration."]);
}

$stmt->close();
$conUser->close();
?>
