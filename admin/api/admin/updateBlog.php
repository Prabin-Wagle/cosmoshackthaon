<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
include '../db.php';
include '../jwt.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { echo json_encode(['success' => false, 'message' => 'Invalid request method']); exit(); }
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) { http_response_code(401); echo json_encode(['success' => false, 'message' => 'No token provided']); exit(); }
$token = $matches[1];
$payload = validateJWT($token);
if (!$payload) { http_response_code(401); echo json_encode(['success' => false, 'message' => 'Invalid or expired token']); exit(); }
if (!isset($payload['role']) || $payload['role'] !== 'admin') { http_response_code(403); echo json_encode(['success' => false, 'message' => 'Access denied']); exit(); }
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) { echo json_encode(['success' => false, 'message' => 'Invalid body']); exit(); }
$id = intval($input['id'] ?? 0);
if ($id <= 0) { echo json_encode(['success' => false, 'message' => 'Invalid id']); exit(); }
$title = mysqli_real_escape_string($con, $input['title'] ?? '');
$slug = mysqli_real_escape_string($con, $input['slug'] ?? '');
$excerpt = mysqli_real_escape_string($con, $input['excerpt'] ?? '');
$thumbnail = mysqli_real_escape_string($con, $input['thumbnail'] ?? '');
$content = $input['content'] ?? '';
$status = mysqli_real_escape_string($con, $input['status'] ?? 'draft');
$stmt = mysqli_prepare($con, "UPDATE blogs SET title = ?, slug = ?, excerpt = ?, thumbnail = ?, content = ?, status = ?, updated_at = NOW() WHERE id = ?");
mysqli_stmt_bind_param($stmt, 'ssssssi', $title, $slug, $excerpt, $thumbnail, $content, $status, $id);
if (mysqli_stmt_execute($stmt)) {
  echo json_encode(['success' => true]);
} else {
  echo json_encode(['success' => false, 'message' => mysqli_error($con)]);
}
mysqli_stmt_close($stmt);
?>
