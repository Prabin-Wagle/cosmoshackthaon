<?php
// Database credentials
$user = "notelibr_testing";
$pass = "K~XrhW^g+FuvD;YN";

// Connect to Contents DB
$con = mysqli_connect('localhost', $user, $pass, 'notelibr_Contents');
if (!$con) {
    die("Contents DB connection failed: " . mysqli_connect_error());
}
$consub = mysqli_connect('localhost', $user, $pass, 'notelibr_subject');
if (!$consub) {
    die("Contents DB connection failed: " . mysqli_connect_error());
}

// Connect to Users DB
$conUser = mysqli_connect('localhost', $user, $pass, 'notelibr_Users');
if (!$conUser) {
    die("Users DB connection failed: " . mysqli_connect_error());
}

$conTest = mysqli_connect('localhost', $user, $pass, 'notelibr_Test');
if (!$conTest) {
    die("Test DB connection failed: " . mysqli_connect_error());
}

$conPrem = mysqli_connect('localhost', $user, $pass, 'notelibr_Premium');
if (!$conPrem) {
    die("Prem DB connection failed: " . mysqli_connect_error());
}

$conSupport = mysqli_connect('localhost', $user, $pass, 'notelibr_Support');
if (!$conSupport) {
    die("Support DB connection failed: " . mysqli_connect_error());
}
?>