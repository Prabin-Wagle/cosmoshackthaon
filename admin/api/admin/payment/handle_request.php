<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../db.php';
require_once '../../jwt.php';

// Authentication
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$token = str_replace('Bearer ', '', $authHeader);
$userData = validateJWT($token);

if (!$userData || $userData['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Unauthorized access. Admin privileges required."]);
    exit;
}

$request_id = $_POST['request_id'] ?? '';
$action = $_POST['action'] ?? ''; // 'approve' or 'reject'
$note = $_POST['note'] ?? ''; // Optional reason
$transaction_code = $_POST['transaction_code'] ?? null;

if (empty($request_id) || empty($action)) {
    echo json_encode(["success" => false, "message" => "Request ID and action are required"]);
    exit;
}

// 1. Fetch the request to get user_id and collection_id
$stmt = $conPrem->prepare("SELECT user_id, collection_id FROM payment_requests WHERE id = ?");
$stmt->bind_param("i", $request_id);
$stmt->execute();
$stmt->bind_result($user_id, $collection_id);
if (!$stmt->fetch()) {
    echo json_encode(["success" => false, "message" => "Request not found"]);
    exit;
}
$stmt->close();

$conPrem->begin_transaction();

try {
    if ($action === 'approve') {
        // 1. Update request status
        $stmt = $conPrem->prepare("UPDATE payment_requests SET status = 'approved', remarks = ?, transaction_code = IFNULL(?, transaction_code), updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->bind_param("ssi", $note, $transaction_code, $request_id);
        $stmt->execute();
        $stmt->close();

        // 2. Grant access
        $granted_by = $userData['user_id'];
        $stmt = $conPrem->prepare("INSERT IGNORE INTO user_series_access (user_id, collection_id, granted_by) VALUES (?, ?, ?)");
        $stmt->bind_param("iii", $user_id, $collection_id, $granted_by);
        $stmt->execute();
        $stmt->close();

        $conPrem->commit();
        echo json_encode(["success" => true, "message" => "Payment approved and access granted"]);
    } else if ($action === 'reject') {
        // 1. Update request status
        $stmt = $conPrem->prepare("UPDATE payment_requests SET status = 'rejected', remarks = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->bind_param("si", $note, $request_id);
        $stmt->execute();
        $stmt->close();

        $conPrem->commit();
        echo json_encode(["success" => true, "message" => "Payment request rejected"]);
    } else if ($action === 'revoke') {
        // 1. Update request status to rejected
        $stmt = $conPrem->prepare("UPDATE payment_requests SET status = 'rejected', remarks = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->bind_param("si", $note, $request_id);
        $stmt->execute();
        $stmt->close();

        // 2. Remove access
        $stmt = $conPrem->prepare("DELETE FROM user_series_access WHERE user_id = ? AND collection_id = ?");
        $stmt->bind_param("ii", $user_id, $collection_id);
        $stmt->execute();
        $stmt->close();

        $conPrem->commit();
        echo json_encode(["success" => true, "message" => "Access revoked successfully"]);
    } else {
        throw new Exception("Invalid action");
    }
} catch (Exception $e) {
    $conPrem->rollback();
    echo json_encode(["success" => false, "message" => "Failed to handle request: " . $e->getMessage()]);
}

$conPrem->close();
?>
