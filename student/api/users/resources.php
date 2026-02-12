<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../db.php';
require_once '../jwt.php';

// Encryption Constants (Shared with Frontend)
define('ENCRYPTION_KEY', 'NoteLibrarySecur3_2026_SecretKey');
define('ENCRYPTION_IV', '1234567890123456');

function respond($success, $message, $extra = []) {
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra));
    exit();
}

// Validate JWT token
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    respond(false, 'Unauthorized');
}

$token = $matches[1];
$payload = validateJWT($token);
if (!$payload) {
    respond(false, 'Invalid session');
}

function decryptData($encryptedData) {
    try {
        $decrypted = openssl_decrypt($encryptedData, 'aes-256-cbc', ENCRYPTION_KEY, 0, ENCRYPTION_IV);
        return json_decode($decrypted, true);
    } catch (Exception $e) {
        return null;
    }
}

// Student context
$classLevel = '';
$faculty = '';
$subject = '';

// Check for encrypted input 'd'
if (isset($_GET['d'])) {
    $decryptedInput = decryptData($_GET['d']);
    if ($decryptedInput) {
        $classLevel = isset($decryptedInput['class_level']) ? trim($decryptedInput['class_level']) : '';
        $faculty = isset($decryptedInput['faculty']) ? trim($decryptedInput['faculty']) : '';
        $subject = isset($decryptedInput['subject']) ? trim($decryptedInput['subject']) : '';
    }
}

// Fallback for legacy
if (!$classLevel) $classLevel = isset($_GET['class_level']) ? trim($_GET['class_level']) : '';
if (!$faculty) $faculty = isset($_GET['faculty']) ? trim($_GET['faculty']) : '';
if (!$subject) $subject = isset($_GET['subject']) ? trim($_GET['subject']) : '';

if (!$classLevel) {
    respond(false, 'class_level is required');
}

// Robust normalization
$baseNormalized = strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $classLevel));
$tableName = "resources_" . $baseNormalized;

// Check if table exists
$checkTable = mysqli_query($con, "SHOW TABLES LIKE '$tableName'");
if (!$checkTable || mysqli_num_rows($checkTable) === 0) {
    // Fallback: Try inserting underscore if it's like 'class12' -> 'class_12'
    if (preg_match('/^([a-z]+)([0-9]+)$/i', $baseNormalized, $matches)) {
        $altTableName = "resources_" . $matches[1] . "_" . $matches[2];
        $checkAlt = mysqli_query($con, "SHOW TABLES LIKE '$altTableName'");
        if ($checkAlt && mysqli_num_rows($checkAlt) > 0) {
            $tableName = $altTableName;
        } else {
             respond(true, 'No resources found for class', ['resources' => [], 'debug' => ['attempted_table' => $tableName, 'alt_table' => $altTableName]]);
        }
    } else {
        respond(true, 'No resources found for class', ['resources' => [], 'debug' => ['attempted_table' => $tableName]]);
    }
}

// Fetch resources
$query = "SELECT id, faculty, subject, unit, resource_type, chapter_name, upload_mode, file_data, created_at 
          FROM `$tableName` 
          WHERE visibility = 1";

if ($subject) {
    $safeSubject = mysqli_real_escape_string($con, $subject);
    $query .= " AND (TRIM(subject) = '$safeSubject' OR subject = '$safeSubject')";
}

if ($faculty && !in_array(strtolower($faculty), ['general', 'none', 'all', ''])) {
    $safeFaculty = mysqli_real_escape_string($con, $faculty);
    $query .= " AND (LOWER(faculty) = LOWER('$safeFaculty') OR LOWER(faculty) = 'general' OR LOWER(faculty) = 'all')";
}

$query .= " ORDER BY created_at DESC";

$result = mysqli_query($con, $query);

$resources = [];
if ($result) {
    while ($row = mysqli_fetch_assoc($result)) {
        $resources[] = $row;
    }
}

function encryptData($data) {
    $json = json_encode($data);
    return openssl_encrypt($json, 'aes-256-cbc', ENCRYPTION_KEY, 0, ENCRYPTION_IV);
}

$payload = [
    'resources' => $resources
];

$encryptedPayload = encryptData($payload);

echo json_encode([
    'success' => true,
    'message' => 'Resources fetched',
    'encrypted' => true,
    'payload' => $encryptedPayload
]);
?>
