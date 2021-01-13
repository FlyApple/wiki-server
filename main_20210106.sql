CREATE DATABASE  IF NOT EXISTS `main` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `main`;
-- MySQL dump 10.13  Distrib 8.0.20, for Win64 (x86_64)
--
-- Host: 10.182.207.70    Database: main
-- ------------------------------------------------------
-- Server version	8.0.22

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `t_account`
--

DROP TABLE IF EXISTS `t_account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_account` (
  `user_id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_nid` varchar(10) NOT NULL COMMENT 'NID(0~9 number, 5-9 characters)',
  `user_nm` varchar(32) NOT NULL COMMENT 'user name',
  `user_pw` varchar(64) DEFAULT NULL COMMENT 'user password',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `user_email` varchar(64) DEFAULT NULL,
  `user_phone` varchar(16) DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `nickname` varchar(32) DEFAULT NULL,
  `gender` int DEFAULT '0' COMMENT '0:unknow,1:man,2:female',
  `country` varchar(32) DEFAULT NULL,
  `region` varchar(48) DEFAULT NULL COMMENT 'province/state,city',
  `level` int DEFAULT '0',
  `experience` int DEFAULT '0',
  `vip_level` int DEFAULT '0',
  `vip_expired` datetime DEFAULT NULL,
  `privilege` int DEFAULT '0',
  `privilege_expired` datetime DEFAULT NULL,
  `status` int DEFAULT '1' COMMENT '0:deleted/removed,1:valid',
  PRIMARY KEY (`user_id`,`user_nm`),
  UNIQUE KEY `user_nid_UNIQUE` (`user_nid`)
) ENGINE=InnoDB AUTO_INCREMENT=87 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `t_auth`
--

