<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
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

function ensureAdmin() {
    $authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        http_response_code(401);
        respond(false, 'No token provided');
    }
    $token = $matches[1];
    $payload = validateJWT($token);
    if (!$payload) {
        http_response_code(401);
        respond(false, 'Invalid or expired token');
    }
    if (!isset($payload['role']) || $payload['role'] !== 'admin') {
        http_response_code(403);
        respond(false, 'Access denied. Admin privileges required.');
    }
}

ensureAdmin();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    global $con;
    $result = mysqli_query($con, "SELECT id, exam_name, created_at FROM competitive_exams ORDER BY id DESC");
    if (!$result) {
        respond(false, 'Failed to fetch competitive exams');
    }
    $exams = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $exams[] = $row;
    }
    respond(true, 'Competitive exams fetched', ['exams' => $exams]);
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = isset($input['action']) ? $input['action'] : '';
    if ($action !== 'add_exam') {
        respond(false, 'Unknown action');
    }
    $examName = isset($input['exam_name']) ? trim($input['exam_name']) : '';
    if ($examName === '') {
        respond(false, 'exam_name is required');
    }
    global $con;
    $stmt = mysqli_prepare($con, "INSERT INTO competitive_exams (exam_name) VALUES (?)");
    if (!$stmt) {
        respond(false, 'Failed to prepare statement');
    }
    mysqli_stmt_bind_param($stmt, 's', $examName);
    if (!mysqli_stmt_execute($stmt)) {
        respond(false, 'Failed to add competitive exam');
    }
    mysqli_stmt_close($stmt);
    respond(true, 'Competitive exam added');
} elseif ($method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    $examId = isset($input['exam_id']) ? intval($input['exam_id']) : 0;
    if ($examId <= 0) {
        respond(false, 'Valid exam_id is required');
    }
    global $con;
    $stmt = mysqli_prepare($con, "DELETE FROM competitive_exams WHERE id = ?");
    if (!$stmt) {
        respond(false, 'Failed to prepare delete statement');
    }
    mysqli_stmt_bind_param($stmt, 'i', $examId);
    if (!mysqli_stmt_execute($stmt)) {
        respond(false, 'Failed to delete competitive exam');
    }
    mysqli_stmt_close($stmt);
    respond(true, 'Competitive exam deleted');
} else {
    respond(false, 'Invalid request method');
}
?>

