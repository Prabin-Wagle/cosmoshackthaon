<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
include '../db.php';
include '../jwt.php';
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { echo json_encode(['success' => false, 'message' => 'Invalid request method']); exit(); }
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) { http_response_code(401); echo json_encode(['success' => false, 'message' => 'No token provided']); exit(); }
$token = $matches[1];
$payload = validateJWT($token);
if (!$payload) { http_response_code(401); echo json_encode(['success' => false, 'message' => 'Invalid or expired token']); exit(); }
if (!isset($payload['role']) || $payload['role'] !== 'admin') { http_response_code(403); echo json_encode(['success' => false, 'message' => 'Access denied']); exit(); }
$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
if ($id <= 0) { echo json_encode(['success' => false, 'message' => 'Invalid id']); exit(); }
$stmt = mysqli_prepare($con, "SELECT id, title, slug, excerpt, thumbnail, content, status, created_at, updated_at FROM blogs WHERE id = ?");
mysqli_stmt_bind_param($stmt, 'i', $id);
mysqli_stmt_execute($stmt);
mysqli_stmt_store_result($stmt);
mysqli_stmt_bind_result($stmt, $bid, $title, $slug, $excerpt, $thumbnail, $content, $status, $created_at, $updated_at);
if (mysqli_stmt_fetch($stmt)) {
  $blog = [
    'id' => $bid,
    'title' => $title,
    'slug' => $slug,
    'excerpt' => $excerpt,
    'thumbnail' => $thumbnail,
    'content' => $content,
    'status' => $status,
    'created_at' => $created_at,
    'updated_at' => $updated_at,
  ];
  echo json_encode(['success' => true, 'blog' => $blog]);
} else {
  echo json_encode(['success' => false, 'message' => 'Not found']);
}
mysqli_stmt_close($stmt);
?>
