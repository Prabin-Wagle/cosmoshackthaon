<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../db.php';
require_once '../jwt.php';

// Auth check
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No token provided']);
    exit;
}
$token = $matches[1];
$payload = validateJWT($token);
if (!$payload || !isset($payload['role']) || $payload['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access denied']);
    exit;
}

$action = $_GET['action'] ?? '';

// Helper to sanitize unit name to table suffix
function getTableSuffix($unit) {
     $suffix = strtolower(str_replace('UNIT_', '', $unit));
     return preg_replace('/[^a-z0-9_]/', '', $suffix);
}

// Helper to get Table Name
function getTableName($unit) {
    return "qb_" . getTableSuffix($unit);
}

if ($action === 'list_units') {
    // List all tables starting with qb_
    $result = mysqli_query($conPrem, "SHOW TABLES LIKE 'qb_%'");
    $units = [];
    while ($row = mysqli_fetch_array($result)) {
        $tableName = $row[0];
        // Convert qb_physics -> Physics
        $unitName = ucfirst(str_replace('qb_', '', $tableName));
        $units[] = ['id' => $tableName, 'name' => $unitName];
    }
    echo json_encode(['success' => true, 'data' => $units]);
    exit;
}

if ($action === 'list_questions') {
    $unit = $_GET['unit'] ?? '';
    if (empty($unit)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Unit is required']);
        exit;
    }
    
    $tableName = $unit; // The frontend should pass the actual table name 'qb_physics' or we map it. 
    // Let's assume frontend passes 'qb_physics' as 'id' from list_units, or a unit name.
    // If it passes 'Physics', we need to convert. Let's make frontend pass the full table name or suffix.
    // Let's assume input is the table name for simplicity and security check.
    
    // Security check: must start with qb_ and be alphanumeric
    if (!preg_match('/^qb_[a-z0-9_]+$/', $tableName)) {
         // Try to convert if it's just "Physics"
         $tableName = "qb_" . strtolower($tableName);
    }
    
    // Verify table exists just in case
    $check = mysqli_query($conPrem, "SHOW TABLES LIKE '$tableName'");
    if (mysqli_num_rows($check) == 0) {
        // Table doesn't exist, maybe empty list
        echo json_encode(['success' => true, 'data' => []]);
        exit;
    }

    $sql = "SELECT * FROM $tableName ORDER BY created_at DESC";
    $result = mysqli_query($conPrem, $sql);
    $questions = [];
    while ($row = mysqli_fetch_assoc($result)) {
        // Decode options
        $row['options'] = json_decode($row['options']);
        $questions[] = $row;
    }
    echo json_encode(['success' => true, 'data' => $questions]);
    exit;
}

