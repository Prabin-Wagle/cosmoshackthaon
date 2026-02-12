<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../db.php';
require_once '../jwt.php';

$authPayload = requireAdminAuth();

function respondJson($payload, $code = 200) {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

function requireAdminAuth() {
    $headers = apache_request_headers();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    if (empty($authHeader) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        respondJson(['success' => false, 'message' => 'No token provided'], 401);
    }

    $token = $matches[1];
    $payload = validateJWT($token);
    if (!$payload || !isset($payload['role']) || $payload['role'] !== 'admin') {
        respondJson(['success' => false, 'message' => 'Access denied'], 403);
    }
    return $payload;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondJson(['success' => false, 'error' => 'Only POST allowed'], 405);
}

// Fields: title, chapter_id, file, path_data (collection, class, subject, unit, chapter names for path)
$chapterId = intval($_POST['chapter_id'] ?? 0);
$title = trim($_POST['title'] ?? '');
$pathData = json_decode($_POST['path_data'] ?? '[]', true);

if ($chapterId <= 0 || $title === '' || empty($pathData)) {
    respondJson(['success' => false, 'error' => 'Missing required fields'], 400);
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    respondJson(['success' => false, 'error' => 'File upload failed'], 400);
}

$file = $_FILES['file'];
$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
if (strtolower($ext) !== 'pdf') {
    respondJson(['success' => false, 'error' => 'Only PDF files are allowed'], 400);
}

// Construct path: collection/class/subject/unit/chapter/
function sanitizePath($str) {
    $str = str_replace(' ', '_', $str);
    return preg_replace('/[^A-Za-z0-9_\-]/', '', $str);
}

$cleanPaths = array_map('sanitizePath', $pathData);
$subDir = implode('/', $cleanPaths);

// Base upload directory (outside public_html if possible)
// Assuming this script is in public_html/api/admin/resourceUpload.php
// We want to go up 3 levels to reach the root above public_html
// Adjust as per actual server structure
$uploadBase = dirname(dirname(dirname(__DIR__))) . '/resource_uploads';

if (!is_dir($uploadBase)) {
    mkdir($uploadBase, 0755, true);
}

$targetDir = $uploadBase . '/' . $subDir;
if (!is_dir($targetDir)) {
    mkdir($targetDir, 0755, true);
}

$fileName = time() . '_' . sanitizePath($title) . '.pdf';
$targetFile = $targetDir . '/' . $fileName;

if (move_uploaded_file($file['tmp_name'], $targetFile)) {
    // Relative path for database
    $dbPath = $subDir . '/' . $fileName;
    
    // Update DB
    $escTitle = mysqli_real_escape_string($conPrem, $title);
    $escPath = mysqli_real_escape_string($conPrem, $dbPath);
    
    $sql = "INSERT INTO resource_documents (chapter_id, title, file_path) VALUES ($chapterId, '$escTitle', '$escPath')";
    
    if (mysqli_query($conPrem, $sql)) {
        respondJson([
            'success' => true,
            'message' => 'File uploaded and record created',
            'id' => mysqli_insert_id($conPrem),
            'path' => $dbPath
        ]);
    } else {
        respondJson(['success' => false, 'error' => 'Database error: ' . mysqli_error($conPrem)], 500);
    }
} else {
    respondJson(['success' => false, 'error' => 'Failed to move uploaded file'], 500);
}
?>
