/** 后端小服务 — 托管游戏网页 + 账号登录 + 存档接口，存档进 SQLite（data.db 单文件）
 *
 *  用法:
 *    npm run build        # 先打出 dist/（本服务直接发 dist 里的静态文件）
 *    npm run server       # 启动，默认端口 8787，可用 PORT / HOST 环境变量改
 *
 *  接口:
 *    POST /api/auth/register  {name, password}  注册（开放注册，总数有上限）
 *    POST /api/auth/login     {name, password}  登录，返回 httpOnly Cookie
 *    GET  /api/auth/me                          看当前登录的是谁（没登录回 401）
 *    POST /api/auth/logout                      退出登录
 *    GET/POST/DELETE /api/save[/槽位]           当前账号的存档（一个账号一档）
 *
 *  安全要点: 密码 scrypt 加盐哈希 + 常量时间比较; 存档接口必须带登录 Cookie;
 *           覆盖旧档前把旧档挪进 backup 列留后悔药（后悔药在数据库里，不落 JSON 文件）
 */

import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import Database from 'better-sqlite3';
import { attachWs, consumeVisitTicket } from './ws.mjs';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..'); // 项目根目录
const DIST = join(ROOT, 'dist');          // vite 打包出来的静态文件
const DB_FILE = join(ROOT, 'server', 'data.db');

const PORT = Number(process.env.PORT ?? 8787);
/** Cookie 域名：填 .7shu.asia 这类值，几个子域（主站/手机版）就能共用同一份登录态；留空只对当前域名生效 */
const COOKIE_DOMAIN = (process.env.COOKIE_DOMAIN ?? '').trim();
const HOST = process.env.HOST ?? '127.0.0.1'; // 默认只听本机回环，外网走 Nginx 反代
const COOKIE = 'bw_token';          // 登录凭证的 Cookie 名
const SESSION_DAYS = 30;            // 登录一次管 30 天
const MAX_USERS = 500;              // 开放注册的总量上限，防陌生人把库灌爆
const MAX_BODY = 3 * 1024 * 1024;   // 请求体上限 3MB（存档才几十 KB，留足余量）
const AUTH_LIMIT = 20;              // 登录/注册每 IP 每分钟最多试 20 次（防猜密码）
const API_LIMIT = 120;              // 其他接口每 IP 每分钟 120 次

/* ---------------- 数据库 ---------------- */

const db = new Database(DB_FILE);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    pass TEXT NOT NULL,             -- 存 "盐:哈希" 的十六进制串，绝不存明文
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    expires INTEGER NOT NULL        -- 过期时间戳（秒）
  );
  CREATE TABLE IF NOT EXISTS saves (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),   -- 一个账号一档 → user_id 即主键
    data TEXT NOT NULL,
    backup TEXT,                    -- 被覆盖前的上一份，后悔药
    updated_at INTEGER NOT NULL
  );
