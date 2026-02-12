<?php
function syncQuestionsToBank($conPrem, $quizJsonData) {
    if (empty($quizJsonData)) return;

    // Decode if it's a string (JSON string or Base64)
    if (is_string($quizJsonData)) {
        // Check if it's Base64
        if (base64_encode(base64_decode($quizJsonData, true)) === $quizJsonData) {
             $decoded = base64_decode($quizJsonData);
             $quizJsonData = json_decode($decoded, true);
        } else {
             $quizJsonData = json_decode($quizJsonData, true);
        }
    }

    if (!is_array($quizJsonData)) return;

    $stats = ['inserted' => 0, 'updated' => 0, 'unchanged' => 0];

    // Group questions by Unit ID to handle dynamic tables efficiently
    $questionsByUnit = [];
    foreach ($quizJsonData as $q) {
        if (!isset($q['questionId']) || !isset($q['unitId'])) continue;
        $unit = $q['unitId'];
        if (!isset($questionsByUnit[$unit])) {
            $questionsByUnit[$unit] = [];
        }
        $questionsByUnit[$unit][] = $q;
    }

    foreach ($questionsByUnit as $unitId => $questions) {
        // Sanitize unitId to form table name
        // UNIT_PHYSICS -> physics
        $suffix = strtolower(str_replace('UNIT_', '', $unitId));
        // Remove strictly non-alphanumeric just in case to prevent SQL issues
        $suffix = preg_replace('/[^a-z0-9_]/', '', $suffix);
        
        if (empty($suffix)) continue;

        $tableName = "qb_" . $suffix; // e.g., qb_physics

        // Create table logic for this specific unit
        $createTableSql = "CREATE TABLE IF NOT EXISTS $tableName (
            id INT AUTO_INCREMENT PRIMARY KEY,
            question_uid VARCHAR(255) UNIQUE NOT NULL,
            chapter VARCHAR(100),
            question_text MEDIUMTEXT,
            options JSON,
            correct_option INT,
            marks DOUBLE,
            explanation MEDIUMTEXT,
            image_link TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX (chapter)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        if (!mysqli_query($conPrem, $createTableSql)) {
            // If table creation fails, skip this batch
            continue;
        }

        // Prepare Insert/Update for this specific table
        $sql = "INSERT INTO $tableName 
            (question_uid, chapter, question_text, options, correct_option, marks, explanation, image_link) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            question_text = VALUES(question_text),
            options = VALUES(options),
            correct_option = VALUES(correct_option),
            marks = VALUES(marks),
            explanation = VALUES(explanation),
            image_link = VALUES(image_link),
            updated_at = NOW()";
            
        $stmt = mysqli_prepare($conPrem, $sql);
        if ($stmt) {
             foreach ($questions as $q) {
                // Parse Chapter: CH_WAVES -> WAVES
                $chapter = isset($q['chapterId']) ? str_replace('CH_', '', $q['chapterId']) : null;
                
                $qId = $q['questionId'];
                $qText = $q['questionText'] ?? ($q['question'] ?? '');
                $opts = json_encode($q['options'] ?? [], JSON_UNESCAPED_UNICODE);
                $correct = intval($q['correctOption'] ?? 0);
                $marks = floatval($q['marks'] ?? 1);
                $expl = $q['explanation'] ?? null;
                $img = $q['imageLink'] ?? null;

                mysqli_stmt_bind_param($stmt, "ssssidss", 
                    $qId, $chapter, $qText, $opts, $correct, $marks, $expl, $img
                );
                mysqli_stmt_execute($stmt);

                $affected = mysqli_stmt_affected_rows($stmt);
                if ($affected === 1) {
                    $stats['inserted']++;
                } elseif ($affected === 2) {
                    $stats['updated']++;
                } else {
                    $stats['unchanged']++;
                }
             }
             mysqli_stmt_close($stmt);
        }
    }
    return $stats;
}
?>
