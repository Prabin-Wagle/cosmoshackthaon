<?php
include('../db.php');
header('Content-Type: text/plain');

if (!isset($conPrem)) {
    die("Error: \$conPrem connection not found");
}

$user_id = 3;
$collection_ids = [1, 2];

echo "Granting access for User ID: $user_id...\n\n";

foreach ($collection_ids as $col_id) {
    // 1. Grant Access (Insert into user_series_access)
    $stmt = $conPrem->prepare("INSERT IGNORE INTO user_series_access (user_id, collection_id, granted_by) VALUES (?, ?, 999)");
    $stmt->bind_param("ii", $user_id, $col_id);
    
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo "[OK] Access granted for Collection ID $col_id.\n";
        } else {
            echo "[INFO] User already has access to Collection ID $col_id.\n";
        }
    } else {
        echo "[ERROR] Failed to grant access for Collection ID $col_id: " . $stmt->error . "\n";
    }
    $stmt->close();

    // 2. Update Payment Request Status
    $stmtUpdate = $conPrem->prepare("UPDATE payment_requests SET status = 'approved', updated_at = NOW() WHERE user_id = ? AND collection_id = ?");
    $stmtUpdate->bind_param("ii", $user_id, $col_id);
    
    if ($stmtUpdate->execute()) {
        echo "[OK] Payment request status updated to 'approved' for Collection ID $col_id.\n";
    } else {
        echo "[ERROR] Failed to update payment status for Collection ID $col_id: " . $stmtUpdate->error . "\n";
    }
    $stmtUpdate->close();
    
    echo "---------------------------------------------------\n";
}

echo "\nDone.";
?>
