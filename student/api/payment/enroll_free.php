<?php
include('../db.php');
include('../jwt.php');
header('Content-Type:application/json');

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = ['http://localhost:5173', 'http://localhost:3000', 'https://notelibraryapp.com'];
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: https://notelibraryapp.com');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['status' => 'false', 'message' => 'Unauthorized']);
    exit();
}

$token = $matches[1];
$payload = validateJWT($token);
if (!$payload || !isset($payload['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'false', 'message' => 'Invalid token']);
    exit();
}

$user_id = $payload['user_id'];
$data = json_decode(file_get_contents('php://input'), true);
$collection_id = isset($data['collection_id']) ? intval($data['collection_id']) : 0;

if ($collection_id <= 0) {
    echo json_encode(['status' => 'false', 'message' => 'Invalid collection ID']);
    exit();
}

// 1. Double check the price is actually 0 for security
$priceQuery = "SELECT price, discount_price FROM test_series_collections WHERE id = ?";
$stmtPrice = $conPrem->prepare($priceQuery);
$stmtPrice->bind_param("i", $collection_id);
$stmtPrice->execute();
$stmtPrice->bind_result($price, $discount_price);
$collection = null;
if ($stmtPrice->fetch()) {
    $collection = [
        'price' => $price,
        'discount_price' => $discount_price
    ];
}
$stmtPrice->close();

if (!$collection) {
    echo json_encode(['status' => 'false', 'message' => 'Collection not found']);
    exit();
}

$actualPrice = ($collection['discount_price'] !== null) ? (float)$collection['discount_price'] : (float)$collection['price'];

if ($actualPrice > 0) {
    echo json_encode(['status' => 'false', 'message' => 'This collection is not free. Purchase required.']);
    exit();
}

// 2. Check if already accessed
$checkQuery = "SELECT id FROM user_series_access WHERE user_id = ? AND collection_id = ?";
$stmtCheck = $conPrem->prepare($checkQuery);
$stmtCheck->bind_param("ii", $user_id, $collection_id);
$stmtCheck->execute();
$stmtCheck->store_result();

if ($stmtCheck->num_rows > 0) {
    echo json_encode(['status' => 'true', 'message' => 'Success! You already have access.']);
    $stmtCheck->close();
    exit();
}
$stmtCheck->close();

// 3. Grant Access
$insertQuery = "INSERT INTO user_series_access (user_id, collection_id) VALUES (?, ?)";
$stmtInsert = $conPrem->prepare($insertQuery);
$stmtInsert->bind_param("ii", $user_id, $collection_id);

if ($stmtInsert->execute()) {
    echo json_encode(['status' => 'true', 'message' => 'Enrollment successful! You can now start the exams.']);
} else {
    echo json_encode(['status' => 'false', 'message' => 'Failed to enroll: ' . $conPrem->error]);
}
$stmtInsert->close();
?>
