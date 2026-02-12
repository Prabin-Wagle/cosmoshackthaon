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
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Validate JWT token
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['data' => null, 'status' => 'false', 'message' => 'Unauthorized']);
    exit();
}

$token = $matches[1];
$payload = validateJWT($token);
if (!$payload) {
    http_response_code(401);
    echo json_encode(['data' => null, 'status' => 'false', 'message' => 'Invalid token']);
    exit();
}

$slug = isset($_GET['slug']) ? mysqli_real_escape_string($con, $_GET['slug']) : null;

if($slug === null){
    echo json_encode(['data' => null, 'status' => 'false', 'message' => 'Slug required']);
    exit();
}

// Fetch single blog by slug
$query = "SELECT * FROM blogs WHERE slug = '$slug' AND status = 'published' LIMIT 1";

$res = mysqli_query($con, $query);
if(mysqli_num_rows($res) > 0){
    $row = mysqli_fetch_assoc($res);
    $blog = [
        'id' => $row['id'],
        'title' => $row['title'],
        'slug' => $row['slug'],
        'excerpt' => $row['excerpt'],
        'thumbnail' => $row['thumbnail'],
        'class' => $row['class'],
        'faculty' => $row['faculty'],
        'exam_type' => $row['exam_type'],
        'content' => $row['content'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at']
    ];
    echo json_encode(['data' => $blog,'status'=>'true']);
} else {
    echo json_encode(['data' => null,'status'=>'false', 'message' => 'Blog not found']);
}
?>
