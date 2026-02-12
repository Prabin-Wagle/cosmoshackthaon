<?php
include '../db.php';
include '../jwt.php';
include '../cors.php';

header('Content-Type: application/json');

// 1. Validate Token
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    die(json_encode(['status' => 'false', 'message' => 'Unauthorized']));
}

$payload = validateJWT($matches[1]);
if (!$payload || !isset($payload['user_id'])) {
    http_response_code(401);
    die(json_encode(['status' => 'false', 'message' => 'Invalid token']));
}

$user_id = $payload['user_id'];
$today = date('Y-m-d');

// 2. Update and Get Streak (Auto-update on app entry/dashboard load)
include 'streak_helper.php';
$streak = updateStreak($conUser, $user_id);

// 3. Count completed targets for today
$targetQuery = "SELECT COUNT(*) as completed FROM notelibr_Users.study_targets WHERE user_id = '$user_id' AND is_completed = 1 AND target_date = '$today'";
$resTarget = mysqli_query($conUser, $targetQuery);
$completedCount = ($resTarget) ? (int)mysqli_fetch_assoc($resTarget)['completed'] : 0;

date_default_timezone_set('Asia/Kathmandu');
$now = date('Y-m-d H:i:s');

// 4. Get Upcoming or Active LIVE Quizzes
$activeQuizzes = [];
$upQuery = "SELECT id, quiz_title, start_time, end_time, mode FROM notelibr_Premium.test_series 
            WHERE collection_id IN (SELECT collection_id FROM notelibr_Premium.user_series_access WHERE user_id = '$user_id')
            AND mode = 'LIVE'
            AND end_time >= '$now'
            ORDER BY 
                CASE WHEN '$now' BETWEEN start_time AND end_time THEN 1
                     ELSE 2 END,
                start_time ASC";
$resUp = mysqli_query($conPrem, $upQuery);

if ($resUp) {
    while ($u = mysqli_fetch_assoc($resUp)) {
        $activeQuizzes[] = [
            'id' => (int)$u['id'],
            'title' => $u['quiz_title'],
            'start_time' => $u['start_time'], 
            'end_time' => $u['end_time'],
            'mode' => $u['mode']
        ];
    }
}

echo json_encode([
    'status' => 'success',
    'completedTargets' => $completedCount,
    'streak' => $streak,
    'activeQuizzes' => $activeQuizzes
]);
?>
