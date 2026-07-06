-- ============================================================
-- AI-Buddy - 增量迁移：添加 user_settings 表
-- ============================================================
-- 背景：
--   视频解析(ExtractVideoSkill)下载到 server 端本地时,
--   每个用户可独立配置保存地址。
--   此表保存 user_id ↔ settings(JSON) 的映射。

CREATE TABLE IF NOT EXISTS `user_settings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL UNIQUE,
    `settings` JSON NOT NULL,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_user_settings_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
