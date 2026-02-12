<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../db.php';
require_once '../jwt.php';

requireAdminAuth();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getTestSeries($conPrem);
        break;
    case 'POST':
        createTestSeries($conPrem);
        break;
    case 'PUT':
        updateTestSeries($conPrem);
        break;
    case 'DELETE':
        deleteTestSeries($conPrem);
        break;
    default:
        respondJson(['success' => false, 'message' => 'Method not allowed'], 405);
}

function respondJson($payload, $code = 200) {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

function requireAdminAuth() {
    $authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        respondJson(['success' => false, 'message' => 'No token provided'], 401);
    }
    $token = $matches[1];
    $payload = validateJWT($token);
    if (!$payload || !isset($payload['role']) || $payload['role'] !== 'admin') {
        respondJson(['success' => false, 'message' => 'Access denied'], 403);
    }
    return $payload;
}

function fetchCollection($conPrem, $collectionId) {
    $collectionId = intval($collectionId);
    if ($collectionId <= 0) {
        respondJson(['success' => false, 'message' => 'collection_id is required'], 400);
    }

    $result = mysqli_query(
        $conPrem,
        "SELECT id, title, competitive_exam FROM test_series_collections WHERE id = $collectionId LIMIT 1"
    );

    if (!$result || mysqli_num_rows($result) === 0) {
        respondJson(['success' => false, 'message' => 'Collection not found'], 404);
    }

    return mysqli_fetch_assoc($result);
}

function normalizeQuizJson($payload) {
    if (is_array($payload)) {
        // Standardize keys (questionText -> question)
        foreach ($payload as &$q) {
            if (isset($q['questionText']) && !isset($q['question'])) {
                $q['question'] = $q['questionText'];
            }
        }
        $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE);
        if ($encoded === false) {
            respondJson(['success' => false, 'message' => 'Unable to encode quiz_json'], 400);
        }
        return base64_encode($encoded);
    }

    if (is_string($payload)) {
        $trimmed = trim($payload);
        // Try to decode to ensure it is valid JSON
        $decoded = json_decode($trimmed, true);
        if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
             respondJson(['success' => false, 'message' => 'quiz_json must be valid JSON'], 400);
        }
        $reencoded = json_encode($decoded, JSON_UNESCAPED_UNICODE);
        if ($reencoded === false) {
             respondJson(['success' => false, 'message' => 'Unable to encode quiz_json'], 400);
        }
        return base64_encode($reencoded);
    }

    respondJson(['success' => false, 'message' => 'quiz_json must be an array or JSON string'], 400);
}

function normalizeMode($value) {
    $mode = strtoupper(trim($value ?? ''));
    return in_array($mode, ['LIVE', 'NORMAL'], true) ? $mode : '';
}

function normalizeDateTime($value, $fieldName) {
    if ($value === null || $value === '') {
        return null;
    }
    $timestamp = strtotime($value);
    if ($timestamp === false) {
        respondJson(['success' => false, 'message' => "Invalid datetime for $fieldName"], 400);
    }
    return date('Y-m-d H:i:s', $timestamp);
}

function getTestSeries($conPrem) {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $collectionId = isset($_GET['collection_id']) ? intval($_GET['collection_id']) : 0;

    $conditions = [];
    if ($id > 0) {
        $conditions[] = "ts.id = $id";
    }
    if ($collectionId > 0) {
        $conditions[] = "ts.collection_id = $collectionId";
    }

    $sql = "SELECT ts.*, c.title AS collection_title, c.competitive_exam AS collection_exam
            FROM test_series ts
            LEFT JOIN test_series_collections c ON ts.collection_id = c.id";

    if (!empty($conditions)) {
        $sql .= ' WHERE ' . implode(' AND ', $conditions);
    }

    $sql .= ' ORDER BY ts.created_at DESC';

    $result = mysqli_query($conPrem, $sql);
    if (!$result) {
        respondJson(['success' => false, 'message' => mysqli_error($conPrem)], 500);
    }

    $rows = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $row['time_limit'] = intval($row['time_limit']);
        $row['negative_marking'] = floatval($row['negative_marking']);
        // $row['quiz_json'] = json_decode($row['quiz_json'], true); // Do NOT decode here. Return raw string (Base64).
        $rows[] = $row;
    }

    respondJson(['success' => true, 'data' => $rows]);
}

