<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

$statusFilter = $_GET['status'] ?? 'pending';

// We need to fetch data from two different databases
// conPrem refers to notelibr_Premium
// Users table is in notelibr_Users (conUser)

// Debug context: Check if the table even has data
$countSql = "SELECT COUNT(*) as total FROM payment_requests";
$countResult = mysqli_query($conPrem, $countSql);
$totalRows = 0;
if ($countResult) {
    $countRow = mysqli_fetch_assoc($countResult);
    $totalRows = (int)$countRow['total'];
}

// 1. Get payment requests
$sql = "SELECT pr.id, pr.user_id, pr.collection_id, pr.screenshot_path, pr.status, pr.remarks, pr.transaction_code, pr.ai_status, pr.created_at, tsc.title as collection_title 
        FROM payment_requests pr
        LEFT JOIN test_series_collections tsc ON pr.collection_id = tsc.id";

if ($statusFilter !== 'all') {
    $sql .= " WHERE pr.status = '" . mysqli_real_escape_string($conPrem, $statusFilter) . "'";
}

$sql .= " ORDER BY pr.created_at DESC";

$result = mysqli_query($conPrem, $sql);
if (!$result) {
    echo json_encode([
        "success" => false, 
        "message" => "Database query failed: " . mysqli_error($conPrem),
        "debug_sql" => $sql
    ]);
    exit;
}

$requests = [];
while ($row = mysqli_fetch_assoc($result)) {
    // Fetch user details from conUser
    $u_id = $row['user_id'];
    $user_sql = "SELECT name, email, profile_picture FROM users WHERE id = $u_id";
    $user_result = mysqli_query($conUser, $user_sql);
    
    if ($user_result && mysqli_num_rows($user_result) > 0) {
        $user_data = mysqli_fetch_assoc($user_result);
        $row['user_name'] = $user_data['name'] ?? 'Unknown User';
        $row['user_email'] = $user_data['email'] ?? '';
        $row['user_profile_picture'] = $user_data['profile_picture'] ?? null;
    } else {
        $row['user_name'] = 'Unknown User (ID: '.$u_id.')';
        $row['user_email'] = '';
        $row['user_profile_picture'] = null;
    }
    
    $requests[] = $row;
}

echo json_encode([
    "success" => true,
    "total_in_db" => $totalRows,
    "filter_used" => $statusFilter,
    "count_after_filter" => count($requests),
    "data" => $requests,
    "debug_sql" => $sql
]);

$conPrem->close();
$conUser->close();
?>
