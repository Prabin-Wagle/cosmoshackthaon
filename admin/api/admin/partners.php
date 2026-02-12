<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include '../db.php';
include '../jwt.php';

// Authentication check
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
$token = str_replace('Bearer ', '', $authHeader);
$userData = validateJWT($token);

if (!$userData || $userData['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
    exit();
}

// Auto-create table if not exists
$createTableQuery = "CREATE TABLE IF NOT EXISTS partners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50),
    logo_url VARCHAR(255),
    featured_image_url VARCHAR(255),
    description TEXT,
    location VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(255),
    programs TEXT,
    students VARCHAR(50),
    established VARCHAR(20),
    is_featured BOOLEAN DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)";
mysqli_query($con, $createTableQuery);

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $query = "SELECT * FROM partners ORDER BY created_at DESC";
        $result = mysqli_query($con, $query);
        $partners = [];
        
        if ($result) {
            while ($row = mysqli_fetch_assoc($result)) {
                $partners[] = $row;
            }
            echo json_encode(['success' => true, 'data' => $partners]);
        } else {
            echo json_encode(['success' => false, 'message' => mysqli_error($con)]);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        
        $name = mysqli_real_escape_string($con, $data['name']);
        $short_name = mysqli_real_escape_string($con, $data['short_name'] ?? '');
        $logo_url = mysqli_real_escape_string($con, $data['logo_url'] ?? '');
        $featured_image_url = mysqli_real_escape_string($con, $data['featured_image_url'] ?? '');
        $description = mysqli_real_escape_string($con, $data['description'] ?? '');
        $location = mysqli_real_escape_string($con, $data['location'] ?? '');
        $phone = mysqli_real_escape_string($con, $data['phone'] ?? '');
        $email = mysqli_real_escape_string($con, $data['email'] ?? '');
        $website = mysqli_real_escape_string($con, $data['website'] ?? '');
        $programs = mysqli_real_escape_string($con, $data['programs'] ?? '');
        $students = mysqli_real_escape_string($con, $data['students'] ?? '');
        $established = mysqli_real_escape_string($con, $data['established'] ?? '');
        $is_featured = (int)($data['is_featured'] ?? 0);
        $status = mysqli_real_escape_string($con, $data['status'] ?? 'active');

        // If this is set as featured, un-feature others (keeping only one featured)
        if ($is_featured === 1) {
            mysqli_query($con, "UPDATE partners SET is_featured = 0");
        }

        $query = "INSERT INTO partners (name, short_name, logo_url, featured_image_url, description, location, phone, email, website, programs, students, established, is_featured, status) 
                  VALUES ('$name', '$short_name', '$logo_url', '$featured_image_url', '$description', '$location', '$phone', '$email', '$website', '$programs', '$students', '$established', $is_featured, '$status')";
        
        if (mysqli_query($con, $query)) {
            echo json_encode(['success' => true, 'message' => 'Partner created successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => mysqli_error($con)]);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"), true);
        $id = (int)$data['id'];
        
        $name = mysqli_real_escape_string($con, $data['name']);
        $short_name = mysqli_real_escape_string($con, $data['short_name']);
        $logo_url = mysqli_real_escape_string($con, $data['logo_url']);
        $featured_image_url = mysqli_real_escape_string($con, $data['featured_image_url']);
        $description = mysqli_real_escape_string($con, $data['description']);
        $location = mysqli_real_escape_string($con, $data['location']);
        $phone = mysqli_real_escape_string($con, $data['phone']);
        $email = mysqli_real_escape_string($con, $data['email']);
        $website = mysqli_real_escape_string($con, $data['website']);
        $programs = mysqli_real_escape_string($con, $data['programs']);
        $students = mysqli_real_escape_string($con, $data['students']);
        $established = mysqli_real_escape_string($con, $data['established']);
        $is_featured = (int)$data['is_featured'];
        $status = mysqli_real_escape_string($con, $data['status']);

        if ($is_featured === 1) {
            mysqli_query($con, "UPDATE partners SET is_featured = 0 WHERE id != $id");
        }

        $query = "UPDATE partners SET 
                  name = '$name', 
                  short_name = '$short_name', 
                  logo_url = '$logo_url', 
                  featured_image_url = '$featured_image_url',
                  description = '$description', 
                  location = '$location', 
                  phone = '$phone', 
                  email = '$email', 
                  website = '$website', 
                  programs = '$programs',
                  students = '$students',
                  established = '$established',
                  is_featured = $is_featured, 
                  status = '$status' 
                  WHERE id = $id";
        
        if (mysqli_query($con, $query)) {
            echo json_encode(['success' => true, 'message' => 'Partner updated successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => mysqli_error($con)]);
        }
        break;

    case 'DELETE':
        $id = (int)$_GET['id'];
        $query = "DELETE FROM partners WHERE id = $id";
        
        if (mysqli_query($con, $query)) {
            echo json_encode(['success' => true, 'message' => 'Partner deleted successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => mysqli_error($con)]);
        }
        break;
}
?>