function createTestSeries($conPrem) {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        respondJson(['success' => false, 'message' => 'Invalid JSON body'], 400);
    }

    $collection = fetchCollection($conPrem, $data['collection_id'] ?? 0);

    $title = trim($data['quiz_title'] ?? '');
    $timeLimit = intval($data['time_limit'] ?? 0);
    $negative = isset($data['negative_marking']) ? floatval($data['negative_marking']) : 0;
    $mode = normalizeMode($data['mode'] ?? 'NORMAL');
    $startTime = normalizeDateTime($data['start_time'] ?? null, 'start_time');
    $endTime = normalizeDateTime($data['end_time'] ?? null, 'end_time');
    $quizJsonInput = $data['quiz_json'] ?? [];
    $quizJsonString = normalizeQuizJson($quizJsonInput);

    // Calculate metadata
    $totalQuestions = 0;
    $totalMarks = 0;
    if (is_array($quizJsonInput)) {
        $totalQuestions = count($quizJsonInput);
        foreach ($quizJsonInput as $q) {
            $totalMarks += floatval($q['marks'] ?? 0);
        }
    } else if (is_string($quizJsonInput)) {
        $decoded = json_decode($quizJsonInput, true);
        if (is_array($decoded)) {
            $totalQuestions = count($decoded);
            foreach ($decoded as $q) {
                $totalMarks += floatval($q['marks'] ?? 0);
            }
        }
    }
    
    $published = isset($data['published']) ? intval($data['published']) : 1;

    if ($title === '' || $timeLimit <= 0 || $mode === '') {
        respondJson(['success' => false, 'message' => 'quiz_title, time_limit and mode are required'], 400);
    }

    if ($mode === 'LIVE') {
        if (!$startTime || !$endTime) {
            respondJson(['success' => false, 'message' => 'start_time and end_time are required for LIVE mode'], 400);
        }
        if ($startTime >= $endTime) {
            respondJson(['success' => false, 'message' => 'end_time must be after start_time'], 400);
        }
    } else {
        $startTime = null;
        $endTime = null;
    }

    $seriesUid = 'ts-' . round(microtime(true) * 1000);

    $titleEscaped = mysqli_real_escape_string($conPrem, $title);
    $quizJsonEscaped = mysqli_real_escape_string($conPrem, $quizJsonString);
    $modeEscaped = mysqli_real_escape_string($conPrem, $mode);
    $startValue = $startTime ? "'" . mysqli_real_escape_string($conPrem, $startTime) . "'" : "NULL";
    $endValue = $endTime ? "'" . mysqli_real_escape_string($conPrem, $endTime) . "'" : "NULL";

    $sql = "INSERT INTO test_series
            (series_uid, collection_id, quiz_title, competitive_exam, time_limit, negative_marking, mode, start_time, end_time, quiz_json, total_questions, total_marks, published, created_at, updated_at)
            VALUES (
                '$seriesUid',
                {$collection['id']},
                '$titleEscaped',
                '{$collection['competitive_exam']}',
                $timeLimit,
                $negative,
                '$modeEscaped',
                $startValue,
                $endValue,
                '$quizJsonEscaped',
                $totalQuestions,
                $totalMarks,
                $published,
                NOW(),
                NOW()
            )";

    if (mysqli_query($conPrem, $sql)) {
        // Sync questions to global bank
        // logic for quizJsonString is base64 encoded, but syncQuestionsToBank handles base64 string or array.
        // We passed $quizJsonString (base64) to DB. But we also have raw $data['quiz_json'] which might be array or string.
        // Let's pass $data['quiz_json'] directly.
        syncQuestionsToBank($conPrem, $data['quiz_json'] ?? []);

        respondJson([
            'success' => true,
            'id' => mysqli_insert_id($conPrem),
            'series_uid' => $seriesUid,
            'message' => 'Test series created successfully'
        ], 201);
    }

    respondJson(['success' => false, 'message' => mysqli_error($conPrem)], 500);
}

