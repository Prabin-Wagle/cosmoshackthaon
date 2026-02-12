<?php
include('../db.php');
include('../jwt.php');
include('../encrypt_helper.php');

// Set Timezone to Nepal to match DB and User context
date_default_timezone_set('Asia/Kathmandu');

// Attempt to include FPDF - User must ensure this file exists
if (file_exists('../lib/fpdf.php')) {
    require('../lib/fpdf.php');
} else {
    // Fallback or Error if library is missing
    header('Content-Type:application/json');
    echo json_encode(['status' => 'false', 'message' => 'PDF Library missing on server (api/lib/fpdf.php)']);
    exit();
}

header('Content-Type:application/json');

// --- CORS Configuration ---
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = ['http://localhost:5173', 'http://localhost:3000', 'https://notelibraryapp.com'];
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: https://notelibraryapp.com');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. Validate Token
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['status' => 'false', 'message' => 'Unauthorized']);
    exit();
}

$token = $matches[1];
$payload = validateJWT($token);
if (!$payload || !isset($payload['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'false', 'message' => 'Invalid token']);
    exit();
}

$quiz_id = isset($_POST['quiz_id']) ? intval($_POST['quiz_id']) : 0;
if ($quiz_id <= 0) {
    echo json_encode(['status' => 'false', 'message' => 'Invalid Quiz ID']);
    exit();
}

// --- CONFIGURATION ---
$uploadDir = '../../upload/result/';
$logoUrl = 'https://notelibraryapp.com/p.jpg';
$fileName = "live_result_{$quiz_id}.pdf";
$filePath = $uploadDir . $fileName;
$publicUrl = "https://notelibraryapp.com/upload/result/" . $fileName; 

// Check if directory exists
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// 2. CHECK EXISTING PDF
if (file_exists($filePath)) {
    // If it exists, checking if it's "stale" is tricky without more logic. 
    // For now, prompt implies "after exam is complete result is prepared". 
    // We assume if it exists, it's good. 
    // OPTIONAL: Re-generate if requested or if file is old? 
    // Let's stick to: If exists, return it.
    echo json_encode(['status' => 'true', 'pdf_url' => $publicUrl, 'message' => 'File retrieved']);
    exit();
}

// 3. GENERATE PDF

// B. Fetch Quiz Details
$qIdx = $conPrem->prepare("SELECT quiz_title, end_time FROM test_series WHERE id = ?");
$qIdx->bind_param("i", $quiz_id);
$qIdx->execute();
$qIdx->bind_result($quizTitle, $endTime);
if (!$qIdx->fetch()) {
    $qIdx->close();
    echo json_encode(['status' => 'false', 'message' => 'Quiz not found']);
    exit();
}
$qIdx->close();

// A. Check if Quiz is Ended (STRICT CHECK)
$now = new DateTime();
$end = new DateTime($endTime);
if ($now < $end) {
    echo json_encode([
        'status' => 'false', 
        'message' => 'Result will be published after exam completion.',
        'publish_date' => $end->format('Y-m-d H:i')
    ]);
    exit();
}

// C. Fetch Leaderboard Data (Top 100 for PDF)
$query = "
    SELECT 
        qa.user_id,
        qa.score, 
        (SELECT SUM(time_spent) FROM quiz_attempt_details WHERE attempt_id = qa.id) as total_time
    FROM quiz_attempts qa
    WHERE qa.quiz_id = ? AND qa.attempt_number = 1
    ORDER BY qa.score DESC, total_time ASC
    LIMIT 100
";

$stmt = $conPrem->prepare($query);
$stmt->bind_param("i", $quiz_id);
$stmt->execute();
$stmt->bind_result($u_id, $sc, $tt);

$rankings = [];
while ($stmt->fetch()) {
    $rankings[] = ['uid' => $u_id, 'score' => $sc, 'time' => $tt];
}
$stmt->close();

// D. Fetch Names
if (!empty($rankings)) {
    $uids = array_map(function($r) { return $r['uid']; }, $rankings);
    $uidStr = implode(',', $uids);
    $uRes = $conUser->query("SELECT id, name FROM users WHERE id IN ($uidStr)");
    $userNames = [];
    while ($urow = $uRes->fetch_assoc()) {
        $userNames[$urow['id']] = $urow['name'];
    }
}

// E. Create PDF with FPDF
class PDF extends FPDF {
    protected $colTitle;
    protected $logo;

    function setHeaderData($title, $logo) {
        $this->colTitle = $title;
        $this->logo = $logo;
    }

    function Header() {
        // Logo
        if ($this->logo && file_exists($this->logo)) {
            try {
                $this->Image($this->logo, 10, 6, 20); // X, Y, W
            } catch (Exception $e) { }
        }
        // Arial bold 15
        $this->SetFont('Arial', 'B', 15);
        // Move to the right
        $this->Cell(30);
        // Title
        $this->Cell(130, 10, 'Note Library - Live Quiz Result', 0, 0, 'C');
        // Line break
        $this->Ln(20);
        
        $this->SetFont('Arial', 'B', 12);
        $this->Cell(0, 10, $this->colTitle, 0, 1, 'C');
        $this->Ln(5);

        // Date
        $this->SetFont('Arial', 'I', 10);
        $this->Cell(0, 10, 'Generated on: ' . date('Y-m-d H:i'), 0, 1, 'R');
        $this->Ln(5);
        
        // Table Header
        $this->SetFillColor(230, 240, 255);
        $this->SetFont('Arial', 'B', 10);
        $this->Cell(20, 10, 'Rank', 1, 0, 'C', true);
        $this->Cell(100, 10, 'Student Name', 1, 0, 'L', true);
        $this->Cell(30, 10, 'Score', 1, 0, 'C', true);
        $this->Cell(40, 10, 'Time Taken', 1, 1, 'C', true);
    }

    function Footer() {
        $this->SetY(-15);
        $this->SetFont('Arial', 'I', 8);
        $this->Cell(0, 10, 'Page ' . $this->PageNo() . '/{nb}', 0, 0, 'C');
    }
}

// Handle Logo - Download to Temp using CURL (more robust)
$localLogo = '../lib/temp_logo_' . uniqid() . '.jpg';
$logoSuccess = false;

$ch = curl_init($logoUrl);
$fp = fopen($localLogo, 'wb');
if ($ch && $fp) {
    curl_setopt($ch, CURLOPT_FILE, $fp);
    curl_setopt($ch, CURLOPT_HEADER, 0);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Ignore SSL strictness for internal op
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    fclose($fp);

    if ($httpCode == 200 && filesize($localLogo) > 0) {
        $logoSuccess = true;
    }
}
// Fallback if CURL fails or file is empty
if (!$logoSuccess && file_exists($localLogo)) {
    unlink($localLogo);
}

$pdf = new PDF();
$pdf->AliasNbPages();
$pdf->setHeaderData($quizTitle, $logoSuccess ? $localLogo : '');
$pdf->AddPage();
$pdf->SetFont('Arial', '', 10);

$rank = 1;
foreach ($rankings as $row) {
    $name = isset($userNames[$row['uid']]) ? $userNames[$row['uid']] : 'Student #' . $row['uid'];
    $score = number_format($row['score'], 1);
    
    // Format Time (Seconds to MM:SS)
    $m = floor($row['time'] / 60);
    $s = $row['time'] % 60;
    $timeStr = sprintf("%02d:%02d", $m, $s);

    $pdf->Cell(20, 10, $rank++, 1, 0, 'C');
    $pdf->Cell(100, 10, $name, 1, 0, 'L');
    $pdf->Cell(30, 10, $score, 1, 0, 'C');
    $pdf->Cell(40, 10, $timeStr, 1, 1, 'C');
}

$pdf->Output('F', $filePath);

// Clean up temp logo
if (file_exists($localLogo)) {
    unlink($localLogo);
}

echo json_encode(['status' => 'true', 'pdf_url' => $publicUrl, 'message' => 'PDF Generated']);
?>
