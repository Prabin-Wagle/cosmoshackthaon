<?php
// Define the encryption key (In production, move this to .env or outside webroot)
include_once 'config_key.php';

// Check if key exists
if (!defined('SECRET_ENCRYPTION_KEY')) {
    die('Encryption key not configured.');
}

define('ENCRYPTION_KEY', SECRET_ENCRYPTION_KEY);
define('ENCRYPTION_METHOD', 'aes-256-cbc');

function encrypt_data($data) {
    $key = ENCRYPTION_KEY;
    $plaintext = json_encode($data);
    $ivLength = openssl_cipher_iv_length(ENCRYPTION_METHOD);
    $iv = openssl_random_pseudo_bytes($ivLength);
    
    $encrypted = openssl_encrypt($plaintext, ENCRYPTION_METHOD, $key, 0, $iv);
    
    // Return IV + Encrypted Data (Example format: IV:EncryptedString)
    return base64_encode($iv . '::' . $encrypted);
}

function send_encrypted_response($data) {
    header('Content-Type: application/json');
    
    // Check if we should actually encrypt (e.g., debug mode off)
    // For now, always encrypt
    $encryptedPayload = encrypt_data($data);
    
    echo json_encode([
        'encrypted' => true,
        'payload' => $encryptedPayload
    ]);
    exit();
}
?>
