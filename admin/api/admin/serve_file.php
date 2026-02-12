<?php
require_once '../jwt.php';

// Validate JWT token
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader)) {
    // Fallback for direct browser links - check for token in query param
    $authHeader = isset($_GET['token']) ? 'Bearer ' . $_GET['token'] : '';
}

if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    die('Unauthorized');
}

$token = $matches[1];
$payload = validateJWT($token);
if (!$payload) {
    http_response_code(401);
    die('Invalid session');
}

$path = isset($_GET['path']) ? $_GET['path'] : '';
if (!$path) {
    http_response_code(400);
    die('Path required');
}

// Security: Ensure path doesn't try to escape storage root
if (strpos($path, '..') !== false) {
    http_response_code(403);
    die('Access denied');
}

$secureRoot = "/home/notelibr/php_secure_storage/";
$fullPath = $secureRoot . $path;

if (!file_exists($fullPath)) {
    http_response_code(404);
    die('File not found');
}

// Optimization: Caching Headers
$lastModifiedTime = filemtime($fullPath);
$etag = md5_file($fullPath);

header("Last-Modified: " . gmdate("D, d M Y H:i:s", $lastModifiedTime) . " GMT");
header("Etag: $etag");
header("Cache-Control: public, max-age=31536000, immutable"); // Cache for 1 year

// Check if file has changed
if (isset($_SERVER['HTTP_IF_MODIFIED_SINCE']) && strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']) >= $lastModifiedTime) {
    http_response_code(304);
    exit();
}
if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH']) == $etag) {
    http_response_code(304);
    exit();
}

// Serve File
$mimeType = mime_content_type($fullPath);
$fileSize = filesize($fullPath);

header('Content-Type: ' . $mimeType);
header('Content-Length: ' . $fileSize);
header('Content-Disposition: inline; filename="' . basename($fullPath) . '"');
header('Accept-Ranges: bytes');

// Clean buffer to avoid memory issues with large files
if (ob_get_level()) ob_end_clean();

$file = fopen($fullPath, 'rb');
if ($file) {
    fpassthru($file);
    fclose($file);
}
exit();
?>
