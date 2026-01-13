<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$path = $_GET['path'] ?? '';
$file = $_GET['file'] ?? '';
$offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

if (!$path || !$file) {
    echo json_encode(['error' => 'Missing parameters']);
    exit;
}

$fullPath = rtrim($path, '/') . '/' . $file;

if (!file_exists($fullPath)) {
    // If file doesn't exist yet, just return empty with same offset
    echo json_encode(['content' => '', 'offset' => $offset, 'exists' => false]);
    exit;
}

clearstatcache(false, $fullPath);
$size = filesize($fullPath);

// If file was truncated, reset offset
if ($size < $offset) {
    $offset = 0;
}

// If no new data
if ($size == $offset) {
    echo json_encode(['content' => '', 'offset' => $offset, 'exists' => true]);
    exit;
}

$handle = fopen($fullPath, 'r');
fseek($handle, $offset);
$content = "";
// Read up to current size
while (ftell($handle) < $size) {
    $content .= fgets($handle);
}
$newOffset = ftell($handle);
fclose($handle);

echo json_encode([
    'content' => $content,
    'offset' => $newOffset,
    'exists' => true
]);
