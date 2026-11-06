/** 玩家偏好设置 —— 自定义按键等，一账号一行 JSON 大字段（以后加新偏好不用改表）
 *
 *  GET /api/settings        当前账号的设置 JSON（未登录 401；从没存过返回 {}）
 *  PUT /api/settings {...}  整份覆盖写入（顶层必须是对象，限 16KB）
 */

const MAX_BYTES = 16 * 1024; // 设置整份不许超过 16KB，防塞垃圾

export function attachSettings({ db, currentUser, send, sendErr, readBody }) {
  const q = {
    get: db.prepare('SELECT settings FROM user_settings WHERE user_id = ?'),
    put: db.prepare(`INSERT INTO user_settings (user_id, settings, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET settings = excluded.settings, updated_at = excluded.updated_at`),
  };

  async function handle(req, res) {
    const u = currentUser(req);
    if (!u) return sendErr(res, 401, '先登录');

    if (req.method === 'GET') {
      const row = q.get.get(u.id);
      let settings = {};
      try { settings = JSON.parse(row?.settings ?? '{}') ?? {}; } catch { /* 库里坏了就当没有 */ }
      return send(res, 200, { settings });
    }

    if (req.method !== 'PUT') return sendErr(res, 405, 'method not allowed');
    const body = await readBody(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return sendErr(res, 400, '设置要是个 JSON 对象');
    }
    const text = JSON.stringify(body);
    if (text.length > MAX_BYTES) return sendErr(res, 413, '设置太大啦');
    q.put.run(u.id, text, Math.floor(Date.now() / 1000));
    return send(res, 200, { ok: true });
  }

  return { handle };
}
