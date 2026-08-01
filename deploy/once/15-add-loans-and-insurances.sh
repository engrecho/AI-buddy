#!/bin/bash
# 一次性任务：创建贷款 + 保险三张表
#
# 表:
#   loans               贷款主表
#   loan_payments       还款计划表
#   health_insurances   家庭保险表（关联 health_profiles）
#
# 安全性: 幂等, 用 CREATE TABLE IF NOT EXISTS
set +e

echo "[once] ===== 创建贷款 + 保险表 ====="
cd "$PROJECT_DIR" || exit 1

echo "  → 创建 loans 表..."
mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" 2>/dev/null <<'SQL'
CREATE TABLE IF NOT EXISTS `loans` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `name` varchar(200) NOT NULL,
  `loan_type` varchar(20) NOT NULL DEFAULT 'other',
  `institution` varchar(255) DEFAULT NULL,
  `principal` decimal(12,2) NOT NULL DEFAULT 0,
  `annual_rate` decimal(6,4) NOT NULL DEFAULT 0,
  `term_months` int(11) NOT NULL DEFAULT 1,
  `repayment_method` varchar(20) NOT NULL DEFAULT 'equal_payment',
  `start_date` date NOT NULL,
  `repayment_day` int(11) NOT NULL DEFAULT 1,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_loans_user` (`user_id`, `status`, `start_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL
echo "  ✓ loans 表就绪"

echo "  → 创建 loan_payments 表..."
mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" 2>/dev/null <<'SQL'
CREATE TABLE IF NOT EXISTS `loan_payments` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `loan_id` bigint(20) NOT NULL,
  `installment` int(11) NOT NULL,
  `due_date` date NOT NULL,
  `due_amount` decimal(12,2) NOT NULL DEFAULT 0,
  `principal_amount` decimal(12,2) NOT NULL DEFAULT 0,
  `interest_amount` decimal(12,2) NOT NULL DEFAULT 0,
  `paid_amount` decimal(12,2) NOT NULL DEFAULT 0,
  `paid_date` date DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_loan_payments_loan` (`loan_id`, `installment`),
  KEY `idx_loan_payments_user` (`user_id`, `status`, `due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL
echo "  ✓ loan_payments 表就绪"

echo "  → 创建 health_insurances 表..."
mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" 2>/dev/null <<'SQL'
CREATE TABLE IF NOT EXISTS `health_insurances` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `profile_id` bigint(20) DEFAULT NULL,
  `name` varchar(200) NOT NULL,
  `insurance_type` varchar(20) NOT NULL DEFAULT 'other',
  `company` varchar(255) DEFAULT NULL,
  `policy_no` varchar(100) DEFAULT NULL,
  `insured_person` varchar(100) DEFAULT NULL,
  `coverage_amount` decimal(12,2) DEFAULT NULL,
  `annual_premium` decimal(12,2) DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `payment_frequency` varchar(20) NOT NULL DEFAULT 'yearly',
  `auto_renew` tinyint(1) NOT NULL DEFAULT 0,
  `beneficiary` varchar(255) DEFAULT NULL,
  `beneficiary_ratio` varchar(255) DEFAULT NULL,
  `coverage_terms` text,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_health_ins_user` (`user_id`, `status`, `expiry_date`),
  KEY `idx_health_ins_profile` (`profile_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL
echo "  ✓ health_insurances 表就绪"

echo ""
echo "[once] ===== 完成 ====="
exit 0
