-- ============================================================
-- AI-Buddy - 增量迁移：业务表主键改为 AUTO_INCREMENT
-- 原因：SKILL API 创建记录时不传 id，需要数据库自增
-- 不影响现有数据：保留所有 id 不变，只是把 id 列标记为自增
-- ============================================================

-- 注意：MODIFY 改主键列属性可能需要临时去掉 AUTO_INCREMENT 再加回去
-- MySQL 8.0+ 可以直接 MODIFY
-- MySQL 5.7 也支持

ALTER TABLE `tasks` MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT;
ALTER TABLE `task_groups` MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT;
ALTER TABLE `task_tags` MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT;
ALTER TABLE `task_members` MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT;
ALTER TABLE `memos` MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT;
ALTER TABLE `task_notes` MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT;
ALTER TABLE `reading_items` MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT;
ALTER TABLE `quick_notes` MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT;