`);
const q = {
  userByName: db.prepare('SELECT * FROM users WHERE name = ?'),
  userById: db.prepare('SELECT * FROM users WHERE id = ?'),
  userCount: db.prepare('SELECT COUNT(*) AS n FROM users'),
  addUser: db.prepare('INSERT INTO users (name, pass, created_at) VALUES (?, ?, ?)'),
  addSession: db.prepare('INSERT INTO sessions (token, user_id, expires) VALUES (?, ?, ?)'),
  session: db.prepare('SELECT * FROM sessions WHERE token = ?'),
  dropSession: db.prepare('DELETE FROM sessions WHERE token = ?'),
  dropExpired: db.prepare('DELETE FROM sessions WHERE expires < ?'),
  save: db.prepare('SELECT data FROM saves WHERE user_id = ?'),
  putSave: db.prepare(`INSERT INTO saves (user_id, data, backup, updated_at) VALUES (?, ?, NULL, ?)
    ON CONFLICT(user_id) DO UPDATE SET backup = saves.data, data = excluded.data, updated_at = excluded.updated_at`),
  dropSave: db.prepare('DELETE FROM saves WHERE user_id = ?'),
};

/* ---------------- 小工具 ---------------- */

const hashPass = (pw, salt) => scryptSync(pw, salt, 64).toString('hex');
const makePass = (pw) => { const s = randomBytes(16).toString('hex'); return `${s}:${hashPass(pw, s)}`; };
const checkPass = (pw, stored) => {
  const [s, h] = (stored ?? '').split(':');
  if (!s || !h) return false;
  const a = Buffer.from(hashPass(pw, s), 'hex');
  const b = Buffer.from(h, 'hex');
  return a.length === b.length && timingSafeEqual(a, b); // 常量时间比较，防按耗时猜密码
};

/** 简单限流：每 IP 每分钟最多 max 次（内存里记，重启清零） */
const buckets = new Map();
function limited(ip, key, max) {
  const now = Date.now();
  const k = `${key}:${ip}`;
  const list = (buckets.get(k) ?? []).filter((t) => now - t < 60_000);
  if (list.length >= max) { buckets.set(k, list); return true; }
  list.push(now);
  buckets.set(k, list);
  return false;
}

function send(res, code, body, headers = {}) {
  const isObj = body !== null && typeof body === 'object';
  const data = isObj ? JSON.stringify(body) : (body ?? '');
  res.writeHead(code, {
    'content-type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    ...headers,
  });
  res.end(data);
}
const sendErr = (res, code, msg) => send(res, code, { error: msg });

/** 读请求体（JSON），太大直接拒 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('too big')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(new Error('bad json')); }
    });
    req.on('error', reject);
  });
}

/** 写 Cookie；https（或反向代理转发来的 https）才加 Secure，不然 http 调试时 Cookie 存不上。
 *  配了 COOKIE_DOMAIN 时 Cookie 对所有子域生效（例如 m. 手机版域名和主域名共用登录态） */
function setSessionCookie(req, res, token, maxAge) {
  const https = req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https';
  const domain = COOKIE_DOMAIN ? ` Domain=${COOKIE_DOMAIN};` : '';
  res.setHeader('set-cookie',
    `${COOKIE}=${token}; Path=/;${domain} HttpOnly; SameSite=Lax; Max-Age=${maxAge}` + (https ? '; Secure' : ''));
}

/** 从 Cookie 里认出当前用户；过期顺手清掉 */
function currentUser(req) {
  const raw = req.headers.cookie ?? '';
  const token = raw.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!token) return null;
  const sess = q.session.get(token);
  if (!sess) return null;
  const now = Math.floor(Date.now() / 1000);
  if (sess.expires < now) { q.dropSession.run(token); return null; }
  return q.userById.get(sess.user_id) ?? null;
}

/* ---------------- 账号接口 ---------------- */

const NAME_RE = /^[\w一-龥-]{2,16}$/; // 2~16 位：字母、数字、下划线、中文、短横线

async function handleAuth(req, res, ip) {
  const action = req.url.split('?')[0].split('/').pop(); // register / login / me / logout

  if (req.method === 'GET' && action === 'me') {
    const u = currentUser(req);
    if (!u) return sendErr(res, 401, 'not logged in');
    return send(res, 200, { name: u.name });
  }
  if (req.method !== 'POST') return sendErr(res, 405, 'method not allowed');
  if (limited(ip, 'auth', AUTH_LIMIT)) return sendErr(res, 429, '试太多次啦，歇一分钟再来');

  if (action === 'logout') {
    const raw = req.headers.cookie ?? '';
    const token = raw.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    if (token) q.dropSession.run(token);
    setSessionCookie(req, res, '', 0);
    return send(res, 200, { ok: true });
  }

  const body = await readBody(req);
  const name = String(body.name ?? '').trim();
  const password = String(body.password ?? '');
  if (!NAME_RE.test(name)) return sendErr(res, 400, '名字要 2~16 位，只能是字母、数字、中文、_ 或 -');
  if (password.length < 4 || password.length > 64) return sendErr(res, 400, '密码要 4~64 位');

  if (action === 'register') {
    if (q.userByName.get(name)) return sendErr(res, 409, '这个名字被人用啦，换一个');
    if (q.userCount.get().n >= MAX_USERS) return sendErr(res, 403, '人满了，找站长加位置');
    const info = q.addUser.run(name, makePass(password), Math.floor(Date.now() / 1000));
    login(res, req, info.lastInsertRowid);
    return send(res, 200, { name });
  }
  if (action === 'login') {
    const u = q.userByName.get(name);
    if (!u || !checkPass(password, u.pass)) return sendErr(res, 401, '名字或密码不对');
    login(res, req, u.id);
    return send(res, 200, { name: u.name });
  }
  return sendErr(res, 404, 'unknown');
}

/** 发一张 30 天的"通行证"（session token 存 Cookie） */
function login(res, req, userId) {
  const token = randomBytes(32).toString('hex');
  const expires = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  q.addSession.run(token, userId, expires);
  setSessionCookie(req, res, token, SESSION_DAYS * 86400);
}

/* ---------------- 存档接口 ---------------- */

async function handleSave(req, res, ip) {
  if (limited(ip, 'api', API_LIMIT)) return sendErr(res, 429, '请求太频繁啦');
  const u = currentUser(req);
  if (!u) return sendErr(res, 401, 'not logged in'); // 没登录：前端会当成本地模式，安静跳过

  if (req.method === 'GET') {
    const row = q.save.get(u.id);
    if (!row) return sendErr(res, 404, 'no save');
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    return res.end(row.data);
  }
  if (req.method === 'DELETE') {
    q.dropSave.run(u.id);
    return send(res, 200, { ok: true });
  }
  if (req.method === 'POST') {
    const body = await readBody(req);
    // 存档格式：比服务端新的档拒收（防止把看不懂的新字段写爆），老档照收（前端 migrateSave 会补齐字段）
    if (!body || typeof body.v !== 'number' || body.v < 1 || body.v > 1) return sendErr(res, 400, 'bad save');
    q.putSave.run(u.id, JSON.stringify(body), Math.floor(Date.now() / 1000));
    return send(res, 200, { ok: true });
  }
  return sendErr(res, 405, 'method not allowed');
}

/** 按用户名读取该用户的存档 JSON 对象（供 WS 双重验证使用） */
function readSaveByUserName(name) {
  const baseName = String(name ?? '').split('#')[0];
  const u = q.userByName.get(baseName);
  if (!u) return null;
  const row = q.save.get(u.id);
  if (!row) return null;
  try {
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

/** 好友访岛：GET /api/visit/world?name=<岛主名>[&ticket=<票据>] — 校验登录态 + 一次性访问票据，返回岛主存档 JSON */
function handleVisitWorld(req, res, ip) {
  if (limited(ip, 'api', API_LIMIT)) return sendErr(res, 429, '请求太频繁啦');
  if (req.method !== 'GET') return sendErr(res, 405, 'method not allowed');
  const u = new URL(req.url ?? '/', 'http://localhost');
  const ownerName = (u.searchParams.get('name') ?? '').trim();
  const ticketParam = (u.searchParams.get('ticket') ?? '').trim() || null;
  if (!ownerName) return sendErr(res, 400, 'missing name');

  // 登录态或有效票据二选一：票据本身就是一次性凭证（128 位随机数），没登录的访客凭票也能进
  const visitor = currentUser(req);
  if (!visitor && !ticketParam) return sendErr(res, 401, 'not logged in');

  const consumed = consumeVisitTicket(ownerName, visitor?.name ?? null, ticketParam);
  if (!consumed) return sendErr(res, 403, 'invalid or expired visit ticket');

  const ownerUser = q.userByName.get(consumed.ownerAccount) ?? q.userByName.get(ownerName.split('#')[0]);
  if (!ownerUser) return sendErr(res, 404, 'owner not found');
  const row = q.save.get(ownerUser.id);
  if (!row) return sendErr(res, 404, 'owner has no save');

  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  res.end(row.data);
}

/* ---------------- 静态文件 ---------------- */

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.map': 'application/json', '.woff2': 'font/woff2',
};

function serveStatic(req, res) {
  let path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (path === '/') path = '/index.html';
  const file = normalize(join(DIST, path));
  if (!file.startsWith(DIST)) return sendErr(res, 403, 'forbidden'); // 防 "../" 越狱读文件
  if (!existsSync(file)) {
    // 单页应用兜底：找不着的路径都回首页
    const index = join(DIST, 'index.html');
    if (!existsSync(index)) return sendErr(res, 503, '先跑 npm run build 打出 dist/');
    return serveFile(req, res, index);
  }
  serveFile(req, res, file);
}

function serveFile(req, res, file) {
  const data = readFileSync(file);
  const type = MIME[extname(file)] ?? 'application/octet-stream';
  const headers = { 'content-type': type };
  // 文本类文件 gzip 压缩一下，手机上加载快些
  if (type.startsWith('text/') || type.includes('json')) {
    if ((req.headers['accept-encoding'] ?? '').includes('gzip')) {
      headers['content-encoding'] = 'gzip';
      res.writeHead(200, headers);
      return res.end(gzipSync(data));
    }
  }
  res.writeHead(200, headers);
  res.end(data);
}

/* ---------------- 入口 ---------------- */

const server = createServer(async (req, res) => {
  try {
    const ip = (req.headers['x-forwarded-for'] ?? '').toString().split(',')[0].trim()
      || req.socket.remoteAddress || '?';
    const url = req.url ?? '/';
    if (url.startsWith('/api/auth/')) return await handleAuth(req, res, ip);
    if (url.startsWith('/api/save')) return await handleSave(req, res, ip);
    if (url.startsWith('/api/visit/world')) return handleVisitWorld(req, res, ip);
    if (url.startsWith('/api/')) return sendErr(res, 404, 'unknown api');
    serveStatic(req, res);
  } catch (e) {
    if (!res.headersSent) sendErr(res, 500, 'server error');
    console.error(e);
  }
});

// 每次启动顺手清掉过期的登录凭证
q.dropExpired.run(Math.floor(Date.now() / 1000));

// 挂上 WebSocket 长连接服务（复用同一端口，处理 /ws 的 upgrade）
attachWs(server, currentUser, readSaveByUserName);

server.listen(PORT, HOST, () => console.log(`方块世界服务器跑起来啦 → http://${HOST}:${PORT}`));
