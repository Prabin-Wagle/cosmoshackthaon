<?php
include '../db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');

$method = $_SERVER['REQUEST_METHOD'];
$user_id = $_REQUEST['user_id'] ?? null;

if (!$user_id) {
    echo json_encode(['status' => 'error', 'message' => 'User ID required']);
    exit;
}

if ($method === 'GET') {
    $start_date = $_GET['start_date'] ?? date('Y-m-d', strtotime('monday this week'));
    $end_date = $_GET['end_date'] ?? date('Y-m-d', strtotime('sunday this week'));
    
    $query = "SELECT * FROM study_targets 
              WHERE user_id = '$user_id' 
              AND target_date BETWEEN '$start_date' AND '$end_date' 
              ORDER BY target_date ASC";
    $res = mysqli_query($conUser, $query);
    $targets = [];
    while($row = mysqli_fetch_assoc($res)) {
        $targets[] = $row;
    }
    echo json_encode(['status' => 'success', 'targets' => $targets]);
} elseif ($method === 'POST') {
    $action = $_POST['action'] ?? 'add';
    
    if ($action === 'add') {
        $label = mysqli_real_escape_string($conUser, $_POST['label']);
        $date = $_POST['target_date'] ?? date('Y-m-d');
        $query = "INSERT INTO study_targets (user_id, label, target_date, progress, is_completed) VALUES ('$user_id', '$label', '$date', 0, 0)";
    } elseif ($action === 'update') {
        $id = $_POST['id'];
        $progress = $_POST['progress'];
        $is_completed = $progress >= 100 ? 1 : 0;
        $query = "UPDATE study_targets SET progress = '$progress', is_completed = '$is_completed' WHERE id = '$id' AND user_id = '$user_id'";
    } elseif ($action === 'rename') {
        $id = $_POST['id'];
        $label = mysqli_real_escape_string($conUser, $_POST['label']);
        $query = "UPDATE study_targets SET label = '$label' WHERE id = '$id' AND user_id = '$user_id'";
    } elseif ($action === 'delete') {
        $id = $_POST['id'];
        $query = "DELETE FROM study_targets WHERE id = '$id' AND user_id = '$user_id'";
    }
    
    if (mysqli_query($conUser, $query)) {
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => mysqli_error($conUser)]);
    }
}
?>
