#!/bin/bash
# 一次性任务：健康档案新增「关联家庭成员」字段
#
# 字段:
#   member_id  关联的家庭成员ID (health_profiles.id 自关联，bigint，可空)
#
# 安全性: 幂等, 用 information_schema 判断列是否存在后再添加
set +e

echo "[once] ===== 健康档案新增 member_id（关联家庭成员）字段 ====="
cd "$PROJECT_DIR" || exit 1

# 列存在则跳过，避免重复 ALTER
EXISTS=$(mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e \
  "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='health_profiles' AND COLUMN_NAME='member_id';" 2>/dev/null)

if [ "$EXISTS" = "0" ]; then
  mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" 2>/dev/null <<'SQL'
ALTER TABLE `health_profiles`
  ADD COLUMN `member_id` bigint(20) DEFAULT NULL COMMENT '关联的家庭成员ID(health_profiles.id 自关联)' AFTER `relationship`,
  ADD KEY `idx_health_profiles_member` (`member_id`);
SQL
  echo "  ✓ health_profiles 已新增 member_id 字段"
else
  echo "  ✓ member_id 字段已存在，跳过"
fi

echo ""
echo "[once] ===== 完成 ====="
exit 0