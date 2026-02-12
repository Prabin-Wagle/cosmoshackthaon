<?php
include('../db.php');
include('../jwt.php');
header('Content-Type:application/json');

include '../cors.php';

$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['data' => [], 'status' => 'false', 'message' => 'Unauthorized']);
    exit();
}

$token = $matches[1];
$payload = validateJWT($token);
if (!$payload) {
    http_response_code(401);
    echo json_encode(['data' => [], 'status' => 'false', 'message' => 'Invalid token']);
    exit();
}

// Debugging: Check if 'user_id' exists
if (!isset($payload['user_id'])) {
    // Try to find what else might be the ID (e.g., 'user_id', 'sub')
    error_log("JWT Payload missing 'user_id': " . json_encode($payload));
    echo json_encode(['status' => 'false', 'message' => 'Invalid token payload: missing user_id', 'debug_payload' => $payload]);
    exit();
}

$user_id = $payload['user_id']; 

$query = "SELECT collection_id FROM user_series_access WHERE user_id = ?";
$stmt = $conPrem->prepare($query);

if (!$stmt) {
    echo json_encode(['status' => 'false', 'message' => 'Database error (prepare): ' . $conPrem->error]);
    exit();
}
$stmt->bind_param("i", $user_id);
$stmt->execute();
$stmt->bind_result($col_id);

$access_list = [];
while ($stmt->fetch()) {
    $access_list[] = $col_id;
}
$stmt->close();

// Fetch Pending Requests
// Fetch All Requests (Detailed)
$queryRequests = "SELECT collection_id, status FROM payment_requests WHERE user_id = ?";
$stmtRequests = $conPrem->prepare($queryRequests);
$requests_detail = [];

if ($stmtRequests) {
    $stmtRequests->bind_param("i", $user_id);
    $stmtRequests->execute();
    $stmtRequests->bind_result($req_col_id, $req_status);
    
    while ($stmtRequests->fetch()) {
        $requests_detail[] = [
            'user_id' => $user_id,
            'collection_id' => $req_col_id,
            'status' => $req_status
        ];
    }
    $stmtRequests->close();
}

// Extract just pending IDs for frontend convenience
$pending_list = [];
foreach ($requests_detail as $req) {
    if ($req['status'] === 'pending') {
        $pending_list[] = $req['collection_id'];
    }
}

echo json_encode([
    'data' => $access_list, 
    'pending' => $pending_list, 
    'requests_detail' => $requests_detail,
    'user_id' => $user_id,
    'status' => 'true'
]);
?>
