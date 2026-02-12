<?php
include '../db.php';

$query = "CREATE TABLE IF NOT EXISTS partners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50),
    logo_url VARCHAR(255),
    featured_image_url VARCHAR(255),
    description TEXT,
    location VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(255),
    programs TEXT, -- Store as JSON or comma separated
    students VARCHAR(50),
    established VARCHAR(20),
    is_featured BOOLEAN DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)";

if (mysqli_query($con, $query)) {
    echo json_encode(['success' => true, 'message' => 'Partners table created successfully']);
} else {
    echo json_encode(['success' => false, 'message' => 'Error creating table: ' . mysqli_error($con)]);
}
?>
