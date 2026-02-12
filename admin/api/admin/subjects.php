<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
    respond(false, 'Invalid or expired token');
}
// Check if user has a valid role (admin or student)
if (!isset($payload['role']) || !in_array($payload['role'], ['admin', 'student'])) {
    http_response_code(403);
    respond(false, 'Access denied. Valid role required.');
}
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') {
    // GET requests: Both admin and student can access
    // Initialize action with default empty string to prevent undefined variable warnings
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    if ($action === 'init') {
        global $consub;
        $tables = [];
        $classes = [];
        $faculties = [];
        $pairs = [];
        $result = mysqli_query($consub, "SHOW TABLES");
        if ($result) {
            while ($row = mysqli_fetch_array($result)) {
                $t = $row[0];
                $tables[] = $t;
                $parts = explode('_', $t);
                $c = isset($parts[0]) ? $parts[0] : '';
                // Format class name
                if (strpos(strtolower($c), 'class') === 0) {
                    $num = substr($c, 5);
                    $c = 'Class ' . $num;
                } else {
                    $c = ucfirst($c);
                }
                
                $f = count($parts) > 1 ? implode('_', array_slice($parts, 1)) : '';
                if ($c !== '') $classes[$c] = true;
                if ($f !== '') $faculties[$f] = true;
                $pairs[] = ['table' => $t, 'class' => $c, 'faculty' => $f];
            }
        }
        respond(true, 'Init loaded', [
            'tables' => $tables,
            'classes' => array_keys($classes),
            'faculties' => array_keys($faculties),
            'pairs' => $pairs,
        ]);
    } elseif ($action === 'subjects') {
        $table = isset($_GET['table']) ? $_GET['table'] : '';
        if ($table === '') {
            respond(false, 'table is required');
        }
        global $consub;
        $safe = mysqli_real_escape_string($consub, $table);
        $exists = mysqli_query($consub, "SHOW TABLES LIKE '" . $safe . "'");
        if (!$exists || mysqli_num_rows($exists) === 0) {
            respond(false, 'Table not found');
        }
        $res = mysqli_query($consub, "SELECT id, subject_name, units, has_units, created_at FROM `{$safe}` ORDER BY id DESC");
        if (!$res) {
            // Fallback if units or has_units column is missing
            $res = mysqli_query($consub, "SELECT id, subject_name, units, created_at FROM `{$safe}` ORDER BY id DESC");
            if (!$res) {
                $res = mysqli_query($consub, "SELECT id, subject_name, created_at FROM `{$safe}` ORDER BY id DESC");
            }
        }
        if (!$res) {
            respond(false, 'Failed to fetch subjects');
        }
        $subjects = [];
        while ($row = mysqli_fetch_assoc($res)) {
            if (!isset($row['units'])) {
                $row['units'] = '[]';
            }
            if (!isset($row['has_units'])) {
                $row['has_units'] = 1; // Default to enabled
            }
            $subjects[] = $row;
        }
        respond(true, 'Subjects fetched', ['table' => $table, 'subjects' => $subjects]);
    } elseif ($action === 'exams') {
        global $con;
        $res = mysqli_query($con, "SELECT id, exam_name, created_at FROM competitive_exams ORDER BY id DESC");
        if (!$res) {
            respond(false, 'Failed to fetch competitive exams');
        }
        $exams = [];
        while ($row = mysqli_fetch_assoc($res)) {
            $exams[] = $row;
        }
        respond(true, 'Competitive exams fetched', ['exams' => $exams]);
    } elseif ($action === 'get_all_data') {
        global $consub;
        global $con;
        
        $tables = [];
        $classes = [];
        $faculties = [];
        $allSubjects = [];
        
        // 1. Get all tables (class_faculty)
        $result = mysqli_query($consub, "SHOW TABLES");
        if ($result) {
            while ($row = mysqli_fetch_array($result)) {
                $t = $row[0];
                $tables[] = $t;
                $parts = explode('_', $t);
                $c = isset($parts[0]) ? $parts[0] : '';
                // Format class name (e.g., class10 -> Class 10)
                if (strpos(strtolower($c), 'class') === 0) {
                    $num = substr($c, 5);
                    $c = 'Class ' . $num;
                } else {
                    $c = ucfirst($c);
                }
                
                $f = count($parts) > 1 ? implode('_', array_slice($parts, 1)) : '';
                if ($c !== '') $classes[$c] = true;
                if ($f !== '') $faculties[$f] = true;

                // 2. For each table, get subjects
                $safe = mysqli_real_escape_string($consub, $t);
                $subRes = mysqli_query($consub, "SELECT id, subject_name, units, has_units FROM `{$safe}` ORDER BY id DESC");
                if (!$subRes) {
                    $subRes = mysqli_query($consub, "SELECT id, subject_name, units FROM `{$safe}` ORDER BY id DESC");
                    if (!$subRes) {
                        $subRes = mysqli_query($consub, "SELECT id, subject_name FROM `{$safe}` ORDER BY id DESC");
                    }
                }
                $subjects = [];
                if ($subRes) {
                    while ($subRow = mysqli_fetch_assoc($subRes)) {
                        if (!isset($subRow['units'])) {
                            $subRow['units'] = '[]';
                        }
                        if (!isset($subRow['has_units'])) {
                            $subRow['has_units'] = 1;
                        }
                        $subjects[] = $subRow;
                    }
                }
                $allSubjects[$t] = $subjects;
            }
        }

        // 3. Get all competitive exams
        $examRes = mysqli_query($con, "SELECT id, exam_name FROM competitive_exams ORDER BY id DESC");
        $exams = [];
        if ($examRes) {
            while ($examRow = mysqli_fetch_assoc($examRes)) {
                $exams[] = $examRow;
            }
        }

        respond(true, 'All data fetched', [
            'classes' => array_keys($classes),
            'faculties' => array_keys($faculties),
            'subjects' => $allSubjects, // Keyed by "class_faculty" table name
            'exams' => $exams
        ]);
    } else {
        // Handle unknown or empty action
        respond(false, 'Unknown or missing action parameter');
    }
} elseif ($method === 'POST') {
    // POST requests: Admin only
    if ($payload['role'] !== 'admin') {
        http_response_code(403);
        respond(false, 'Access denied. Admin privileges required for modifications.');
    }
    $input = json_decode(file_get_contents('php://input'), true);
    // Initialize action with default empty string to prevent undefined variable warnings
    $action = isset($input['action']) ? $input['action'] : '';
    if ($action === 'add_subject') {
        $table = isset($input['table']) ? $input['table'] : '';
        $subjectName = isset($input['subject_name']) ? trim($input['subject_name']) : '';
        $hasUnits = isset($input['has_units']) ? intval($input['has_units']) : 1;
        if ($table === '' || $subjectName === '') {
            respond(false, 'table and subject_name are required');
        }
        global $consub;
        $safe = mysqli_real_escape_string($consub, $table);
        $exists = mysqli_query($consub, "SHOW TABLES LIKE '" . $safe . "'");
        if (!$exists || mysqli_num_rows($exists) === 0) {
            respond(false, 'Table not found');
        }
        
        // Ensure has_units column exists (for backward compatibility if not migrated yet)
        $colCheck = mysqli_query($consub, "SHOW COLUMNS FROM `{$safe}` LIKE 'has_units'");
        if (mysqli_num_rows($colCheck) === 0) {
            mysqli_query($consub, "ALTER TABLE `{$safe}` ADD COLUMN has_units TINYINT(1) DEFAULT 1");
        }

        $stmt = mysqli_prepare($consub, "INSERT INTO `{$safe}` (subject_name, has_units) VALUES (?, ?)");
        if (!$stmt) {
            respond(false, 'Failed to prepare insert: ' . mysqli_error($consub));
        }
        mysqli_stmt_bind_param($stmt, 'si', $subjectName, $hasUnits);
        if (!mysqli_stmt_execute($stmt)) {
            respond(false, 'Failed to add subject: ' . mysqli_stmt_error($stmt));
        }
        mysqli_stmt_close($stmt);
        respond(true, 'Subject added', ['table' => $table]);
    } elseif ($action === 'delete_subject') {
        $table = isset($input['table']) ? $input['table'] : '';
        $subjectId = isset($input['subject_id']) ? intval($input['subject_id']) : 0;
        if ($table === '' || $subjectId <= 0) {
            respond(false, 'table and valid subject_id are required');
        }
        global $consub;
        $safe = mysqli_real_escape_string($consub, $table);
        $exists = mysqli_query($consub, "SHOW TABLES LIKE '" . $safe . "'");
        if (!$exists || mysqli_num_rows($exists) === 0) {
            respond(false, 'Table not found');
        }
        $stmt = mysqli_prepare($consub, "DELETE FROM `{$safe}` WHERE id = ?");
        if (!$stmt) {
            respond(false, 'Failed to prepare delete');
        }
        mysqli_stmt_bind_param($stmt, 'i', $subjectId);
        if (!mysqli_stmt_execute($stmt)) {
            respond(false, 'Failed to delete subject');
        }
        mysqli_stmt_close($stmt);
        respond(true, 'Subject deleted', ['table' => $table]);
    } elseif ($action === 'update_units') {
        $table = isset($input['table']) ? $input['table'] : '';
        $subjectId = isset($input['subject_id']) ? intval($input['subject_id']) : 0;
        $units = isset($input['units']) ? $input['units'] : [];
        if ($table === '' || $subjectId <= 0 || !is_array($units)) {
            respond(false, 'table, valid subject_id and units array are required');
        }
        global $consub;
        $safe = mysqli_real_escape_string($consub, $table);
        $exists = mysqli_query($consub, "SHOW TABLES LIKE '" . $safe . "'");
        if (!$exists || mysqli_num_rows($exists) === 0) {
            respond(false, 'Table not found');
        }
        $unitsJson = json_encode($units);
        $stmt = mysqli_prepare($consub, "UPDATE `{$safe}` SET units = ? WHERE id = ?");
        if (!$stmt) {
            // Check if column exists, if not try to add it
            $colCheck = mysqli_query($consub, "SHOW COLUMNS FROM `{$safe}` LIKE 'units'");
            if (mysqli_num_rows($colCheck) === 0) {
                mysqli_query($consub, "ALTER TABLE `{$safe}` ADD COLUMN units LONGTEXT DEFAULT '[]'");
                $stmt = mysqli_prepare($consub, "UPDATE `{$safe}` SET units = ? WHERE id = ?");
            }
        }
        if (!$stmt) {
            $error = mysqli_error($consub);
            respond(false, "Failed to prepare update for table '{$safe}': {$error}");
        }
        mysqli_stmt_bind_param($stmt, 'si', $unitsJson, $subjectId);
        if (!mysqli_stmt_execute($stmt)) {
            respond(false, 'Failed to update units: ' . mysqli_stmt_error($stmt));
        }
        mysqli_stmt_close($stmt);
        respond(true, 'Units updated', ['table' => $table, 'subject_id' => $subjectId]);
    } elseif ($action === 'toggle_units_support') {
        $table = isset($input['table']) ? $input['table'] : '';
        $subjectId = isset($input['subject_id']) ? intval($input['subject_id']) : 0;
        $hasUnits = isset($input['has_units']) ? intval($input['has_units']) : 1;
        
        if ($table === '' || $subjectId <= 0) {
            respond(false, 'table and valid subject_id are required');
        }
        
        global $consub;
        $safe = mysqli_real_escape_string($consub, $table);
        
        // Ensure column exists first
        $colCheck = mysqli_query($consub, "SHOW COLUMNS FROM `{$safe}` LIKE 'has_units'");
        if (mysqli_num_rows($colCheck) === 0) {
            mysqli_query($consub, "ALTER TABLE `{$safe}` ADD COLUMN has_units TINYINT(1) DEFAULT 1");
        }
        
        $stmt = mysqli_prepare($consub, "UPDATE `{$safe}` SET has_units = ? WHERE id = ?");
        if (!$stmt) {
            respond(false, 'Failed to prepare toggle update: ' . mysqli_error($consub));
        }
        
        mysqli_stmt_bind_param($stmt, 'ii', $hasUnits, $subjectId);
        if (!mysqli_stmt_execute($stmt)) {
            respond(false, 'Failed to toggle unit support: ' . mysqli_stmt_error($stmt));
        }
        mysqli_stmt_close($stmt);
        respond(true, 'Unit support toggled', ['has_units' => $hasUnits]);
    } elseif ($action === 'add_exam') {
        $examName = isset($input['exam_name']) ? trim($input['exam_name']) : '';
        if ($examName === '') {
            respond(false, 'exam_name is required');
        }
        global $con;
        $stmt = mysqli_prepare($con, "INSERT INTO competitive_exams (exam_name) VALUES (?)");
        if (!$stmt) {
            respond(false, 'Failed to prepare insert');
        }
        mysqli_stmt_bind_param($stmt, 's', $examName);
        if (!mysqli_stmt_execute($stmt)) {
            respond(false, 'Failed to add competitive exam');
        }
        mysqli_stmt_close($stmt);
        respond(true, 'Competitive exam added');
    } elseif ($action === 'delete_exam') {
        $examId = isset($input['exam_id']) ? intval($input['exam_id']) : 0;
        if ($examId <= 0) {
            respond(false, 'Valid exam_id is required');
        }
        global $con;
        $stmt = mysqli_prepare($con, "DELETE FROM competitive_exams WHERE id = ?");
        if (!$stmt) {
            respond(false, 'Failed to prepare delete');
        }
        mysqli_stmt_bind_param($stmt, 'i', $examId);
        if (!mysqli_stmt_execute($stmt)) {
            respond(false, 'Failed to delete competitive exam');
        }
        mysqli_stmt_close($stmt);
        respond(true, 'Competitive exam deleted');
    } else {
        // Handle unknown or empty action
        respond(false, 'Unknown or missing action parameter');
    }
} else {
    respond(false, 'Invalid request method');
}
?>