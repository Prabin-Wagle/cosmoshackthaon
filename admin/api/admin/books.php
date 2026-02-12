<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../db.php';
require_once '../jwt.php';

define('BOOKS_TABLE', 'class_books');

function respondJson($payload, $code = 200) {
    http_response_code($code);
    echo json_encode($payload);
    exit();
}

$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    respondJson(['success' => false, 'message' => 'No token provided'], 401);
}
$token = $matches[1];
$payload = validateJWT($token);
if (!$payload) {
    respondJson(['success' => false, 'message' => 'Invalid or expired token'], 401);
}
if (!isset($payload['role']) || $payload['role'] !== 'admin') {
    respondJson(['success' => false, 'message' => 'Access denied. Admin privileges required.'], 403);
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getBooks($con);
        break;
    case 'POST':
        createBook($con);
        break;
    case 'PUT':
        updateBook($con);
        break;
    case 'DELETE':
        deleteBook($con);
        break;
    default:
        respondJson(['success' => false, 'message' => 'Method not allowed'], 405);
}

function getBooks($con) {
    $conditions = [];
    $params = [];

    if (!empty($_GET['class_level'])) {
        $conditions[] = 'class_level = ?';
        $params[] = $_GET['class_level'];
    }
    if (!empty($_GET['faculty'])) {
        $conditions[] = 'faculty = ?';
        $params[] = $_GET['faculty'];
    }
    if (!empty($_GET['subject'])) {
        $conditions[] = 'subject = ?';
        $params[] = $_GET['subject'];
    }

    $sql = 'SELECT id, title, drive_link, class_level, faculty, subject, description, created_at
            FROM ' . BOOKS_TABLE;
    if (!empty($conditions)) {
        $sql .= ' WHERE ' . implode(' AND ', $conditions);
    }
    $sql .= ' ORDER BY created_at DESC';

    if (!empty($params)) {
        $types = str_repeat('s', count($params));
        $stmt = mysqli_prepare($con, $sql);
        if (!$stmt) {
            respondJson(['success' => false, 'message' => 'Failed to prepare statement'], 500);
        }
        mysqli_stmt_bind_param($stmt, $types, ...$params);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
    } else {
        $result = mysqli_query($con, $sql);
    }

    if (!$result) {
        respondJson(['success' => false, 'message' => 'Failed to fetch books'], 500);
    }

    $books = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $books[] = $row;
    }

    if (!empty($stmt)) {
        mysqli_stmt_close($stmt);
    }

    respondJson(['success' => true, 'data' => $books]);
}

function createBook($con) {
    $data = json_decode(file_get_contents('php://input'), true);
    $title = isset($data['title']) ? trim($data['title']) : '';
    $driveLink = isset($data['drive_link']) ? trim($data['drive_link']) : '';
    $classLevel = isset($data['class_level']) ? trim($data['class_level']) : '';
    $faculty = isset($data['faculty']) ? trim($data['faculty']) : '';
    $subject = isset($data['subject']) ? trim($data['subject']) : '';
    $description = isset($data['description']) ? trim($data['description']) : '';

    if ($title === '' || $driveLink === '' || $classLevel === '' || $faculty === '' || $subject === '') {
        respondJson(['success' => false, 'message' => 'All fields except description are required'], 400);
    }

    $stmt = mysqli_prepare(
        $con,
        'INSERT INTO ' . BOOKS_TABLE . ' (title, drive_link, class_level, faculty, subject, description)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    if (!$stmt) {
        respondJson(['success' => false, 'message' => 'Failed to prepare insert'], 500);
    }

    mysqli_stmt_bind_param($stmt, 'ssssss', $title, $driveLink, $classLevel, $faculty, $subject, $description);

    if (!mysqli_stmt_execute($stmt)) {
        mysqli_stmt_close($stmt);
        respondJson(['success' => false, 'message' => 'Failed to create book'], 500);
    }

    $newId = mysqli_insert_id($con);
    mysqli_stmt_close($stmt);

    respondJson(['success' => true, 'message' => 'Book added successfully', 'id' => $newId], 201);
}

function updateBook($con) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = isset($data['id']) ? intval($data['id']) : 0;
    $title = isset($data['title']) ? trim($data['title']) : '';
    $driveLink = isset($data['drive_link']) ? trim($data['drive_link']) : '';
    $classLevel = isset($data['class_level']) ? trim($data['class_level']) : '';
    $faculty = isset($data['faculty']) ? trim($data['faculty']) : '';
    $subject = isset($data['subject']) ? trim($data['subject']) : '';
    $description = isset($data['description']) ? trim($data['description']) : '';

    if ($id <= 0 || $title === '' || $driveLink === '' || $classLevel === '' || $faculty === '' || $subject === '') {
        respondJson(['success' => false, 'message' => 'All fields are required'], 400);
    }

    $stmt = mysqli_prepare(
        $con,
        'UPDATE ' . BOOKS_TABLE . ' SET title = ?, drive_link = ?, class_level = ?, faculty = ?, subject = ?, description = ?
         WHERE id = ?'
    );
    if (!$stmt) {
        respondJson(['success' => false, 'message' => 'Failed to prepare update'], 500);
    }

    mysqli_stmt_bind_param($stmt, 'ssssssi', $title, $driveLink, $classLevel, $faculty, $subject, $description, $id);

    if (!mysqli_stmt_execute($stmt)) {
        mysqli_stmt_close($stmt);
        respondJson(['success' => false, 'message' => 'Failed to update book'], 500);
    }

    mysqli_stmt_close($stmt);
    respondJson(['success' => true, 'message' => 'Book updated successfully']);
}

function deleteBook($con) {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if ($id <= 0) {
        respondJson(['success' => false, 'message' => 'Invalid book id'], 400);
    }

    $stmt = mysqli_prepare($con, 'DELETE FROM ' . BOOKS_TABLE . ' WHERE id = ?');
    if (!$stmt) {
        respondJson(['success' => false, 'message' => 'Failed to prepare delete'], 500);
    }

    mysqli_stmt_bind_param($stmt, 'i', $id);
    if (!mysqli_stmt_execute($stmt)) {
        mysqli_stmt_close($stmt);
        respondJson(['success' => false, 'message' => 'Failed to delete book'], 500);
    }

    mysqli_stmt_close($stmt);
    respondJson(['success' => true, 'message' => 'Book deleted successfully']);
}
?>

