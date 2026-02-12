<?php
require_once '../jwt.php';

// Encryption Constants (Shared with Frontend)
define('ENCRYPTION_KEY', 'NoteLibrarySecur3_2026_SecretKey');
define('ENCRYPTION_IV', '1234567890123456');

function decryptData($encryptedData) {
    try {
        $decrypted = openssl_decrypt($encryptedData, 'aes-256-cbc', ENCRYPTION_KEY, 0, ENCRYPTION_IV);
        return json_decode($decrypted, true);
    } catch (Exception $e) {
        return null;
    }
}

$path = '';
$token = '';

// Check for encrypted parameter 'd' (Support both GET and POST)
$encryptedData = isset($_GET['d']) ? $_GET['d'] : '';
if (empty($encryptedData)) {
    $input = file_get_contents('php://input');
    $postData = json_decode($input, true);
    $encryptedData = isset($postData['d']) ? $postData['d'] : '';
}

if (!empty($encryptedData)) {
    $decryptedData = decryptData($encryptedData);
    if ($decryptedData) {
        $path = isset($decryptedData['path']) ? $decryptedData['path'] : '';
        $token = isset($decryptedData['token']) ? $decryptedData['token'] : '';
    }
}

// Fallback for legacy support (Remove later for full security)
if (!$path) $path = isset($_GET['path']) ? $_GET['path'] : '';
if (!$token) {
    // Validate JWT token from header or fallback
    $authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (empty($authHeader)) {
        $authHeader = isset($_GET['token']) ? 'Bearer ' . $_GET['token'] : '';
    }

    if (!empty($authHead&& preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $token = $matches[1];
    }
}

if (empty($token)) {
    http_response_code(401);
    die('Unauthorized');
}

$payload = validateJWT($token);
if (!$payload) {
    http_response_code(401);
    die('Invalid session');
}

if (!$path) {
    http_response_code(400);
    die('Path required');
}

// Security: Ensure path doesn't try to escape storage root
if (strpos($path, '..') !== false) {
    http_response_code(403);
    die('Access denied');
}

$secureRoot = "/home/notelibr/php_secure_storage/";
$fullPath = $secureRoot . $path;

if (!file_exists($fullPath)) {
    http_response_code(404);
    die('File not found');
}

// Optimization: Caching Headers
$lastModifiedTime = filemtime($fullPath);
$etag = md5_file($fullPath);

header("Last-Modified: " . gmdate("D, d M Y H:i:s", $lastModifiedTime) . " GMT");
header("Etag: $etag");
header("Cache-Control: private, max-age=31536000, immutable"); 
header("Referrer-Policy: no-referrer");
header("X-Content-Type-Options: nosniff");

// Check if file has changed
if (isset($_SERVER['HTTP_IF_MODIFIED_SINCE']) && strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']) >= $lastModifiedTime) {
    http_response_code(304);
    exit();
}
if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH']) == $etag) {
    http_response_code(304);
    exit();
}

// Serve File or Watermark PDF
$mimeType = mime_content_type($fullPath);
$fileSize = filesize($fullPath);
$extension = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));

// Explicitly allow PDF processing based on extension OR mime
$isPDF = ($extension === 'pdf' || $mimeType === 'application/pdf');

if ($isPDF) {
    try {
        $libPath = __DIR__ . '/../lib/';
        
        // Final verified paths from Ultra Scan v3.0
        $fpdfFile = $libPath . 'fpdf.php';
        $fpdiFile = $libPath . 'FPDI-2.6.4/src/autoload.php';

        if (file_exists($fpdfFile) && file_exists($fpdiFile)) {
            require_once $fpdfFile;
            require_once $fpdiFile;

            if (class_exists('\setasign\Fpdi\Fpdi')) {
                class WatermarkedPDF extends \setasign\Fpdi\Fpdi {
                    protected $extgstates = array();

                    // Transparency support
                    function SetAlpha($alpha, $bm='Normal') {
                        $gs = $this->AddExtGState(array('ca'=>$alpha, 'CA'=>$alpha, 'BM'=>'/'.$bm));
                        $this->SetExtGState($gs);
                    }

                    function AddExtGState($parms) {
                        $n = count($this->extgstates)+1;
                        $this->extgstates[$n]['parms'] = $parms;
                        return $n;
                    }

                    function SetExtGState($gs) {
                        $this->_out(sprintf('/GS%d gs', $gs));
                    }

                    function _putextgstates() {
                        for ($i = 1; $i <= count($this->extgstates); $i++) {
                            $this->_newobj();
                            $this->extgstates[$i]['n'] = $this->n;
                            $this->_put('<</Type /ExtGState');
                            foreach ($this->extgstates[$i]['parms'] as $k=>$v) {
                                $this->_put('/'.$k.' '.$v);
                            }
                            $this->_put('>>');
                            $this->_put('endobj');
                        }
                    }

                    function _putresourcedict() {
                        parent::_putresourcedict();
                        $this->_put('/ExtGState <<');
                        foreach ($this->extgstates as $k=>$v) {
                            $this->_put('/GS'.$k.' '.$v['n'].' 0 R');
                        }
                        $this->_put('>>');
                    }

                    function _putresources() {
                        $this->_putextgstates();
                        parent::_putresources();
                    }

                    function RotatedImage($file, $x, $y, $w, $h, $angle) {
                        $this->_out(sprintf('q %.5F %.5F %.5F %.5F %.2F %.2F cm 1 0 0 1 %.2F %.2F cm', cos(deg2rad($angle)), sin(deg2rad($angle)), -sin(deg2rad($angle)), cos(deg2rad($angle)), $x, $y, -$x, -$y));
                        $this->Image($file, $x, $y, $w, $h);
                        $this->_out('Q');
                    }
                }

                $pdf = new WatermarkedPDF();
                $pageCount = $pdf->setSourceFile($fullPath);

                for ($n = 1; $n <= $pageCount; $n++) {
                    $tplIdx = $pdf->importPage($n);
                    $size = $pdf->getTemplateSize($tplIdx);

                    $pdf->AddPage($size['orientation'], array($size['width'], $size['height']));
                    
                    // 1. Render Note Content
                    $pdf->useTemplate($tplIdx);

                    // 2. Render Repeating Watermark Grid in Foreground
                    $pdf->SetAlpha(0.12); 
                    $watermarkImage = 'https://notelibraryapp.com/p.jpg';
                    $imgWidth = 30;
                    $imgHeight = 30;
                    $angle = 35; // Slightly shallower for pattern look
                    
                    $stepX = 120;
                    $stepY = 120;
                    
                    for ($x = -20; $x < $size['width'] + 100; $x += $stepX) {
                        for ($y = -20; $y < $size['height'] + 100; $y += $stepY) {
                            $pdf->RotatedImage($watermarkImage, $x, $y, $imgWidth, $imgHeight, $angle);
                        }
                    }
                    
                    // Reset Alpha for next page
                    $pdf->SetAlpha(1); 
                }

                if (ob_get_level()) ob_end_clean();
                header('Content-Type: application/pdf');
                header('Content-Disposition: inline; filename="Document.pdf"');
                $pdf->Output('I', 'Document.pdf');
                exit();
            }
        }
    } catch (Exception $e) {
        // Fallback to normal serving if anything fails
    }
}

header('Content-Type: ' . $mimeType);
header('Content-Length: ' . $fileSize);
header('Content-Disposition: inline; filename="File.' . $extension . '"');
header('Accept-Ranges: bytes');

if (ob_get_level()) ob_end_clean();

$file = fopen($fullPath, 'rb');
if ($file) {
    fpassthru($file);
    fclose($file);
}
exit();
?>
