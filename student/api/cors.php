<?php
// Centralized CORS configuration
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = [
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'https://student.notelibraryapp.com',
    'https://notelibraryapp.com'
];

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else if (empty($origin)) {
    // Optional: Allow requests with no origin (e.g., from server-side or certain tools)
    // header("Access-Control-Allow-Origin: *"); 
}

header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE, PUT');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>
