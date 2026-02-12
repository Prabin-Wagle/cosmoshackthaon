<?php
include('../db.php');
include('../jwt.php');
header('Content-Type:application/json');

// --- CORS ---
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = ['http://localhost:5173', 'http://localhost:3000', 'https://notelibraryapp.com'];
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: https://notelibraryapp.com');
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. Validate Token
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['status' => 'false', 'message' => 'Unauthorized']);
    exit();
}

$token = $matches[1];
$payload = validateJWT($token);
if (!$payload || !isset($payload['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'false', 'message' => 'Invalid token']);
    exit();
}

$attempt_id = isset($_GET['attempt_id']) ? intval($_GET['attempt_id']) : 0;

if ($attempt_id <= 0) {
    echo json_encode(['status' => 'false', 'message' => 'Invalid Attempt ID']);
    exit();
}

// 2. Fetch Summary First
$summaryQuery = "SELECT id, quiz_id, attempt_number, score, total_questions, correct_count, incorrect_count, attempt_date, attempt_json, analytics_json 
                 FROM quiz_attempts 
                 WHERE id = ?";
$sStmt = $conPrem->prepare($summaryQuery);

if (!$sStmt) {
    echo json_encode(['status' => 'false', 'message' => 'Database error: ' . $conPrem->error . '. Please ensure you have run the manual SQL migration.']);
    exit();
}
$sStmt->bind_param("i", $attempt_id);
$sStmt->execute();
$sStmt->store_result();
$sStmt->bind_result($a_id, $q_id, $a_num, $sc, $t_q, $c_c, $i_c, $a_d, $at_j, $an_j);

if (!$sStmt->fetch()) {
    echo json_encode(['status' => 'false', 'message' => 'Attempt not found']);
    exit();
}

$summary = [
    'id' => $a_id,
    'quiz_id' => $q_id,
    'attempt_number' => $a_num,
    'score' => $sc,
    'total_questions' => $t_q,
    'correct_count' => $c_c,
    'incorrect_count' => $i_c,
    'attempt_date' => $a_d,
    'attempt_json' => json_decode($at_j, true),
    'analytics_json' => json_decode($an_j, true)
];
$sStmt->close();

// 3. Fetch Details
$query = "SELECT question_index, selected_option, is_bookmarked, is_correct, time_spent 
          FROM quiz_attempt_details 
          WHERE attempt_id = ? 
          ORDER BY question_index ASC";
$stmt = $conPrem->prepare($query);
$stmt->bind_param("i", $attempt_id);
$stmt->execute();
$stmt->bind_result($q_idx, $s_opt, $i_bmk, $i_cor, $t_spent);

$details = [];
while ($stmt->fetch()) {
    $details[] = [
        'question_index' => $q_idx,
        'selected_option' => $s_opt,
        'is_bookmarked' => $i_bmk == 1,
        'is_correct' => $i_cor == 1,
        'time_spent' => $t_spent
    ];
}

// --- Encryption Helper ---
define('ENCRYPTION_KEY', 'NoteLibrarySecur3_2026_SecretKey');
define('ENCRYPTION_IV', '1234567890123456');

function encryptData($data) {
    $json = json_encode($data);
    return openssl_encrypt($json, 'aes-256-cbc', ENCRYPTION_KEY, 0, ENCRYPTION_IV);
}

// Construct the full data object
$fullData = [
    'summary' => $summary,
    'details' => $details
];

// Encrypt the entire data payload
$encryptedPayload = encryptData($fullData);

echo json_encode([
    'status' => 'true', 
    'encrypted' => true,
    'payload' => $encryptedPayload
]);

$stmt->close();
?>
