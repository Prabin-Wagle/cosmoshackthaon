<?php
include('../db.php');
include('../jwt.php');

header('Content-Type:application/json');

// --- CORS ---
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = ['http://localhost:5173', 'http://localhost:3000', 'https://notelibraryapp.com', 'https://student.notelibraryapp.com'];
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: https://notelibraryapp.com');
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit();
}

// --- Auth ---
$headers = apache_request_headers();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
if (empty($authHeader) && isset($headers['authorization'])) $authHeader = $headers['authorization'];

$payload = null;
if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $payload = validateJWT($matches[1]);
}

if (!$payload) {
    echo json_encode(['status' => 'false', 'message' => 'Unauthorized']);
    exit();
}

$user_id = $payload['user_id'];

$is_practice = isset($_GET['mode']) && $_GET['mode'] === 'practice';
$session_questions = [];

// --- Ensure Tables Exist ---
$conPrem->query("CREATE TABLE IF NOT EXISTS quiz_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    quiz_id INT NOT NULL,
    quiz_json MEDIUMTEXT NOT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_session_user (session_id, user_id),
    INDEX idx_user_quiz (user_id, quiz_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// If it's already LONGTEXT, let's try to alter it to MEDIUMTEXT to avoid the 4GiB memory bug on some PHP versions
$conPrem->query("ALTER TABLE quiz_sessions MODIFY COLUMN quiz_json MEDIUMTEXT NOT NULL");

$conPrem->query("CREATE TABLE IF NOT EXISTS user_mistakes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    quiz_id INT NOT NULL,
    question_index INT NOT NULL,
    marks FLOAT DEFAULT 1,
    unit_id VARCHAR(255) DEFAULT NULL,
    incorrect_count INT DEFAULT 1,
    last_attempted TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, quiz_id, question_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$conPrem->query("CREATE TABLE IF NOT EXISTS user_bookmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    quiz_id INT NOT NULL,
    question_index INT NOT NULL,
    marks FLOAT DEFAULT 1,
    unit_id VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, quiz_id, question_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// --- Get Latest 3 Attempted Quiz IDs ---
$latestQuizIds = [];
$latestQuery = "SELECT DISTINCT quiz_id FROM quiz_attempts WHERE user_id = ? ORDER BY attempt_date DESC LIMIT 3";
$lStmt = $conPrem->prepare($latestQuery);
if ($lStmt) {
    $lStmt->bind_param("i", $user_id);
    $lStmt->execute();
    $lStmt->bind_result($lQuizId);
    while ($lStmt->fetch()) {
        $latestQuizIds[] = $lQuizId;
    }
    $lStmt->close();
}

// --- Fetch Wrong Questions ---
$wrongQuery = "SELECT um.id, um.quiz_id, um.question_index, um.marks, um.unit_id, ts.quiz_title, ts.quiz_json 
               FROM user_mistakes um 
               JOIN test_series ts ON um.quiz_id = ts.id 
               WHERE um.user_id = ?";
$wrongStmt = $conPrem->prepare($wrongQuery);
$wrongItems = [];

if ($wrongStmt) {
    $wrongStmt->bind_param("i", $user_id);
    $wrongStmt->execute();
    $wrongStmt->store_result();
    $wrongStmt->bind_result($id, $qId, $qIdx, $marks, $unitId, $qTitle, $rawJson);
    
    while ($wrongStmt->fetch()) {
        $quizData = [];
        $decoded = base64_decode($rawJson, true);
        if ($decoded !== false) {
            $quizData = json_decode($decoded, true);
        } else {
            $quizData = json_decode($rawJson, true);
        }
        
        $question = (is_array($quizData) && isset($quizData[$qIdx])) ? $quizData[$qIdx] : null;
        
        if ($question) {
            // Normalize question key
            if (!isset($question['question']) && isset($question['questionText'])) {
                $question['question'] = $question['questionText'];
            }
            
            $pool_index = count($session_questions);
            $session_questions[] = $question;

            $item = [
                'id' => $id,
                'type' => 'wrong',
                'quiz_id' => $qId,
                'quiz_title' => $qTitle,
                'question_index' => $qIdx,
                'originalIndex' => $pool_index,
                'marks' => floatval($marks ?? 1),
                'unit_id' => $unitId ?? 'Uncategorized',
                'question' => $question,
                'is_latest_set' => in_array($qId, $latestQuizIds)
            ];

            if ($is_practice) {
                unset($item['question']['correctOption']);
                unset($item['question']['explanation']);
            }
            
            $wrongItems[] = $item;
        }
    }
    $wrongStmt->close();
}

// --- Fetch Bookmarked Questions ---
$bookmarkQuery = "SELECT ub.id, ub.quiz_id, ub.question_index, ub.marks, ub.unit_id, ts.quiz_title, ts.quiz_json 
                  FROM user_bookmarks ub 
                  JOIN test_series ts ON ub.quiz_id = ts.id 
                  WHERE ub.user_id = ?";
$bookmarkStmt = $conPrem->prepare($bookmarkQuery);
$bookmarkItems = [];

if ($bookmarkStmt) {
    $bookmarkStmt->bind_param("i", $user_id);
    $bookmarkStmt->execute();
    $bookmarkStmt->store_result();
    $bookmarkStmt->bind_result($id, $qId, $qIdx, $marks, $unitId, $qTitle, $rawJson);
    
    while ($bookmarkStmt->fetch()) {
        $quizData = [];
        $decoded = base64_decode($rawJson, true);
        if ($decoded !== false) {
            $quizData = json_decode($decoded, true);
        } else {
            $quizData = json_decode($rawJson, true);
        }
        
        $question = (is_array($quizData) && isset($quizData[$qIdx])) ? $quizData[$qIdx] : null;
        
        if ($question) {
            // Normalize question key
            if (!isset($question['question']) && isset($question['questionText'])) {
                $question['question'] = $question['questionText'];
            }
            
            $pool_index = count($session_questions);
            $session_questions[] = $question;

            $item = [
                'id' => $id,
                'type' => 'bookmarked',
                'quiz_id' => $qId,
                'quiz_title' => $qTitle,
                'question_index' => $qIdx,
                'originalIndex' => $pool_index,
                'marks' => floatval($marks ?? 1),
                'unit_id' => $unitId ?? 'Uncategorized',
                'question' => $question
            ];

            if ($is_practice) {
                unset($item['question']['correctOption']);
                unset($item['question']['explanation']);
            }
            
            $bookmarkItems[] = $item;
        }
    }
    $bookmarkStmt->close();
}

// --- Calculate Analytics ---
$analytics = [
    'total_wrong' => count($wrongItems),
    'total_bookmarked' => count($bookmarkItems),
    'by_unit' => [],
    'by_marks' => []
];

foreach ($wrongItems as $item) {
    $unit = $item['unit_id'];
    $marks = strval($item['marks']);
    
    if (!isset($analytics['by_unit'][$unit])) {
        $analytics['by_unit'][$unit] = ['wrong' => 0, 'bookmarked' => 0];
    }
    $analytics['by_unit'][$unit]['wrong']++;
    
    if (!isset($analytics['by_marks'][$marks])) {
        $analytics['by_marks'][$marks] = ['wrong' => 0, 'bookmarked' => 0];
    }
    $analytics['by_marks'][$marks]['wrong']++;
}

foreach ($bookmarkItems as $item) {
    $unit = $item['unit_id'];
    $marks = strval($item['marks']);
    
    if (!isset($analytics['by_unit'][$unit])) {
        $analytics['by_unit'][$unit] = ['wrong' => 0, 'bookmarked' => 0];
    }
    $analytics['by_unit'][$unit]['bookmarked']++;
    
    if (!isset($analytics['by_marks'][$marks])) {
        $analytics['by_marks'][$marks] = ['wrong' => 0, 'bookmarked' => 0];
    }
    $analytics['by_marks'][$marks]['bookmarked']++;
}

$quiz_session_id = '';
if ($is_practice && !empty($session_questions)) {
    $quiz_session_id = bin2hex(random_bytes(16));
    $sess_json = json_encode($session_questions);
    $pool_id = 0;
    
    $sessQuery = "INSERT INTO quiz_sessions (session_id, user_id, quiz_id, quiz_json, created_at) VALUES (?, ?, ?, ?, NOW())";
    $sessStmt = $conPrem->prepare($sessQuery);
    if ($sessStmt) {
        $sessStmt->bind_param("siis", $quiz_session_id, $user_id, $pool_id, $sess_json);
        $sessStmt->execute();
        $sessStmt->close();
    }
}

echo json_encode([
    'status' => 'true',
    'wrong' => $wrongItems,
    'bookmarked' => $bookmarkItems,
    'analytics' => $analytics,
    'quiz_session_id' => $quiz_session_id
]);
?>
