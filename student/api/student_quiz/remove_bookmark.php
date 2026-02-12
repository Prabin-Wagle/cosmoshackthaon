<?php
include('../db.php');
include('../jwt.php');

header('Content-Type:application/json');

// --- CORS ---
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = ['http://localhost:5173', 'http://localhost:3000', 'https://notelibraryapp.com', 'https://student.notelibraryapp.com'];
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: https://notelibraryapp.com');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit();
}

// --- Auth ---
$headers = apache_request_headers();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
if (empty($authHeader) && isset($headers['authorization'])) $authHeader = $headers['authorization'];

$payload = null;
if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $payload = validateJWT($matches[1]);
}

if (!$payload) {
    echo json_encode(['status' => 'false', 'message' => 'Unauthorized']);
    exit();
}

$user_id = $payload['user_id'];

// --- Get POST data ---
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['bookmark_id'])) {
    echo json_encode(['status' => 'false', 'message' => 'Invalid data']);
    exit();
}

$bookmark_id = intval($data['bookmark_id']);

// Delete the bookmark record
$query = "DELETE FROM user_bookmarks WHERE id = ? AND user_id = ?";
$stmt = $conPrem->prepare($query);

if (!$stmt) {
    echo json_encode(['status' => 'false', 'message' => 'Prepare failed: ' . $conPrem->error]);
    exit();
}

$stmt->bind_param("ii", $bookmark_id, $user_id);

if ($stmt->execute()) {
    echo json_encode(['status' => 'true', 'message' => 'Bookmark removed']);
} else {
    echo json_encode(['status' => 'false', 'message' => 'Execute failed: ' . $stmt->error]);
}

$stmt->close();
?>
