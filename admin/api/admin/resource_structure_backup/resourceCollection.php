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

switch ($method) {
    case 'GET':
        getCollections($conPrem);
        break;
    case 'POST':
        createCollection($conPrem);
        break;
    case 'PUT':
        updateCollection($conPrem);
        break;
    case 'DELETE':
        deleteCollection($conPrem);
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

function getCollections($conPrem) {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    
    $sql = "SELECT * FROM resource_collections";
    if ($id > 0) {
        $sql .= " WHERE id = $id";
    }
    $sql .= " ORDER BY created_at DESC";
    
    $result = mysqli_query($conPrem, $sql);
    if (!$result) {
        respondJson(['success' => false, 'error' => mysqli_error($conPrem)], 500);
    }
    
    $collections = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $collections[] = $row;
    }
    
    respondJson(['success' => true, 'data' => $collections]);
}

function createCollection($conPrem) {
    $data = json_decode(file_get_contents('php://input'), true);
    $title = mysqli_real_escape_string($conPrem, trim($data['title'] ?? ''));
    $description = mysqli_real_escape_string($conPrem, trim($data['description'] ?? ''));
    $imageUrl = mysqli_real_escape_string($conPrem, trim($data['image_url'] ?? ''));
    
    if ($title === '') {
        respondJson(['success' => false, 'error' => 'Title is required'], 400);
    }
    
    $sql = "INSERT INTO resource_collections (title, description, image_url) VALUES ('$title', '$description', '$imageUrl')";
    if (mysqli_query($conPrem, $sql)) {
        respondJson(['success' => true, 'id' => mysqli_insert_id($conPrem), 'message' => 'Collection created']);
    } else {
        respondJson(['success' => false, 'error' => mysqli_error($conPrem)], 500);
    }
}

function updateCollection($conPrem) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval($data['id'] ?? 0);
    $title = mysqli_real_escape_string($conPrem, trim($data['title'] ?? ''));
    $description = mysqli_real_escape_string($conPrem, trim($data['description'] ?? ''));
    $imageUrl = mysqli_real_escape_string($conPrem, trim($data['image_url'] ?? ''));
    
    if ($id <= 0 || $title === '') {
        respondJson(['success' => false, 'error' => 'ID and Title are required'], 400);
    }
    
    $sql = "UPDATE resource_collections SET title = '$title', description = '$description', image_url = '$imageUrl' WHERE id = $id";
    if (mysqli_query($conPrem, $sql)) {
        respondJson(['success' => true, 'message' => 'Collection updated']);
    } else {
        respondJson(['success' => false, 'error' => mysqli_error($conPrem)], 500);
    }
}

function deleteCollection($conPrem) {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if ($id <= 0) {
        respondJson(['success' => false, 'error' => 'ID is required'], 400);
    }
    
    $sql = "DELETE FROM resource_collections WHERE id = $id";
    if (mysqli_query($conPrem, $sql)) {
        respondJson(['success' => true, 'message' => 'Collection deleted']);
    } else {
        respondJson(['success' => false, 'error' => mysqli_error($conPrem)], 500);
    }
}
?>
