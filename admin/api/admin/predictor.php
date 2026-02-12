<?php
header('Content-Type: application/json');
// Only allow requests with the custom header
if (!isset($_SERVER['HTTP_X_REQUESTED_BY']) || $_SERVER['HTTP_X_REQUESTED_BY'] !== 'MEC-Predictor') {
    http_response_code(403);
    echo json_encode(["error" => "Forbidden: Invalid request source."]);
    exit;
}

include '../db.php';

function fetchJSON($con, $table) {
    $sql = "SELECT json_data FROM $table";
    $result = $con->query($sql);
    $data = [];
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $decoded = json_decode($row['json_data'], true);
            if ($decoded !== null) {
                $data = array_merge($data, $decoded);
            }
        }
    }
    return $data;
}

function fetchScholarshipColleges($con) {
    $sql = "SELECT json_data FROM mbbs_sc";
    $result = $con->query($sql);
    $data = [];
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $decoded = json_decode($row['json_data'], true);
            if ($decoded !== null) {
                $data = array_merge($data, $decoded);
            }
        }
    }
    return $data;
}

$response = [
    "MBBS" => fetchJSON($con, "mbbs"),
    "BDS" => fetchJSON($con, "bds"),
    "NURSING" => fetchJSON($con, "nursing"),
    "MBBS_SCHOLARSHIP" => fetchScholarshipColleges($con)
];

echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
