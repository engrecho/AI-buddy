#!/bin/bash
# 一次性任务：查询数据库中所有用户，确认是否有测试账号
set +e
echo "[once] ===== 查询数据库用户表 ====="
echo ""
echo "→ 所有用户（不显示密码）:"
mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
  SELECT id, username, nickname, avatar_url, created_at, last_login_at
  FROM users ORDER BY id
" 2>/dev/null
echo ""
echo "→ 用户总数:"
mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e "
  SELECT COUNT(*) FROM users
" 2>/dev/null
echo ""
echo "[once] ===== 完成 ====="
exit 0
