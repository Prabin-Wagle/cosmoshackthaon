<?php
include '../cors.php';

include '../db.php';

// Get POST data
$name = $_POST['name'] ?? '';
$username = $_POST['username'] ?? '';
$email = $_POST['email'] ?? '';
$phNo = $_POST['phNo'] ?? '';
$province = $_POST['province'] ?? ''; // Added province
$district = $_POST['district'] ?? '';
$city = $_POST['city'] ?? '';
$password = $_POST['password'] ?? '';
$class = $_POST['class'] ?? '';
$faculty = $_POST['faculty'] ?? '';
$competition = $_POST['competition'] ?? '';
$competition = $_POST['competition'] ?? '';
$role = $_POST['role'] ?? 'student';
$is_google = isset($_POST['is_google']) && $_POST['is_google'] == '1';

// --- Input Validation ---
if (empty($name) || empty($username) || empty($email) || empty($password)) {
    echo json_encode(["status" => "error", "message" => "Name, username, email, and password are required."]);
    exit;
}

// Username validation: min 4 chars, not all digits
if (strlen($username) < 4) {
    echo json_encode(["status" => "error", "message" => "Username must be at least 4 characters long."]);
    exit;
}
if (ctype_digit($username)) {
    echo json_encode(["status" => "error", "message" => "Username cannot contain only numbers."]);
    exit;
}
if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
    echo json_encode(["status" => "error", "message" => "Username can only contain letters, numbers, and underscores."]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["status" => "error", "message" => "Invalid email format."]);
    exit;
}

// Check if username already exists
$stmt = $conUser->prepare("SELECT id FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows > 0) {
    echo json_encode(["status" => "error", "message" => "Username already taken."]);
    $stmt->close();
    exit;
}
$stmt->close();

// Check if email already exists
$stmt = $conUser->prepare("SELECT id, password FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$stmt->store_result();
$existing_user_id = null;
$existing_user_password = null;

if ($stmt->num_rows > 0) {
    $stmt->bind_result($existing_user_id, $existing_user_password);
    $stmt->fetch();
    
    // If password is NOT empty, then it's a real duplicate
    if (!empty($existing_user_password)) {
        echo json_encode(["status" => "error", "message" => "Email already registered."]);
        $stmt->close();
        exit;
    }
    // If password IS empty, it means we can update this record (Google Login flow)
}
$stmt->close();

// Check if phone number already exists (if provided)
if (!empty($phNo)) {
    $stmt = $conUser->prepare("SELECT id FROM users WHERE phNo = ?");
    $stmt->bind_param("s", $phNo);
    $stmt->execute();
    $stmt->store_result();
    if ($stmt->num_rows > 0) {
        echo json_encode(["status" => "error", "message" => "Phone number already registered."]);
        $stmt->close();
        exit;
    }
    $stmt->close();
}

// --- OTP Generation and Email ---
$otp = rand(100000, 999999);

function sendOtpEmail($email, $otp) {
    $subject = "Your OTP Code - Note Library";
    $message = "Dear user,\n\nYour OTP code for registration is: $otp\n\nIf you didn't request this, please ignore this email.\n\nRegards,\nNote Library";
    $headers = "From: noreply@notelibraryapp.com";
    return mail($email, $subject, $message, $headers);
}

// --- Password Hashing and Database Insertion ---
$hashed_password = password_hash($password, PASSWORD_DEFAULT);

// Validate role
if (!in_array($role, ['student', 'admin'])) {
    $role = 'student';
}

// --- Profile Picture Handling ---
function deleteProfilePictureFiles($userId) {
    $uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/user_profiles/';
    $oldFiles = glob($uploadDir . $userId . '.*');
    if ($oldFiles) {
        foreach ($oldFiles as $oldFile) {
            if (file_exists($oldFile)) {
                unlink($oldFile);
            }
        }
    }
}

function handleProfilePictureUpload($userId) {
    if (!isset($_FILES['profile_picture']) || $_FILES['profile_picture']['error'] !== UPLOAD_ERR_OK) {
        return null;
    }

    $file = $_FILES['profile_picture'];
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $maxSize = 5 * 1024 * 1024; // 5MB

    if (!in_array($file['type'], $allowedTypes)) {
        return null;
    }

    if ($file['size'] > $maxSize) {
        return null;
    }

    // Create upload directory if it doesn't exist
    $uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/user_profiles/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Delete existing files first
    deleteProfilePictureFiles($userId);

    // Get file extension
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    if (empty($extension)) $extension = 'jpg'; // Fallback
    $filename = $userId . '.' . strtolower($extension);
    $targetPath = $uploadDir . $filename;

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        return '/uploads/user_profiles/' . $filename;
    }

    return null;
}

if ($existing_user_id) {
    // UPDATE existing user
    $stmt = $conUser->prepare("UPDATE users SET name=?, username=?, phNo=?, province=?, district=?, city=?, password=?, class=?, faculty=?, competition=?, otp=?, role=?, is_verified=1 WHERE id=?");
    $stmt->bind_param("sssssssssssisi", $name, $username, $phNo, $province, $district, $city, $hashed_password, $class, $faculty, $competition, $otp, $role, $existing_user_id);
} else {
    // INSERT new user
    $is_verified = $is_google ? 1 : 0;
    $stmt = $conUser->prepare("INSERT INTO users (name, username, email, phNo, province, district, city, password, class, faculty, competition, otp, role, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sssssssssssisi", $name, $username, $email, $phNo, $province, $district, $city, $hashed_password, $class, $faculty, $competition, $otp, $role, $is_verified);
}

if ($stmt->execute()) {
    // Get the user ID (either existing or newly inserted)
    $userId = $existing_user_id ?: $conUser->insert_id;

    // Handle profile picture upload
    $profilePicturePath = handleProfilePictureUpload($userId);
    if ($profilePicturePath) {
        $updatePicStmt = $conUser->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
        $updatePicStmt->bind_param("si", $profilePicturePath, $userId);
        $updatePicStmt->execute();
        $updatePicStmt->close();
    }

    // If updating existing user (Google flow) OR new Google user, we don't need to send OTP
    if ($existing_user_id || $is_google) {
         echo json_encode(["status" => "success", "message" => "Registration completed successfully."]);
    } else {
        // Send OTP email for new users
        if (sendOtpEmail($email, $otp)) {
            echo json_encode(["status" => "success", "message" => "Registration successful. OTP sent to your email."]);
        } else {
            echo json_encode(["status" => "error", "message" => "Registration successful, but failed to send OTP."]);
        }
    }
} else {
    echo json_encode(["status" => "error", "message" => "Registration failed: " . $stmt->error]);
}

$stmt->close();
$conUser->close();
$con->close();
$conTest->close();
?>
