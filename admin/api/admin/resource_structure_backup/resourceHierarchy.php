<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../db.php';
require_once '../jwt.php';

$authPayload = requireAdminAuth();

$method = $_SERVER['REQUEST_METHOD'];
$type = $_GET['type'] ?? ''; // faculty, subject, unit, chapter, document

$allowedTypes = ['faculty', 'subject', 'unit', 'chapter', 'document'];
if (!in_array($type, $allowedTypes)) {
    respondJson(['success' => false, 'error' => 'Invalid type'], 400);
}

$tableMap = [
    'faculty' => 'resource_faculties',
    'subject' => 'resource_subjects',
    'unit' => 'resource_units',
    'chapter' => 'resource_chapters',
    'document' => 'resource_documents'
];

$parentMap = [
    'faculty' => 'collection_id',
    'subject' => 'faculty_id',
    'unit' => 'subject_id',
    'chapter' => 'unit_id',
    'document' => 'chapter_id'
];

$tableName = $tableMap[$type];
$parentCol = $parentMap[$type];

switch ($method) {
    case 'GET':
        handleGet($conPrem, $tableName, $parentCol);
        break;
    case 'POST':
        handlePost($conPrem, $tableName, $parentCol, $type);
        break;
    case 'PUT':
        handlePut($conPrem, $tableName);
        break;
    case 'DELETE':
        handleDelete($conPrem, $tableName);
        break;
    default:
        respondJson(['success' => false, 'error' => 'Method not allowed'], 405);
        break;
}

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

function handleGet($conPrem, $tableName, $parentCol) {
    $parentId = intval($_GET['parentId'] ?? 0);
    if ($parentId <= 0) {
        respondJson(['success' => false, 'error' => 'Parent ID is required'], 400);
    }
    
    $sql = "SELECT * FROM $tableName WHERE $parentCol = $parentId ORDER BY created_at ASC";
    $result = mysqli_query($conPrem, $sql);
    if (!$result) {
        respondJson(['success' => false, 'error' => mysqli_error($conPrem)], 500);
    }
    
    $items = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $items[] = $row;
    }
    respondJson(['success' => true, 'data' => $items]);
}

function handlePost($conPrem, $tableName, $parentCol, $type) {
    $data = json_decode(file_get_contents('php://input'), true);
    $title = mysqli_real_escape_string($conPrem, trim($data['title'] ?? ''));
    $parentId = intval($data['parentId'] ?? 0);
    
    if ($title === '' || $parentId <= 0) {
        respondJson(['success' => false, 'error' => 'Title and Parent ID are required'], 400);
    }
    
    if ($type === 'document') {
        $filePath = mysqli_real_escape_string($conPrem, trim($data['file_path'] ?? ''));
        $pdfLink = mysqli_real_escape_string($conPrem, trim($data['pdf_link'] ?? ''));
        $sql = "INSERT INTO $tableName (title, $parentCol, file_path, pdf_link) VALUES ('$title', $parentId, '$filePath', '$pdfLink')";
    } else {
        $sql = "INSERT INTO $tableName (title, $parentCol) VALUES ('$title', $parentId)";
    }

    if (mysqli_query($conPrem, $sql)) {
        respondJson(['success' => true, 'id' => mysqli_insert_id($conPrem), 'message' => ucfirst($type) . ' created']);
    } else {
        respondJson(['success' => false, 'error' => mysqli_error($conPrem)], 500);
    }
}

function handlePut($conPrem, $tableName) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval($data['id'] ?? 0);
    $title = mysqli_real_escape_string($conPrem, trim($data['title'] ?? ''));
    
    if ($id <= 0 || $title === '') {
        respondJson(['success' => false, 'error' => 'ID and Title are required'], 400);
    }
    
    $sql = "UPDATE $tableName SET title = '$title' WHERE id = $id";
    if (mysqli_query($conPrem, $sql)) {
        respondJson(['success' => true, 'message' => 'Updated successfully']);
    } else {
        respondJson(['success' => false, 'error' => mysqli_error($conPrem)], 500);
    }
}

function handleDelete($conPrem, $tableName) {
    $id = intval($_GET['id'] ?? 0);
    if ($id <= 0) {
        respondJson(['success' => false, 'error' => 'ID is required'], 400);
    }
    
    $sql = "DELETE FROM $tableName WHERE id = $id";
    if (mysqli_query($conPrem, $sql)) {
        respondJson(['success' => true, 'message' => 'Deleted successfully']);
    } else {
        respondJson(['success' => false, 'error' => mysqli_error($conPrem)], 500);
    }
}
?>
