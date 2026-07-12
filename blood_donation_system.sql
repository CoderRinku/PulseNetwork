-- MySQL Database Schema & Seed Data
-- Database Name: blood_donation_system
-- Created for: Online Blood Donation & Blood Bank Finder System

CREATE DATABASE IF NOT EXISTS `blood_donation_system` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `blood_donation_system`;

-- --------------------------------------------------------
-- Table structure for table `users`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('Admin', 'Donor', 'Patient', 'Blood Bank / Hospital') NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `nid_birth_cert` VARCHAR(50) NOT NULL,
  `status` ENUM('Active', 'Pending', 'Inactive') NOT NULL DEFAULT 'Active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `donors`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `donors` (
  `user_id` VARCHAR(50) NOT NULL,
  `blood_group` ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
  `age` INT NOT NULL,
  `weight` INT NOT NULL,
  `permanent_area` VARCHAR(255) NOT NULL,
  `division` VARCHAR(100) NOT NULL,
  `district` VARCHAR(100) NOT NULL,
  `thana` VARCHAR(100) NOT NULL,
  `lat` DECIMAL(10, 8) NOT NULL,
  `lng` DECIMAL(11, 8) NOT NULL,
  `last_donation_date` TIMESTAMP NULL,
  `is_eligible` BOOLEAN NOT NULL DEFAULT TRUE,
  `response_rate` INT NOT NULL DEFAULT 100,
  `activity_score` INT NOT NULL DEFAULT 80,
  `total_donations` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `blood_banks`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `blood_banks` (
  `user_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `verification_status` ENUM('Pending', 'Verified', 'Rejected') NOT NULL DEFAULT 'Pending',
  `division` VARCHAR(100) NOT NULL,
  `district` VARCHAR(100) NOT NULL,
  `thana` VARCHAR(100) NOT NULL,
  `lat` DECIMAL(10, 8) NOT NULL,
  `lng` DECIMAL(11, 8) NOT NULL,
  `contact_no` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `blood_inventory`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `blood_inventory` (
  `id` INT AUTO_INCREMENT,
  `blood_bank_id` VARCHAR(50) NOT NULL,
  `blood_group` ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
  `quantity` INT NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_bank_group` (`blood_bank_id`, `blood_group`),
  FOREIGN KEY (`blood_bank_id`) REFERENCES `blood_banks` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `emergency_requests`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `emergency_requests` (
  `id` VARCHAR(50) NOT NULL,
  `patient_id` VARCHAR(50) NOT NULL,
  `blood_group` ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
  `units_needed` INT NOT NULL DEFAULT 1,
  `hospital_name` VARCHAR(150) NOT NULL,
  `location_details` VARCHAR(255) NOT NULL,
  `division` VARCHAR(100) NOT NULL,
  `district` VARCHAR(100) NOT NULL,
  `thana` VARCHAR(100) NOT NULL,
  `lat` DECIMAL(10, 8) NOT NULL,
  `lng` DECIMAL(11, 8) NOT NULL,
  `urgency_level` ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
  `status` ENUM('Pending', 'Approved', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `messages`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `messages` (
  `id` VARCHAR(50) NOT NULL,
  `sender_id` VARCHAR(50) NOT NULL,
  `receiver_id` VARCHAR(50) NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `donation_history`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `donation_history` (
  `id` VARCHAR(50) NOT NULL,
  `donor_id` VARCHAR(50) NOT NULL,
  `recipient_id` VARCHAR(50) NOT NULL,
  `recipient_type` VARCHAR(50) NOT NULL,
  `donation_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `units_donated` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`donor_id`) REFERENCES `donors` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Geographic Coordinates and Index Optimization
-- --------------------------------------------------------
CREATE INDEX `idx_geo_donor` ON `donors` (`division`, `district`, `thana`);
CREATE INDEX `idx_geo_request` ON `emergency_requests` (`division`, `district`, `thana`, `urgency_level`);

-- --------------------------------------------------------
-- Seed Data Inserting
-- --------------------------------------------------------
-- Passwords below are encrypted using bcrypt representation of 'password123'
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `phone`, `nid_birth_cert`, `status`, `created_at`) VALUES
('user-admin', 'Super Administrator', 'admin@blooddonation.org', '$2a$10$U.yGzN7o.n9M19p0l.cT8eRz.WbZc/5qF4z6n.VfM3vWzHj1y45yO', 'Admin', '+8801711111111', '123456789012', 'Active', NOW() - INTERVAL 30 DAY),
('user-donor-1', 'Tanvir Rahman', 'tanvir@gmail.com', '$2a$10$U.yGzN7o.n9M19p0l.cT8eRz.WbZc/5qF4z6n.VfM3vWzHj1y45yO', 'Donor', '+8801722222222', '987654321098', 'Active', NOW() - INTERVAL 25 DAY),
('user-donor-2', 'Anika Tasnim', 'anika@gmail.com', '$2a$10$U.yGzN7o.n9M19p0l.cT8eRz.WbZc/5qF4z6n.VfM3vWzHj1y45yO', 'Donor', '+8801733333333', '456789012345', 'Active', NOW() - INTERVAL 20 DAY),
('user-donor-3', 'Rakib Hasan', 'rakib@gmail.com', '$2a$10$U.yGzN7o.n9M19p0l.cT8eRz.WbZc/5qF4z6n.VfM3vWzHj1y45yO', 'Donor', '+8801744444444', '654321098765', 'Active', NOW() - INTERVAL 15 DAY),
('user-patient-1', 'Sajjad Hossain', 'sajjad@gmail.com', '$2a$10$U.yGzN7o.n9M19p0l.cT8eRz.WbZc/5qF4z6n.VfM3vWzHj1y45yO', 'Patient', '+8801755555555', '321098765432', 'Active', NOW() - INTERVAL 10 DAY),
('user-bb-1', 'Dhaka Central Blood Bank', 'dhakabb@pulsenetwork.org', '$2a$10$U.yGzN7o.n9M19p0l.cT8eRz.WbZc/5qF4z6n.VfM3vWzHj1y45yO', 'Blood Bank / Hospital', '+8801766666666', 'BB-VERIFY-1002', 'Active', NOW() - INTERVAL 40 DAY),
('user-bb-2', 'Sylhet Red Crescent Society', 'sylhetred@pulsenetwork.org', '$2a$10$U.yGzN7o.n9M19p0l.cT8eRz.WbZc/5qF4z6n.VfM3vWzHj1y45yO', 'Blood Bank / Hospital', '+8801777777777', 'BB-VERIFY-1003', 'Pending', NOW());

INSERT INTO `donors` (`user_id`, `blood_group`, `age`, `weight`, `permanent_area`, `division`, `district`, `thana`, `lat`, `lng`, `last_donation_date`, `is_eligible`, `response_rate`, `activity_score`, `total_donations`) VALUES
('user-donor-1', 'A+', 26, 72, 'Mirpur-10, Dhaka', 'Dhaka', 'Dhaka', 'Mirpur', 23.80410000, 90.36260000, NOW() - INTERVAL 95 DAY, TRUE, 92, 85, 4),
('user-donor-2', 'O-', 24, 58, 'Dhanmondi 27, Dhaka', 'Dhaka', 'Dhaka', 'Dhanmondi', 23.74610000, 90.37420000, NOW() - INTERVAL 30 DAY, FALSE, 98, 95, 8),
('user-donor-3', 'B+', 31, 80, 'Amberkhana Point, Sylhet', 'Sylhet', 'Sylhet', 'Amberkhana', 24.90800000, 91.86500000, NOW() - INTERVAL 110 DAY, TRUE, 75, 70, 2);

INSERT INTO `blood_banks` (`user_id`, `name`, `verification_status`, `division`, `district`, `thana`, `lat`, `lng`, `contact_no`) VALUES
('user-bb-1', 'Dhaka Central Blood Bank', 'Verified', 'Dhaka', 'Dhaka', 'Gulshan', 23.79250000, 90.40780000, '+88029999999'),
('user-bb-2', 'Sylhet Red Crescent Society', 'Pending', 'Sylhet', 'Sylhet', 'Zindabazar', 24.89490000, 91.86870000, '+88082177777');

INSERT INTO `blood_inventory` (`blood_bank_id`, `blood_group`, `quantity`) VALUES
('user-bb-1', 'A+', 25),
('user-bb-1', 'A-', 8),
('user-bb-1', 'B+', 18),
('user-bb-1', 'B-', 5),
('user-bb-1', 'AB+', 12),
('user-bb-1', 'AB-', 2),
('user-bb-1', 'O+', 30),
('user-bb-1', 'O-', 4);

INSERT INTO `emergency_requests` (`id`, `patient_id`, `blood_group`, `units_needed`, `hospital_name`, `location_details`, `division`, `district`, `thana`, `lat`, `lng`, `urgency_level`, `status`, `created_at`) VALUES
('req-1', 'user-patient-1', 'A+', 2, 'Dhaka Medical College Hospital', 'Ward 12, Bed 15, DMCH, Dhaka', 'Dhaka', 'Dhaka', 'Motijheel', 23.73300000, 90.41720000, 'High', 'Pending', NOW() - INTERVAL 2 HOUR),
('req-2', 'user-patient-1', 'AB-', 1, 'Sylhet MAG Osmani Medical College', 'ICU, Bed 4, Sylhet', 'Sylhet', 'Sylhet', 'Zindabazar', 24.89490000, 91.86870000, 'High', 'Approved', NOW() - INTERVAL 1 DAY);

INSERT INTO `messages` (`id`, `sender_id`, `receiver_id`, `message`, `is_read`, `timestamp`) VALUES
('msg-1', 'user-patient-1', 'user-donor-1', 'Hello Tanvir, I see you are an eligible A+ donor near Mirpur. We urgently need 2 bags of A+ blood at DMCH. Can you help?', FALSE, NOW() - INTERVAL 30 MINUTE),
('msg-2', 'user-donor-1', 'user-patient-1', 'Hi Sajjad, yes, I am available. I can come to DMCH by 5 PM today.', FALSE, NOW() - INTERVAL 25 MINUTE);

INSERT INTO `donation_history` (`id`, `donor_id`, `recipient_id`, `recipient_type`, `donation_date`, `units_donated`) VALUES
('don-h-1', 'user-donor-1', 'user-bb-1', 'BloodBank', NOW() - INTERVAL 95 DAY),
('don-h-2', 'user-donor-2', 'user-patient-1', 'Patient', NOW() - INTERVAL 30 DAY);
