<?php
// Dashboard Stats API - Comprehensive statistics for admin dashboard
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include '../db.php';
include '../jwt.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    exit();
}

// JWT Validation
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';

if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Authorization token not found']);
    exit();
}

$token = $matches[1];
$payload = validateJWT($token);

if (!$payload || !isset($payload['role']) || $payload['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Access denied']);
    exit();
}

// Helper function
function getCount($conn, $query) {
    $result = mysqli_query($conn, $query);
    if (!$result) return 0;
    $row = mysqli_fetch_assoc($result);
    return isset($row['count']) ? (int)$row['count'] : 0;
}

function getSum($conn, $query) {
    $result = mysqli_query($conn, $query);
    if (!$result) return 0;
    $row = mysqli_fetch_assoc($result);
    return isset($row['total']) ? (float)$row['total'] : 0;
}

// ====== USER STATS (from $conUser) ======
$totalUsers = getCount($conUser, "SELECT COUNT(*) as count FROM users");
$activeUsers = getCount($conUser, "SELECT COUNT(*) as count FROM users WHERE blocked = 0");
$blockedUsers = getCount($conUser, "SELECT COUNT(*) as count FROM users WHERE blocked = 1");

// Daily signups (last 30 days)
$dailySignups = [];
$dailyQuery = "SELECT DATE(createdAt) as date, COUNT(*) as count 
               FROM users 
               WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) 
               GROUP BY DATE(createdAt) 
               ORDER BY date ASC";
$dailyResult = mysqli_query($conUser, $dailyQuery);
if ($dailyResult) {
    while ($row = mysqli_fetch_assoc($dailyResult)) {
        $dailySignups[] = ['date' => $row['date'], 'count' => (int)$row['count']];
    }
}

// Monthly signups (last 12 months)
$monthlySignups = [];
$monthlyQuery = "SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COUNT(*) as count 
                 FROM users 
                 WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) 
                 GROUP BY DATE_FORMAT(createdAt, '%Y-%m') 
                 ORDER BY month ASC";
$monthlyResult = mysqli_query($conUser, $monthlyQuery);
if ($monthlyResult) {
    while ($row = mysqli_fetch_assoc($monthlyResult)) {
        $monthlySignups[] = ['month' => $row['month'], 'count' => (int)$row['count']];
    }
}

// ====== CONTENT STATS (from $conPrem) ======
// Correct table names based on actual API files
$booksCount = getCount($conPrem, "SELECT COUNT(*) as count FROM class_books");
$videosCount = getCount($conPrem, "SELECT COUNT(*) as count FROM video_playlists");
$noticesCount = getCount($conPrem, "SELECT COUNT(*) as count FROM blogs");
$testSeriesCount = getCount($conPrem, "SELECT COUNT(*) as count FROM test_series");
$collectionsCount = getCount($conPrem, "SELECT COUNT(*) as count FROM test_series_collections");

// Resources are spread across multiple tables
$notesCount = getCount($conPrem, "SELECT COUNT(*) as count FROM notes");
$practicalCount = getCount($conPrem, "SELECT COUNT(*) as count FROM practical");
$compNotesCount = getCount($conPrem, "SELECT COUNT(*) as count FROM comp_notes");
$exerciseCount = getCount($conPrem, "SELECT COUNT(*) as count FROM exercise");
$freewritingCount = getCount($conPrem, "SELECT COUNT(*) as count FROM freewriting");
$grammarCount = getCount($conPrem, "SELECT COUNT(*) as count FROM grammar");
$resourcesCount = $notesCount + $practicalCount + $compNotesCount + $exerciseCount + $freewritingCount + $grammarCount;

// ====== PAYMENT STATS (from $conPrem) ======
$pendingPayments = getCount($conPrem, "SELECT COUNT(*) as count FROM payment_requests WHERE status = 'pending'");
$approvedPayments = getCount($conPrem, "SELECT COUNT(*) as count FROM payment_requests WHERE status = 'approved'");
$rejectedPayments = getCount($conPrem, "SELECT COUNT(*) as count FROM payment_requests WHERE status = 'rejected'");
$totalPayments = getCount($conPrem, "SELECT COUNT(*) as count FROM payment_requests");

