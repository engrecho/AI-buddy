import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { registerVisitSharing } from './visit-sharing.js';

test('visit sharing: ownership, lifecycle, expiry and public field isolation', async t => {
  let share;
  let deleted = false;
  let activeUser = true;
  const pool = { async query(sql, args) {
    if (sql.startsWith('SELECT v.id')) {
      assert.match(sql, /v.user_id = \?/);
      assert.match(sql, /p.deleted_at IS NULL/);
      return [[args[0] === '10' && args[1] === 1 && !deleted ? { id: 10 } : null].filter(Boolean)];
    }
    if (sql.startsWith('INSERT INTO health_visit_shares')) {
      share = { hash: args[2], expires: new Date(args[3].replace(' ', 'T') + 'Z') };
      return [{}];
    }
    if (sql.startsWith('DELETE')) { share = null; return [{}]; }
    if (sql.startsWith('SELECT DATE_FORMAT')) return [[share && share.expires > new Date() ? { expires_at: share.expires.toISOString() } : null].filter(Boolean)];
    if (sql.startsWith('SELECT v.*')) {
      assert.match(sql, /v.user_id = s.user_id/);
      assert.match(sql, /p.deleted_at IS NULL/);
      assert.match(sql, /u.is_active = 1/);
      assert.match(sql, /s.expires_at > UTC_TIMESTAMP\(\)/);
      return [[share && share.hash === args[0] && share.expires > new Date() && !deleted && activeUser ? {
        id: 10, user_id: 1, profile_id: 3, patient_name: '测试病人', visit_date: '2026-10-26',
        chief_complaint: '<script>alert(1)</script>', attachment_urls: [], id_card: 'private',
        share_expires_at: share.expires.toISOString(),
      } : null].filter(Boolean)];
    }
    if (sql.startsWith('SELECT m.*')) {
      assert.deepEqual(args, [10, 1, 3]);
      assert.match(sql, /m.user_id = \? AND m.profile_id = \?/);
      return [[{ id: 33, user_id: 1, name: '测试药物', visit_ids: [10, 99] }]];
    }
    throw new Error(`Unexpected query: ${sql}`);
  } };
  const app = express();
  registerVisitSharing(app, { pool, transformRow: (table, row) => row,
    authMiddleware: (req, res, next) => {
      if (!req.headers.authorization) return res.sendStatus(401);
      req.user = { id: Number(req.headers.authorization) }; next();
    } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, method = 'GET', user) {
    const r = await fetch(base + path, { method, headers: user ? { Authorization: String(user) } : {} });
    return { status: r.status, headers: r.headers, json: r.headers.get('content-type')?.includes('json') ? await r.json() : null };
  }
  const owner = '/api/health/visits/10/share';
  assert.equal((await request(owner, 'POST')).status, 401);
  for (const method of ['GET', 'POST', 'DELETE']) assert.equal((await request(owner, method, 2)).status, 404);
  assert.equal((await request('/api/health/visits/invalid/share', 'POST', 1)).status, 400);
  assert.equal((await request(owner, 'GET', 1)).json.data.active, false);
  const created = await request(owner, 'POST', 1);
  const token = created.json.data.token;
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.notEqual(share.hash, token);
  assert.ok(Math.abs(new Date(created.json.data.expires_at) - Date.now() - 7 * 86400000) < 5000);
  const path = `/api/shared/visits/${token}`;
  const result = await request(path);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(result.headers.get('referrer-policy'), 'no-referrer');
  assert.match(result.headers.get('x-robots-tag'), /noindex/);
  assert.equal(result.json.data.patient_name, '测试病人');
  assert.equal(result.json.data.visit.chief_complaint, '<script>alert(1)</script>');
  for (const field of ['id', 'user_id', 'profile_id', 'id_card', 'token_hash']) assert.equal(result.json.data.visit[field], undefined);
  assert.equal(result.json.data.medications[0].visit_ids, undefined);
  assert.equal((await request(owner, 'GET', 1)).json.data.active, true);
  assert.equal((await request('/api/shared/visits/bad')).status, 404);
  deleted = true; assert.equal((await request(path)).status, 404); deleted = false;
  activeUser = false; assert.equal((await request(path)).status, 404); activeUser = true;
  share.expires = new Date(0); assert.equal((await request(path)).status, 404);
  await request(owner, 'POST', 1);
  assert.equal((await request(path)).status, 404, 'rotation invalidates previous token');
  const second = (await request(owner, 'POST', 1)).json.data.token;
  await request(owner, 'DELETE', 1);
  assert.equal((await request(`/api/shared/visits/${second}`)).status, 404);
  assert.equal((await request(owner, 'GET', 1)).json.data.active, false);
});
