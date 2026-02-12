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

// Validate JWT token
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

$class = isset($_POST['class']) ? trim($_POST['class']) : null;
$faculty = isset($_POST['faculty']) ? trim($_POST['faculty']) : null;
$subjectName = isset($_POST['subjectName']) ? trim($_POST['subjectName']) : null;

if($class === null || $faculty === null || $subjectName === null){
    echo json_encode(['data' => [], 'status' => 'false', 'message' => 'Missing required parameters']);
    return;
}

// Fetch books from class_books table
$query = "SELECT * FROM class_books WHERE class_level = '$class' AND faculty = '$faculty' AND subject = '$subjectName'";

$res = mysqli_query($con, $query);
if(mysqli_num_rows($res) > 0){
    $arr = [];
    while($row = mysqli_fetch_assoc($res)){
        // Map class_books fields to match expected Resource interface
        $arr[] = [
            'id' => $row['id'],
            'chapterName' => $row['title'],
            'chapter' => $row['description'],
            'link' => $row['drive_link'],
            'class' => $row['class_level'],
            'faculty' => $row['faculty'],
            'subjectName' => $row['subject']
        ];
    }
    echo json_encode(['data' => $arr,'status'=>'true']);
} else {
    echo json_encode(['data' => [],'status'=>'false']);
}
?>
