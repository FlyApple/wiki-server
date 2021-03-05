CREATE TABLE `t_user` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `user_nid` varchar(10) NOT NULL,
  `auth_id` int unsigned NOT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT NULL,
  `nickname` varchar(32) DEFAULT NULL,
  `gender` int DEFAULT '0' COMMENT '0:unknow,1:man,2:female',
  `age` int DEFAULT '0',
  `public_level` int DEFAULT '0' COMMENT '1:email;2:phone;3:email,phone',
  `country` varchar(32) DEFAULT NULL,
  `region` varchar(48) DEFAULT NULL,
  `maxim` varchar(128) DEFAULT NULL COMMENT '座右铭，签名',
  `following` int DEFAULT '0',
  `followers` int DEFAULT '0',
  PRIMARY KEY (`id`,`user_id`,`user_nid`,`auth_id`)
) ENGINE=InnoDB AUTO_INCREMENT=100007 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `t_follow` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `user_nid` varchar(10) NOT NULL,
  `auth_id` int unsigned NOT NULL,
  `user_did` int unsigned NOT NULL COMMENT 't_user table id',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `following_id` int unsigned DEFAULT NULL,
  `following_nid` varchar(10) DEFAULT NULL,
  `status` varchar(45) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1000046 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE `main`.`t_auth_history` 
ADD COLUMN `value` VARCHAR(128) NULL DEFAULT NULL AFTER `status`;
ALTER TABLE `main`.`t_auth_history` 
CHANGE COLUMN `value` `value` VARCHAR(128) NULL DEFAULT NULL AFTER `desc`, RENAME TO  `main`.`t_history` ;