// Revenue calculation - sum of collection prices (discount_price if exists, else price) for approved payments
$revenueQuery = "SELECT SUM(
                    CASE 
                        WHEN tsc.discount_price IS NOT NULL AND tsc.discount_price > 0 THEN tsc.discount_price 
                        ELSE COALESCE(tsc.price, 0) 
                    END
                 ) as total 
                 FROM payment_requests pr 
                 LEFT JOIN test_series_collections tsc ON pr.collection_id = tsc.id
                 WHERE pr.status = 'approved'";
$totalRevenue = getSum($conPrem, $revenueQuery);

// Recent payments (last 7 days) - with revenue from collection prices
$recentPayments = [];
$recentQuery = "SELECT DATE(pr.created_at) as date, 
                       COUNT(*) as count,
                       SUM(
                           CASE WHEN pr.status = 'approved' THEN 
                               CASE WHEN tsc.discount_price IS NOT NULL AND tsc.discount_price > 0 
                                    THEN tsc.discount_price 
                                    ELSE COALESCE(tsc.price, 0) 
                               END
                           ELSE 0 END
                       ) as revenue
                FROM payment_requests pr
                LEFT JOIN test_series_collections tsc ON pr.collection_id = tsc.id
                WHERE pr.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
                GROUP BY DATE(pr.created_at) 
                ORDER BY date ASC";
$recentResult = mysqli_query($conPrem, $recentQuery);
if ($recentResult) {
    while ($row = mysqli_fetch_assoc($recentResult)) {
        $recentPayments[] = [
            'date' => $row['date'],
            'count' => (int)$row['count'],
            'revenue' => (float)$row['revenue']
        ];
    }
}

// Monthly revenue (last 6 months) - from collection prices
$monthlyRevenue = [];
$revenueMonthlyQuery = "SELECT DATE_FORMAT(pr.created_at, '%Y-%m') as month, 
                        SUM(
                            CASE WHEN pr.status = 'approved' THEN 
                                CASE WHEN tsc.discount_price IS NOT NULL AND tsc.discount_price > 0 
                                     THEN tsc.discount_price 
                                     ELSE COALESCE(tsc.price, 0) 
                                END
                            ELSE 0 END
                        ) as revenue,
                        COUNT(*) as requests
                 FROM payment_requests pr
                 LEFT JOIN test_series_collections tsc ON pr.collection_id = tsc.id
                 WHERE pr.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) 
                 GROUP BY DATE_FORMAT(pr.created_at, '%Y-%m') 
                 ORDER BY month ASC";
$revenueResult = mysqli_query($conPrem, $revenueMonthlyQuery);
if ($revenueResult) {
    while ($row = mysqli_fetch_assoc($revenueResult)) {
        $monthlyRevenue[] = [
            'month' => $row['month'],
            'revenue' => (float)$row['revenue'],
            'requests' => (int)$row['requests']
        ];
    }
}

// ====== OUTPUT ======
http_response_code(200);
echo json_encode([
    'status' => 'success',
    'data' => [
        'users' => [
            'total' => $totalUsers,
            'active' => $activeUsers,
            'blocked' => $blockedUsers,
            'dailySignups' => $dailySignups,
            'monthlySignups' => $monthlySignups
        ],
        'payments' => [
            'pending' => $pendingPayments,
            'approved' => $approvedPayments,
            'rejected' => $rejectedPayments,
            'total' => $totalPayments,
            'revenue' => $totalRevenue,
            'recentPayments' => $recentPayments,
            'monthlyRevenue' => $monthlyRevenue
        ]
    ]
]);

mysqli_close($conUser);
mysqli_close($conPrem);
?>
