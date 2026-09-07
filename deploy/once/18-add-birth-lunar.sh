#!/bin/bash
# 一次性任务：家庭成员/健康档案新增「农历生日」标记字段
#
# 字段:
#   birth_lunar  生日是否按农历 (tinyint 1，默认 0)
#
# 安全性: 幂等, 用 information_schema 判断列是否存在后再添加
set +e

echo "[once] ===== 健康档案新增 birth_lunar（农历生日）字段 ====="
cd "$PROJECT_DIR" || exit 1

# 列存在则跳过，避免重复 ALTER
EXISTS=$(mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e \
  "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='health_profiles' AND COLUMN_NAME='birth_lunar';" 2>/dev/null)

if [ "$EXISTS" = "0" ]; then
  mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" 2>/dev/null <<'SQL'
ALTER TABLE `health_profiles`
  ADD COLUMN `birth_lunar` tinyint(1) NOT NULL DEFAULT 0 AFTER `birth_date`;
SQL
  echo "  ✓ health_profiles 已新增 birth_lunar 字段"
else
  echo "  ✓ birth_lunar 字段已存在，跳过"
fi

echo ""
echo "[once] ===== 完成 ====="
exit 0