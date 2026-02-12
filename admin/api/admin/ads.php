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

define('ADS_TABLE', 'ads');

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
        getAds($con);
        break;
    case 'POST':
        createAd($con);
        break;
    case 'PUT':
        updateAd($con);
        break;
    case 'DELETE':
        deleteAd($con);
        break;
    default:
        respondJson(['success' => false, 'message' => 'Method not allowed'], 405);
}

function getAds($con) {
    $sql = "SELECT * FROM " . ADS_TABLE . " ORDER BY created_at DESC";
    $result = mysqli_query($con, $sql);
    
    if (!$result) {
        respondJson(['success' => false, 'message' => 'Failed to fetch ads'], 500);
    }

    $ads = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $ads[] = $row;
    }
    respondJson(['success' => true, 'data' => $ads]);
}

function createAd($con) {
    $data = json_decode(file_get_contents('php://input'), true);
    $title = isset($data['title']) ? trim($data['title']) : '';
    $imageUrl = isset($data['image_url']) ? trim($data['image_url']) : '';
    $linkUrl = isset($data['link_url']) ? trim($data['link_url']) : '';
    $position = isset($data['position']) ? $data['position'] : 'content';
    $status = isset($data['status']) ? $data['status'] : 'active';

    if ($title === '' || $imageUrl === '') {
        respondJson(['success' => false, 'message' => 'Title and Image URL are required'], 400);
    }

    $stmt = mysqli_prepare($con, "INSERT INTO " . ADS_TABLE . " (title, image_url, link_url, position, status) VALUES (?, ?, ?, ?, ?)");
    mysqli_stmt_bind_param($stmt, 'sssss', $title, $imageUrl, $linkUrl, $position, $status);

    if (mysqli_stmt_execute($stmt)) {
        respondJson(['success' => true, 'message' => 'Ad created successfully', 'id' => mysqli_insert_id($con)], 201);
    } else {
        respondJson(['success' => false, 'message' => 'Failed to create ad'], 500);
    }
    mysqli_stmt_close($stmt);
}

function updateAd($con) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = isset($data['id']) ? intval($data['id']) : 0;
    $title = isset($data['title']) ? trim($data['title']) : '';
    $imageUrl = isset($data['image_url']) ? trim($data['image_url']) : '';
    $linkUrl = isset($data['link_url']) ? trim($data['link_url']) : '';
    $position = isset($data['position']) ? $data['position'] : 'content';
    $status = isset($data['status']) ? $data['status'] : 'active';

    if ($id <= 0 || $title === '' || $imageUrl === '') {
        respondJson(['success' => false, 'message' => 'ID, Title, and Image URL are required'], 400);
    }

    $stmt = mysqli_prepare($con, "UPDATE " . ADS_TABLE . " SET title = ?, image_url = ?, link_url = ?, position = ?, status = ? WHERE id = ?");
    mysqli_stmt_bind_param($stmt, 'sssssi', $title, $imageUrl, $linkUrl, $position, $status, $id);

    if (mysqli_stmt_execute($stmt)) {
        respondJson(['success' => true, 'message' => 'Ad updated successfully']);
    } else {
        respondJson(['success' => false, 'message' => 'Failed to update ad'], 500);
    }
    mysqli_stmt_close($stmt);
}

function deleteAd($con) {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if ($id <= 0) {
        respondJson(['success' => false, 'message' => 'Invalid ad ID'], 400);
    }

    $stmt = mysqli_prepare($con, "DELETE FROM " . ADS_TABLE . " WHERE id = ?");
    mysqli_stmt_bind_param($stmt, 'i', $id);

    if (mysqli_stmt_execute($stmt)) {
        respondJson(['success' => true, 'message' => 'Ad deleted successfully']);
    } else {
        respondJson(['success' => false, 'message' => 'Failed to delete ad'], 500);
    }
    mysqli_stmt_close($stmt);
}
?>
