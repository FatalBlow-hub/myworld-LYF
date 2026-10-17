/** 游戏状态权威化 — 岛币半权威 + 家长强制项（禁创造 / 僵尸开关）
 *
 * 存档仍是客户端每 15 秒整体覆盖写回的，服务端在"这一来一回之间"把权威值和家长设置钉进存档：
 *  - 岛币：权威值存库；客户端上报的涨跌在合理范围内采纳、异常暴涨拦截并记审计日志
 *  - 曾开创造：权威值只增不减（客户端改本地存档也否认不掉），家长可清除
 *  - 禁创造 / 僵尸：读档时强制覆盖，下次进游戏生效（游戏启动时还会拉一次配置再应用一遍）
 * 彻底防刷需要把游戏内每次买卖都改成走服务端算钱（"真权威"），本次按半权威实现，见 docs/变更历史.md
 *
 * 接口:
 *   GET  /api/game/config                      当前账号的家长配置（游戏启动时拉一次）
 *   PUT  /api/admin/gamestate { name, creativeBlocked?, zombieForced?, everCreative? }
 *   POST /api/admin/coins { name, delta }       发放（正）/ 扣除（负）岛币
 *   GET  /api/admin/coins?name=&limit=20       岛币变化审计（控制台曲线）
 */

const COIN_SPIKE_LIMIT = 500; // 单次存档上涨超过这么多视为异常：保留权威值、记日志
const COIN_MAX = 1_000_000;   // 岛币上限，防止存档里塞个天文数字