function updateTestSeries($conPrem) {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data) || empty($data['id'])) {
        respondJson(['success' => false, 'message' => 'id and payload are required'], 400);
    }

    $id = intval($data['id']);
    if ($id <= 0) {
        respondJson(['success' => false, 'message' => 'Invalid id'], 400);
    }

    $existingResult = mysqli_query($conPrem, "SELECT * FROM test_series WHERE id = $id LIMIT 1");
    if (!$existingResult || mysqli_num_rows($existingResult) === 0) {
        respondJson(['success' => false, 'message' => 'Test series not found'], 404);
    }
    $existing = mysqli_fetch_assoc($existingResult);

    $collectionId = isset($data['collection_id']) ? intval($data['collection_id']) : intval($existing['collection_id']);
    $collection = fetchCollection($conPrem, $collectionId);

    $title = trim($data['quiz_title'] ?? $existing['quiz_title']);
    $timeLimit = isset($data['time_limit']) ? intval($data['time_limit']) : intval($existing['time_limit']);
    $negative = isset($data['negative_marking']) ? floatval($data['negative_marking']) : floatval($existing['negative_marking']);
    $mode = isset($data['mode']) ? normalizeMode($data['mode']) : $existing['mode'];
    $startTimeInput = array_key_exists('start_time', $data) ? $data['start_time'] : $existing['start_time'];
    $endTimeInput = array_key_exists('end_time', $data) ? $data['end_time'] : $existing['end_time'];
    // For modification, if quiz_json is NOT provided, we use the existing one.
    // The existing one is already Base64 encoded in DB.
    // However, normalizeQuizJson now expects array or JSON string.
    // If we pass the existing Base64 string to normalizeQuizJson, it might not work if it tries to json_decode it.
    // Let's handle this.

    $quizJsonInput = null;
    if (array_key_exists('quiz_json', $data)) {
         $quizJsonInput = $data['quiz_json'];
         $quizJsonString = normalizeQuizJson($quizJsonInput);
    } else {
         // Keep existing (already encoded)
         $quizJsonString = $existing['quiz_json'];
         $decoded = base64_decode($quizJsonString, true);
         if ($decoded !== false) {
             $quizJsonInput = json_decode($decoded, true);
         } else {
             $quizJsonInput = json_decode($quizJsonString, true);
         }
    }

    // Calculate metadata
    $totalQuestions = 0;
    $totalMarks = 0;
    if (is_array($quizJsonInput)) {
        $totalQuestions = count($quizJsonInput);
        foreach ($quizJsonInput as $q) {
            $totalMarks += floatval($q['marks'] ?? 0);
        }
    }
    
    $published = array_key_exists('published', $data) ? intval($data['published']) : intval($existing['published'] ?? 1);

    if ($title === '' || $timeLimit <= 0 || $mode === '') {
        respondJson(['success' => false, 'message' => 'quiz_title, time_limit and mode are required'], 400);
    }

    $startTime = normalizeDateTime($startTimeInput, 'start_time');
    $endTime = normalizeDateTime($endTimeInput, 'end_time');

    if ($mode === 'LIVE') {
        if (!$startTime || !$endTime) {
            respondJson(['success' => false, 'message' => 'start_time and end_time are required for LIVE mode'], 400);
        }
        if ($startTime >= $endTime) {
            respondJson(['success' => false, 'message' => 'end_time must be after start_time'], 400);
        }
    } else {
        $startTime = null;
        $endTime = null;
    }

    $titleEscaped = mysqli_real_escape_string($conPrem, $title);
    $quizJsonEscaped = mysqli_real_escape_string($conPrem, $quizJsonString);
    $modeEscaped = mysqli_real_escape_string($conPrem, $mode);
    $startValue = $startTime ? "'" . mysqli_real_escape_string($conPrem, $startTime) . "'" : "NULL";
    $endValue = $endTime ? "'" . mysqli_real_escape_string($conPrem, $endTime) . "'" : "NULL";

    $sql = "UPDATE test_series
            SET collection_id = {$collection['id']},
                quiz_title = '$titleEscaped',
                competitive_exam = '{$collection['competitive_exam']}',
                time_limit = $timeLimit,
                negative_marking = $negative,
                mode = '$modeEscaped',
                start_time = $startValue,
                end_time = $endValue,
                quiz_json = '$quizJsonEscaped',
                total_questions = $totalQuestions,
                total_marks = $totalMarks,
                published = $published,
                updated_at = NOW()
            WHERE id = $id";

    if (mysqli_query($conPrem, $sql)) {
        // Sync questions to global bank
        // If quiz_json was updated, $data['quiz_json'] is set. 
        // If not, $existing['quiz_json'] was used.
        $jsonPayloadForSync = array_key_exists('quiz_json', $data) ? $data['quiz_json'] : $existing['quiz_json'];
        syncQuestionsToBank($conPrem, $jsonPayloadForSync);

        respondJson(['success' => true, 'message' => 'Test series updated successfully']);
    }

    respondJson(['success' => false, 'message' => mysqli_error($conPrem)], 500);
}

function deleteTestSeries($conPrem) {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if ($id <= 0) {
        respondJson(['success' => false, 'message' => 'Invalid id'], 400);
    }

    $stmt = mysqli_prepare($conPrem, "DELETE FROM test_series WHERE id = ?");
    if (!$stmt) {
        respondJson(['success' => false, 'message' => mysqli_error($conPrem)], 500);
    }

    mysqli_stmt_bind_param($stmt, 'i', $id);
    $ok = mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    if ($ok) {
        // Sync questions to the global question bank
        // For delete, we might NOT want to delete from bank, so we do nothing.
        respondJson(['success' => true, 'message' => 'Test series deleted successfully']);
    }

    respondJson(['success' => false, 'message' => mysqli_error($conPrem)], 500);
}

require_once 'bankHelper.php';
?>

