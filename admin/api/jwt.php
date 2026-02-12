<?php
define('JWT_SECRET_KEY', 'your-secret-key-change-this-in-production-2024');

function base64UrlEncode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}

function generateJWT($payload, $expiresIn = 86400) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);

    $payload['iat'] = time();
    $payload['exp'] = time() + $expiresIn;

    $base64UrlHeader = base64UrlEncode($header);
    $base64UrlPayload = base64UrlEncode(json_encode($payload));

    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET_KEY, true);
    $base64UrlSignature = base64UrlEncode($signature);

    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function validateJWT($jwt) {
    if (empty($jwt)) {
        return false;
    }

    $tokenParts = explode('.', $jwt);

    if (count($tokenParts) !== 3) {
        return false;
    }

    $header = base64UrlDecode($tokenParts[0]);
    $payload = base64UrlDecode($tokenParts[1]);
    $signatureProvided = $tokenParts[2];

    $signature = hash_hmac('sha256', $tokenParts[0] . "." . $tokenParts[1], JWT_SECRET_KEY, true);
    $base64UrlSignature = base64UrlEncode($signature);

    if ($base64UrlSignature !== $signatureProvided) {
        return false;
    }

    $payloadData = json_decode($payload, true);

    if (!isset($payloadData['exp']) || $payloadData['exp'] < time()) {
        return false;
    }

    return $payloadData;
}
?>