/** 服务器本地日期 'YYYY-MM-DD'（与 addict.mjs 同一口径） */
function today() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 组装游戏状态能力（deps 由 index.mjs 注入，与 addict.mjs 同一模式） */
export function attachGameState(deps) {
  const { db, currentUser, send, sendErr, readBody, limited, API_LIMIT } = deps;

  const q = {
    stateByUser: db.prepare('SELECT * FROM game_state WHERE user_id = ?'),
    upsert: db.prepare(`INSERT INTO game_state (user_id, coins, ever_creative, creative_blocked, zombie_forced, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET coins = excluded.coins, ever_creative = excluded.ever_creative,
        creative_blocked = excluded.creative_blocked, zombie_forced = excluded.zombie_forced,
        updated_at = excluded.updated_at`),
    log: db.prepare('INSERT INTO coin_log (user_id, day, reported, accepted, delta, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    logList: db.prepare('SELECT day, reported, accepted, delta, reason, created_at FROM coin_log WHERE user_id = ? ORDER BY id DESC LIMIT ?'),
    userByName: db.prepare('SELECT * FROM users WHERE name = ?'),
  };

  /** 对外可见的状态（没有权威行时按默认值给） */
  function publicState(userId) {
    const st = q.stateByUser.get(userId);
    return {
      coins: st ? st.coins : 0,
      everCreative: st ? st.ever_creative === 1 : false,
      creativeBlocked: st ? st.creative_blocked === 1 : false,
      // null = 家长不干预（用存档自己的值）
      zombieForced: st && (st.zombie_forced === 0 || st.zombie_forced === 1) ? st.zombie_forced : null,
    };
  }

  /** 管理员鉴权（与 addict.mjs 同规则：登录 + is_admin） */
  function requireAdmin(req, res) {
    const u = currentUser(req);
    if (!u) { sendErr(res, 401, 'not logged in'); return null; }
    if (u.is_admin !== 1) { sendErr(res, 403, '需要管理员账号'); return null; }
    return u;
  }

  /** 存档写回时调用：采信或拦截上报值，并把权威值写回存档对象（改不了本地存档了）
   *  @returns {{ coins: number, everCreative: boolean }} 权威值 */
  function syncFromSave(userId, save) {
    const now = Math.floor(Date.now() / 1000);
    const st = q.stateByUser.get(userId);
    const raw = typeof save.coins === 'number' && Number.isFinite(save.coins) ? save.coins : 0;
    const reported = Math.max(0, Math.min(Math.floor(raw), COIN_MAX));
    const everReported = !!save.everCreative;

    if (!st) {
      // 第一次见到这个账号的存档：以存档里的岛币为权威起点（不动孩子已经赚到的钱）
      q.upsert.run(userId, reported, everReported ? 1 : 0, 0, null, now);
      q.log.run(userId, today(), reported, reported, 0, 'init', now);
      save.coins = reported;
      save.everCreative = everReported;
      return { coins: reported, everCreative: everReported };
    }

    const delta = reported - st.coins;
    let coins = st.coins;
    let reason = 'save-sync';
    if (delta > COIN_SPIKE_LIMIT) {
      reason = 'rejected-spike'; // 涨太猛：不采信，保留权威值
    } else {
      coins = reported;          // 正常涨跌（包括花钱下降）照收
    }
    const ever = (st.ever_creative === 1 || everReported) ? 1 : 0;
    q.upsert.run(userId, coins, ever, st.creative_blocked, st.zombie_forced, now);
    if (delta !== 0 || ever !== st.ever_creative) {
      q.log.run(userId, today(), reported, coins, coins - reported, reason, now);
    }
    // 存档里也写权威值：下次读档就绕开本地改动
    save.coins = coins;
    save.everCreative = ever === 1;
    return { coins, everCreative: ever === 1 };
  }

  /** 读档时调用：权威值覆盖 + 家长强制项生效（直接改存档对象） */
  function applyToSave(userId, save) {
    const st = q.stateByUser.get(userId);
    if (!st) return save;
    save.coins = st.coins;
    save.everCreative = st.ever_creative === 1;
    if (st.creative_blocked === 1) save.mode = 'survival'; // 家长禁用创造：强制生存
    if (st.zombie_forced === 0 || st.zombie_forced === 1) {
      save.zombieAttack = st.zombie_forced === 1;
      save.zombieSpawn = st.zombie_forced === 1;
    }
    return save;
  }

  /** GET /api/game/config：游戏启动时拉一次，把家长设置应用到开局 */
  async function handleConfig(req, res, ip) {
    if (limited(ip, 'api', API_LIMIT)) return sendErr(res, 429, '请求太频繁啦');
    const u = currentUser(req);
    if (!u) return sendErr(res, 401, 'not logged in'); // 没登录 → 前端本地模式，安静跳过
    return send(res, 200, publicState(u.id));
  }

  /* ---------------- 控制台接口（家长） ---------------- */

  async function handleAdmin(req, res, ip) {
    if (limited(ip, 'api', API_LIMIT)) return sendErr(res, 429, '请求太频繁啦');
    const action = (req.url ?? '').split('?')[0].split('/').pop(); // gamestate / coins

    // 改家长强制项：禁创造 / 僵尸（null=不干预）/ 清除"曾开创造"
    if (req.method === 'PUT' && action === 'gamestate') {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      const body = await readBody(req);
      const u = q.userByName.get(String(body.name ?? '').trim());
      if (!u) return sendErr(res, 404, '没有这个账号');
      const st = q.stateByUser.get(u.id);
      const now = Math.floor(Date.now() / 1000);
      const creativeBlocked = body.creativeBlocked === undefined
        ? (st ? st.creative_blocked : 0)
        : (body.creativeBlocked ? 1 : 0);
      const zombieForced = body.zombieForced === undefined
        ? (st ? st.zombie_forced : null)
        : (body.zombieForced === null ? null : (body.zombieForced ? 1 : 0));
      // everCreative 家长只能清除（置 0）；置 1 由存档同步自动完成，不接受手工置真
      const ever = body.everCreative === false ? 0 : (st ? st.ever_creative : 0);
      q.upsert.run(u.id, st ? st.coins : 0, ever, creativeBlocked, zombieForced, now);
      console.log(`[控制台] ${u.name} 游戏设置: 禁创造=${creativeBlocked} 僵尸=${zombieForced === null ? '不干预' : (zombieForced ? '开' : '关')}`);
      return send(res, 200, publicState(u.id));
    }

    // 发放 / 扣除岛币：直接改权威值，读档时覆盖客户端（不会被自动存档吃掉）
    if (req.method === 'POST' && action === 'coins') {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      const body = await readBody(req);
      const u = q.userByName.get(String(body.name ?? '').trim());
      if (!u) return sendErr(res, 404, '没有这个账号');
      const delta = Math.floor(Number(body.delta));
      if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100_000) {
        return sendErr(res, 400, '发放/扣除数量要在 1~100000 之间');
      }
      const st = q.stateByUser.get(u.id);
      const now = Math.floor(Date.now() / 1000);
      const coins = Math.max(0, Math.min((st ? st.coins : 0) + delta, COIN_MAX));
      q.upsert.run(u.id, coins, st ? st.ever_creative : 0, st ? st.creative_blocked : 0, st ? st.zombie_forced : null, now);
      q.log.run(u.id, today(), coins, coins, delta, delta > 0 ? 'admin-grant' : 'admin-deduct', now);
      console.log(`[控制台] ${u.name} ${delta > 0 ? '发放' : '扣除'} 岛币 ${Math.abs(delta)}，余额 ${coins}`);
      return send(res, 200, publicState(u.id));
    }

    // 岛币变化审计（控制台曲线：看谁在猛涨，暴涨被拦的会留 'rejected-spike'）
    if (req.method === 'GET' && action === 'coins') {
      if (!requireAdmin(req, res)) return;
      const url = new URL(req.url ?? '/', 'http://localhost');
      const u = q.userByName.get((url.searchParams.get('name') ?? '').trim());
      if (!u) return sendErr(res, 404, '没有这个账号');
      const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 20, 1), 100);
      const log = q.logList.all(u.id, limit)
        .map((r) => ({ day: r.day, reported: r.reported, accepted: r.accepted, delta: r.delta, reason: r.reason, at: r.created_at }));
      return send(res, 200, { name: u.name, coins: publicState(u.id).coins, log });
    }

    return sendErr(res, 404, 'unknown');
  }

  return { syncFromSave, applyToSave, handleConfig, handleAdmin, publicState };
}
