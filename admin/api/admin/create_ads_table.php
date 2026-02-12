<?php
include '../db.php';
$sql = "CREATE TABLE IF NOT EXISTS ads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    link_url TEXT,
    position ENUM('top', 'sidebar', 'popup', 'content') DEFAULT 'content',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

if (mysqli_query($con, $sql)) {
    echo "Table 'ads' created successfully or already exists.";
} else {
    echo "Error creating table: " . mysqli_error($con);
}
?>
