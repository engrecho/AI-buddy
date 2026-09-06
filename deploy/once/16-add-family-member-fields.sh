#!/bin/bash
# 一次性任务：健康档案新增「身份证号」「与本人关系」字段，用于家庭成员管理
#
# 字段:
#   id_card      身份证号 (varchar 32)
#   relationship 与本人关系，如 本人/妻子/丈夫/女儿/儿子/母亲/父亲 (varchar 32)
#
# 安全性: 幂等, 用 ADD COLUMN ... IF NOT EXISTS；仅新增列，不动表数据
set +e

echo "[once] ===== 健康档案新增 身份证号+关系 字段 ====="
cd "$PROJECT_DIR" || exit 1

mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" 2>/dev/null <<'SQL'
ALTER TABLE `health_profiles`
  ADD COLUMN IF NOT EXISTS `id_card` varchar(32) DEFAULT NULL AFTER `patient_avatar_url`,
  ADD COLUMN IF NOT EXISTS `relationship` varchar(32) DEFAULT NULL AFTER `id_card`;
SQL
echo "  ✓ health_profiles 新增 id_card / relationship 字段"

echo ""
echo "[once] ===== 完成 ====="
exit 0