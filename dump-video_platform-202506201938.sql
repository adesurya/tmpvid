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
  CONSTRAINT `ad_clicks_ibfk_1` FOREIGN KEY (`ad_id`) REFERENCES `ads` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Track ad clicks for analytics';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ad_clicks`
--

LOCK TABLES `ad_clicks` WRITE;
/*!40000 ALTER TABLE `ad_clicks` DISABLE KEYS */;
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
  CONSTRAINT `ad_impressions_ibfk_1` FOREIGN KEY (`ad_id`) REFERENCES `ads` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Track ad impressions for analytics';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ad_impressions`
--

LOCK TABLES `ad_impressions` WRITE;
/*!40000 ALTER TABLE `ad_impressions` DISABLE KEYS */;
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
  CONSTRAINT `ads_chk_1` CHECK ((`slot_position` between 1 and 5)),
  CONSTRAINT `ads_chk_counts` CHECK (((`impressions_count` >= 0) and (`clicks_count` >= 0))),
  CONSTRAINT `ads_chk_duration` CHECK (((`duration` >= 0) and (`duration` <= 3600))),
  CONSTRAINT `ads_chk_slot_position` CHECK ((`slot_position` between 1 and 5))
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Advertisement management table supporting image, video, and Google Ads';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ads`
--

LOCK TABLES `ads` WRITE;
/*!40000 ALTER TABLE `ads` DISABLE KEYS */;
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
  `title` varchar(255) NOT NULL,
  `description` text,
  `slug` varchar(255) NOT NULL,
  `thumbnail` varchar(255) DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `series_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `series`
--

LOCK TABLES `series` WRITE;
/*!40000 ALTER TABLE `series` DISABLE KEYS */;
INSERT INTO `series` VALUES (1,'Daily Highlights','Best moments of the day','daily-highlights',NULL,1,'2025-06-08 15:00:36','2025-06-08 15:00:36'),(2,'Tech Tips','Quick technology tips','tech-tips',NULL,5,'2025-06-08 15:00:36','2025-06-08 15:00:36'),(3,'Music Sessions','Live music performances','music-sessions',NULL,3,'2025-06-08 15:00:36','2025-06-08 15:00:36'),(4,'Daily Vlogs','Daily life and experiences','daily-vlogs',NULL,1,'2025-06-08 17:13:32','2025-06-08 17:13:32'),(5,'Tech Reviews','Latest gadget reviews','tech-reviews',NULL,4,'2025-06-08 17:13:32','2025-06-08 17:13:32'),(6,'Cooking Basics','Learn basic cooking skills','cooking-basics',NULL,6,'2025-06-08 17:13:32','2025-06-08 17:13:32'),(8,'asdsad','asdasd','asdsad',NULL,4,'2025-06-09 08:06:06','2025-06-09 08:06:06');
/*!40000 ALTER TABLE `series` ENABLE KEYS */;
UNLOCK TABLES;

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
INSERT INTO `users` VALUES (1,'admin','admin@example.com','$2a$12$Ew7PX6j7xeqwoz8OpdszcOTB08ibIoQcdwELlA7mDms48tr9TN0de','admin',NULL,'2025-06-08 15:00:29','2025-06-08 17:19:22');
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `video_shares`
--

LOCK TABLES `video_shares` WRITE;
/*!40000 ALTER TABLE `video_shares` DISABLE KEYS */;
INSERT INTO `video_shares` VALUES (3,8,NULL,'copy','2025-06-18 11:41:58',NULL,NULL),(4,8,NULL,'whatsapp','2025-06-18 11:42:07',NULL,NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `video_views`
--

LOCK TABLES `video_views` WRITE;
/*!40000 ALTER TABLE `video_views` DISABLE KEYS */;
INSERT INTO `video_views` VALUES (48,8,1,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-06-16 08:03:25'),(49,8,1,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',5,'2025-06-16 08:03:34'),(50,8,NULL,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-06-16 11:13:46'),(51,6,NULL,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',0,'2025-06-16 11:13:57'),(52,6,NULL,'::1','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',4,'2025-06-16 11:14:03');
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
INSERT INTO `videos` VALUES (6,'Test','Test Upload 1','test','/uploads/videos/f9b5d996-5028-4104-876b-29809ca64198.mp4',NULL,0,635910,'720p','local',1,NULL,1,2,0,0,0.00,'published','2025-06-16 07:57:20','2025-06-16 11:14:03'),(7,'Test Upload 2','Test Upload 2','test-upload-2','/uploads/videos/4a227ed0-708a-4689-b110-af105b602643.mp4',NULL,0,940444,'720p','local',2,NULL,1,0,0,0,0.00,'published','2025-06-16 07:57:45','2025-06-16 07:57:45'),(8,'Test Upload 3','Test Upload 3','test-upload-3','/uploads/videos/751ba9ba-76b7-4572-a1db-d42d69203610.mp4',NULL,0,1160561,'720p','local',2,NULL,1,3,0,2,0.00,'published','2025-06-16 07:58:27','2025-06-18 11:42:07');
/*!40000 ALTER TABLE `videos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'video_platform'
--

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
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-06-20 19:38:27
