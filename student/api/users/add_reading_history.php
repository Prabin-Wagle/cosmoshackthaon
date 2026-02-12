<?php
include('../db.php');
include('../jwt.php');
header('Content-Type:application/json');

// --- CORS ---
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

// 1. Validate Token
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

// 2. Ensure Table Exists
$createTable = "CREATE TABLE IF NOT EXISTS user_reading_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    resource_id INT NOT NULL,
    resource_type VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(255) DEFAULT NULL,
    url TEXT DEFAULT NULL,
    last_read TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_recent (user_id, last_read DESC),
    UNIQUE KEY idx_user_resource (user_id, resource_id, resource_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
$conPrem->query($createTable);

// Encryption Constants
define('ENCRYPTION_KEY', 'NoteLibrarySecur3_2026_SecretKey');
define('ENCRYPTION_IV', '1234567890123456');

function decryptData($encryptedData) {
    try {
        $decrypted = openssl_decrypt($encryptedData, 'aes-256-cbc', ENCRYPTION_KEY, 0, ENCRYPTION_IV);
        return json_decode($decrypted, true);
    } catch (Exception $e) {
        return null;
    }
}

// 3. Get POST data
$input = file_get_contents('php://input');
$raw_data = json_decode($input, true);
$data = [];

if (isset($raw_data['d'])) {
    $data = decryptData($raw_data['d']);
} else {
    // Fallback for legacy
    $data = $raw_data;
}

if (!$data || !isset($data['resource_id']) || !isset($data['resource_type']) || !isset($data['title'])) {
    echo json_encode(['status' => 'false', 'message' => 'Invalid data']);
    exit();
}

$resource_id = intval($data['resource_id']);
$resource_type = $data['resource_type'];
$title = $data['title'];
$subject = isset($data['subject']) ? $data['subject'] : null;
$url = isset($data['url']) ? $data['url'] : null;

// 4. Insert or Update History
$query = "INSERT INTO user_reading_history (user_id, resource_id, resource_type, title, subject, url) 
          VALUES (?, ?, ?, ?, ?, ?) 
          ON DUPLICATE KEY UPDATE title = VALUES(title), subject = VALUES(subject), url = VALUES(url), last_read = CURRENT_TIMESTAMP";

$stmt = $conPrem->prepare($query);
if ($stmt) {
    $stmt->bind_param("iissss", $user_id, $resource_id, $resource_type, $title, $subject, $url);
    if ($stmt->execute()) {
        echo json_encode(['status' => 'true', 'message' => 'History updated']);
    } else {
        echo json_encode(['status' => 'false', 'message' => 'Failed to update history: ' . $stmt->error]);
    }
    $stmt->close();
} else {
    echo json_encode(['status' => 'false', 'message' => 'Prepare failed: ' . $conPrem->error]);
}
?>
