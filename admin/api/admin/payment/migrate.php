<?php
require_once '../../db.php';

$table = 'payment_requests';
$columns = [
    'transaction_code' => "VARCHAR(255) DEFAULT NULL AFTER status",
    'ai_status' => "ENUM('pending','verified','failed') DEFAULT 'pending' AFTER transaction_code",
    'ai_response' => "TEXT DEFAULT NULL AFTER ai_status"
];

foreach ($columns as $column => $definition) {
    // Check if column exists
    $result = $conPrem->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
    if ($result->num_rows == 0) {
        echo "Adding column $column...\n";
        $alter = $conPrem->query("ALTER TABLE `$table` ADD `$column` $definition");
        if ($alter) {
            echo "Column $column added successfully.\n";
            if ($column === 'transaction_code') {
                $conPrem->query("ALTER TABLE `$table` ADD UNIQUE KEY `unique_transaction` (`transaction_code`)");
            }
        } else {
            echo "Error adding column $column: " . $conPrem->error . "\n";
        }
    } else {
        echo "Column $column already exists.\n";
    }
}

$conPrem->close();
echo "Migration completed.";
?>