if ($action === 'generate_random_set') {
    // Input: { "config": { "Physics": 5, "Chemistry": 5 } }
    $input = json_decode(file_get_contents('php://input'), true);
    $config = $input['config'] ?? [];

    if (empty($config)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Configuration is required']);
        exit;
    }

    $finalQuestions = [];
    $currentQNo = 1;

    foreach ($config as $unitName => $count) {
        $count = intval($count);
        if ($count <= 0) continue;

        $tableName = "qb_" . getTableSuffix($unitName);
        
        // precise table check
        $check = mysqli_query($conPrem, "SHOW TABLES LIKE '$tableName'");
        if (mysqli_num_rows($check) == 0) continue;

        // Random Selection
        $sql = "SELECT * FROM $tableName ORDER BY RAND() LIMIT $count";
        $result = mysqli_query($conPrem, $sql);
        
        while ($row = mysqli_fetch_assoc($result)) {
            $q = [
                'questionId' => $row['question_uid'],
                'questionNo' => $currentQNo++,
                'questionText' => $row['question_text'], // Map back to frontend expected key
                'imageLink' => $row['image_link'],
                'options' => json_decode($row['options']),
                'correctOption' => intval($row['correct_option']),
                'marks' => floatval($row['marks']),
                'unitId' => 'UNIT_' . strtoupper($unitName), // Re-construct unitId if needed, or user can edit
                'chapterId' => 'CH_' . strtoupper($row['chapter']),
                'explanation' => $row['explanation']
            ];
            $finalQuestions[] = $q;
        }
    }

    echo json_encode(['success' => true, 'data' => $finalQuestions]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Add or Update Question
    $input = json_decode(file_get_contents('php://input'), true);
    
    $unit = $input['unit'] ?? '';
    if (empty($unit)) {
         http_response_code(400);
         echo json_encode(['success' => false, 'message' => 'Unit is required']);
         exit;
    }

    $tableName = "qb_" . getTableSuffix($unit);
    
    // Create table if not exists (for new units)
     $createTableSql = "CREATE TABLE IF NOT EXISTS $tableName (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question_uid VARCHAR(255) UNIQUE NOT NULL,
        chapter VARCHAR(100),
        question_text MEDIUMTEXT,
        options JSON,
        correct_option INT,
        marks DOUBLE,
        explanation MEDIUMTEXT,
        image_link TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (chapter)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    mysqli_query($conPrem, $createTableSql);

    $id = isset($input['id']) ? intval($input['id']) : 0;
    
    // Fields
    $questionId = $input['questionId'] ?? ('Q_' . uniqid());
    $chapter = $input['chapter'] ?? '';
    // If user provides "CH_WAVES", clean it
    $chapter = str_replace('CH_', '', $chapter);
    
    $text = $input['questionText'] ?? '';
    $options = json_encode($input['options'] ?? [], JSON_UNESCAPED_UNICODE);
    $correct = intval($input['correctOption'] ?? 0);
    $marks = floatval($input['marks'] ?? 1);
    $explanation = $input['explanation'] ?? '';
    $image = $input['imageLink'] ?? null;
    
    $qIdStr = mysqli_real_escape_string($conPrem, $questionId);
    $chapterStr = mysqli_real_escape_string($conPrem, $chapter);
    $textStr = mysqli_real_escape_string($conPrem, $text);
    $optionsStr = mysqli_real_escape_string($conPrem, $options);
    $explStr = mysqli_real_escape_string($conPrem, $explanation);
    $imgStr = $image ? "'" . mysqli_real_escape_string($conPrem, $image) . "'" : "NULL";

    if ($id > 0) {
        // Update by ID (Primary Key)
        $sql = "UPDATE $tableName SET 
                question_uid = '$qIdStr',
                chapter = '$chapterStr',
                question_text = '$textStr',
                options = '$optionsStr',
                correct_option = $correct,
                marks = $marks,
                explanation = '$explStr',
                image_link = $imgStr,
                updated_at = NOW()
                WHERE id = $id";
                
        if (mysqli_query($conPrem, $sql)) {
            echo json_encode(['success' => true, 'message' => 'Question updated successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => mysqli_error($conPrem)]);
        }
    } else {
        // Create
        // Need to check duplicate question_uid
        $check = mysqli_query($conPrem, "SELECT id FROM $tableName WHERE question_uid = '$qIdStr'");
        if (mysqli_num_rows($check) > 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Duplicate Question ID']);
            exit;
        }

        $sql = "INSERT INTO $tableName 
                (question_uid, chapter, question_text, options, correct_option, marks, explanation, image_link)
                VALUES ('$qIdStr', '$chapterStr', '$textStr', '$optionsStr', $correct, $marks, '$explStr', $imgStr)";
                
        if (mysqli_query($conPrem, $sql)) {
            echo json_encode(['success' => true, 'message' => 'Question added successfully', 'id' => mysqli_insert_id($conPrem)]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => mysqli_error($conPrem)]);
        }
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $unit = $_GET['unit'] ?? '';
    $id = intval($_GET['id'] ?? 0);
    
    if (empty($unit) || $id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Unit and ID are required']);
        exit;
    }
    
    $tableName = $unit;
    if (!preg_match('/^qb_[a-z0-9_]+$/', $tableName)) {
         $tableName = "qb_" . strtolower($tableName);
    }
    
    // Check exist
    $check = mysqli_query($conPrem, "SHOW TABLES LIKE '$tableName'");
    if (mysqli_num_rows($check) == 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Unit table not found']);
        exit;
    }
    
    $sql = "DELETE FROM $tableName WHERE id = $id";
    if (mysqli_query($conPrem, $sql)) {
        echo json_encode(['success' => true, 'message' => 'Question deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => mysqli_error($conPrem)]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
?>
