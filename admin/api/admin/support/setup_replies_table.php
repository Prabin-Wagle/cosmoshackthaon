<?php
require_once '../../db.php';

$sql = "CREATE TABLE IF NOT EXISTS `ticket_replies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ticket_id` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

if ($conSupport->query($sql) === TRUE) {
    echo "Table ticket_replies created successfully or already exists";
} else {
    echo "Error creating table: " . $conSupport->error;
}

$conSupport->close();
?>
