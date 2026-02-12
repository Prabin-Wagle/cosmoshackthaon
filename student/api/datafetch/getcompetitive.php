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

$exam_type = null;
$subjectName = null;

// Check for encrypted input 'd'
if (isset($_POST['d'])) {
    $decryptedInput = decryptData($_POST['d']);
    if ($decryptedInput) {
        $exam_type = isset($decryptedInput['exam_type']) ? trim($decryptedInput['exam_type']) : null;
        $subjectName = isset($decryptedInput['subjectName']) ? trim($decryptedInput['subjectName']) : null;
        // Fallback for different key names
        if (!$subjectName) $subjectName = isset($decryptedInput['subject']) ? trim($decryptedInput['subject']) : null;
    }
}

// Fallback for legacy
if (!$exam_type) $exam_type = isset($_POST['exam_type']) ? trim($_POST['exam_type']) : null;
if (!$subjectName) $subjectName = isset($_POST['subjectName']) ? trim($_POST['subjectName']) : null;

if($exam_type === null){
    echo json_encode(['data' => [], 'status' => 'false', 'message' => 'Exam type required']);
    return;
}

// If subjectName is provided, fetch resources for that subject
if ($subjectName !== null) {
    // Trim subject name to handle trailing spaces in database
    // Handle shared subjects (Physics, Chemistry, English) for CEE
    if ($exam_type === 'CEE' && in_array($subjectName, ['Physics', 'Chemistry', 'English'])) {
        $query = "SELECT * FROM comp_notes WHERE TRIM(subjectName) = '$subjectName' AND (exam_type = 'CEE' OR exam_type = 'IOE')";
    } else {
        $query = "SELECT * FROM comp_notes WHERE exam_type = '$exam_type' AND TRIM(subjectName) = '$subjectName'";
    }

    
    $res = mysqli_query($con, $query);
    if(mysqli_num_rows($res) > 0){
        $arr = [];
        while($row = mysqli_fetch_assoc($res)){
            // Map comp_notes fields to match expected Resource interface
            $arr[] = [
                'id' => $row['id'],
                'chapter' => $row['chapter'],
                'chapterName' => $row['chapterName'],
                'link' => $row['driveLink'], // Map driveLink to link
                'exam_type' => $row['exam_type'],
                'subjectName' => trim($row['subjectName'])
                // Deliberately not including 'image' field
            ];
        }
        echo json_encode(['data' => $arr, 'status' => 'true']);
    } else {
                // Debug: return the query that was execute 
        echo json_encode([
            'data' => [], 
            'status' => 'false',
            'debug' => [
                'query' => $query,
                'exam_type' => $exam_type,
                'subjectName' => $subjectName
            ]
        ]);
    }
} else {
    // Fetch subject list for the exam type
    // Include shared subjects (Physics, Chemistry, English) for CEE from IOE
    if ($exam_type === 'CEE') {
        $query = "SELECT DISTINCT TRIM(subjectName) as subject_name FROM comp_notes WHERE exam_type = 'CEE' OR (exam_type = 'IOE' AND TRIM(subjectName) IN ('Physics', 'Chemistry', 'English'))";
    } else {
        $query = "SELECT DISTINCT TRIM(subjectName) as subject_name FROM comp_notes WHERE exam_type = '$exam_type'";
    }
    
    $res = mysqli_query($con, $query);
    if(mysqli_num_rows($res) > 0){
        $subjects = [];
        while($row = mysqli_fetch_assoc($res)){
            // Add a dummy id and code for compatibility with Subject interface
            $row['id'] = 0; 
            $row['subject_code'] = $exam_type; 
            $subjects[] = $row;
        }
        echo json_encode(['subjects' => $subjects, 'status' => 'true', 'success' => true]);
    } else {
        echo json_encode(['subjects' => [], 'status' => 'false', 'success' => false]);
    }
}
?>
