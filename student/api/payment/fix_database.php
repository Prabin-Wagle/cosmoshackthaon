<?php
include('../db.php');
header('Content-Type: text/plain');

// Use Premium DB connection
if (!isset($conPrem)) {
    die("Error: \$conPrem connection not found in db.php");
}

echo "Checking tables in notelibr_Premium...\n\n";

// 1. Create payment_requests table
$sql1 = "CREATE TABLE IF NOT EXISTS `payment_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `collection_id` int(11) NOT NULL,
  `screenshot_path` varchar(512) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_pay_user` (`user_id`),
  KEY `fk_pay_collection` (`collection_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

if (mysqli_query($conPrem, $sql1)) {
    echo "Table 'payment_requests': OK (Created or already exists)\n";
} else {
    echo "Table 'payment_requests': FAILED - " . mysqli_error($conPrem) . "\n";
}

// 2. Create user_series_access table
$sql2 = "CREATE TABLE IF NOT EXISTS `user_series_access` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `collection_id` int(11) NOT NULL,
  `granted_by` int(11) DEFAULT NULL COMMENT 'Admin ID who granted access',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_access` (`user_id`, `collection_id`),
  KEY `fk_access_collection` (`collection_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

if (mysqli_query($conPrem, $sql2)) {
    echo "Table 'user_series_access': OK (Created or already exists)\n";
} else {
    echo "Table 'user_series_access': FAILED - " . mysqli_error($conPrem) . "\n";
}

echo "\nDatabase fix attempt finished.";
?>
