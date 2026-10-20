/** 大厅留言板 + 信箱 —— 评论公开所有人可见，私信只有收件人能看到
 *
 *  GET  /api/board?limit=50       公开评论（登录可见）
 *  POST /api/board {content}      发一条评论（登录；同一账号 20 秒最多一条）
 *  GET  /api/mail                 我收到的信（登录）
 *  POST /api/mail {to, content}   给某个玩家写信（登录，不能发给自己）
 *
 *  安全：内容统一压空白 + 截断 80 字；写入参数化，不拼 SQL；目标账号必须真实存在。
 */

const MAX_LEN = 80;         // 单条最多多少字
const LIST_LIMIT = 50;      // 一次最多取多少条
const COOLDOWN_MS = 5_000;  // 同一账号在同一类（评论/私信）里的发言冷却

export function attachBoard({ db, currentUser, send, sendErr, readBody }) {
  const q = {
    listBoard: db.prepare(`
      SELECT b.content, b.created_at AS at, u.name
      FROM board_posts b JOIN users u ON u.id = b.user_id
      ORDER BY b.id DESC LIMIT ?`),
    addBoard: db.prepare('INSERT INTO board_posts (user_id, content, created_at) VALUES (?, ?, ?)'),
    listMail: db.prepare(`
      SELECT m.content, m.created_at AS at, f.name AS sender
      FROM mails m JOIN users f ON f.id = m.from_id
      WHERE m.to_id = ? ORDER BY m.id DESC LIMIT ?`),
    addMail: db.prepare('INSERT INTO mails (from_id, to_id, content, created_at) VALUES (?, ?, ?, ?)'),
    userByName: db.prepare('SELECT id, name FROM users WHERE name = ?'),
  };

  /** 「评论」「私信」各自一套节流：发完评论可以马上写信，互不耽误（内存级，重启清零） */
  const lastPost = { board: new Map(), mail: new Map() };

  /** 压掉换行/多余空格并截断，避免刷屏和超长内容 */
  const clean = (text) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_LEN);

  async function handle(req, res) {
    const u = currentUser(req);
    const isBoard = (req.url ?? '').split('?')[0].startsWith('/api/board');

    if (req.method === 'GET') {
      if (!u) return sendErr(res, 401, '先登录才能看留言');
      if (isBoard) {
        const posts = q.listBoard.all(LIST_LIMIT).map((r) => ({ name: r.name, content: r.content, at: r.at }));
        return send(res, 200, { posts });
      }
      const mails = q.listMail.all(u.id, LIST_LIMIT).map((r) => ({ from: r.sender, content: r.content, at: r.at }));
      return send(res, 200, { mails });
    }

    if (req.method !== 'POST') return sendErr(res, 405, 'method not allowed');
    if (!u) return sendErr(res, 401, '先登录才能发');

    const body = await readBody(req);
    const content = clean(body.content);
    if (!content) return sendErr(res, 400, '内容不能为空');

    // 先校验收件人再算冷却：写错名字/写给自己不算一次发言，别白等冷却
    let target = null;
    if (!isBoard) {
      // 名字可能带 "#1234" 后缀（联机显示名），按 # 前面那截找账号
      const toName = String(body.to ?? '').trim().split('#')[0];
      if (!toName) return sendErr(res, 400, '要写给谁呀');
      target = q.userByName.get(toName);
      if (!target) return sendErr(res, 404, '没有这个玩家');
      if (target.id === u.id) return sendErr(res, 400, '别给自己写信啦');
    }

    const now = Date.now();
    const kind = isBoard ? 'board' : 'mail';
    if (now - (lastPost[kind].get(u.id) ?? 0) < COOLDOWN_MS) return sendErr(res, 429, '发太快啦，歇几秒再发');
    lastPost[kind].set(u.id, now);

    if (isBoard) q.addBoard.run(u.id, content, Math.floor(now / 1000));
    else q.addMail.run(u.id, target.id, content, Math.floor(now / 1000));
    return send(res, 200, { ok: true });
  }

  return { handle };
}
