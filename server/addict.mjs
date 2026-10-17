/** 幼儿防沉迷模块 — 每日在线时长累计、到点锁定、家长控制台 API
 *
 * 规则（2026-10-18 与用户确认）：
 *  - 按天累计：以服务器本地日期为键，0 点自然换行重置；中途退出重登不重置
 *  - 实际在线时长：HTTP 心跳（30 秒）+ WS ping（10 秒）都驱动累计，服务端按
 *    "距上次心跳的墙上时间"自行计算（封顶 90 秒）——关页面/断线期间不计，
 *    重连最多补 90 秒，客户端伪造上报值无效
 *  - 到点锁定：当天 usedSec >= limitSec + bonusSec 即锁定——心跳 403、
 *    WS 踢下线、前端锁屏回登录页，当天不再放行；家长加时后立即恢复
 *  - 家长控制台：is_admin 账号按账号设每日上限、当天临时加时、开关防沉迷
 *
 * 接口:
 *   GET  /api/playtime/me                      当前账号今日额度
 *   POST /api/playtime/heartbeat               心跳，返回最新额度（锁定时 403）
 *   GET  /api/admin/me                         当前账号是不是管理员
 *   GET  /api/admin/playtime?day=YYYY-MM-DD    全部账号当天用量
 *   GET  /api/admin/history?name=&days=14      单账号最近 N 天每日用量（详情页趋势）
 *   PUT  /api/admin/config { name, dailyLimitSec?, enabled? }
 *   POST /api/admin/bonus { name, minutes }
 *   POST /api/admin/ban { name, banned }            封停 / 解封账号（封停=不许登录+通行证作废）
 *   DELETE /api/admin/user?name=                    删除账号（含存档，不可逆）
 *   GET  /api/admin/game?name=                      游戏内情况（只读：岛币/模式/背包/僵尸开关…）
 *
 * 依赖方向：本模块不 import index.mjs（避免循环），登录态与工具函数由
 * index.mjs 以 deps 注入，与 ws.mjs 的 attachWs 同一模式。
 */

const DEFAULT_LIMIT_SEC = 3600;   // 默认每日上限 1 小时
const MAX_DELTA_SEC = 90;         // 单次心跳最多计 90 秒（心跳 10~30 秒 + 余量；断线重连补爆防护）
const MAX_LIMIT_SEC = 24 * 3600;  // 单账号每日上限硬顶 24 小时（防配置失误锁死人）
const MAX_BONUS_MIN = 240;        // 单次加时上限 240 分钟

/** 服务器本地日期 'YYYY-MM-DD'（"0 点重置"的天按服务器时区算） */
function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 存档 JSON 解析兜底：坏档不该让控制台报错 */
const safeParse = (s) => { try { return JSON.parse(s); } catch { return null; } };

