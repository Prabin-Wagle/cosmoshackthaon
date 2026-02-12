<?php
include '../db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Table for Notifications
$createNotificationsTable = "CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";

// Table for Study Targets (To-Do)
$createTargetsTable = "CREATE TABLE IF NOT EXISTS study_targets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    label VARCHAR(255) NOT NULL,
    progress INT DEFAULT 0,
    target_date DATE,
    is_completed TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";

$results = [];
if (mysqli_query($conUser, $createNotificationsTable)) {
    $results['notifications_table'] = 'Ready';
} else {
    $results['notifications_table_error'] = mysqli_error($conUser);
}

if (mysqli_query($conUser, $createTargetsTable)) {
    $results['targets_table'] = 'Ready';
} else {
    $results['targets_table_error'] = mysqli_error($conUser);
}

echo json_encode(['status' => 'success', 'results' => $results]);
?>
