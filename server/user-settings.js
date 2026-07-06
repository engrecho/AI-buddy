// user-settings.js — 读取/保存每个用户的设置
// 当前主要用于：视频解析离线保存地址(offline_output_root)
//
// 容错策略：
//   - 表不存在时自动 CREATE TABLE IF NOT EXISTS（避免依赖 deploy/pull.sh 先跑迁移）
//   - 任何 SQL 异常都返回 {} / 静默失败,不影响主流程

import { pool } from './db.js';

const ALLOWED_KEYS = new Set(['offline_output_root']);

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`user_settings\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` BIGINT NOT NULL UNIQUE,
        \`settings\` JSON NOT NULL,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_user_settings_user_id\` (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    ensured = true;
  } catch (_) {
    // 多次重试避免锁竞争
    setTimeout(() => { ensured = false; }, 5000);
  }
}

/**
 * 读取当前用户的所有设置（容错：表不存在/SQL 失败时返回 {}）
 */
export async function getUserSetting(userId) {
  await ensureTable();
  try {
    const [rows] = await pool.query(
      'SELECT settings FROM user_settings WHERE user_id = ?',
      [userId]
    );
    if (rows.length === 0) return {};
    const raw = rows[0].settings;
    if (raw && typeof raw === 'string') {
      try { return JSON.parse(raw); } catch (_) { return {}; }
    }
    return raw || {};
  } catch (_) {
    return {};
  }
}

/**
 * 部分更新:只更新 patch 中出现的 key,其他保留
 * @returns {Promise<object>} 更新后的完整 settings
 */
export async function updateUserSetting(userId, patch) {
  await ensureTable();
  const safe = {};
  for (const k of Object.keys(patch || {})) {
    if (ALLOWED_KEYS.has(k)) safe[k] = patch[k];
  }
  if (Object.keys(safe).length === 0) return await getUserSetting(userId);

  try {
    const current = await getUserSetting(userId);
    const next = { ...current, ...safe };
    await pool.query(
      `INSERT INTO user_settings (user_id, settings)
       VALUES (?, CAST(? AS JSON))
       ON DUPLICATE KEY UPDATE settings = VALUES(settings)`,
      [userId, JSON.stringify(next)]
    );
    return next;
  } catch (_) {
    // 写失败:也至少返回内存中的 next
    return { ...(await getUserSetting(userId)), ...safe };
  }
}
