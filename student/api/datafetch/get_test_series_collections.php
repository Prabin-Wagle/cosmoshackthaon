<?php
include('../db.php');
include('../jwt.php');
header('Content-Type:application/json');

// Standard CORS headers
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = ['http://localhost:5173', 'http://localhost:3000', 'https://notelibraryapp.com'];
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: https://notelibraryapp.com');
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$query = "SELECT * FROM test_series_collections ORDER BY created_at DESC";
$res = mysqli_query($conPrem, $query);

if (!$res) {
    http_response_code(500);
    echo json_encode(['status' => 'false', 'message' => 'Database error: ' . mysqli_error($con)]);
    exit();
}

if(mysqli_num_rows($res) > 0){
    $arr = [];
    while($row = mysqli_fetch_assoc($res)){
        // Cast types
        $row['id'] = (int)$row['id'];
        $row['price'] = (float)$row['price'];
        if($row['discount_price']) $row['discount_price'] = (float)$row['discount_price'];
        
        $arr[] = $row;
    }
    echo json_encode(['data' => $arr,'status'=>'true']);
} else {
    echo json_encode(['data' => [],'status'=>'false', 'message' => 'No collections found']);
}
?>
