<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
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

function getAuthPayload() {
    $authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        http_response_code(401);
        respond(false, 'No token provided');
    }
    $token = $matches[1];
    $payload = validateJWT($token);
    if (!$payload) {
        http_response_code(401);
        respond(false, 'Invalid or expired token');
    }
    if (!isset($payload['role']) || $payload['role'] !== 'admin') {
        http_response_code(403);
        respond(false, 'Access denied. Admin privileges required.');
    }
    return $payload;
}

function sanitizeIdentifier($name) {
    $name = strtolower($name);
    $name = preg_replace('/\s+/', '_', $name);
    $name = preg_replace('/[^a-z0-9_]/', '', $name);
    $name = preg_replace('/_+/', '_', $name);
    $name = trim($name, '_');
    if ($name === '') {
        return false;
    }
    if (!preg_match('/^[a-z]/', $name)) {
        $name = 't_' . $name;
    }
    if (strlen($name) > 60) {
        $name = substr($name, 0, 60);
    }
    return $name;
}

function tableNameFromInputs($className, $facultyName) {
    $c = sanitizeIdentifier($className);
    $f = sanitizeIdentifier($facultyName);
    if ($c === false || $f === false) {
        return false;
    }
    $table = $c . '_' . $f;
    if (strlen($table) > 64) {
        $table = substr($table, 0, 64);
    }
    return $table;
}

