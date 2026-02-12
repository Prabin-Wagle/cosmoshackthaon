<?php
include('../db.php');
include('../jwt.php');
include('../encrypt_helper.php');
header('Content-Type:application/json');

// --- CORS Configuration ---
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

// 1. Validate Token (Optional for reading leaderboard, but good for privacy if needed)
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (!empty($authHeader) && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    $token = $matches[1];
    $payload = validateJWT($token);
}

$quiz_id = isset($_GET['quiz_id']) ? intval($_GET['quiz_id']) : 0;

if ($quiz_id <= 0) {
    // If no specific quiz ID, maybe fetch latest live quiz? 
    // For now, let's require it or fetch the most recent attempt's quiz
    $latestQuizQuery = "SELECT quiz_id FROM quiz_attempts ORDER BY attempt_date DESC LIMIT 1";
    $resLatest = $conPrem->query($latestQuizQuery);
    if ($resLatest && $resLatest->num_rows > 0) {
        $row = $resLatest->fetch_assoc();
        $quiz_id = $row['quiz_id'];
    }
}

// 2. Fetch Leaderboard
// Rank by Score DESC, then by Total Time ASC
$query = "
    SELECT 
        qa.id as attempt_id,
        qa.user_id,
        qa.score, 
        (SELECT SUM(time_spent) FROM quiz_attempt_details WHERE attempt_id = qa.id) as total_time
    FROM quiz_attempts qa
    WHERE qa.quiz_id = ?
    AND qa.attempt_number = 1
    ORDER BY qa.score DESC, total_time ASC
    LIMIT 20
";

$stmt = $conPrem->prepare($query);
$stmt->bind_param("i", $quiz_id);
$stmt->execute();
$stmt->bind_result($attempt_id, $u_id_db, $score, $total_time);

$attempts = [];
while ($stmt->fetch()) {
    $attempts[] = [
        'attempt_id' => $attempt_id,
        'user_id' => $u_id_db,
        'score' => $score,
        'total_time' => $total_time
    ];
}
$stmt->close();

// 3. User Specific Rank (If Logged In)
$userEntry = null;
$currentUserId = isset($payload['user_id']) ? $payload['user_id'] : 0;

if ($currentUserId > 0) {
    // Check if user is already in top 20
    $found = false;
    foreach ($attempts as $att) {
        if ($att['user_id'] == $currentUserId) $found = true;
    }

    if (!$found) {
        // Fetch User Stats
        $uQuery = "
            SELECT qa.id, qa.score, 
            (SELECT SUM(time_spent) FROM quiz_attempt_details WHERE attempt_id = qa.id) as total_time
            FROM quiz_attempts qa 
            WHERE qa.quiz_id = ? AND qa.user_id = ? AND qa.attempt_number = 1
        ";
        $uStmt = $conPrem->prepare($uQuery);
        $uStmt->bind_param("ii", $quiz_id, $currentUserId);
        $uStmt->execute();
        $uStmt->bind_result($myId, $myScore, $myTime);
        if ($uStmt->fetch()) {
            // successful fetch of user data
        }
        $uStmt->close();

        if ($myId) {
            // Calculate Rank
            // Rank = Count of people with Score > MyScore  OR  (Score = MyScore AND Time < MyTime) + 1
            $rankQuery = "
                SELECT count(*) FROM quiz_attempts qa
                JOIN (SELECT attempt_id, SUM(time_spent) as t_time FROM quiz_attempt_details GROUP BY attempt_id) t 
                ON t.attempt_id = qa.id
                WHERE qa.quiz_id = ? AND qa.attempt_number = 1 AND (
                    qa.score > ? OR (qa.score = ? AND t.t_time < ?)
                )
            ";
            
            // Simplified Rank Query avoiding complex JOIN if possible, but Total Time is needed.
            // Let's use a simpler approximation if performance is key, but for accuracy:
            // We need the subquery for time. 
            // Actually, `quiz_attempts` doesn't have total_time column? The original query calculates it on the fly.
            // Let's stick to the structure.
            
           $rQ = "
                SELECT COUNT(*) 
                FROM quiz_attempts qa
                WHERE qa.quiz_id = ? AND qa.attempt_number = 1 
                AND (
                    qa.score > ? OR 
                    (qa.score = ? AND (SELECT SUM(time_spent) FROM quiz_attempt_details WHERE attempt_id = qa.id) < ?)
                )
            ";
            
            $rStmt = $conPrem->prepare($rQ);
            $rStmt->bind_param("iddi", $quiz_id, $myScore, $myScore, $myTime);
            $rStmt->execute();
            $rStmt->bind_result($higherRankCount);
            $rStmt->fetch();
            $rStmt->close();

            $myRank = $higherRankCount + 1;
            
            $userEntry = [
                'attempt_id' => $myId,
                'user_id' => $currentUserId,
                'score' => $myScore,
                'total_time' => $myTime,
                'rank' => $myRank,
                'is_current_user' => true
            ];
        }
    }
}

$leaderboard = [];
if (!empty($attempts)) {
    $userIds = array_map(function($a) { return $a['user_id']; }, $attempts);
    if ($userEntry) $userIds[] = $userEntry['user_id'];
    
    $userIdList = implode(',', array_unique($userIds));
    
    $names = [];
    if (!empty($userIdList)) {
        // Fetch names and profile images from $conUser
        $nameQuery = "SELECT id, name, profile_image FROM users WHERE id IN ($userIdList)";
        $nameRes = isset($conUser) ? $conUser->query($nameQuery) : null;
        
        // Fallback if profile_image doesn't exist or query fails
        if (!$nameRes && isset($conUser)) {
            $nameQuery = "SELECT id, name FROM users WHERE id IN ($userIdList)";
            $nameRes = $conUser->query($nameQuery);
        }

        if ($nameRes && $nameRes !== true) {
            while ($nRow = $nameRes->fetch_assoc()) {
                $names[$nRow['id']] = [
                    'name' => $nRow['name'],
                    'profile_image' => isset($nRow['profile_image']) ? $nRow['profile_image'] : null
                ];
            }
        }
    }
    
    $rank = 1;
    foreach ($attempts as $att) {
        $userData = isset($names[$att['user_id']]) ? $names[$att['user_id']] : ['name' => 'Anonymous', 'profile_image' => null];
        $leaderboard[] = [
            'rank' => $rank++,
            'name' => $userData['name'],
            'profile_image' => $userData['profile_image'],
            'score' => floatval($att['score']),
            'total_time' => intval($att['total_time']),
            'is_current_user' => ($currentUserId == $att['user_id'])
        ];
    }
    
    // Append User Entry if separate
    if ($userEntry) {
         $userData = isset($names[$userEntry['user_id']]) ? $names[$userEntry['user_id']] : ['name' => 'Me', 'profile_image' => null];
         // Convert to frontend format
         $leaderboard[] = [
             'rank' => $userEntry['rank'],
             'name' => $userData['name'],
             'profile_image' => $userData['profile_image'],
             'score' => floatval($userEntry['score']),
             'total_time' => intval($userEntry['total_time']),
             'is_current_user' => true
         ];
    }
}

// Also get basic quiz info for context
$qTitle = "Leaderboard";
$qt = $conPrem->prepare("SELECT quiz_title FROM test_series WHERE id = ?");
$qt->bind_param("i", $quiz_id);
$qt->execute();
$qt->bind_result($quizInfo);
if($qt->fetch()) $qTitle = $quizInfo;
$qt->close();

echo json_encode([
    'status' => 'true',
    'quiz_title' => $qTitle,
    'quiz_id' => $quiz_id,
    'data' => $leaderboard
]);
?>
