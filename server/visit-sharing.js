import crypto from 'node:crypto';

const hash = token => crypto.createHash('sha256').update(token).digest('hex');
const validId = id => /^[1-9]\d{0,18}$/.test(String(id));
const visitFields = ['visit_date', 'hospital', 'department', 'doctor', 'chief_complaint', 'diagnosis', 'prescription', 'examination', 'next_visit_date', 'next_visit_date_end', 'cost', 'is_reimbursed', 'reimburse_amount', 'attachment_urls'];
const medFields = ['name', 'photo_url', 'usage_instruction', 'dosage', 'start_date', 'end_date', 'status', 'notes'];
const pick = (row, keys) => Object.fromEntries(keys.map(key => [key, row[key] ?? null]));

export async function ensureVisitSharesTable(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS health_visit_shares (
    visit_id BIGINT NOT NULL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

// This table is deliberately excluded from the generic CRUD API allowlist.
export function registerVisitSharing(app, { pool, authMiddleware, transformRow }) {
  const privateResponse = (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    next();
  };
  async function ownedVisit(req, res, next) {
    try {
      if (!validId(req.params.id)) return res.status(400).json({ error: { message: '无效的就诊记录' } });
      const [rows] = await pool.query(`SELECT v.id FROM health_visits v
        JOIN health_profiles p ON p.id = v.profile_id AND p.user_id = v.user_id
        WHERE v.id = ? AND v.user_id = ? AND p.deleted_at IS NULL`, [req.params.id, req.user.id]);
      if (!rows.length) return res.status(404).json({ error: { message: '就诊记录不存在' } });
      next();
    } catch (err) { next(err); }
  }
  const ownerPath = '/api/health/visits/:id/share';
  app.get(ownerPath, privateResponse, authMiddleware, ownedVisit, async (req, res, next) => {
    try {
      const [rows] = await pool.query("SELECT DATE_FORMAT(expires_at, '%Y-%m-%dT%H:%i:%s.000Z') AS expires_at FROM health_visit_shares WHERE visit_id = ? AND user_id = ? AND expires_at > UTC_TIMESTAMP()", [req.params.id, req.user.id]);
      res.json({ data: { active: !!rows.length, expires_at: rows[0] ? new Date(rows[0].expires_at).toISOString() : null }, error: null });
    } catch (err) { next(err); }
  });
  app.post(ownerPath, privateResponse, authMiddleware, ownedVisit, async (req, res, next) => {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 7 * 86400000);
      await pool.query(`INSERT INTO health_visit_shares (visit_id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), token_hash = VALUES(token_hash), expires_at = VALUES(expires_at), created_at = CURRENT_TIMESTAMP`,
      [req.params.id, req.user.id, hash(token), expires.toISOString().slice(0, 19).replace('T', ' ')]);
      res.json({ data: { token, active: true, expires_at: expires.toISOString() }, error: null });
    } catch (err) { next(err); }
  });
  app.delete(ownerPath, privateResponse, authMiddleware, ownedVisit, async (req, res, next) => {
    try {
      await pool.query('DELETE FROM health_visit_shares WHERE visit_id = ? AND user_id = ?', [req.params.id, req.user.id]);
      res.json({ data: { active: false }, error: null });
    } catch (err) { next(err); }
  });
  app.get('/api/shared/visits/:token', privateResponse, async (req, res, next) => {
    try {
      const unavailable = () => res.status(404).json({ error: { message: '分享链接已失效或不存在，请联系分享者' } });
      if (!/^[a-f0-9]{64}$/.test(req.params.token)) return unavailable();
      const [rows] = await pool.query(`SELECT v.*, p.patient_name, DATE_FORMAT(s.expires_at, '%Y-%m-%dT%H:%i:%s.000Z') AS share_expires_at
        FROM health_visit_shares s
        JOIN health_visits v ON v.id = s.visit_id AND v.user_id = s.user_id
        JOIN health_profiles p ON p.id = v.profile_id AND p.user_id = s.user_id AND p.deleted_at IS NULL
        JOIN users u ON u.id = s.user_id AND u.is_active = 1
        WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP() LIMIT 1`, [hash(req.params.token)]);
      if (!rows.length) return unavailable();
      const row = rows[0];
      const [meds] = await pool.query(`SELECT m.* FROM health_medications m
        JOIN visit_medications vm ON vm.medication_id = m.id
        WHERE vm.visit_id = ? AND m.user_id = ? AND m.profile_id = ?`, [row.id, row.user_id, row.profile_id]);
      const visit = pick(transformRow('health_visits', row), visitFields);
      res.json({ data: { patient_name: row.patient_name, visit,
        medications: meds.map(m => pick(transformRow('health_medications', m), medFields)),
        expires_at: new Date(row.share_expires_at).toISOString() }, error: null });
    } catch (err) { next(err); }
  });
}