getAuthPayload();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = isset($input['action']) ? $input['action'] : '';

    if ($action === 'create_table') {
        $className = isset($input['class_name']) ? $input['class_name'] : '';
        $facultyName = isset($input['faculty_name']) ? $input['faculty_name'] : '';
        if ($className === '' || $facultyName === '') {
            respond(false, 'class_name and faculty_name are required');
        }
        $table = tableNameFromInputs($className, $facultyName);
        if ($table === false) {
            respond(false, 'Invalid class or faculty name');
        }
        $sql = "CREATE TABLE IF NOT EXISTS `{$table}` (
            id INT AUTO_INCREMENT PRIMARY KEY,
            subject_name VARCHAR(255) NOT NULL,
            units LONGTEXT DEFAULT '[]',
            has_units TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        global $consub;
        if (!mysqli_query($consub, $sql)) {
            respond(false, 'Failed to create table');
        }
        respond(true, 'Table created', ['table' => $table]);
    } elseif ($action === 'add_subject') {
        $className = isset($input['class_name']) ? $input['class_name'] : '';
        $facultyName = isset($input['faculty_name']) ? $input['faculty_name'] : '';
        $subjectName = isset($input['subject_name']) ? $input['subject_name'] : '';
        $hasUnits = isset($input['has_units']) ? intval($input['has_units']) : 1;
        if ($className === '' || $facultyName === '' || $subjectName === '') {
            respond(false, 'class_name, faculty_name and subject_name are required');
        }
        $table = tableNameFromInputs($className, $facultyName);
        if ($table === false) {
            respond(false, 'Invalid class or faculty name');
        }
        global $consub;
        $createSql = "CREATE TABLE IF NOT EXISTS `{$table}` (
            id INT AUTO_INCREMENT PRIMARY KEY,
            subject_name VARCHAR(255) NOT NULL,
            units LONGTEXT DEFAULT '[]',
            has_units TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        if (!mysqli_query($consub, $createSql)) {
            respond(false, 'Failed to ensure table exists');
        }
        $stmt = mysqli_prepare($consub, "INSERT INTO `{$table}` (subject_name, has_units) VALUES (?, ?)");
        if (!$stmt) {
            respond(false, 'Failed to prepare insert');
        }
        mysqli_stmt_bind_param($stmt, 'si', $subjectName, $hasUnits);
        if (!mysqli_stmt_execute($stmt)) {
            respond(false, 'Failed to add subject');
        }
        mysqli_stmt_close($stmt);
        respond(true, 'Subject added', ['table' => $table]);
    } elseif ($action === 'rename_table') {
        $oldTable = isset($input['old_table']) ? $input['old_table'] : '';
        $newClass = isset($input['new_class_name']) ? $input['new_class_name'] : '';
        $newFaculty = isset($input['new_faculty_name']) ? $input['new_faculty_name'] : '';
        if ($oldTable === '' || $newClass === '' || $newFaculty === '') {
            respond(false, 'old_table, new_class_name and new_faculty_name are required');
        }
        $newTable = tableNameFromInputs($newClass, $newFaculty);
        if ($newTable === false) {
            respond(false, 'Invalid new class or faculty name');
        }
        global $consub;
        $exists = mysqli_query($consub, "SHOW TABLES LIKE '" . mysqli_real_escape_string($consub, $oldTable) . "'");
        if (!$exists || mysqli_num_rows($exists) === 0) {
            respond(false, 'Source table does not exist');
        }
        $sql = "RENAME TABLE `{$oldTable}` TO `{$newTable}`";
        if (!mysqli_query($consub, $sql)) {
            respond(false, 'Failed to rename table');
        }
        respond(true, 'Table renamed', ['table' => $newTable]);
    } elseif ($action === 'delete_table') {
        $tableName = isset($input['table_name']) ? $input['table_name'] : '';
        if ($tableName === '') {
            respond(false, 'table_name is required');
        }
        global $consub;
        $sql = "DROP TABLE IF EXISTS `{$tableName}`";
        if (!mysqli_query($consub, $sql)) {
            respond(false, 'Failed to delete table');
        }
        respond(true, 'Table deleted');
    } else {
        respond(false, 'Unknown action');
    }
} elseif ($method === 'GET') {
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    if ($action === 'list_subjects') {
        $className = isset($_GET['class_name']) ? $_GET['class_name'] : '';
        $facultyName = isset($_GET['faculty_name']) ? $_GET['faculty_name'] : '';
        if ($className === '' || $facultyName === '') {
            respond(false, 'class_name and faculty_name are required');
        }
        $table = tableNameFromInputs($className, $facultyName);
        if ($table === false) {
            respond(false, 'Invalid class or faculty name');
        }
        global $consub;
        $exists = mysqli_query($consub, "SHOW TABLES LIKE '" . mysqli_real_escape_string($consub, $table) . "'");
        if (!$exists || mysqli_num_rows($exists) === 0) {
            respond(true, 'No table found, create it first', ['subjects' => [], 'table' => $table]);
        }
        $result = mysqli_query($consub, "SELECT id, subject_name, units, has_units, created_at FROM `{$table}` ORDER BY id DESC");
        if (!$result) {
            $result = mysqli_query($consub, "SELECT id, subject_name, units, created_at FROM `{$table}` ORDER BY id DESC");
            if (!$result) {
                $result = mysqli_query($consub, "SELECT id, subject_name, created_at FROM `{$table}` ORDER BY id DESC");
            }
        }
        if (!$result) {
            respond(false, 'Failed to fetch subjects');
        }
        $subjects = [];
        while ($row = mysqli_fetch_assoc($result)) {
            if (!isset($row['units'])) {
                $row['units'] = '[]';
            }
            if (!isset($row['has_units'])) {
                $row['has_units'] = 1;
            }
            $subjects[] = $row;
        }
        respond(true, 'Subjects fetched', ['subjects' => $subjects, 'table' => $table]);
    } elseif ($action === 'list_tables') {
        global $consub;
        $tables = [];
        $result = mysqli_query($consub, "SHOW TABLES");
        if ($result) {
            while ($row = mysqli_fetch_array($result)) {
                $tables[] = $row[0];
            }
        }
        respond(true, 'Tables fetched', ['tables' => $tables]);
    } else {
        respond(false, 'Unknown action');
    }
} elseif ($method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    $className = isset($input['class_name']) ? $input['class_name'] : '';
    $facultyName = isset($input['faculty_name']) ? $input['faculty_name'] : '';
    $subjectId = isset($input['subject_id']) ? intval($input['subject_id']) : 0;
    if ($className === '' || $facultyName === '' || $subjectId <= 0) {
        respond(false, 'class_name, faculty_name and valid subject_id are required');
    }
    $table = tableNameFromInputs($className, $facultyName);
    if ($table === false) {
        respond(false, 'Invalid class or faculty name');
    }
    global $consub;
    $stmt = mysqli_prepare($consub, "DELETE FROM `{$table}` WHERE id = ?");
    if (!$stmt) {
        respond(false, 'Failed to prepare delete');
    }
    mysqli_stmt_bind_param($stmt, 'i', $subjectId);
    if (!mysqli_stmt_execute($stmt)) {
        respond(false, 'Failed to delete subject');
    }
    mysqli_stmt_close($stmt);
    respond(true, 'Subject deleted', ['table' => $table]);
} else {
    respond(false, 'Invalid request method');
}
?>