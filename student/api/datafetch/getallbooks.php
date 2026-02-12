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

// 1. Extract class and faculty directly from JWT payload for dynamic filtering
$class = $payload['class'] ?? null;
$faculty = $payload['faculty'] ?? null;

if(!$class || !$faculty){
    echo json_encode(['data' => [], 'status' => 'false', 'message' => 'Curriculum data not found in token']);
    return;
}

// 2. Fetch filtered books, ordered by subject and title
// Logic: Admins see everything, students see their specific class/faculty
// Using LOWER and REPLACE for robust matching (e.g., 'class12' matches 'Class 12')
$userRole = $payload['role'] ?? 'student';

$query = "SELECT id, title, description, drive_link, class_level, faculty, subject FROM class_books ";

if ($userRole !== 'admin') {
    $query .= " WHERE LOWER(REPLACE(class_level, ' ', '')) = LOWER(REPLACE(?, ' ', '')) 
                AND LOWER(REPLACE(faculty, ' ', '')) = LOWER(REPLACE(?, ' ', '')) ";
}

$query .= " ORDER BY subject, title";

$stmt = $con->prepare($query);
if ($stmt) {
    if ($userRole !== 'admin') {
        $stmt->bind_param("ss", $class, $faculty);
    }
    $stmt->execute();
    $stmt->bind_result($id, $title, $description, $drive_link, $class_level, $faculty_res, $subject);
    
    $arr = [];
    while($stmt->fetch()){
        // Map class_books fields to match expected Resource interface
        $arr[] = [
            'id' => $id,
            'chapterName' => $title,
            'chapter' => $description,
            'link' => $drive_link,
            'class' => $class_level,
            'faculty' => $faculty_res,
            'subjectName' => $subject
        ];
    }
    echo json_encode(['data' => $arr, 'status' => 'true']);
    $stmt->close();
} else {
    echo json_encode(['data' => [], 'status' => 'false', 'message' => 'Query error: ' . $con->error]);
}
?>
