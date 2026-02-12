<?php
include('../db.php');
include('../jwt.php');
header('Content-Type:application/json');
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = ['http://localhost:5173', 'http://localhost:3000', 'https://notelibraryapp.com'];
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: https://notelibraryapp.com');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Validate JWT token
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

$class = isset($_POST['class']) ? $_POST['class'] : null;
$subjectName = isset($_POST['subjectName']) ? $_POST['subjectName'] : null;
if($class===null || $subjectName===null){
    echo "Not Authorized";
    return;
}
$res = mysqli_query($con, "select * from grammar where class = '$class' and subjectName = '$subjectName'");
if(mysqli_num_rows($res)>0){
    while($row = mysqli_fetch_assoc($res)){
        $arr[] = $row;
    }
    echo json_encode(['data' => $arr,'status'=>'true']);

}else{
    echo json_encode(['data' => [],'status'=>'false']);

}
?>

