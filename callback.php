<?php
session_start();

$code = $_GET['code'] ?? '';

if (!$code) {
    die("Login failed: No code provided.");
}

// Verify with yoSSO
$sso_url = 'http://localhost:8001/validate.php';

$ch = curl_init($sso_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, ['code' => $code]);
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code !== 200) {
    die("Login failed: SSO server error.");
}

$data = json_decode($response, true);

if ($data && isset($data['valid']) && $data['valid'] === true) {
    $_SESSION['user'] = $data['username'];
    header("Location: index.php");
    exit;
} else {
    die("Login failed: Invalid code.");
}
?>
