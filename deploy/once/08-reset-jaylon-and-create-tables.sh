#!/bin/bash
# 一次性任务：重置 jaylon 密码 + 确保新表已创建
cd "$PROJECT_DIR"

echo "=== 1. 创建新表（幂等）==="
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
echo "=== 3. 重置 jaylon 密码为 111111 ==="
node -e "
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
(async () => {
  const pool = mysql.createPool({ host:'localhost', user:process.env.DB_USER, password:process.env.DB_PASSWORD, database:process.env.DB_NAME });
  const hash = await bcrypt.hash('111111', 10);
  const [r] = await pool.query('UPDATE users SET password_hash=? WHERE username=?', [hash, 'jaylon']);
  console.log('更新行数:', r.affectedRows);
  const [rows] = await pool.query('SELECT id, username, nickname FROM users WHERE username=?', ['jaylon']);
  console.log('jaylon 用户:', rows[0]);
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
"
