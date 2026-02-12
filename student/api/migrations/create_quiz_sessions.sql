-- Quiz Sessions table for secure answer validation
-- Stores the quiz data for the duration of a session

CREATE TABLE IF NOT EXISTS quiz_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    quiz_id INT NOT NULL,
    quiz_json LONGTEXT NOT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_session_user (session_id, user_id),
    INDEX idx_user_quiz (user_id, quiz_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
