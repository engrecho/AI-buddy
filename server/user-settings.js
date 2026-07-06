// user-settings.js — 读取/保存每个用户的设置
// 当前主要用于：视频解析离线保存地址(offline_output_root)

import { pool } from './db.js';

const ALLOWED_KEYS = new Set(['offline_output_root']);

/**
 * 读取当前用户的所有设置
 */
export async function getUserSetting(userId) {
  const [rows] = await pool.query(
    'SELECT settings FROM user_settings WHERE user_id = ?',
    [userId]
  );
  if (rows.length === 0) return {};
  // 不同 mysql 驱动版本对 JSON 列的返回略有不同
  const raw = rows[0].settings;
  if (raw && typeof raw === 'string') {
    try { return JSON.parse(raw); } catch (_) { return {}; }
  }
  return raw || {};
}

/**
 * 部分更新:只更新 patch 中出现的 key,其他保留
 * @returns {Promise<object>} 更新后的完整 settings
 */
export async function updateUserSetting(userId, patch) {
  const safe = {};
  for (const k of Object.keys(patch || {})) {
    if (ALLOWED_KEYS.has(k)) safe[k] = patch[k];
  }
  if (Object.keys(safe).length === 0) return await getUserSetting(userId);

  const current = await getUserSetting(userId);
  const next = { ...current, ...safe };

  await pool.query(
    `INSERT INTO user_settings (user_id, settings)
     VALUES (?, CAST(? AS JSON))
     ON DUPLICATE KEY UPDATE settings = VALUES(settings)`,
    [userId, JSON.stringify(next)]
  );
  return next;
}
