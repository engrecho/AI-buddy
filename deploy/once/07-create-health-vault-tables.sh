#!/bin/bash
# 一次性任务：创建健康档案和密码保险箱的数据表
# 幂等设计：CREATE TABLE IF NOT EXISTS，重复执行无副作用
cd "$PROJECT_DIR"

echo "=== 创建健康档案 + 保险箱数据表 ==="

# 提取新表的 CREATE TABLE 语句并执行
node -e "
const fs = require('fs');
const sql = fs.readFileSync('deploy/mysql-schema.sql', 'utf8');
const newTables = ['health_profiles', 'health_visits', 'health_medications', 'vault_items'];
for (const table of newTables) {
  const re = new RegExp('(CREATE TABLE[\\\\s\\\\S]*?\`' + table + '\`[\\\\s\\\\S]*?ENGINE=InnoDB[^;]+;)', 'm');
  const m = sql.match(re);
  if (m) {
    console.log(m[1]);
  } else {
    console.error('NOT FOUND:', table);
    process.exit(1);
  }
}
" > /tmp/health-vault-tables.sql

if [ $? -ne 0 ]; then
  echo "✗ 提取建表语句失败"
  exit 1
fi

echo "待执行 SQL:"
cat /tmp/health-vault-tables.sql
echo ""

mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < /tmp/health-vault-tables.sql 2>&1
if [ $? -eq 0 ]; then
  echo "✓ 建表成功"
  # 验证
  TABLES=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e "SELECT table_name FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name IN ('health_profiles','health_visits','health_medications','vault_items');")
  echo "已创建的表:"
  echo "$TABLES"
  rm -f /tmp/health-vault-tables.sql
else
  echo "✗ 建表失败"
  rm -f /tmp/health-vault-tables.sql
  exit 1
fi