/** 本地日期减 n 天（'YYYY-MM-DD' → 'YYYY-MM-DD'），历史统计按服务器本地日期算 */
function dayMinus(day, n) {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() - n);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 组装防沉迷能力：HTTP 处理器 + WS 锁定查询/计时。deps 见文件头 */
export function attachAddict(deps) {
  const { db, currentUser, send, sendErr, readBody, limited, API_LIMIT } = deps;

  const q = {
    configByUser: db.prepare('SELECT * FROM addict_config WHERE user_id = ?'),
    upsertConfig: db.prepare(`INSERT INTO addict_config (user_id, daily_limit_sec, enabled, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET daily_limit_sec = excluded.daily_limit_sec, enabled = excluded.enabled, updated_at = excluded.updated_at`),
    dayByUser: db.prepare('SELECT * FROM playtime_daily WHERE user_id = ? AND day = ?'),
    addSeconds: db.prepare(`INSERT INTO playtime_daily (user_id, day, seconds, bonus_seconds, updated_at) VALUES (?, ?, ?, 0, ?)
      ON CONFLICT(user_id, day) DO UPDATE SET seconds = seconds + excluded.seconds, updated_at = excluded.updated_at`),
    addBonus: db.prepare(`INSERT INTO playtime_daily (user_id, day, seconds, bonus_seconds, updated_at) VALUES (?, ?, 0, ?, ?)
      ON CONFLICT(user_id, day) DO UPDATE SET bonus_seconds = bonus_seconds + excluded.bonus_seconds, updated_at = excluded.updated_at`),
    allUsers: db.prepare('SELECT id, name, is_admin, banned FROM users ORDER BY id'),
    daysRange: db.prepare('SELECT * FROM playtime_daily WHERE user_id = ? AND day >= ? AND day <= ? ORDER BY day'),
    saveByUser: db.prepare('SELECT data, updated_at FROM saves WHERE user_id = ?'),
    gameStateByUser: db.prepare('SELECT coins, ever_creative, creative_blocked, zombie_forced FROM game_state WHERE user_id = ?'),
    userByName: db.prepare('SELECT * FROM users WHERE name = ?'),
  };

  /** 当前额度快照（配置行/用量行缺失时给默认值，不写库） */
  function stateOf(userId, day = today()) {
    const cfg = q.configByUser.get(userId);
    const limitSec = cfg ? cfg.daily_limit_sec : DEFAULT_LIMIT_SEC;
    const enabled = cfg ? cfg.enabled === 1 : true;
    const row = q.dayByUser.get(userId, day);
    const usedSec = row ? row.seconds : 0;
    const bonusSec = row ? row.bonus_seconds : 0;
    const quotaSec = limitSec + bonusSec;
    return {
      day, usedSec, limitSec, bonusSec,
      remainingSec: Math.max(0, quotaSec - usedSec),
      locked: enabled && usedSec >= quotaSec, // 关闭防沉迷（enabled=0）时永不锁
      enabled,
    };
  }

  /** 计一次心跳：按"距上次心跳的墙上时间"累计（封顶防刷），返回本次计了多久 */
  function beat(userId) {
    const nowSec = Math.floor(Date.now() / 1000);
    const day = today();
    const row = q.dayByUser.get(userId, day);
    const delta = row ? Math.min(Math.max(nowSec - row.updated_at, 0), MAX_DELTA_SEC) : 0;
    if (delta > 0) q.addSeconds.run(userId, day, delta, nowSec);
    else if (!row) q.addSeconds.run(userId, day, 0, nowSec); // 今天第一跳：建档，不计时
    return delta;
  }

  /** 按名字计心跳（WS ping 用；游客/未注册名返回 0） */
  function beatByName(name) {
    const base = String(name ?? '').split('#')[0];
    const u = q.userByName.get(base);
    return u ? beat(u.id) : 0;
  }

  /** 账号今天是否已锁定（WS 握手/心跳时踢人用） */
  function isLockedByName(name) {
    const base = String(name ?? '').split('#')[0];
    const u = q.userByName.get(base);
    if (!u) return false; // 游客不锁（没账号就没有额度概念）
    return stateOf(u.id).locked;
  }

  /** 账号是否被家长停用（WS 握手/心跳时踢人用；封停不随天数重置，只有家长解封） */
  function bannedByName(name) {
    const base = String(name ?? '').split('#')[0];
    const u = q.userByName.get(base);
    return !!u && u.banned === 1;
  }

  /** 管理员鉴权：当前登录账号必须带 is_admin（失败已直接回响应，返回 null） */
  function requireAdmin(req, res) {
    const u = currentUser(req);
    if (!u) { sendErr(res, 401, 'not logged in'); return null; }
    if (u.is_admin !== 1) { sendErr(res, 403, '需要管理员账号'); return null; }
    return u;
  }

  /* ---------------- 用户端接口 ---------------- */

  async function handlePlaytime(req, res, ip) {
    if (limited(ip, 'api', API_LIMIT)) return sendErr(res, 429, '请求太频繁啦');
    const u = currentUser(req);
    if (!u) return sendErr(res, 401, 'not logged in'); // 没登录：前端本地模式，安静跳过
    const action = (req.url ?? '').split('?')[0].split('/').pop(); // me / heartbeat

    if (req.method === 'GET' && action === 'me') return send(res, 200, stateOf(u.id));

    if (req.method === 'POST' && action === 'heartbeat') {
      const st = stateOf(u.id);
      // 锁了不累计，但把状态带回去（403 体含额度），前端据此锁屏展示已玩时长
      if (st.locked) return send(res, 403, { error: 'locked', ...st });
      const added = beat(u.id);
      return send(res, 200, { ...stateOf(u.id), added });
    }
    return sendErr(res, 404, 'unknown');
  }

  /* ---------------- 控制台接口（家长） ---------------- */

  async function handleAdmin(req, res, ip) {
    if (limited(ip, 'api', API_LIMIT)) return sendErr(res, 429, '请求太频繁啦');
    const action = (req.url ?? '').split('?')[0].split('/').pop(); // me / playtime / history / config / bonus

    if (req.method === 'GET' && action === 'me') {
      const u = requireAdmin(req, res);
      if (!u) return;
      return send(res, 200, { name: u.name, admin: true });
    }

    if (req.method === 'GET' && action === 'playtime') {
      if (!requireAdmin(req, res)) return;
      const day = new URL(req.url ?? '/', 'http://localhost').searchParams.get('day') || today();
      if (!DAY_RE.test(day)) return sendErr(res, 400, '日期格式不对，要 YYYY-MM-DD');
      const users = q.allUsers.all().map((u) => ({ name: u.name, isAdmin: u.is_admin === 1, banned: u.banned === 1, ...stateOf(u.id, day) }));
      return send(res, 200, { day, users });
    }

    // 单账号最近 N 天每日用量（详情页趋势图；没玩的日子补 0）。
    // 注意：历史日期的上限/加时/锁定按【当前配置】回算，配置变更本身不按天留痕
    if (req.method === 'GET' && action === 'history') {
      if (!requireAdmin(req, res)) return;
      const url = new URL(req.url ?? '/', 'http://localhost');
      const u = q.userByName.get((url.searchParams.get('name') ?? '').trim());
      if (!u) return sendErr(res, 404, '没有这个账号');
      const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 14, 1), 90);
      const end = today();
      const start = dayMinus(end, days - 1);
      const rows = new Map(q.daysRange.all(u.id, start, end).map((r) => [r.day, r]));
      const cfg = q.configByUser.get(u.id);
      const limitSec = cfg ? cfg.daily_limit_sec : DEFAULT_LIMIT_SEC;
      const enabled = cfg ? cfg.enabled === 1 : true;
      const list = [];
      for (let i = 0; i < days; i++) {
        const day = dayMinus(end, days - 1 - i);
        const row = rows.get(day);
        const usedSec = row ? row.seconds : 0;
        const bonusSec = row ? row.bonus_seconds : 0;
        const quotaSec = limitSec + bonusSec;
        list.push({
          day, usedSec, limitSec, bonusSec,
          remainingSec: Math.max(0, quotaSec - usedSec),
          locked: enabled && usedSec >= quotaSec,
          enabled,
        });
      }
      return send(res, 200, { name: u.name, isAdmin: u.is_admin === 1, days: list });
    }

    if (req.method === 'PUT' && action === 'config') {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const u = q.userByName.get(String(body.name ?? '').trim());
      if (!u) return sendErr(res, 404, '没有这个账号');
      const cur = q.configByUser.get(u.id);
      // 部分更新：没传的字段保留原值
      const limitSec = body.dailyLimitSec === undefined
        ? (cur?.daily_limit_sec ?? DEFAULT_LIMIT_SEC)
        : Math.floor(Number(body.dailyLimitSec));
      const enabled = body.enabled === undefined
        ? (cur ? cur.enabled : 1)
        : (body.enabled ? 1 : 0);
      if (!Number.isInteger(limitSec) || limitSec < 0 || limitSec > MAX_LIMIT_SEC) {
        return sendErr(res, 400, '每日上限要在 0~1440 分钟之间');
      }
      q.upsertConfig.run(u.id, limitSec, enabled, Math.floor(Date.now() / 1000));
      console.log(`[防沉迷] ${u.name} 配置更新: 上限=${limitSec}秒 开关=${enabled}`);
      return send(res, 200, stateOf(u.id));
    }

    if (req.method === 'POST' && action === 'bonus') {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const u = q.userByName.get(String(body.name ?? '').trim());
      if (!u) return sendErr(res, 404, '没有这个账号');
      const minutes = Math.floor(Number(body.minutes));
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_BONUS_MIN) {
        return sendErr(res, 400, '加时要在 1~240 分钟之间');
      }
      // 加时记到哪天（默认今天；不能给未来加分——ISO 日期串可直接比大小）
      const day = body.day === undefined ? today() : String(body.day);
      if (!DAY_RE.test(day) || day > today()) return sendErr(res, 400, '加时日期只能是今天或更早');
      q.addBonus.run(u.id, day, minutes * 60, Math.floor(Date.now() / 1000));
      console.log(`[防沉迷] ${u.name} ${day} 加时 ${minutes} 分钟`);
      return send(res, 200, stateOf(u.id));
    }

    // 封停 / 解封：封停时把该账号所有通行证作废（等于强制登出），在线的那一个由 WS 层踢下线
    if (req.method === 'POST' && action === 'ban') {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const u = q.userByName.get(String(body.name ?? '').trim());
      if (!u) return sendErr(res, 404, '没有这个账号');
      const banned = body.banned ? 1 : 0;
      db.prepare('UPDATE users SET banned = ? WHERE id = ?').run(banned, u.id);
      if (banned) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id);
      console.log(`[控制台] ${u.name} ${banned ? '已封停' : '已解封'}`);
      return send(res, 200, { name: u.name, banned: banned === 1 });
    }

    // 删除账号：账号 + 存档 + 通行证 + 防沉迷数据一起删（不可逆，前端有二次确认）
    if (req.method === 'DELETE' && action === 'user') {
      if (!requireAdmin(req, res)) return;
      const name = new URL(req.url ?? '/', 'http://localhost').searchParams.get('name') ?? '';
      const u = q.userByName.get(name.trim());
      if (!u) return sendErr(res, 404, '没有这个账号');
      for (const t of ['saves', 'sessions', 'playtime_daily', 'addict_config']) {
        db.prepare(`DELETE FROM ${t} WHERE user_id = ?`).run(u.id);
      }
      db.prepare('DELETE FROM users WHERE id = ?').run(u.id);
      console.log(`[控制台] ${u.name} 账号已删除`);
      return send(res, 200, { name: u.name, deleted: true });
    }

    // 游戏内情况（只读）：从存档 JSON 里挑家长关心的字段。改不了——存档是客户端权威的，
    // 写入会和孩子的自动存档打架，等"服务端权威迁移"做好再开写接口
    if (req.method === 'GET' && action === 'game') {
      if (!requireAdmin(req, res)) return;
      const name = new URL(req.url ?? '/', 'http://localhost').searchParams.get('name') ?? '';
      const u = q.userByName.get(name.trim());
      if (!u) return sendErr(res, 404, '没有这个账号');
      const row = q.saveByUser.get(u.id);
      const data = row ? safeParse(row.data) : null;
      const inv = data?.inv ?? {};
      const filled = (arr) => (Array.isArray(arr) ? arr.filter((s) => s && typeof s === 'object').length : 0);
      const gs = q.gameStateByUser.get(u.id); // 权威游戏状态（0003）
      return send(res, 200, {
        name: u.name,
        banned: u.banned === 1,
        hasSave: !!data,
        updatedAt: row ? row.updated_at : null,
        mode: data?.mode ?? null,
        everCreative: gs ? gs.ever_creative === 1 : !!data?.everCreative,
        zombieAttack: data?.zombieAttack ?? null,
        character: data?.character ?? null,
        islandType: data?.islandType ?? null,
        coins: gs ? gs.coins : (data?.coins ?? 0),      // 权威岛币优先
        creativeBlocked: gs ? gs.creative_blocked === 1 : false,
        zombieForced: gs && (gs.zombie_forced === 0 || gs.zombie_forced === 1) ? gs.zombie_forced : null,
        hp: data?.hp ?? null,
        itemCount: filled(inv.hotbar) + filled(inv.storage) + filled(inv.armor) + filled(inv.waistbag),
        warriors: Array.isArray(data?.warriors) ? data.warriors.length : 0,
        tanks: Array.isArray(data?.tanks) ? data.tanks.length : 0,
        learned: Array.isArray(data?.learned) ? data.learned.length : 0,
      });
    }

    return sendErr(res, 404, 'unknown');
  }

  return { handlePlaytime, handleAdmin, isLockedByName, bannedByName, beatByName };
}

/** 启动时同步管理员名单：环境变量 ADMIN_NAMES（逗号分隔）为权威——
 *  名单里的账号 is_admin=1，其余一律 0；改名单后重启生效。空名单 = 控制台停用 */
export function syncAdmins(db, names) {
  const list = (names ?? []).map((s) => String(s).trim()).filter(Boolean);
  const set = db.prepare('UPDATE users SET is_admin = ? WHERE id = ?');
  for (const u of db.prepare('SELECT id, name, is_admin FROM users').all()) {
    const want = list.includes(u.name) ? 1 : 0;
    if (u.is_admin !== want) set.run(want, u.id);
  }
  console.log(list.length
    ? `[防沉迷] 管理员名单: ${list.join('、')}`
    : '[防沉迷] 未配置 ADMIN_NAMES，控制台不可用（游戏不受影响）');
}
