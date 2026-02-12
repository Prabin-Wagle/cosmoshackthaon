<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include '../db.php';
include '../jwt.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['email']) || !isset($input['password'])) {
    echo json_encode(['success' => false, 'message' => 'Email and password are required']);
    exit();
}

$email = mysqli_real_escape_string($conUser, $input['email']);
$password = $input['password'];

$query = "SELECT id, name, email, password, role FROM users WHERE email = '$email'";
$result = mysqli_query($conUser, $query);

if (!$result) {
    echo json_encode(['success' => false, 'message' => 'Database error']);
    exit();
}

if (mysqli_num_rows($result) === 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
    exit();
}

$user = mysqli_fetch_assoc($result);

if (!password_verify($password, $user['password'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
    exit();
}

if ($user['role'] !== 'admin') {
    echo json_encode(['success' => false, 'message' => 'Access denied. Admin privileges required.']);
    exit();
}

unset($user['password']);

$jwtPayload = [
    'user_id' => $user['id'],
    'email' => $user['email'],
    'role' => $user['role']
];

$token = generateJWT($jwtPayload, 86400);

echo json_encode([
    'success' => true,
    'message' => 'Login successful',
    'user' => $user,
    'token' => $token
]);
?>