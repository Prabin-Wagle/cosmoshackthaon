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
    echo json_encode(['data' => [], 'status' => 'false', 'message' => 'Unauthorized']);
    exit();
}

$token = $matches[1];
$payload = validateJWT($token);
if (!$payload) {
    http_response_code(401);
    echo json_encode(['data' => [], 'status' => 'false', 'message' => 'Invalid token']);
    exit();
}

$user_id = $payload['user_id']; 
// Debugging
if (!isset($payload['user_id'])) {
    echo json_encode(['status' => 'false', 'message' => 'Invalid token payload: missing user_id', 'debug_payload' => $payload]);
    exit();
}

if(!isset($_POST['collection_id']) || !isset($_FILES['screenshot'])){
    echo json_encode(['status' => 'false', 'message' => 'Missing collection ID or screenshot']);
    exit();
}

$collection_id = intval($_POST['collection_id']);
$file = $_FILES['screenshot'];

// Check for existing pending request
$checkStmt = $conPrem->prepare("SELECT id FROM payment_requests WHERE user_id = ? AND collection_id = ? AND status = 'pending'");
$checkStmt->bind_param("ii", $user_id, $collection_id);
$checkStmt->execute();
$checkStmt->store_result();

if ($checkStmt->num_rows > 0) {
    echo json_encode(['status' => 'false', 'message' => 'You already have a pending request for this collection.']);
    exit();
}
$checkStmt->close();

// Validate file type
$allowed_types = ['image/jpeg', 'image/png', 'image/jpg'];
if (!in_array($file['type'], $allowed_types)) {
    echo json_encode(['status' => 'false', 'message' => 'Invalid file type. Only JPG and PNG allowed.']);
    exit();
}

// Upload directory - ensure it exists
$upload_dir = '../../uploads/payment_receipts/';
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

$filename = uniqid() . '_' . basename($file['name']);
$target_path = $upload_dir . $filename;
$db_path = 'uploads/payment_receipts/' . $filename; // Path to store in DB

if (move_uploaded_file($file['tmp_name'], $target_path)) {
    $stmt = $conPrem->prepare("INSERT INTO payment_requests (user_id, collection_id, screenshot_path, status) VALUES (?, ?, ?, 'pending')");
    if (!$stmt) {
        echo json_encode(['status' => 'false', 'message' => 'Database error (prepare): ' . $conPrem->error]);
        exit();
    }
    $stmt->bind_param("iis", $user_id, $collection_id, $db_path);
    
    if ($stmt->execute()) {
        $stmt->close();
        echo json_encode(['status' => 'true', 'message' => 'Payment submitted successfully! Your request will be reviewed by admin shortly.']);
    } else {
        echo json_encode(['status' => 'false', 'message' => 'Database error: ' . $stmt->error]);
        $stmt->close();
    }
} else {
    echo json_encode(['status' => 'false', 'message' => 'Failed to upload file']);
}
?>
