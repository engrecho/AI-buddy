#!/bin/bash
# 一次性任务：创建健康档案和密码保险箱的数据表
# 直接用完整 schema 文件执行（所有表都是 CREATE TABLE IF NOT EXISTS，幂等）
cd "$PROJECT_DIR"

echo "=== 创建健康档案 + 保险箱数据表 ==="

# 执行完整 schema（IF NOT EXISTS 保证幂等，已存在的表会跳过）
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < deploy/mysql-schema.sql 2>&1
if [ $? -eq 0 ]; then
  echo "✓ schema 执行成功"
else
  echo "✗ schema 执行失败"
  exit 1
fi

# 验证 4 张新表
echo ""
echo "=== 验证新表 ==="
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e "
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='$DB_NAME'
  AND table_name IN ('health_profiles','health_visits','health_medications','vault_items')
  ORDER BY table_name;
" 2>/dev/null

echo ""
echo "✓ 完成"
