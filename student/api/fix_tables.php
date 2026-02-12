<?php
include 'db.php';

header('Content-Type: application/json');

$results = [];

// 1. Tables in notelibr_Users ($conUser)
$users_tables = [
    "notifications" => "CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )",
    "study_targets" => "CREATE TABLE IF NOT EXISTS study_targets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        label VARCHAR(255) NOT NULL,
        progress INT DEFAULT 0,
        target_date DATE,
        is_completed TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )"
];

foreach ($users_tables as $name => $sql) {
    if (mysqli_query($conUser, $sql)) {
        $results['Users DB'][$name] = "Ready/Created";
    } else {
        $results['Users DB'][$name] = "Error: " . mysqli_error($conUser);
    }
}

// 2. Tables in notelibr_Premium ($conPrem)
$premium_tables = [
    "quiz_attempts" => "CREATE TABLE IF NOT EXISTS quiz_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        quiz_id INT NOT NULL,
        collection_id INT DEFAULT NULL,
        attempt_number INT DEFAULT 1,
        score FLOAT DEFAULT 0,
        total_questions INT DEFAULT 0,
        correct_count INT DEFAULT 0,
        incorrect_count INT DEFAULT 0,
        attempt_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )",
    "quiz_attempt_details" => "CREATE TABLE IF NOT EXISTS quiz_attempt_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        attempt_id INT NOT NULL,
        question_index INT NOT NULL,
        selected_option INT DEFAULT -1,
        is_bookmarked TINYINT(1) DEFAULT 0,
        is_correct TINYINT(1) DEFAULT 0,
        time_spent INT DEFAULT 0,
        INDEX (attempt_id)
    )",
    "user_series_access" => "CREATE TABLE IF NOT EXISTS user_series_access (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        collection_id INT NOT NULL,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_id),
        INDEX (collection_id)
    )",
    "payment_requests" => "CREATE TABLE IF NOT EXISTS payment_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        collection_id INT NOT NULL,
        amount DECIMAL(10,2),
        payment_method VARCHAR(50),
        transaction_id VARCHAR(100),
        screenshot_path VARCHAR(255),
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        ai_status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (user_id),
        INDEX (status)
    )"
];

foreach ($premium_tables as $name => $sql) {
    if (mysqli_query($conPrem, $sql)) {
        $results['Premium DB'][$name] = "Ready/Created";
    } else {
        $results['Premium DB'][$name] = "Error: " . mysqli_error($conPrem);
    }
}

// 3. Tables in notelibr_Contents ($con)
$contents_tables = [
    "notices" => "CREATE TABLE IF NOT EXISTS notices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )"
];

foreach ($contents_tables as $name => $sql) {
    if (mysqli_query($con, $sql)) {
        $results['Contents DB'][$name] = "Ready/Created";
    } else {
        $results['Contents DB'][$name] = "Error: " . mysqli_error($con);
    }
}

echo json_encode(['status' => 'complete', 'results' => $results], JSON_PRETTY_PRINT);
?>
