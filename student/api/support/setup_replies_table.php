<?php
require_once '../db.php';

$sql = "CREATE TABLE IF NOT EXISTS `ticket_replies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  INDEX (`ticket_id`),
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

if ($conSupport->query($sql) === TRUE) {
    echo "Table 'ticket_replies' created successfully\n";
} else {
    echo "Error creating table: " . $conSupport->error . "\n";
}

$conSupport->close();
?>
