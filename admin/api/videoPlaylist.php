<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include '../db.php';


$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getPlaylists($con);
        break;
    case 'POST':
        createPlaylist($con);
        break;
    case 'PUT':
        updatePlaylist($con);
        break;
    case 'DELETE':
        deletePlaylist($con);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

function getPlaylists($con) {
    $sql = "SELECT * FROM video_playlists ORDER BY created_at DESC";
    $result = mysqli_query($con, $sql);

    if ($result) {
        $playlists = [];
        while ($row = mysqli_fetch_assoc($result)) {
            $row['subjects'] = json_decode($row['subjects'], true);
            $row['id'] = (int)$row['id'];
            $playlists[] = $row;
        }
        echo json_encode(['success' => true, 'data' => $playlists]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => mysqli_error($con)]);
    }
}

function createPlaylist($con) {
    $data = json_decode(file_get_contents('php://input'), true);

    $title = mysqli_real_escape_string($con, $data['title']);
    $description = mysqli_real_escape_string($con, $data['description']);
    $thumbnail = mysqli_real_escape_string($con, $data['thumbnail']);
    $class_level = mysqli_real_escape_string($con, $data['class_level']);
    $faculty = mysqli_real_escape_string($con, $data['faculty']);
    $competitive_exam = mysqli_real_escape_string($con, $data['competitive_exam']);
    $subjects = mysqli_real_escape_string($con, json_encode($data['subjects']));

    $sql = "INSERT INTO video_playlists (title, description, thumbnail, class_level, faculty, competitive_exam, subjects)
            VALUES ('$title', '$description', '$thumbnail', '$class_level', '$faculty', '$competitive_exam', '$subjects')";

    if (mysqli_query($con, $sql)) {
        $id = mysqli_insert_id($con);
        echo json_encode(['success' => true, 'id' => $id, 'message' => 'Playlist created successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => mysqli_error($con)]);
    }
}

function updatePlaylist($con) {
    $data = json_decode(file_get_contents('php://input'), true);

    $id = intval($data['id']);
    $title = mysqli_real_escape_string($con, $data['title']);
    $description = mysqli_real_escape_string($con, $data['description']);
    $thumbnail = mysqli_real_escape_string($con, $data['thumbnail']);
    $class_level = mysqli_real_escape_string($con, $data['class_level']);
    $faculty = mysqli_real_escape_string($con, $data['faculty']);
    $competitive_exam = mysqli_real_escape_string($con, $data['competitive_exam']);
    $subjects = mysqli_real_escape_string($con, json_encode($data['subjects']));

    $sql = "UPDATE video_playlists SET
            title = '$title',
            description = '$description',
            thumbnail = '$thumbnail',
            class_level = '$class_level',
            faculty = '$faculty',
            competitive_exam = '$competitive_exam',
            subjects = '$subjects'
            WHERE id = $id";

    if (mysqli_query($con, $sql)) {
        echo json_encode(['success' => true, 'message' => 'Playlist updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => mysqli_error($con)]);
    }
}

function deletePlaylist($con) {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid ID']);
        return;
    }

    $sql = "DELETE FROM video_playlists WHERE id = $id";

    if (mysqli_query($con, $sql)) {
        echo json_encode(['success' => true, 'message' => 'Playlist deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => mysqli_error($con)]);
    }
}
?>
