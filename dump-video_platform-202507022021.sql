-- MySQL dump 10.13  Distrib 8.0.19, for Win64 (x86_64)
--
-- Host: localhost    Database: video_platform
-- ------------------------------------------------------
-- Server version	8.0.30

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Temporary view structure for view `active_ads_performance`
--

DROP TABLE IF EXISTS `active_ads_performance`;
/*!50001 DROP VIEW IF EXISTS `active_ads_performance`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `active_ads_performance` AS SELECT 
 1 AS `id`,
 1 AS `title`,
 1 AS `description`,
 1 AS `type`,
 1 AS `media_url`,
 1 AS `click_url`,
 1 AS `slot_position`,
 1 AS `impressions_count`,
 1 AS `clicks_count`,
 1 AS `ctr_percentage`,
 1 AS `created_at`,
 1 AS `updated_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `ad_clicks`
--

DROP TABLE IF EXISTS `ad_clicks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ad_clicks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ad_id` int NOT NULL,
  `user_id` int DEFAULT NULL COMMENT 'ID user yang mengklik ad (jika login)',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP address pengunjung',
  `user_agent` text COLLATE utf8mb4_unicode_ci COMMENT 'Browser user agent',
  `referrer` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'URL referrer',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ad_clicks_ad_id` (`ad_id`),
  KEY `idx_ad_clicks_created_at` (`created_at`),
  KEY `idx_ad_clicks_user_id` (`user_id`),
  KEY `idx_analytics` (`ad_id`,`created_at`,`user_id`),
  CONSTRAINT `ad_clicks_ibfk_1` FOREIGN KEY (`ad_id`) REFERENCES `ads` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Track ad clicks for analytics';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ad_clicks`
--

LOCK TABLES `ad_clicks` WRITE;
/*!40000 ALTER TABLE `ad_clicks` DISABLE KEYS */;
INSERT INTO `ad_clicks` VALUES (1,14,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36','http://localhost:3000/','2025-06-24 08:02:53');
/*!40000 ALTER TABLE `ad_clicks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ad_impressions`
--

DROP TABLE IF EXISTS `ad_impressions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ad_impressions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ad_id` int NOT NULL,
  `user_id` int DEFAULT NULL COMMENT 'ID user yang melihat ad (jika login)',
  `video_index` int DEFAULT NULL COMMENT 'Index video dimana ad ditampilkan',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP address pengunjung',
  `user_agent` text COLLATE utf8mb4_unicode_ci COMMENT 'Browser user agent',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ad_impressions_ad_id` (`ad_id`),
  KEY `idx_ad_impressions_created_at` (`created_at`),
  KEY `idx_ad_impressions_video_index` (`video_index`),
  KEY `idx_ad_impressions_user_id` (`user_id`),
  KEY `idx_analytics` (`ad_id`,`created_at`,`user_id`),
  CONSTRAINT `ad_impressions_ibfk_1` FOREIGN KEY (`ad_id`) REFERENCES `ads` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Track ad impressions for analytics';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ad_impressions`
--

LOCK TABLES `ad_impressions` WRITE;
/*!40000 ALTER TABLE `ad_impressions` DISABLE KEYS */;
INSERT INTO `ad_impressions` VALUES (1,13,1,2,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36','2025-06-24 08:02:33'),(2,13,1,2,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36','2025-06-24 08:02:33'),(3,14,1,3,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36','2025-06-24 08:02:35');
/*!40000 ALTER TABLE `ad_impressions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ads`
--

DROP TABLE IF EXISTS `ads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `type` enum('video','image','google_ads') COLLATE utf8mb4_unicode_ci NOT NULL,
  `media_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Media file URL for image/video ads, null for Google Ads',
  `click_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Destination URL when ad is clicked, optional for Google Ads',
  `duration` int DEFAULT '0',
  `slot_position` int NOT NULL,
  `impressions_count` int DEFAULT '0',
  `clicks_count` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `start_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `end_date` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `open_new_tab` tinyint(1) DEFAULT '1',
  `google_ads_script` text COLLATE utf8mb4_unicode_ci COMMENT 'Google Ads script content for google_ads type',
  PRIMARY KEY (`id`),
  KEY `idx_ads_slot_position` (`slot_position`),
  KEY `idx_ads_is_active` (`is_active`),
  KEY `idx_ads_dates` (`start_date`,`end_date`),
  KEY `idx_ads_type` (`type`),
  KEY `idx_active_slot_type` (`is_active`,`slot_position`,`type`),
  KEY `idx_performance` (`impressions_count`,`clicks_count`),
  CONSTRAINT `ads_chk_1` CHECK ((`slot_position` between 1 and 5)),
  CONSTRAINT `ads_chk_counts` CHECK (((`impressions_count` >= 0) and (`clicks_count` >= 0))),
  CONSTRAINT `ads_chk_duration` CHECK (((`duration` >= 0) and (`duration` <= 3600))),
  CONSTRAINT `ads_chk_slot_position` CHECK ((`slot_position` between 1 and 5))
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Advertisement management table supporting image, video, and Google Ads';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ads`
--

LOCK TABLES `ads` WRITE;
/*!40000 ALTER TABLE `ads` DISABLE KEYS */;
INSERT INTO `ads` VALUES (13,'Test 2','Test 2','image','/uploads/ads/ad-1750752123303-726343817.jpg','https://example.com',0,2,42,0,1,'2025-06-24 08:02:03',NULL,'2025-06-24 08:02:03','2025-07-01 08:42:51',1,NULL),(14,'Test Ads 3',NULL,'image','/uploads/ads/ad-1750752147973-819792230.png','https://example.com',0,3,13,1,1,'2025-06-24 08:02:28',NULL,'2025-06-24 08:02:28','2025-07-01 08:42:55',1,NULL);
/*!40000 ALTER TABLE `ads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `ads_analytics`
--

DROP TABLE IF EXISTS `ads_analytics`;
/*!50001 DROP VIEW IF EXISTS `ads_analytics`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `ads_analytics` AS SELECT 
 1 AS `id`,
 1 AS `title`,
 1 AS `type`,
 1 AS `slot_position`,
 1 AS `is_active`,
 1 AS `impressions_count`,
 1 AS `clicks_count`,
 1 AS `ctr_percentage`,
 1 AS `tracked_impressions`,
 1 AS `tracked_clicks`,
 1 AS `unique_viewers`,
 1 AS `unique_clickers`,
 1 AS `created_at`,
 1 AS `updated_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `ads_backup`
--

DROP TABLE IF EXISTS `ads_backup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ads_backup` (
  `id` int NOT NULL DEFAULT '0',
  `title` varchar(255) NOT NULL,
  `description` text,
  `type` enum('video','image') NOT NULL,
  `media_url` varchar(500) NOT NULL,
  `click_url` varchar(500) NOT NULL,
  `duration` int DEFAULT '0',
  `slot_position` int NOT NULL,
  `impressions_count` int DEFAULT '0',
  `clicks_count` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `start_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `end_date` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `open_new_tab` tinyint(1) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ads_backup`
--

LOCK TABLES `ads_backup` WRITE;
/*!40000 ALTER TABLE `ads_backup` DISABLE KEYS */;
/*!40000 ALTER TABLE `ads_backup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `ads_dashboard_summary`
--

DROP TABLE IF EXISTS `ads_dashboard_summary`;
/*!50001 DROP VIEW IF EXISTS `ads_dashboard_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `ads_dashboard_summary` AS SELECT 
 1 AS `total_ads`,
 1 AS `active_ads`,
 1 AS `inactive_ads`,
 1 AS `total_impressions`,
 1 AS `total_clicks`,
 1 AS `overall_ctr`,
 1 AS `google_ads_count`,
 1 AS `image_ads_count`,
 1 AS `video_ads_count`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `ads_settings`
--

DROP TABLE IF EXISTS `ads_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ads_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('google_adsense','google_ads','custom','analytics') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'google_adsense',
  `code` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` enum('header','footer','before_video','after_video','sidebar') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'header',
  `status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `publisher_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ad_slot` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `validation_status` enum('valid','invalid','warning','pending') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `validation_score` decimal(3,1) DEFAULT '0.0',
  `validation_errors` json DEFAULT NULL,
  `validation_warnings` json DEFAULT NULL,
  `validation_data` json DEFAULT NULL,
  `code_hash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_validated` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_validation_status` (`validation_status`),
  KEY `idx_code_hash` (`code_hash`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ads_settings`
--

LOCK TABLES `ads_settings` WRITE;
/*!40000 ALTER TABLE `ads_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `ads_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `slug` varchar(100) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Entertainment','Fun and entertaining videos','entertainment',NULL,'2025-06-08 15:00:33','2025-06-08 15:00:33'),(2,'Education','Educational and learning content','education',NULL,'2025-06-08 15:00:33','2025-06-08 15:00:33'),(3,'Music','Music videos and performances','music',NULL,'2025-06-08 15:00:33','2025-06-08 15:00:33'),(4,'Sports','Sports highlights and content','sports',NULL,'2025-06-08 15:00:33','2025-06-08 15:00:33'),(5,'Technology','Tech reviews and tutorials','technology',NULL,'2025-06-08 15:00:33','2025-06-08 15:00:33'),(6,'Comedy','Funny and comedic content','comedy',NULL,'2025-06-08 15:00:33','2025-06-08 15:00:33'),(12,'Cooking','Cooking tutorials and recipes','cooking',NULL,'2025-06-08 17:13:32','2025-06-08 17:13:32'),(13,'Travel','Travel vlogs and destinations','travel',NULL,'2025-06-08 17:13:32','2025-06-08 17:13:32'),(14,'Fashion','Fashion and style content','fashion',NULL,'2025-06-08 17:13:32','2025-06-08 17:13:32');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `series`
--

DROP TABLE IF EXISTS `series`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `series` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `description` text,
  `slug` varchar(220) NOT NULL,
  `thumbnail` varchar(500) DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `total_episodes` int DEFAULT '0',
  `status` enum('active','inactive','deleted') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `category_id` (`category_id`),
  KEY `idx_series_status` (`status`),
  KEY `idx_series_created` (`created_at`),
  KEY `idx_series_title` (`title`),
  KEY `idx_series_title_status` (`title`,`status`),
  KEY `idx_series_category_status` (`category_id`,`status`),
  CONSTRAINT `fk_series_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `series`
--

LOCK TABLES `series` WRITE;
/*!40000 ALTER TABLE `series` DISABLE KEYS */;
INSERT INTO `series` VALUES (1,'Daily Highlights','Best moments of the day','daily-highlights',NULL,1,0,'active','2025-06-08 15:00:36','2025-06-08 15:00:36'),(2,'Tech Tips','Quick technology tips','tech-tips',NULL,5,0,'active','2025-06-08 15:00:36','2025-06-08 15:00:36'),(3,'Music Sessions','Live music performances','music-sessions',NULL,3,0,'active','2025-06-08 15:00:36','2025-06-08 15:00:36'),(4,'Daily Vlogs','Daily life and experiences','daily-vlogs',NULL,1,0,'active','2025-06-08 17:13:32','2025-06-08 17:13:32'),(5,'Tech Reviews','Latest gadget reviews','tech-reviews',NULL,4,0,'active','2025-06-08 17:13:32','2025-06-08 17:13:32'),(6,'Cooking Basics','Learn basic cooking skills','cooking-basics',NULL,6,0,'active','2025-06-08 17:13:32','2025-06-08 17:13:32'),(8,'asdsad','asdasd','asdsad',NULL,4,0,'deleted','2025-06-09 08:06:06','2025-06-26 04:01:01'),(9,'Tech Tutorials','Learn programming and technology step by step','tech-tutorials',NULL,5,0,'active','2025-06-26 03:55:02','2025-06-26 03:56:31'),(10,'Music Theory Fundamentals','Understanding the basics of music theory','music-theory-fundamentals',NULL,3,0,'active','2025-06-26 03:55:02','2025-06-26 03:56:31'),(11,'Fitness Journey','Complete fitness and wellness guide','fitness-journey',NULL,4,0,'active','2025-06-26 03:55:02','2025-06-26 03:56:31'),(12,'Comedy Sketches','Funny short video series for entertainment','comedy-sketches',NULL,1,0,'active','2025-06-26 03:55:02','2025-06-26 03:56:31'),(13,'Web Development Bootcamp','Complete web development course from beginner to advanced','web-development-bootcamp',NULL,5,0,'active','2025-06-26 03:55:02','2025-06-26 03:56:31'),(14,'Home Gardening Tips','Learn how to grow plants and maintain a garden at home','home-gardening-tips',NULL,2,0,'active','2025-06-26 03:55:02','2025-06-26 03:56:31'),(15,'Guitar Lessons','Learn to play guitar from scratch','guitar-lessons',NULL,3,0,'active','2025-06-26 03:55:02','2025-06-26 03:56:31'),(16,'Yoga for Beginners','Introduction to yoga poses and meditation','yoga-for-beginners',NULL,4,0,'active','2025-06-26 03:55:02','2025-06-26 03:56:31'),(17,'Stand-up Comedy Specials','Collection of stand-up comedy performances','stand-up-comedy-specials',NULL,1,0,'active','2025-06-26 03:55:02','2025-06-26 03:56:31');
/*!40000 ALTER TABLE `series` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `series_with_stats`
--

DROP TABLE IF EXISTS `series_with_stats`;
/*!50001 DROP VIEW IF EXISTS `series_with_stats`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `series_with_stats` AS SELECT 
 1 AS `id`,
 1 AS `title`,
 1 AS `slug`,
 1 AS `description`,
 1 AS `thumbnail`,
 1 AS `category_id`,
 1 AS `status`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `category_name`,
 1 AS `actual_episodes`,
 1 AS `recorded_episodes`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `tags`
--

DROP TABLE IF EXISTS `tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tags`
--

LOCK TABLES `tags` WRITE;
/*!40000 ALTER TABLE `tags` DISABLE KEYS */;
/*!40000 ALTER TABLE `tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `profile_image` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','admin@example.com','$2b$12$9M7cV6rU.xLoGfyFOdFeYeQeGbwGGlBeH6XK5.NPByDw7tU3l6ubm','admin','active',NULL,'2025-06-08 15:00:29','2025-07-02 12:57:57');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `video_likes`
--

DROP TABLE IF EXISTS `video_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `video_likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `video_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_like` (`video_id`,`user_id`),
  KEY `user_id` (`user_id`),
  KEY `idx_video_likes_video_id` (`video_id`),
  CONSTRAINT `video_likes_ibfk_1` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `video_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `video_likes`
--

LOCK TABLES `video_likes` WRITE;
/*!40000 ALTER TABLE `video_likes` DISABLE KEYS */;
/*!40000 ALTER TABLE `video_likes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `video_shares`
--

DROP TABLE IF EXISTS `video_shares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `video_shares` (
  `id` int NOT NULL AUTO_INCREMENT,
  `video_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `platform` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `user_agent` text,
  `referrer` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_video_shares_video_id` (`video_id`),
  KEY `idx_video_shares_platform` (`platform`),
  CONSTRAINT `video_shares_ibfk_1` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `video_shares_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `video_shares`
--

LOCK TABLES `video_shares` WRITE;
/*!40000 ALTER TABLE `video_shares` DISABLE KEYS */;
INSERT INTO `video_shares` VALUES (3,8,NULL,'copy','2025-06-18 11:41:58',NULL,NULL),(4,8,NULL,'whatsapp','2025-06-18 11:42:07',NULL,NULL),(5,8,NULL,'copy','2025-06-25 12:18:09',NULL,NULL),(6,8,NULL,'whatsapp','2025-06-25 12:18:14',NULL,NULL),(7,7,1,'copy','2025-06-25 13:04:44',NULL,NULL);
/*!40000 ALTER TABLE `video_shares` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `video_tags`
--

DROP TABLE IF EXISTS `video_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `video_tags` (
  `video_id` int NOT NULL,
  `tag_id` int NOT NULL,
  PRIMARY KEY (`video_id`,`tag_id`),
  KEY `tag_id` (`tag_id`),
  CONSTRAINT `video_tags_ibfk_1` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `video_tags_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `video_tags`
--

LOCK TABLES `video_tags` WRITE;
/*!40000 ALTER TABLE `video_tags` DISABLE KEYS */;
/*!40000 ALTER TABLE `video_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `video_views`
--

DROP TABLE IF EXISTS `video_views`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `video_views` (
  `id` int NOT NULL AUTO_INCREMENT,
  `video_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `watch_duration` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_video_user` (`video_id`,`user_id`),
  KEY `idx_created` (`created_at`),
  KEY `idx_video_views_video` (`video_id`,`created_at` DESC),
  KEY `idx_video_views_video_id_created` (`video_id`,`created_at`),
  KEY `idx_video_views_user_id` (`user_id`),
  KEY `idx_video_views_ip_address` (`ip_address`),
  CONSTRAINT `video_views_ibfk_1` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `video_views_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=166 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `video_views`
--

LOCK TABLES `video_views` WRITE;
/*!40000 ALTER TABLE `video_views` DISABLE KEYS */;
INSERT INTO `video_views` VALUES (48,8,1,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-06-16 08:03:25'),(49,8,1,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',5,'2025-06-16 08:03:34'),(50,8,NULL,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-06-16 11:13:46'),(51,6,NULL,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-06-16 11:13:57'),(52,6,NULL,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',4,'2025-06-16 11:14:03'),(53,8,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',0,'2025-06-23 04:12:02'),(54,8,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',0,'2025-06-23 10:44:52'),(55,8,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',0,'2025-06-23 10:44:54'),(56,6,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',0,'2025-06-23 10:44:56'),(57,7,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',0,'2025-06-23 10:44:59'),(58,8,NULL,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-06-23 10:45:12'),(59,7,NULL,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-06-23 10:45:20'),(60,8,NULL,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-06-24 03:25:51'),(61,6,NULL,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-06-24 03:26:09'),(62,7,NULL,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-06-24 03:26:10'),(63,7,NULL,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-06-24 04:51:31'),(64,8,NULL,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-06-24 05:03:45'),(65,8,1,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',0,'2025-06-24 07:46:09'),(66,6,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-24 07:46:15'),(67,7,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-24 07:46:16'),(68,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-24 07:46:19'),(69,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-24 07:54:31'),(70,7,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-24 07:54:32'),(71,6,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-24 07:54:36'),(72,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-24 07:54:36'),(73,6,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-24 07:54:47'),(74,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-24 07:54:54'),(75,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-24 08:00:52'),(76,6,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-24 08:00:57'),(77,7,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-24 08:00:58'),(78,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-24 08:00:59'),(79,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-24 08:02:33'),(80,6,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-24 08:02:35'),(81,7,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-24 08:02:41'),(82,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-24 08:02:42'),(83,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 08:36:18'),(84,6,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 08:36:20'),(85,7,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 08:36:35'),(86,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 08:36:36'),(87,8,1,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',0,'2025-06-25 10:33:41'),(88,8,1,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',0,'2025-06-25 10:35:39'),(89,8,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',0,'2025-06-25 12:16:55'),(90,6,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',0,'2025-06-25 12:17:03'),(91,7,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',0,'2025-06-25 12:17:05'),(92,8,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',0,'2025-06-25 12:17:06'),(93,7,NULL,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:17:46'),(94,8,NULL,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:17:49'),(95,7,NULL,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:17:53'),(96,6,NULL,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:17:57'),(97,8,NULL,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:17:58'),(98,8,NULL,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:28:01'),(99,6,NULL,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:28:04'),(100,6,NULL,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:35:02'),(101,8,NULL,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:35:04'),(102,6,NULL,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:35:08'),(103,7,NULL,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:35:12'),(104,8,NULL,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:35:13'),(105,8,NULL,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:42:43'),(106,8,NULL,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:47:40'),(107,8,NULL,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:47:42'),(108,6,NULL,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:48:32'),(109,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:53:41'),(110,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:54:34'),(111,6,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:54:41'),(112,7,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:54:52'),(113,7,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:54:53'),(114,7,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',1,'2025-06-25 12:54:54'),(115,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:55:09'),(116,6,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:55:10'),(117,7,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:55:12'),(118,7,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:55:14'),(119,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:55:19'),(120,7,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:55:43'),(121,6,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:55:45'),(122,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:55:46'),(123,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:57:01'),(124,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:57:17'),(125,7,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:57:21'),(126,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:58:13'),(127,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:58:19'),(128,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:58:19'),(129,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',5,'2025-06-25 12:59:31'),(130,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:59:31'),(131,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:59:32'),(132,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',5,'2025-06-25 12:59:38'),(133,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:59:43'),(134,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 12:59:44'),(135,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',5,'2025-06-25 12:59:50'),(136,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 13:00:04'),(137,7,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 13:00:09'),(138,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 13:00:10'),(139,7,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 13:03:24'),(140,7,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 13:03:26'),(141,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 13:04:17'),(142,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 13:04:25'),(143,7,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 13:04:28'),(144,6,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 13:04:34'),(145,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 13:04:36'),(146,6,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 13:04:55'),(147,6,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 13:04:56'),(148,6,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',2,'2025-06-25 13:04:59'),(149,8,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 13:05:01'),(150,7,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 13:05:06'),(151,7,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-25 13:05:07'),(152,7,1,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',4,'2025-06-25 13:05:12'),(153,8,1,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',0,'2025-06-26 02:51:25'),(154,8,NULL,'::ffff:127.0.0.1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-26 07:00:44'),(155,8,NULL,'::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',0,'2025-06-26 07:24:58'),(156,8,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',0,'2025-07-01 08:35:40'),(157,8,NULL,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-07-01 08:36:03'),(158,8,1,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-07-01 08:39:07'),(159,7,1,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-07-01 08:39:20'),(160,6,1,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-07-01 08:39:25'),(161,8,1,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-07-01 08:39:26'),(162,8,1,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-07-01 08:42:52'),(163,7,1,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-07-01 08:42:54'),(164,6,1,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-07-01 08:42:58'),(165,8,1,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-07-01 08:42:59');
/*!40000 ALTER TABLE `video_views` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `videos`
--

DROP TABLE IF EXISTS `videos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `videos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `slug` varchar(255) NOT NULL,
  `video_url` varchar(500) NOT NULL,
  `thumbnail` varchar(255) DEFAULT NULL,
  `duration` int DEFAULT '0',
  `file_size` bigint DEFAULT '0',
  `video_quality` enum('360p','720p','1080p','4K') DEFAULT '720p',
  `storage_type` enum('local','s3') DEFAULT 'local',
  `storage_metadata` json DEFAULT NULL COMMENT 'JSON metadata for storage-specific information (S3 keys, buckets, etc.)',
  `category_id` int DEFAULT NULL,
  `series_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `views_count` int DEFAULT '0',
  `likes_count` int DEFAULT '0',
  `shares_count` int DEFAULT '0',
  `engagement_score` decimal(10,2) DEFAULT '0.00',
  `status` enum('draft','published','private') DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `series_id` (`series_id`),
  KEY `user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_category` (`category_id`),
  KEY `idx_views` (`views_count`),
  KEY `idx_created` (`created_at`),
  KEY `idx_videos_engagement` (`views_count` DESC,`likes_count` DESC,`created_at` DESC),
  KEY `idx_videos_status_created` (`status`,`created_at`),
  KEY `idx_videos_storage_type` (`storage_type`),
  KEY `idx_videos_video_url` (`video_url`(255)),
  CONSTRAINT `videos_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `videos_ibfk_2` FOREIGN KEY (`series_id`) REFERENCES `series` (`id`) ON DELETE SET NULL,
  CONSTRAINT `videos_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `videos`
--

LOCK TABLES `videos` WRITE;
/*!40000 ALTER TABLE `videos` DISABLE KEYS */;
INSERT INTO `videos` VALUES (6,'Test','Test Upload 1','test','/uploads/videos/f9b5d996-5028-4104-876b-29809ca64198.mp4',NULL,0,635910,'720p','local','{\"migrated\": true, \"storage_type\": \"local\"}',1,NULL,1,25,0,0,0.00,'published','2025-06-16 07:57:20','2025-07-02 13:06:04'),(7,'Test Upload 2','Test Upload 2','test-upload-2','/uploads/videos/4a227ed0-708a-4689-b110-af105b602643.mp4',NULL,0,940444,'720p','local','{\"migrated\": true, \"storage_type\": \"local\"}',2,NULL,1,29,0,1,0.00,'published','2025-06-16 07:57:45','2025-07-02 13:06:04'),(8,'Test Upload 3','Test Upload 3','test-upload-3','/uploads/videos/751ba9ba-76b7-4572-a1db-d42d69203610.mp4',NULL,0,1160561,'720p','local','{\"migrated\": true, \"storage_type\": \"local\"}',2,NULL,1,64,0,4,0.00,'published','2025-06-16 07:58:27','2025-07-02 13:06:04');
/*!40000 ALTER TABLE `videos` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `update_series_episode_count_after_insert` AFTER INSERT ON `videos` FOR EACH ROW BEGIN
    IF NEW.series_id IS NOT NULL THEN
        UPDATE series 
        SET total_episodes = (
            SELECT COUNT(*) 
            FROM videos 
            WHERE series_id = NEW.series_id AND status = 'published'
        )
        WHERE id = NEW.series_id;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `update_series_episode_count_after_update` AFTER UPDATE ON `videos` FOR EACH ROW BEGIN
    -- Update old series if changed
    IF OLD.series_id IS NOT NULL AND (NEW.series_id != OLD.series_id OR NEW.series_id IS NULL) THEN
        UPDATE series 
        SET total_episodes = (
            SELECT COUNT(*) 
            FROM videos 
            WHERE series_id = OLD.series_id AND status = 'published'
        )
        WHERE id = OLD.series_id;
    END IF;
    
    -- Update new series
    IF NEW.series_id IS NOT NULL THEN
        UPDATE series 
        SET total_episodes = (
            SELECT COUNT(*) 
            FROM videos 
            WHERE series_id = NEW.series_id AND status = 'published'
        )
        WHERE id = NEW.series_id;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `update_series_episode_count_after_delete` AFTER DELETE ON `videos` FOR EACH ROW BEGIN
    IF OLD.series_id IS NOT NULL THEN
        UPDATE series 
        SET total_episodes = (
            SELECT COUNT(*) 
            FROM videos 
            WHERE series_id = OLD.series_id AND status = 'published'
        )
        WHERE id = OLD.series_id;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Dumping routines for database 'video_platform'
--
/*!50003 DROP PROCEDURE IF EXISTS `UpdateSeriesEpisodeCounts` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `UpdateSeriesEpisodeCounts`()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE current_series_id INT;
    DECLARE episode_count INT;
    
    DECLARE series_cursor CURSOR FOR 
        SELECT id FROM series WHERE status = 'active';
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN series_cursor;
    
    read_loop: LOOP
        FETCH series_cursor INTO current_series_id;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Count episodes for this series
        SELECT COUNT(*) INTO episode_count 
        FROM videos 
        WHERE series_id = current_series_id AND status = 'published';
        
        -- Update the series
        UPDATE series 
        SET total_episodes = episode_count 
        WHERE id = current_series_id;
        
    END LOOP;
    
    CLOSE series_cursor;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `active_ads_performance`
--

/*!50001 DROP VIEW IF EXISTS `active_ads_performance`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `active_ads_performance` AS select `a`.`id` AS `id`,`a`.`title` AS `title`,`a`.`description` AS `description`,`a`.`type` AS `type`,`a`.`media_url` AS `media_url`,`a`.`click_url` AS `click_url`,`a`.`slot_position` AS `slot_position`,`a`.`impressions_count` AS `impressions_count`,`a`.`clicks_count` AS `clicks_count`,(case when (`a`.`impressions_count` > 0) then round(((`a`.`clicks_count` / `a`.`impressions_count`) * 100),2) else 0 end) AS `ctr_percentage`,`a`.`created_at` AS `created_at`,`a`.`updated_at` AS `updated_at` from `ads` `a` where ((`a`.`is_active` = 1) and ((`a`.`start_date` is null) or (`a`.`start_date` <= now())) and ((`a`.`end_date` is null) or (`a`.`end_date` >= now()))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `ads_analytics`
--

/*!50001 DROP VIEW IF EXISTS `ads_analytics`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `ads_analytics` AS select `a`.`id` AS `id`,`a`.`title` AS `title`,`a`.`type` AS `type`,`a`.`slot_position` AS `slot_position`,`a`.`is_active` AS `is_active`,`a`.`impressions_count` AS `impressions_count`,`a`.`clicks_count` AS `clicks_count`,(case when (`a`.`impressions_count` > 0) then round(((`a`.`clicks_count` / `a`.`impressions_count`) * 100),2) else 0 end) AS `ctr_percentage`,count(distinct `ai`.`id`) AS `tracked_impressions`,count(distinct `ac`.`id`) AS `tracked_clicks`,count(distinct `ai`.`user_id`) AS `unique_viewers`,count(distinct `ac`.`user_id`) AS `unique_clickers`,`a`.`created_at` AS `created_at`,`a`.`updated_at` AS `updated_at` from ((`ads` `a` left join `ad_impressions` `ai` on((`a`.`id` = `ai`.`ad_id`))) left join `ad_clicks` `ac` on((`a`.`id` = `ac`.`ad_id`))) group by `a`.`id`,`a`.`title`,`a`.`type`,`a`.`slot_position`,`a`.`is_active`,`a`.`impressions_count`,`a`.`clicks_count`,`a`.`created_at`,`a`.`updated_at` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `ads_dashboard_summary`
--

/*!50001 DROP VIEW IF EXISTS `ads_dashboard_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `ads_dashboard_summary` AS select count(0) AS `total_ads`,sum((case when (`ads`.`is_active` = 1) then 1 else 0 end)) AS `active_ads`,sum((case when (`ads`.`is_active` = 0) then 1 else 0 end)) AS `inactive_ads`,coalesce(sum(`ads`.`impressions_count`),0) AS `total_impressions`,coalesce(sum(`ads`.`clicks_count`),0) AS `total_clicks`,(case when (sum(`ads`.`impressions_count`) > 0) then round(((sum(`ads`.`clicks_count`) / sum(`ads`.`impressions_count`)) * 100),2) else 0 end) AS `overall_ctr`,count((case when (`ads`.`type` = 'google_ads') then 1 end)) AS `google_ads_count`,count((case when (`ads`.`type` = 'image') then 1 end)) AS `image_ads_count`,count((case when (`ads`.`type` = 'video') then 1 end)) AS `video_ads_count` from `ads` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `series_with_stats`
--

/*!50001 DROP VIEW IF EXISTS `series_with_stats`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `series_with_stats` AS select `s`.`id` AS `id`,`s`.`title` AS `title`,`s`.`slug` AS `slug`,`s`.`description` AS `description`,`s`.`thumbnail` AS `thumbnail`,`s`.`category_id` AS `category_id`,`s`.`status` AS `status`,`s`.`created_at` AS `created_at`,`s`.`updated_at` AS `updated_at`,`c`.`name` AS `category_name`,coalesce(`v`.`episode_count`,0) AS `actual_episodes`,`s`.`total_episodes` AS `recorded_episodes` from ((`series` `s` left join `categories` `c` on((`s`.`category_id` = `c`.`id`))) left join (select `videos`.`series_id` AS `series_id`,count(0) AS `episode_count` from `videos` where (`videos`.`status` = 'published') group by `videos`.`series_id`) `v` on((`s`.`id` = `v`.`series_id`))) where (`s`.`status` = 'active') */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-07-02 20:21:28
