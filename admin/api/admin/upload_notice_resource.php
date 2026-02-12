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

if (!isset($_FILES['resource'])) {
    respond(false, 'No file uploaded');
}

$file = $_FILES['resource'];
$fileName = $file['name'];
$fileTmpName = $file['tmp_name'];
$fileSize = $file['size'];
$fileError = $file['error'];

if ($fileError === 0) {
    // 1GB limit (1024 * 1024 * 1024 = 1073741824 bytes)
    if ($fileSize < 1073741824) { 
        $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        // Allowed extensions for notice resources (images, docs, videos)
        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'pdf', 'doc', 'docx'];

        if (in_array($fileExt, $allowed)) {
            // Generate unique name: uniqueId_OriginalName.ext
            // Sanitize original name to remove spaces and special chars
            $sanitizedOriginal = preg_replace('/[^a-zA-Z0-9\-_]/', '_', pathinfo($fileName, PATHINFO_FILENAME));
            // Limit length of original part
            $sanitizedOriginal = substr($sanitizedOriginal, 0, 50);
            
            $newName = uniqid('res_', true) . '_' . $sanitizedOriginal . "." . $fileExt;
            
            // Define upload path - going up two levels from api/admin to root, then into uploads/notice_resources
            $uploadDir = '../../uploads/notice_resources/';
            
            if (!file_exists($uploadDir)) {
                if (!mkdir($uploadDir, 0777, true)) {
                    respond(false, 'Failed to create upload directory');
                }
            }

            $destination = $uploadDir . $newName;

            if (move_uploaded_file($fileTmpName, $destination)) {
                // Return the public URL
                $publicUrl = 'https://notelibraryapp.com/uploads/notice_resources/' . $newName;
                respond(true, 'Resource uploaded successfully', ['url' => $publicUrl, 'name' => $newName]);
            } else {
                respond(false, 'Failed to move uploaded file');
            }
        } else {
            respond(false, 'Invalid file type. Allowed: jpg, jpeg, png, gif, webp, mp4, webm, pdf, doc, docx');
        }
    } else {
        respond(false, 'File is too large. Max 1GB');
    }
} else {
    respond(false, 'Error uploading file');
}
?>
