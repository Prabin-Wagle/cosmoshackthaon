<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

$directory = '../../uploads/notice_resources/';
$baseUrl = 'https://notelibraryapp.com/uploads/notice_resources/';

if (!is_dir($directory)) {
    respond(true, 'Directory empty or does not exist', ['files' => []]);
}

$files = [];
$scanned_files = scandir($directory);

foreach ($scanned_files as $file) {
    if ($file === '.' || $file === '..') continue;

    $filePath = $directory . $file;
    if (is_file($filePath)) {
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        
        // Extract original name if it follows the pattern: res_UNIQUEID_OriginalName.ext
        // Pattern: res_ + 23 chars (uniqid with true) + _ + OriginalName
        $originalName = $file;
        if (preg_match('/^res_[a-z0-9.]+_+(.+)\.'.$ext.'$/', $file, $matches)) {
            $originalName = $matches[1] . '.' . $ext;
        }

        $files[] = [
            'name' => $file, // System name for URL
            'original_name' => $originalName, // Display name
            'url' => $baseUrl . $file,
            'type' => $ext,
            'size' => filesize($filePath),
            'date' => filemtime($filePath)
        ];
    }
}

// Sort by date descending (newest first)
usort($files, function ($a, $b) {
    return $b['date'] - $a['date'];
});

respond(true, 'Files fetched successfully', ['files' => $files]);
?>
