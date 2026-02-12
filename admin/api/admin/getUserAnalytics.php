<?php
// Set headers for JSON response and CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include database connection and JWT validation logic
include '../db.php';
include '../jwt.php';

// Ensure the request method is GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    exit();
}

// --- JWT and Admin Role Validation ---
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';

if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401); // Unauthorized
    echo json_encode(['status' => 'error', 'message' => 'Authorization token not found']);
    exit();
}

$token = $matches[1];
$payload = validateJWT($token);

if (!$payload) {
    http_response_code(401); // Unauthorized
    echo json_encode(['status' => 'error', 'message' => 'Invalid or expired token']);
    exit();
}

if (!isset($payload['role']) || $payload['role'] !== 'admin') {
    http_response_code(403); // Forbidden
    echo json_encode(['status' => 'error', 'message' => 'Access denied. Admin privileges required.']);
    exit();
}

// --- Database Queries with Error Handling ---

// Helper function to handle query errors to avoid repetition
function handleQueryError($connection) {
    http_response_code(500); // Internal Server Error
    // Log the error for debugging, but don't expose it to the client in production
    error_log('MySQL Error: ' . mysqli_error($connection)); 
    echo json_encode([
        'status' => 'error',
        'message' => 'A database error occurred.'
        // For development, you might want to show the specific error:
        // 'mysql_error' => mysqli_error($connection) 
    ]);
    exit();
}

// 1. Get Total Users
$totalUsersQuery = "SELECT COUNT(*) as total FROM users";
$totalUsersResult = mysqli_query($conUser, $totalUsersQuery);
if (!$totalUsersResult) {
    handleQueryError($conUser);
}
$totalUsers = mysqli_fetch_assoc($totalUsersResult)['total'];

// 2. Get Active Users
$activeUsersQuery = "SELECT COUNT(*) as active FROM users WHERE blocked = 0";
$activeUsersResult = mysqli_query($conUser, $activeUsersQuery);
if (!$activeUsersResult) {
    handleQueryError($conUser);
}
$activeUsers = mysqli_fetch_assoc($activeUsersResult)['active'];

// 3. Get Blocked Users
$blockedUsersQuery = "SELECT COUNT(*) as blocked FROM users WHERE blocked = 1";
$blockedUsersResult = mysqli_query($conUser, $blockedUsersQuery);
if (!$blockedUsersResult) {
    handleQueryError($conUser);
}
$blockedUsers = mysqli_fetch_assoc($blockedUsersResult)['blocked'];

// 4. Get Daily Signups for the Last 30 Days
$last30DaysQuery = "SELECT DATE(createdAt) as date, COUNT(*) as count
                    FROM users
                    WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                    GROUP BY DATE(createdAt)
                    ORDER BY date ASC";
$last30DaysResult = mysqli_query($conUser, $last30DaysQuery);
if (!$last30DaysResult) {
    handleQueryError($conUser);
}

$dailyData = [];
while ($row = mysqli_fetch_assoc($last30DaysResult)) {
    $dailyData[] = [
        'date' => $row['date'],
        'count' => (int)$row['count']
    ];
}

// 5. Get Monthly Signups for the Last 12 Months
$monthlyQuery = "SELECT
                    DATE_FORMAT(createdAt, '%Y-%m') as month,
                    COUNT(*) as count
                 FROM users
                 WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                 GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
                 ORDER BY month ASC";
$monthlyResult = mysqli_query($conUser, $monthlyQuery);
if (!$monthlyResult) {
    handleQueryError($conUser);
}

$monthlyData = [];
while ($row = mysqli_fetch_assoc($monthlyResult)) {
    $monthlyData[] = [
        'month' => $row['month'],
        'count' => (int)$row['count']
    ];
}


// --- Final JSON Output ---
// If we reach here, all queries were successful
http_response_code(200); // OK
echo json_encode([
    'status' => 'success',
    'data' => [
        'totalUsers' => (int)$totalUsers,
        'activeUsers' => (int)$activeUsers,
        'blockedUsers' => (int)$blockedUsers,
        'dailySignups' => $dailyData,
        'monthlySignups' => $monthlyData
    ]
]);

// It's good practice to close the connection, though PHP does it automatically at the end of the script
mysqli_close($conUser);
?>