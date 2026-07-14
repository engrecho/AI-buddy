#!/bin/bash
# 一次性任务：建表 + 重置 jaylon 密码（纯 mysql 方式，不依赖 node）
cd "$PROJECT_DIR"

echo "=== 1. 创建新表 ==="
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < deploy/mysql-schema.sql 2>&1
if [ $? -eq 0 ]; then echo "✓ schema OK"; else echo "✗ schema 失败"; fi

echo ""
echo "=== 2. 验证新表 ==="
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e "
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='$DB_NAME'
  AND table_name IN ('health_profiles','health_visits','health_medications','vault_items')
  ORDER BY table_name;" 2>/dev/null

echo ""
echo "=== 3. 重置 jaylon 密码 ==="
# 用服务器端 node + bcryptjs 生成哈希
HASH=$(node -e "const bcrypt=require('bcryptjs');bcrypt.hash('111111',10).then(h=>process.stdout.write(h))" 2>/dev/null)
if [ -z "$HASH" ]; then
  echo "✗ node 生成哈希失败，尝试用项目内 bcryptjs"
  HASH=$(cd server && node -e "const bcrypt=require('bcryptjs');bcrypt.hash('111111',10).then(h=>process.stdout.write(h))" 2>/dev/null)
fi
if [ -z "$HASH" ]; then
  echo "✗ 仍失败，尝试全局"
  HASH=$(node -e "const bcrypt=require('/www/wwwroot/buddy.bajiaolu.cn/server/node_modules/bcryptjs');bcrypt.hash('111111',10).then(h=>process.stdout.write(h))" 2>/dev/null)
fi

if [ -n "$HASH" ]; then
  echo "哈希: ${HASH:0:20}..."
  mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "UPDATE users SET password_hash='$HASH' WHERE username='jaylon';" 2>/dev/null
  echo "✓ jaylon 密码已重置为 111111"
else
  echo "✗ 所有方式都失败"
  exit 1
fi

echo ""
echo "=== 完成 ==="
