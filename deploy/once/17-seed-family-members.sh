#!/bin/bash
# 一次性任务：为 jaylon 预置初始家庭成员
#
# 幂等：仅当该身份证号在数据库不存在时插入。已存在则跳过，绝不覆盖已有档案。
# 只插入「未删除」(deleted_at IS NULL) 的记录作为判重。
set +e

echo "[once] ===== 预置初始家庭成员 ====="
cd "$PROJECT_DIR" || exit 1

USER_ID=$(mysql -N -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" 2>/dev/null \
  -e "SELECT id FROM users WHERE username='jaylon' LIMIT 1;")

if [ -z "$USER_ID" ]; then
  echo "  ! 未找到 jaylon 用户，跳过预置"
  exit 0
fi
echo "  → jaylon user_id=$USER_ID"

for row in \
  "王旭|511025198912203180|妻子|female|1989-12-20" \
  "王悠然|371102202111261923|女儿|female|2021-11-26" \
  "牟玉花|372802195908031945|母亲|female|1959-08-03"; do
  IFS='|' read -r name idcard rel gender birth <<< "$row"
  EXISTS=$(mysql -N -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" 2>/dev/null \
    -e "SELECT COUNT(*) FROM health_profiles WHERE user_id=$USER_ID AND id_card='$idcard' AND deleted_at IS NULL LIMIT 1;")
  if [ "$EXISTS" = "0" ]; then
    mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" 2>/dev/null <<SQL
INSERT INTO health_profiles
  (user_id, patient_name, patient_avatar_url, id_card, relationship, gender, birth_date, disease_name, color, tags, status, notes, created_at, updated_at)
VALUES
  ($USER_ID, '$name', NULL, '$idcard', '$rel', '$gender', '$birth', NULL, '#bae63b', NULL, 'active', '家庭成员', NOW(), NOW());
SQL
    echo "  ✓ 已添加 $name（$rel）"
  else
    echo "  = 跳过 $name（已存在）"
  fi
done

echo ""
echo "[once] ===== 完成 ====="
exit 0