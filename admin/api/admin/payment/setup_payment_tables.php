<?php
require_once '../../db.php';

// Tables are in conPrem (notelibr_Premium)

$sqls = [
    "CREATE TABLE IF NOT EXISTS `payment_requests` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `user_id` int(11) NOT NULL,
      `collection_id` int(11) NOT NULL,
      `screenshot_path` varchar(512) NOT NULL,
      `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      `transaction_code` varchar(255) DEFAULT NULL,
      `ai_status` enum('pending','verified','failed') DEFAULT 'pending',
      `ai_response` text DEFAULT NULL,
      `remarks` text DEFAULT NULL,
      `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      UNIQUE KEY `unique_transaction` (`transaction_code`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

    "CREATE TABLE IF NOT EXISTS `user_series_access` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `user_id` int(11) NOT NULL,
      `collection_id` int(11) NOT NULL,
      `granted_by` int(11) DEFAULT NULL,
      `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      UNIQUE KEY `user_col` (`user_id`,`collection_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"
];

foreach ($sqls as $sql) {
    if ($conPrem->query($sql) === TRUE) {
        echo "Table created successfully or already exists\n";
    } else {
        echo "Error creating table: " . $conPrem->error . "\n";
    }
}

$conPrem->close();
?>
