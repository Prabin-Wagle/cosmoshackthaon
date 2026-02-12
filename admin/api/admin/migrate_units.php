<?php
require_once '../db.php';
require_once '../jwt.php';

header('Content-Type: application/json');

// Simple check for admin role (simplified for this migration script)
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    die(json_encode(['success' => false, 'message' => 'Unauthorized']));
}
$payload = validateJWT($matches[1]);
if (!$payload || $payload['role'] !== 'admin') {
    die(json_encode(['success' => false, 'message' => 'Admin access required']));
}

global $consub;

$tables = [];
$result = mysqli_query($consub, "SHOW TABLES");
if ($result) {
    while ($row = mysqli_fetch_array($result)) {
        if (strpos($row[0], 'class') === 0) {
            $tables[] = $row[0];
        }
    }
}

$updated = [];
$errors = [];

foreach ($tables as $table) {
    $table_updated = false;
    $table_errors = [];

    // Add units column
    $colUnits = mysqli_query($consub, "SHOW COLUMNS FROM `{$table}` LIKE 'units'");
    if (mysqli_num_rows($colUnits) === 0) {
        if (mysqli_query($consub, "ALTER TABLE `{$table}` ADD COLUMN units LONGTEXT DEFAULT '[]'")) {
            $table_updated = true;
        } else {
            $table_errors[] = "Failed to add 'units' to $table: " . mysqli_error($consub);
        }
    }

    // Add has_units column
    $colHasUnits = mysqli_query($consub, "SHOW COLUMNS FROM `{$table}` LIKE 'has_units'");
    if (mysqli_num_rows($colHasUnits) === 0) {
        if (mysqli_query($consub, "ALTER TABLE `{$table}` ADD COLUMN has_units TINYINT(1) DEFAULT 1")) {
            $table_updated = true;
        } else {
            $table_errors[] = "Failed to add 'has_units' to $table: " . mysqli_error($consub);
        }
    }

    if ($table_updated && empty($table_errors)) {
        $updated[] = $table;
    } elseif (!empty($table_errors)) {
        $errors = array_merge($errors, $table_errors);
    } else {
        $updated[] = "$table (no new columns added)";
    }
}

echo json_encode([
    'success' => true,
    'message' => 'Migration completed',
    'updated_tables' => $updated,
    'errors' => $errors
]);
?>
