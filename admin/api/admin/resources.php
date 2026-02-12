<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 86400"); // 24 hours

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

// Validate JWT token
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    respond(false, 'No token provided');
}

$token = $matches[1];
$payload = validateJWT($token);
if (!$payload) {
    http_response_code(401);
    respond(false, 'Invalid token');
}

$isAdmin = ($payload['role'] === 'admin');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = isset($_GET['action']) ? $_GET['action'] : 'list';
    
    if ($action === 'list') {
        $classLevel = isset($_GET['class_level']) ? trim($_GET['class_level']) : '';
        if (!$classLevel) {
            respond(false, 'class_level is required');
        }

        $normalizedClass = strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $classLevel));
        $tableName = "resources_" . $normalizedClass;
        
        global $con; // notelibr_Contents
        
        // Check if table exists
        $checkTable = mysqli_query($con, "SHOW TABLES LIKE '$tableName'");
        if (!$checkTable || mysqli_num_rows($checkTable) === 0) {
            respond(true, 'No resources found', ['resources' => []]);
        }

        $query = "SELECT * FROM `$tableName` ORDER BY created_at DESC";
        $result = mysqli_query($con, $query);
        
        $resources = [];
        if ($result) {
            while ($row = mysqli_fetch_assoc($result)) {
                $resources[] = $row;
            }
        }
        respond(true, 'Resources fetched', ['resources' => $resources]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!$isAdmin) {
        http_response_code(403);
        respond(false, 'Admin privileges required');
    }

    $input = json_decode(file_get_contents('php://input'), true);
    // If json_decode fails, it might be a multipart/form-data POST (upload)
    if (!$input) {
        $action = isset($_POST['action']) ? $_POST['action'] : 'save';
    } else {
        $action = isset($input['action']) ? $input['action'] : 'save';
    }

    if ($action === 'save') {
        $classLevel = isset($_POST['class_level']) ? trim($_POST['class_level']) : '';
        $faculty = isset($_POST['faculty']) ? trim($_POST['faculty']) : 'None';
        $subject = isset($_POST['subject']) ? trim($_POST['subject']) : '';
        $unit = isset($_POST['unit']) ? trim($_POST['unit']) : 'General';
        $resourceType = isset($_POST['description']) ? trim($_POST['description']) : 'Notes';
        $uploadMode = isset($_POST['upload_mode']) ? $_POST['upload_mode'] : 'link';
        $visibility = isset($_POST['visibility']) && $_POST['visibility'] === 'true' ? 1 : 0;

        if (!$classLevel || !$subject) {
            respond(false, 'Missing required fields (Class, Subject)');
        }

        $normalizedClass = strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $classLevel));
        $tableName = "resources_" . $normalizedClass;
        
        global $con; // notelibr_Contents

        $createTableSQL = "CREATE TABLE IF NOT EXISTS `$tableName` (
            id INT AUTO_INCREMENT PRIMARY KEY,
            faculty VARCHAR(100),
            subject VARCHAR(100) NOT NULL,
            unit VARCHAR(100),
            resource_type VARCHAR(100),
            chapter_name VARCHAR(255),
            upload_mode ENUM('link', 'manual') NOT NULL,
            file_data TEXT,
            visibility TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
        
        mysqli_query($con, $createTableSQL);

        if ($uploadMode === 'manual') {
            if (!isset($_FILES['files']) || empty($_FILES['files']['name'][0])) {
                respond(false, 'No files uploaded');
            }

            $secureRoot = "/home/notelibr/php_secure_storage/";
            $filesCount = count($_FILES['files']['name']);
            $successCount = 0;

            for ($i = 0; $i < $filesCount; $i++) {
                $tmpName = $_FILES['files']['tmp_name'][$i];
                $cleanFileName = basename($_FILES['files']['name'][$i]);
                $chapterName = pathinfo($cleanFileName, PATHINFO_FILENAME);
                
                $pathParts = [$classLevel, ($faculty !== 'None' ? $faculty : ''), $subject, $unit, $resourceType, $chapterName];
                $cleanParts = array_map(function($p) { return preg_replace('/[^a-zA-Z0-9_\-\s]/', '', $p); }, array_filter($pathParts));
                
                $relativeDir = implode(DIRECTORY_SEPARATOR, $cleanParts);
                $fullDir = $secureRoot . $relativeDir;
                if (!is_dir($fullDir)) mkdir($fullDir, 0755, true);

                $targetFile = $fullDir . DIRECTORY_SEPARATOR . $cleanFileName;
                $dbPath = $relativeDir . DIRECTORY_SEPARATOR . $cleanFileName;

                if (move_uploaded_file($tmpName, $targetFile)) {
                    $stmt = mysqli_prepare($con, "INSERT INTO `$tableName` (faculty, subject, unit, resource_type, chapter_name, upload_mode, file_data, visibility) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                    mysqli_stmt_bind_param($stmt, 'sssssssi', $faculty, $subject, $unit, $resourceType, $chapterName, $uploadMode, $dbPath, $visibility);
                    if (mysqli_stmt_execute($stmt)) $successCount++;
                    mysqli_stmt_close($stmt);
                }
            }
            respond(true, "Successfully saved $successCount resources");
        } else {
            $chapterName = isset($_POST['chapter_name']) ? trim($_POST['chapter_name']) : '';
            $driveLink = isset($_POST['drive_link']) ? trim($_POST['drive_link']) : '';
            if (!$chapterName || !$driveLink) respond(false, 'Missing Drive link or Chapter name');

            $stmt = mysqli_prepare($con, "INSERT INTO `$tableName` (faculty, subject, unit, resource_type, chapter_name, upload_mode, file_data, visibility) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            mysqli_stmt_bind_param($stmt, 'sssssssi', $faculty, $subject, $unit, $resourceType, $chapterName, $uploadMode, $driveLink, $visibility);
            $success = mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
            respond($success, $success ? 'Link saved' : 'Failed to save link');
        }
    } elseif ($action === 'toggle_visibility') {
        $id = intval($input['id']);
        $classLevel = trim($input['class_level']);
        $visibility = intval($input['visibility']);
        
        $normalizedClass = strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $classLevel));
        $tableName = "resources_" . $normalizedClass;
        global $con;
        
        $stmt = mysqli_prepare($con, "UPDATE `$tableName` SET visibility = ? WHERE id = ?");
        mysqli_stmt_bind_param($stmt, 'ii', $visibility, $id);
        $success = mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);
        respond($success, $success ? 'Visibility updated' : 'Update failed');
    } elseif ($action === 'delete') {
        $ids = isset($input['ids']) ? $input['ids'] : (isset($input['id']) ? [$input['id']] : []);
        $classLevel = trim($input['class_level']);
        
        if (empty($ids) || !$classLevel) {
            respond(false, 'IDs and class_level are required');
        }

        $normalizedClass = strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $classLevel));
        $tableName = "resources_" . $normalizedClass;
        global $con;
        
        // Clean and validate IDs
        $cleanIds = array_map('intval', $ids);
        $idList = implode(',', $cleanIds);
        
        $query = "DELETE FROM `$tableName` WHERE id IN ($idList)";
        $success = mysqli_query($con, $query);
        
        respond($success, $success ? 'Resource(s) deleted' : 'Delete failed');
    }
}
?>
