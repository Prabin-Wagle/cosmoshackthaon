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
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

// 2. Fetch History
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 10;
$query = "SELECT id, resource_id, resource_type, title, subject, url, last_read 
          FROM user_reading_history 
          WHERE user_id = ? 
          ORDER BY last_read DESC 
          LIMIT ?";

$stmt = $conPrem->prepare($query);
if ($stmt) {
    $stmt->bind_param("ii", $user_id, $limit);
    $stmt->execute();
    $stmt->store_result();
    $stmt->bind_result($id, $resource_id, $resource_type, $title, $subject, $url, $last_read);
    
    $arr = [];
    while ($stmt->fetch()) {
        $arr[] = [
            'id' => $id,
            'resource_id' => $resource_id,
            'resource_type' => $resource_type,
            'title' => $title,
            'subject' => $subject,
            'url' => $url,
            'last_read' => $last_read
        ];
    }
    
    echo json_encode(['status' => 'true', 'data' => $arr]);
    $stmt->close();
} else {
    echo json_encode(['status' => 'false', 'message' => 'Query failed: ' . $conPrem->error]);
}
?>
