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

function respond($success, $message, $extra = []) {
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra));
    exit();
}

// Validate Token
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    respond(false, 'No token provided');
}

$token = $matches[1];
$payload = validateJWT($token);
if (!$payload || $payload['role'] !== 'admin') {
    http_response_code(403);
    respond(false, 'Access denied');
}

if (!isset($_FILES['image'])) {
    respond(false, 'No file uploaded');
}

$file = $_FILES['image'];
$fileName = $file['name'];
$fileTmpName = $file['tmp_name'];
$fileSize = $file['size'];
$fileError = $file['error'];

if ($fileError === 0) {
    if ($fileSize < 5000000) { // 5MB limit
        $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

        if (in_array($fileExt, $allowed)) {
            // Use custom filename if provided, otherwise generate unique name
            if (isset($_POST['customFileName']) && !empty($_POST['customFileName'])) {
                // Sanitize the custom filename
                $customName = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $_POST['customFileName']);
                // Ensure it has the correct extension
                $customNameExt = strtolower(pathinfo($customName, PATHINFO_EXTENSION));
                if (!in_array($customNameExt, $allowed)) {
                    $customName = pathinfo($customName, PATHINFO_FILENAME) . '.' . $fileExt;
                }
                $newName = $customName;
            } else {
                $newName = uniqid('q_', true) . "." . $fileExt;
            }
            
            // Define upload path - going up two levels from api/admin to root, then into uploads/questionImages
            // Adjust this path based on your actual server structure
            // Assuming api/admin/upload.php -> project root is ../../
            $uploadDir = '../../uploads/questionImages/';
            
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            $destination = $uploadDir . $newName;

            if (move_uploaded_file($fileTmpName, $destination)) {
                // Return the public URL
                // Verify the domain name or use relative path logic if suitable
                $publicUrl = 'https://notelibraryapp.com/uploads/questionImages/' . $newName;
                respond(true, 'Image uploaded successfully', ['url' => $publicUrl]);
            } else {
                respond(false, 'Failed to move uploaded file');
            }
        } else {
            respond(false, 'Invalid file type. Allowed: jpg, jpeg, png, gif, webp');
        }
    } else {
        respond(false, 'File is too large. Max 5MB');
    }
} else {
    respond(false, 'Error uploading file');
}
?>
