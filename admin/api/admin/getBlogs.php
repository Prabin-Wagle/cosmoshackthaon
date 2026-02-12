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
$result = mysqli_query($con, "SELECT id, title, slug, excerpt, thumbnail, content, status, created_at, updated_at FROM blogs ORDER BY id DESC");
if (!$result) { echo json_encode(['success' => false, 'message' => 'Database error']); exit(); }
$blogs = [];
while ($row = mysqli_fetch_assoc($result)) { $blogs[] = $row; }
echo json_encode(['success' => true, 'blogs' => $blogs]);
?>
