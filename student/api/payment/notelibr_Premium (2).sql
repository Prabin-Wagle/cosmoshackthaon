-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Jan 22, 2026 at 12:04 PM
-- Server version: 10.6.24-MariaDB
-- PHP Version: 8.4.16

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `notelibr_Premium`
--

-- --------------------------------------------------------

--
-- Table structure for table `user_series_access`
--

CREATE TABLE `user_series_access` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `collection_id` int(11) NOT NULL,
  `granted_by` int(11) DEFAULT NULL COMMENT 'Admin ID who granted access',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_series_access`
--

INSERT INTO `user_series_access` (`id`, `user_id`, `collection_id`, `granted_by`, `created_at`) VALUES
(2, 11, 2, 999, '2025-12-17 13:03:41'),
(7, 7, 1, 0, '2025-12-20 14:38:17'),
(8, 7, 2, 7, '2025-12-20 16:00:13'),
(9, 3, 2, 7, '2025-12-22 15:25:34'),
(11, 3, 1, 7, '2026-01-18 12:26:05'),
(13, 11, 1, 7, '2026-01-18 16:54:45');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `user_series_access`
--
ALTER TABLE `user_series_access`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_access` (`user_id`,`collection_id`),
  ADD KEY `fk_access_collection` (`collection_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `user_series_access`
--
ALTER TABLE `user_series_access`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `user_series_access`
--
ALTER TABLE `user_series_access`
  ADD CONSTRAINT `fk_access_collection` FOREIGN KEY (`collection_id`) REFERENCES `test_series_collections` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
