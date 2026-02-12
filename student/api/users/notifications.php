<?php
include '../db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$user_id = $_GET['user_id'] ?? null;

if (!$user_id) {
    echo json_encode(['status' => 'error', 'message' => 'User ID required']);
    exit;
}

// Ensure notification_reads table exists
mysqli_query($conUser, "CREATE TABLE IF NOT EXISTS notification_reads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    notification_id VARCHAR(100) NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_read (user_id, notification_id)
)");

if (isset($_GET['mark_read'])) {
    $notif_id = mysqli_real_escape_string($conUser, $_GET['mark_read']);
    
    // Insert into read status table
    $query = "INSERT IGNORE INTO notification_reads (user_id, notification_id) VALUES ('$user_id', '$notif_id')";
    mysqli_query($conUser, $query);
    
    // Also update main table if it's a numeric ID
    if (is_numeric($notif_id)) {
        mysqli_query($conUser, "UPDATE notifications SET is_read = 1 WHERE id = '$notif_id' AND user_id = '$user_id'");
    }
    
    echo json_encode(['status' => 'success']);
    exit;
}

if (isset($_GET['mark_all'])) {
    // 1. Mark all existing DB notifications as read
    mysqli_query($conUser, "UPDATE notifications SET is_read = 1 WHERE user_id = '$user_id'");
    
    // 2. We skip bulk marking virtual ones for now as it's complex without a list, 
    // but we can insert the IDs of all current virtual notifications if they were passed, 
    // or just let them stay. Most users care about the badge clearing.
    echo json_encode(['status' => 'success']);
    exit;
}

// Fetch read notification IDs for this user
$readRes = mysqli_query($conUser, "SELECT notification_id FROM notification_reads WHERE user_id = '$user_id'");
$readIds = [];
while($r = mysqli_fetch_assoc($readRes)) {
    $readIds[] = $r['notification_id'];
}

$query = "SELECT * FROM notifications WHERE user_id = '$user_id' AND type != 'read_marker' ORDER BY created_at DESC LIMIT 15";
$res = mysqli_query($conUser, $query);
$notifications = [];
while($row = mysqli_fetch_assoc($res)) {
    $row['created_at'] = gmdate('Y-m-d\TH:i:s\Z', strtotime($row['created_at']));
    // Override is_read if it's in our reads table
    if (in_array($row['id'], $readIds)) {
        $row['is_read'] = 1;
    }
    $notifications[] = $row;
}

// --- Dynamic Quiz Notifications (Live Schedule) ---
$quizQuery = "SELECT id, quiz_title, start_time, mode FROM test_series 
              WHERE collection_id IN (SELECT collection_id FROM user_series_access WHERE user_id = '$user_id')
              AND mode = 'LIVE'
              AND start_time >= NOW()
              AND id NOT IN (SELECT quiz_id FROM quiz_attempts WHERE user_id = '$user_id')
              ORDER BY start_time ASC LIMIT 5";
$quizRes = mysqli_query($conPrem, $quizQuery);

if ($quizRes) {
    while($quiz = mysqli_fetch_assoc($quizRes)) {
        $vId = 'quiz_' . $quiz['id'];
        
        // Skip if already marked as read
        if (in_array($vId, $readIds)) continue;

        $startTime = strtotime($quiz['start_time']);
        $diff = $startTime - time();
        $timeLabel = $diff < 3600 ? "Starting in " . floor($diff/60) . " mins" : "Scheduled for " . date('M j, g:i A', $startTime);
        
        $notifications[] = [
            'id' => $vId,
            'title' => 'Upcoming LIVE Quiz',
            'message' => $quiz['quiz_title'] . " is " . $timeLabel,
            'type' => 'warning',
            'is_read' => 0,
            'created_at' => gmdate('Y-m-d\TH:i:s\Z', strtotime($quiz['start_time']))
        ];
    }
}

// Sort notifications by created_at DESC (virtual ones might have future dates, so we sort)
usort($notifications, function($a, $b) {
    return strtotime($b['created_at']) - strtotime($a['created_at']);
});

// Add a dummy welcome notification if empty
if (count($notifications) === 0) {
    if (!in_array('0', $readIds)) {
        $notifications[] = [
            'id' => 0,
            'title' => 'Welcome to Dashboard',
            'message' => 'Start tracking your competitive exam progress!',
            'type' => 'info',
            'is_read' => 0,
            'created_at' => gmdate('Y-m-d\TH:i:s\Z')
        ];
    }
}

echo json_encode(['status' => 'success', 'notifications' => $notifications]);
?>
