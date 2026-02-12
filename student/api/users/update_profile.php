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

// Verify JWT token
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

if (empty($authHeader) || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    echo json_encode(["status" => "error", "message" => "Authorization token required"]);
    exit;
}

$token = $matches[1];
$decoded = validateJWT($token);

if (!$decoded) {
    echo json_encode(["status" => "error", "message" => "Invalid or expired token"]);
    exit;
}

$userId = $decoded['user_id'];

// Get POST data
$name = $_POST['name'] ?? '';
$username = $_POST['username'] ?? '';
$phNo = $_POST['phNo'] ?? '';
$province = $_POST['province'] ?? '';
$district = $_POST['district'] ?? '';
$city = $_POST['city'] ?? '';
$class = $_POST['class'] ?? '';
$faculty = $_POST['faculty'] ?? '';
$competition = $_POST['competition'] ?? '';
$removeProfilePicture = isset($_POST['remove_profile_picture']) && $_POST['remove_profile_picture'] === 'true';

// --- Input Validation ---
if (empty($name) || empty($username)) {
    echo json_encode(["status" => "error", "message" => "Name and username are required."]);
    exit;
}

// Username validation
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

// Check if username is taken by another user
$stmt = $conUser->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
$stmt->bind_param("si", $username, $userId);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows > 0) {
    echo json_encode(["status" => "error", "message" => "Username already taken."]);
    $stmt->close();
    exit;
}
$stmt->close();

// Check if phone number is taken by another user (if provided)
if (!empty($phNo)) {
    $stmt = $conUser->prepare("SELECT id FROM users WHERE phNo = ? AND id != ?");
    $stmt->bind_param("si", $phNo, $userId);
    $stmt->execute();
    $stmt->store_result();
    if ($stmt->num_rows > 0) {
        echo json_encode(["status" => "error", "message" => "Phone number already registered."]);
        $stmt->close();
        exit;
    }
    $stmt->close();
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

// --- Update User Profile ---
$stmt = $conUser->prepare("UPDATE users SET name=?, username=?, phNo=?, province=?, district=?, city=?, class=?, faculty=?, competition=? WHERE id=?");
$stmt->bind_param("sssssssssi", $name, $username, $phNo, $province, $district, $city, $class, $faculty, $competition, $userId);

$debug_info = [];
$debug_info['remove_flag_detected'] = $removeProfilePicture;
$debug_info['userId'] = $userId;

if ($stmt->execute()) {
    $executed_actions = [];
    // 1. Handle explicit removal
    if ($removeProfilePicture) {
        deleteProfilePictureFiles($userId);
        $updatePicStmt = $conUser->prepare("UPDATE users SET profile_picture = NULL WHERE id = ?");
        if ($updatePicStmt) {
            $updatePicStmt->bind_param("i", $userId);
            if ($updatePicStmt->execute()) {
                $executed_actions[] = "photo_removed_from_db";
            } else {
                $executed_actions[] = "photo_removal_db_error: " . $updatePicStmt->error;
            }
            $updatePicStmt->close();
        } else {
            $executed_actions[] = "photo_removal_prepare_error: " . $conUser->error;
        }
    } 
    // 2. Handle new upload
    else {
        $profilePicturePath = handleProfilePictureUpload($userId);
        if ($profilePicturePath) {
            $updatePicStmt = $conUser->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
            if ($updatePicStmt) {
                $updatePicStmt->bind_param("si", $profilePicturePath, $userId);
                if ($updatePicStmt->execute()) {
                    $executed_actions[] = "photo_uploaded_and_updated";
                }
                $updatePicStmt->close();
            }
        }
    }

    // Fetch updated user data
    $fetchStmt = $conUser->prepare("SELECT id, name, username, email, phNo, province, district, city, class, faculty, competition, role, profile_picture FROM users WHERE id = ?");
    $fetchStmt->bind_param("i", $userId);
    $fetchStmt->execute();
    $fetchStmt->bind_result($id, $name, $username, $email, $phNo, $province, $district, $city, $class, $faculty, $competition, $role, $profile_picture);
    
    $user = null;
    if ($fetchStmt->fetch()) {
        $user = [
            'id' => $id,
            'name' => $name,
            'username' => $username,
            'email' => $email,
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
    }
    $fetchStmt->close();

    // Generate New JWT Token with updated info
    $newPayload = [
        'user_id' => $user['id'],
        'email' => $user['email'],
        'username' => $user['username'],
        'role' => $user['role'],
        'class' => $user['class'],
        'faculty' => $user['faculty'],
        'competition' => $user['competition']
    ];
    $newToken = generateJWT($newPayload, 86400);

    echo json_encode([
        "status" => "success",
        "message" => "Profile updated successfully.",
        "user" => $user,
        "token" => $newToken,
        "debug" => $debug_info,
        "actions" => $executed_actions
    ]);
} else {
    echo json_encode([
        "status" => "error", 
        "message" => "Failed to update profile: " . $stmt->error,
        "debug" => $debug_info
    ]);
}

$stmt->close();
$conUser->close();
$con->close();
$conTest->close();
?>
