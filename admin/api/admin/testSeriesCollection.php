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
    $authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
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

function sanitizeExam($value) {
    $value = strtoupper(trim($value ?? ''));
    $allowed = ['IOE', 'CEE', 'OTHER'];
    return in_array($value, $allowed, true) ? $value : '';
}

function buildNullableNumber($value) {
    if ($value === '' || $value === null) {
        return 'NULL';
    }
    return floatval($value);
}

function getCollections($conPrem) {
    $collectionId = isset($_GET['id']) ? intval($_GET['id']) : 0;

    $sql = "SELECT id, title, competitive_exam, description, price, discount_price, image_url, created_at, updated_at
            FROM test_series_collections";

    if ($collectionId > 0) {
        $sql .= " WHERE id = $collectionId";
    }

    $sql .= " ORDER BY created_at DESC";

    $result = mysqli_query($conPrem, $sql);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => mysqli_error($conPrem)]);
        return;
    }

    $collections = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $row['price'] = $row['price'] !== null ? floatval($row['price']) : null;
        $row['discount_price'] = $row['discount_price'] !== null ? floatval($row['discount_price']) : null;
        $collections[] = $row;
    }

    echo json_encode(['success' => true, 'data' => $collections]);
}

function createCollection($conPrem) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!is_array($data)) {
        respondJson(['success' => false, 'error' => 'Invalid JSON payload'], 400);
    }

    $title = mysqli_real_escape_string($conPrem, trim($data['title'] ?? ''));
    $description = mysqli_real_escape_string($conPrem, trim($data['description'] ?? ''));
    $competitiveExam = sanitizeExam($data['competitive_exam'] ?? '');
    $price = isset($data['price']) ? floatval($data['price']) : null;
    $discountPrice = isset($data['discount_price']) && $data['discount_price'] !== ''
        ? floatval($data['discount_price'])
        : null;
    $imageUrl = trim($data['image_url'] ?? '');
    $imageValue = $imageUrl !== '' ? "'" . mysqli_real_escape_string($conPrem, $imageUrl) . "'" : "NULL";

    if ($title === '' || $competitiveExam === '' || $price === null) {
        respondJson(['success' => false, 'error' => 'title, competitive_exam and price are required'], 400);
    }

    $discountValue = $discountPrice !== null ? $discountPrice : "NULL";

    $sql = "INSERT INTO test_series_collections (title, competitive_exam, description, price, discount_price, image_url, created_at, updated_at)
            VALUES ('$title', '$competitiveExam', '$description', $price, $discountValue, $imageValue, NOW(), NOW())";

    if (mysqli_query($conPrem, $sql)) {
        respondJson([
            'success' => true,
            'id' => mysqli_insert_id($conPrem),
            'message' => 'Test series collection created successfully'
        ]);
    } else {
        respondJson(['success' => false, 'error' => mysqli_error($conPrem)], 500);
    }
}

function updateCollection($conPrem) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!is_array($data) || empty($data['id'])) {
        respondJson(['success' => false, 'error' => 'id and payload are required'], 400);
    }

    $id = intval($data['id']);
    $title = mysqli_real_escape_string($conPrem, trim($data['title'] ?? ''));
    $description = mysqli_real_escape_string($conPrem, trim($data['description'] ?? ''));
    $competitiveExam = sanitizeExam($data['competitive_exam'] ?? '');
    $price = isset($data['price']) ? floatval($data['price']) : null;
    $discountPrice = isset($data['discount_price']) && $data['discount_price'] !== ''
        ? floatval($data['discount_price'])
        : null;
    $imageUrl = trim($data['image_url'] ?? '');
    $imageValue = $imageUrl !== '' ? "'" . mysqli_real_escape_string($conPrem, $imageUrl) . "'" : "NULL";

    if ($id <= 0 || $title === '' || $competitiveExam === '' || $price === null) {
        respondJson(['success' => false, 'error' => 'Invalid payload'], 400);
    }

    $discountValue = $discountPrice !== null ? $discountPrice : "NULL";

    $sql = "UPDATE test_series_collections
            SET title = '$title',
                competitive_exam = '$competitiveExam',
                description = '$description',
                price = $price,
                discount_price = $discountValue,
                image_url = $imageValue,
                updated_at = NOW()
            WHERE id = $id";

    if (mysqli_query($conPrem, $sql)) {
        respondJson(['success' => true, 'message' => 'Test series collection updated successfully']);
    } else {
        respondJson(['success' => false, 'error' => mysqli_error($conPrem)], 500);
    }
}

function deleteCollection($conPrem) {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;

    if ($id <= 0) {
        respondJson(['success' => false, 'error' => 'Invalid id'], 400);
    }

    $stmt = mysqli_prepare($conPrem, "DELETE FROM test_series_collections WHERE id = ?");

    if (!$stmt) {
        respondJson(['success' => false, 'error' => mysqli_error($conPrem)], 500);
    }

    mysqli_stmt_bind_param($stmt, 'i', $id);

    $success = mysqli_stmt_execute($stmt);

    if ($success) {
        respondJson(['success' => true, 'message' => 'Test series collection deleted successfully']);
    } else {
        respondJson(['success' => false, 'error' => mysqli_stmt_error($stmt)], 500);
    }

    mysqli_stmt_close($stmt);
}
?>

