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

$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$token = str_replace('Bearer ', '', $authHeader);
$userData = validateJWT($token);

if (!$userData || $userData['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Unauthorized access. Admin privileges required."]);
    exit;
}

// Join tickets with users to get user names and emails
// Note: we need to use the correct connections from db.php
// $conUser is for notelibr_Users, $conSupport is for notelibr_Support
// Since they are likely on the same server, we might need to use full table names if cross-db joins are supported,
// or fetch separately. Given the current structure, let's fetch tickets and then map users if join is tricky.
// However, standard PHP projects often allow cross-db queries if same credentials.

$tickets_query = "SELECT t.* FROM tickets t ORDER BY t.created_at DESC";
$tickets_result = mysqli_query($conSupport, $tickets_query);

if (!$tickets_result) {
    echo json_encode(["success" => false, "message" => "Database error: " . mysqli_error($conSupport)]);
    exit;
}

$tickets = [];
while ($row = mysqli_fetch_assoc($tickets_result)) {
    // Fetch user info for each ticket
    $u_id = $row['user_id'];
    $user_query = "SELECT name, email, profile_picture FROM users WHERE id = $u_id";
    $user_result = mysqli_query($conUser, $user_query);
    $u_info = mysqli_fetch_assoc($user_result);
    
    if ($u_info) {
        $row['user_name'] = $u_info['name'];
        $row['user_email'] = $u_info['email'];
        $row['user_profile_picture'] = $u_info['profile_picture'];
    } else {
        $row['user_name'] = "Unknown User";
        $row['user_email'] = "N/A";
        $row['user_profile_picture'] = null;
    }
    
    $tickets[] = $row;
}

echo json_encode([
    "success" => true,
    "tickets" => $tickets
]);

mysqli_close($conSupport);
mysqli_close($conUser);
?>
