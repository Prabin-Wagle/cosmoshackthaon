<?php
// 1. CORS Configuration for Localhost and Production
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = [
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:5173',      // Common Vite/React port
    'http://localhost:8080',
    'https://student.notelibraryapp.com',
    'https://notelibraryapp.com'  // Added main domain based on your logs
];

// Allow dynamic origin if it's in the allowed list
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}

header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../db.php';
require_once '../jwt.php';

function respond($success, $message, $extra = []) {
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra));
    exit();
}

// Encryption Constants
define('ENCRYPTION_KEY', 'NoteLibrarySecur3_2026_SecretKey');
define('ENCRYPTION_IV', '1234567890123456');

function decryptData($encryptedData) {
    try {
        // Fix for URL encoding replacing + with space
        $fixedData = str_replace(' ', '+', $encryptedData);
        $decrypted = openssl_decrypt($fixedData, 'aes-256-cbc', ENCRYPTION_KEY, 0, ENCRYPTION_IV);
        if ($decrypted === false) return null;
        return json_decode($decrypted, true);
    } catch (Exception $e) {
        return null;
    }
}

// 2. ROBUST ACTION PARSING
$action = '';
$table = '';

// Check for encrypted parameter 'd'
if (isset($_GET['d'])) {
    $decryptedData = decryptData($_GET['d']);
    if ($decryptedData) {
        $action = isset($decryptedData['action']) ? trim($decryptedData['action']) : '';
        $table = isset($decryptedData['table']) ? trim($decryptedData['table']) : '';
    }
}

// Fallback for legacy support
if (!$action) {
    $raw_action = isset($_GET['action']) ? $_GET['action'] : (isset($_GET['action_']) ? $_GET['action_'] : '');
    $action = trim($raw_action);
}
if (!$table) {
    $table = isset($_GET['table']) ? trim($_GET['table']) : '';
}

// Define public actions that don't require authentication
$publicActions = ['init', 'exams'];

// Check if the current action requires authentication
if (!in_array($action, $publicActions)) {
    // Validate JWT token for non-public actions
    $authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        http_response_code(401);
        respond(false, 'No token provided (Action received: ' . $action . ')');
    }

    $token = $matches[1];
    $payload = validateJWT($token);
    if (!$payload) {
        http_response_code(401);
        respond(false, 'Invalid or expired token');
    }

    // Check if user has a valid role
    if (!isset($payload['role']) || !in_array($payload['role'], ['admin', 'student'])) {
        http_response_code(403);
        respond(false, 'Access denied. Valid role required.');
    }
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    
    if ($action === 'init') {
        // Get all tables from notelibr_subject database
        global $consub;
        $tables = [];
        $classes = [];
        $faculties = [];
        $pairs = [];
        
        $result = mysqli_query($consub, "SHOW TABLES");
        if ($result) {
            while ($row = mysqli_fetch_array($result)) {
                $tableName = $row[0];
                $tables[] = $tableName;
                
                if (preg_match('/^class(\d+)_(.+)$/', $tableName, $matches)) {
                    $classNum = $matches[1];
                    $faculty = $matches[2];
                    
                    $className = 'class' . $classNum;
                    $classes[$className] = true;
                    
                    if ($faculty !== 'none') {
                        $faculties[$faculty] = true;
                    }
                    
                    $pairs[] = [
                        'table' => $tableName,
                        'class' => $className,
                        'faculty' => $faculty
                    ];
                }
            }
        }
        
        respond(true, 'Init data loaded', [
            'tables' => $tables,
            'classes' => array_keys($classes),
            'faculties' => array_keys($faculties),
            'pairs' => $pairs,
        ]);
        
    } elseif ($action === 'subjects') {
        // $table is already set from d or $_GET
        
        if ($table === '') {
            respond(false, 'table parameter is required');
        }
        
        global $consub;
        $safe = mysqli_real_escape_string($consub, $table);
        
        $exists = mysqli_query($consub, "SHOW TABLES LIKE '" . $safe . "'");
        if (!$exists || mysqli_num_rows($exists) === 0) {
            respond(false, 'Table not found');
        }
        
        $res = mysqli_query($consub, "SELECT * FROM `{$safe}` ORDER BY id DESC");
        if (!$res) {
            respond(false, 'Failed to fetch subjects: ' . mysqli_error($consub));
        }
        
        $subjects = [];
        while ($row = mysqli_fetch_assoc($res)) {
            $subjects[] = $row;
        }
        
        respond(true, 'Subjects fetched', [
            'table' => $table,
            'subjects' => $subjects
        ]);
        
    } elseif ($action === 'exams') {
        global $con;
        
        $res = mysqli_query($con, "SELECT * FROM `competitive_exams` ORDER BY id DESC");
        if (!$res) {
            respond(false, 'Failed to fetch competitive exams: ' . mysqli_error($con));
        }
        
        $exams = [];
        while ($row = mysqli_fetch_assoc($res)) {
            $exams[] = $row;
        }
        
        respond(true, 'Competitive exams fetched', [
            'exams' => $exams
        ]);
        
    } else {
        respond(false, 'Unknown or missing action parameter. Received: ' . ($action ? $action : 'EMPTY'), [
            'debug_action' => $action,
            'd_set' => isset($_GET['d'])
        ]);
    }
    
} else {
    respond(false, 'Invalid request method. Only GET is allowed.');
}
?>