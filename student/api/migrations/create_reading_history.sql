-- User Reading History table
-- Tracks notes, books, and notices read by the user

CREATE TABLE IF NOT EXISTS user_reading_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    resource_id INT NOT NULL,
    resource_type VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(255) DEFAULT NULL,
    url TEXT DEFAULT NULL,
    last_read TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_recent (user_id, last_read DESC),
    UNIQUE KEY idx_user_resource (user_id, resource_id, resource_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