DROP TABLE IF EXISTS `t_auth`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_auth` (
  `auth_id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `user_nid` varchar(10) NOT NULL,
  `auth_ipaddress` varchar(16) DEFAULT NULL COMMENT 'IPv4',
  `auth_region` varchar(64) DEFAULT NULL COMMENT 'country,region',
  `auth_device` varchar(64) DEFAULT NULL,
  `auth_code` varchar(10) DEFAULT NULL COMMENT 'Auth code 6/8 Characters(0-9,a-z,A-Z)',
  `auth_hash` varchar(64) DEFAULT NULL,
  `auth_used` int unsigned DEFAULT '0',
  `auth_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `auth_expired` datetime DEFAULT '2099-01-01 00:00:00',
  `auth_used_time` datetime DEFAULT NULL,
  `activated` int unsigned DEFAULT '0',
  `activated_time` datetime DEFAULT NULL,
  `verified_phone` int unsigned DEFAULT '0',
  `verified_phone_time` datetime DEFAULT NULL,
  `verifying_phone` int unsigned DEFAULT '0' COMMENT 'Auth code 6/8 Characters(0-9)',
  `verifying_phone_time` datetime DEFAULT NULL,
  `verified_email` int unsigned DEFAULT '0',
  `verified_email_time` datetime DEFAULT NULL,
  `verifying_email` int unsigned DEFAULT '0' COMMENT 'Auth code 6/8 Characters(0-9,a-z,A-Z)',
  `verifying_email_time` datetime DEFAULT NULL,
  `shared_key` varchar(64) DEFAULT NULL,
  `api_key` varchar(64) DEFAULT NULL,
  `status` int DEFAULT '0',
  PRIMARY KEY (`auth_id`,`user_id`,`user_nid`)
) ENGINE=InnoDB AUTO_INCREMENT=10032 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`sa`@`%`*/ /*!50003 TRIGGER `t_auth_AFTER_INSERT` AFTER INSERT ON `t_auth` FOR EACH ROW BEGIN
	UPDATE `main`.`t_statistics` SET user_count = user_count + 1;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `t_auth_history`
--

DROP TABLE IF EXISTS `t_auth_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_auth_history` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `auth_id` int unsigned NOT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `expired_time` datetime DEFAULT NULL,
  `used_time` datetime DEFAULT NULL,
  `auth_name` varchar(64) NOT NULL COMMENT 'email/phone',
  `auth_code` varchar(10) NOT NULL,
  `auth_hash` varchar(64) NOT NULL,
  `auth_ipaddress` varchar(16) DEFAULT NULL,
  `auth_region` varchar(64) DEFAULT NULL,
  `auth_device` varchar(64) DEFAULT NULL,
  `desc` varchar(64) DEFAULT 'none' COMMENT 'login auth:login,account check:verifying',
  `status` int DEFAULT '0' COMMENT '0:unuse,1:used',
  PRIMARY KEY (`id`,`auth_id`,`auth_code`,`auth_hash`)
) ENGINE=InnoDB AUTO_INCREMENT=219 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `t_money`
--

DROP TABLE IF EXISTS `t_money`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_money` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `auth_id` int NOT NULL,
  `money` decimal(16,2) DEFAULT '0.00',
  `gold` decimal(16,2) DEFAULT '0.00',
  `diamonds` decimal(16,2) DEFAULT '0.00',
  PRIMARY KEY (`id`,`user_id`,`auth_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `t_note_commitlist`
--

DROP TABLE IF EXISTS `t_note_commitlist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_note_commitlist` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nid` varchar(32) NOT NULL,
  `user_id` int NOT NULL,
  `user_nid` int NOT NULL,
  `auth_id` varchar(10) NOT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT NULL,
  `note_uid` int unsigned NOT NULL,
  `note_nid` varchar(32) NOT NULL,
  `reply_id` int unsigned DEFAULT '0' COMMENT '回复评论ID',
  `reply_nid` varchar(32) DEFAULT NULL,
  `replyto_id` int unsigned DEFAULT '0' COMMENT '回复给回复评论ID',
  `replyto_nid` varchar(32) DEFAULT NULL,
  `crypto_level` int unsigned DEFAULT '0',
  `content` varchar(512) DEFAULT NULL,
  `like_count` int unsigned DEFAULT '0',
  `reply_count` int unsigned DEFAULT '0',
  `uuid` varchar(42) NOT NULL,
  `status` int DEFAULT '1',
  PRIMARY KEY (`id`,`nid`,`uuid`),
  UNIQUE KEY `id_UNIQUE` (`id`),
  UNIQUE KEY `nid_UNIQUE` (`nid`),
  UNIQUE KEY `uuid_UNIQUE` (`uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=1161 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`sa`@`%`*/ /*!50003 TRIGGER `t_note_commitlist_AFTER_INSERT` AFTER INSERT ON `t_note_commitlist` FOR EACH ROW BEGIN
    DECLARE name VARCHAR(16) DEFAULT "0000-00-00"; 
    SET name = DATE_FORMAT(NOW(), "%Y-%m-%d");
    
    -- 更新全部统计信息
    IF NEW.reply_id > 0 THEN
    UPDATE `main`.`t_statistics` SET reply_count = reply_count + 1;
    ELSE
    UPDATE `main`.`t_statistics` SET commit_count = commit_count + 1;
    END IF;
	
    -- 更新每日统计信息
	IF EXISTS (SELECT id FROM `main`.`t_statistics_daily` WHERE name = name) THEN
        IF NEW.reply_id > 0 THEN
		UPDATE `main`.`t_statistics_daily` SET reply_count = reply_count + 1, last_time=NOW();
		ELSE
		UPDATE `main`.`t_statistics_daily` SET commit_count = commit_count + 1, last_time=NOW();
		END IF;
	ELSE
		IF NEW.reply_id > 0 THEN
        INSERT INTO `main`.`t_statistics_daily` (name, last_time, reply_count) VALUES (name, last_time=NOW(), 1);
        ELSE
        INSERT INTO `main`.`t_statistics_daily` (name, last_time, commit_count) VALUES (name, last_time=NOW(), 1);
        END IF;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `t_note_list`
--

DROP TABLE IF EXISTS `t_note_list`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_note_list` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nid` varchar(32) NOT NULL,
  `user_id` int NOT NULL,
  `auth_id` int NOT NULL,
  `user_nid` varchar(10) NOT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT NULL,
  `crypto_level` int unsigned DEFAULT '0',
  `private_level` int unsigned DEFAULT '0',
  `content` varchar(2048) DEFAULT NULL COMMENT '内容最大长度为512个字符',
  `tags` varchar(128) DEFAULT NULL,
  `view_count` int unsigned DEFAULT '0',
  `shared_count` int unsigned DEFAULT '0',
  `like_count` int unsigned DEFAULT '0',
  `favorites_count` int unsigned DEFAULT '0',
  `commit_count` int unsigned DEFAULT '0',
  `topping` int DEFAULT '0',
  `uuid` varchar(42) NOT NULL,
  `status` int DEFAULT '1' COMMENT '0:deleted/removed,1:default,2:private',
  PRIMARY KEY (`id`,`nid`,`uuid`),
  UNIQUE KEY `id_UNIQUE` (`id`),
  UNIQUE KEY `uuid_UNIQUE` (`uuid`),
  UNIQUE KEY `nid_UNIQUE` (`nid`)
) ENGINE=InnoDB AUTO_INCREMENT=1037 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`sa`@`%`*/ /*!50003 TRIGGER `t_note_list_AFTER_INSERT` AFTER INSERT ON `t_note_list` FOR EACH ROW BEGIN
	DECLARE name VARCHAR(16) DEFAULT "0000-00-00"; 
    SET name = DATE_FORMAT(NOW(), "%Y-%m-%d");
    -- 更新全部统计信息
    UPDATE `main`.`t_statistics` SET note_count = note_count + 1;
	-- 更新每日统计信息
	IF EXISTS (SELECT id FROM `main`.`t_statistics_daily` WHERE name = name) THEN
		UPDATE `main`.`t_statistics_daily` SET note_count = note_count + 1, last_time=NOW();
	ELSE
        INSERT INTO `main`.`t_statistics_daily` (name, last_time, note_count) VALUES (name, NOW(), 1);
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `t_privilege`
--

DROP TABLE IF EXISTS `t_privilege`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_privilege` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(32) NOT NULL,
  `level` int DEFAULT '1',
  `admin_level` int DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `expired_time` datetime DEFAULT NULL,
  `allow_login` int unsigned DEFAULT '1',
  `allow_notes` int unsigned DEFAULT '0',
  `allow_share` int unsigned DEFAULT '0',
  `allow_commit` int unsigned DEFAULT '0',
  `allow_like` int unsigned DEFAULT '1',
  `allow_favorites` int unsigned DEFAULT '1',
  `desc` varchar(32) DEFAULT NULL,
  `status` int DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_UNIQUE` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=104 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `t_settings`
--

DROP TABLE IF EXISTS `t_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_settings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(32) DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `allow_signup` int unsigned DEFAULT '1' COMMENT '允许新用户注册',
  `allow_signin` int unsigned DEFAULT '1' COMMENT '允许用户登录',
  `allow_note` int unsigned DEFAULT '1' COMMENT '允许用户发布新的NOTE',
  `allow_commit` int unsigned DEFAULT '1' COMMENT '允许用户发表评论及回复',
  `status` int DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `t_statistics`
--

DROP TABLE IF EXISTS `t_statistics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_statistics` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(32) DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_count` int unsigned DEFAULT '0',
  `note_count` int unsigned DEFAULT '0',
  `commit_count` int unsigned DEFAULT '0',
  `reply_count` int unsigned DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_UNIQUE` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `t_statistics_daily`
--

DROP TABLE IF EXISTS `t_statistics_daily`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_statistics_daily` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(32) DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_time` datetime DEFAULT NULL,
  `user_count` int unsigned DEFAULT '0',
  `note_count` int unsigned DEFAULT '0',
  `commit_count` int unsigned DEFAULT '0',
  `reply_count` int unsigned DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'main'
--

--
-- Dumping routines for database 'main'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2021-01-07 16:05:44
