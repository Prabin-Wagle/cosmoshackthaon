<?php
include('../db.php');
header('Content-Type: text/plain');

if (!isset($conPrem)) {
    die("Error: \$conPrem connection not found");
}

echo "Cleaning up duplicate pending requests...\n\n";

// Query to find duplicates (keep the latest one)
$query = "
    DELETE t1 FROM payment_requests t1
    INNER JOIN payment_requests t2 
    WHERE 
        t1.id < t2.id AND 
        t1.user_id = t2.user_id AND 
        t1.collection_id = t2.collection_id AND 
        t1.status = 'pending' AND 
        t2.status = 'pending'
";

if (mysqli_query($conPrem, $query)) {
    echo "Duplicates removed successfully. Only the latest request for each user/collection remains.\n";
} else {
    echo "Error removing duplicates: " . mysqli_error($conPrem) . "\n";
}
?>
