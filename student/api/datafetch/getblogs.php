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

// 1. Extract user details directly from JWT payload for dynamic filtering
$userClass = $payload['class'] ?? '';
$userFaculty = $payload['faculty'] ?? '';
$userCompetition = $payload['competition'] ?? '';
$userRole = $payload['role'] ?? 'student';

// FALLBACK: If payload is missing data (e.g. old token), fetch from DB
if ($userRole !== 'admin' && (empty($userClass) || empty($userFaculty))) {
    $userId = $payload['user_id'];
    $userStmt = $conUser->prepare("SELECT class, faculty, competition FROM users WHERE id = ?");
    if ($userStmt) {
        $userStmt->bind_param("i", $userId);
        $userStmt->execute();
        $userStmt->bind_result($dbClass, $dbFaculty, $dbComp);
        if ($userStmt->fetch()) {
            $userClass = $dbClass;
            $userFaculty = $dbFaculty;
            $userCompetition = $dbComp;
        }
        $userStmt->close();
    }
}

// 2. Fetch filtered blogs, ordered by newest first
// Logic: 
// - Admins see everything
// - Students see if (Class & Faculty match) OR (Competition matches) OR (Both are 'All')
// - We use LOWER and REPLACE to be case/space insensitive (e.g., 'class12' matches 'Class 12')

$query = "SELECT id, title, slug, excerpt, thumbnail, class, faculty, exam_type, status, created_at, updated_at 
          FROM blogs 
          WHERE status = 'published' ";

if ($userRole !== 'admin') {
    $query .= " AND (
                (class = 'All' AND (exam_type = 'All' OR exam_type = '')) OR 
                (LOWER(REPLACE(class, ' ', '')) = LOWER(REPLACE(?, ' ', '')) AND (LOWER(REPLACE(faculty, ' ', '')) = LOWER(REPLACE(?, ' ', '')) OR faculty = 'All' OR ? = 'All')) OR 
                (LOWER(REPLACE(exam_type, ' ', '')) = LOWER(REPLACE(?, ' ', '')) AND exam_type != 'All' AND exam_type != '')
              )";
}

$query .= " ORDER BY created_at DESC";

$stmt = $con->prepare($query);
if ($stmt) {
    if ($userRole !== 'admin') {
        $stmt->bind_param("ssss", $userClass, $userFaculty, $userFaculty, $userCompetition);
    }
    $stmt->execute();
    $stmt->bind_result($id, $title, $slug, $excerpt, $thumbnail, $class, $faculty, $exam_type, $status, $created_at, $updated_at);
    
    $arr = [];
    while($stmt->fetch()){
        $arr[] = [
            'id' => $id,
            'title' => $title,
            'slug' => $slug,
            'excerpt' => $excerpt,
            'thumbnail' => $thumbnail,
            'class' => $class,
            'faculty' => $faculty,
            'exam_type' => $exam_type,
            'created_at' => $created_at,
            'updated_at' => $updated_at
        ];
    }
    echo json_encode([
        'data' => $arr, 
        'status' => 'true'
    ]);
    $stmt->close();
} else {
    echo json_encode([
        'data' => [], 
        'status' => 'false', 
        'message' => 'Query error: ' . $con->error
    ]);
}

$con->close();
if(isset($conUser)) $conUser->close();
?>
