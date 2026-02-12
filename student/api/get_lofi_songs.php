<?php
header('Content-Type: application/json');
include 'cors.php';

// The 'lofi' folder is now inside the 'api' folder
$lofiDir = __DIR__ . '/lofi/';
$songs = [];

if (is_dir($lofiDir)) {
    $files = scandir($lofiDir);
    foreach ($files as $file) {
        // Only include mp3 files
        if (pathinfo($file, PATHINFO_EXTENSION) === 'mp3') {
            // Create a nice title from the filename (remove extension and replace underscores/hyphens)
            $title = pathinfo($file, PATHINFO_FILENAME);
            $title = str_replace(['_', '-'], ' ', $title);
            $title = ucwords($title);

            $songs[] = [
                'title' => $title,
                'artist' => 'Lofi Library',
                'url' => 'https://notelibraryapp.com/api/lofi/' . rawurlencode($file)
            ];
        }
    }
}

if (empty($songs)) {
    // Fallback if no songs found in folder
    $songs = [
        [
            'title' => 'Sample Lofi',
            'artist' => 'Mixkit',
            'url' => 'https://assets.mixkit.co/music/preview/mixkit-lofi-night-123.mp3'
        ]
    ];
}

echo json_encode([
    'status' => 'success',
    'data' => $songs
]);
?>
