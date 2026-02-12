<?php

function updateStreak($conUser, $user_id) {
    date_default_timezone_set('Asia/Kathmandu');
    $today = date('Y-m-d');
    $yesterday = date('Y-m-d', strtotime('-1 day'));

    // Check if streak record exists
    $stQuery = "SELECT current_streak, last_activity_date, longest_streak FROM user_streaks WHERE user_id = '$user_id'";
    $resSt = mysqli_query($conUser, $stQuery);

    if ($stRow = mysqli_fetch_assoc($resSt)) {
        $currStreak = (int)$stRow['current_streak'];
        $lastDate = $stRow['last_activity_date'];
        $maxStreak = (int)$stRow['longest_streak'];

        if ($lastDate === $today) {
            // Already updated today
            return $currStreak;
        }

        if ($lastDate === $yesterday) {
            // Consecutive day
            $newStreak = $currStreak + 1;
        } else {
            // Streak broken
            $newStreak = 1;
        }

        $newMax = max($newStreak, $maxStreak);

        $upQuery = "UPDATE user_streaks SET 
                    current_streak = '$newStreak', 
                    last_activity_date = '$today', 
                    longest_streak = '$newMax' 
                    WHERE user_id = '$user_id'";
        mysqli_query($conUser, $upQuery);
        return $newStreak;

    } else {
        // First time streak
        $insQuery = "INSERT INTO user_streaks (user_id, current_streak, last_activity_date, longest_streak) 
                     VALUES ('$user_id', 1, '$today', 1)";
        mysqli_query($conUser, $insQuery);
        return 1;
    }
}
?>
