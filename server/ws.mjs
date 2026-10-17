/** WebSocket 联机服务 — 挂在现有 HTTP server 的 upgrade 事件上，管连接、心跳超时清理、在线名单、大厅排队匹配与好友访岛 */

import { randomBytes } from 'node:crypto';
import { WebSocketServer } from 'ws';

const HEARTBEAT_CHECK_MS = 10_000; // 每 10 秒巡检一次超时连接
const HEARTBEAT_TIMEOUT_MS = 30_000; // 超过 30 秒没收到任何消息判定掉线
const MAX_MSG_BYTES = 16 * 1024; // 单条消息上限 16KB
const NAME_MAX_LEN = 24;
const QUEUE_MAX = 32; // 大厅队列人数上限
const ISLAND_TYPES = ['apple', 'peach', 'orange'];
const VISIT_TIMEOUT_MS = 60_000; // 访岛申请 60 秒无响应作废
const TICKET_TTL_MS = 5 * 60_000; // 访问票据 5 分钟有效

/**
 * 内存一次性访问票据表：ticket -> { visitorAccount, visitorName, ownerAccount, ownerName, snapshot, expiresAt }
 * 供 GET /api/visit/world 校验并一次性消费
 * @type {Map<string, { visitorAccount: string | null, visitorName: string, ownerAccount: string | null, ownerName: string, snapshot?: any, expiresAt: number }>}
 */
const visitTickets = new Map();

/**
 * 校验并一次性消费访问票据（匹配岛主名字 + 访客身份，且未过期）
 * @param {string} ownerName 岛主名字（可是在线显示名或账号名）
 * @param {string | null} visitorAccount 访客登录账号名
 * @param {string | null} [ticketParam] 可选的显式 ticket 参数
 * @returns {{ ownerAccount: string, snapshot?: any } | null}
 */
export function consumeVisitTicket(ownerName, visitorAccount, ticketParam = null) {
  const now = Date.now();
  for (const [k, t] of visitTickets.entries()) {
    if (now > t.expiresAt) visitTickets.delete(k);
  }
  const baseOwner = ownerName.split('#')[0];
  for (const [k, t] of visitTickets.entries()) {
    if (ticketParam && k !== ticketParam) continue;
    const ownerMatch = t.ownerName === ownerName || t.ownerAccount === ownerName || t.ownerAccount === baseOwner;
    if (!ownerMatch) continue;
    const visitorMatch = !t.visitorAccount || !visitorAccount
      ? true
      : (t.visitorAccount === visitorAccount || t.visitorName === visitorAccount);
    if (!visitorMatch) continue;
    visitTickets.delete(k);
    return { ownerAccount: t.ownerAccount || baseOwner, snapshot: t.snapshot };
  }
  return null;
}

/**
 * 把 WebSocket 服务挂到现有的 HTTP server 上（路径 /ws，不新开端口）
 * @param {import('node:http').Server} server
 * @param {(req: import('node:http').IncomingMessage) => { name: string } | null} [resolveUser]
 * @param {(name: string) => Record<string, any> | null} [readUserSave]
 */
export function attachWs(server, resolveUser, readUserSave) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MSG_BYTES });

  /**
   * 活跃连接表：ws -> { name: string | null, cookieName: string | null, lastSeen: number, everCreative: boolean }
   * @type {Map<import('ws').WebSocket, { name: string | null, cookieName: string | null, lastSeen: number, everCreative: boolean }>}
   */
  const clients = new Map();

  /**
   * 待响应的访岛申请表：key(`${from}->${to}`) -> { fromWs, toWs, fromName, toName, timer }
   * @type {Map<string, { fromWs: import('ws').WebSocket, toWs: import('ws').WebSocket, fromName: string, toName: string, timer: ReturnType<typeof setTimeout> }>}
   */
  const pendingVisits = new Map();

  /**
   * 大厅排队连接队列（按先后顺序排列，保证不重复）
   * @type {import('ws').WebSocket[]}
   */
  const hallQueue = [];

  /** 已分配过的副本岛 ID 集合（随机不重复） */
  const usedIslandIds = new Set();

  /** 随机分配一个不重复的副本岛正整数 ID（用于客户端地形种子偏移） */
  function allocIslandId() {
    for (let i = 0; i < 1000; i++) {
      const id = 100000 + Math.floor(Math.random() * 900000);
      if (!usedIslandIds.has(id)) {
        usedIslandIds.add(id);
        return id;
      }
    }
    const fallback = Date.now() % 1000000000;
    usedIslandIds.add(fallback);
    return fallback;
  }

  /** 随机选一种岛屿类型（苹果/桃子/橙子 各 1/3 概率） */
  function pickIslandType() {
    return ISLAND_TYPES[Math.floor(Math.random() * ISLAND_TYPES.length)];
  }

  /** 汇总当前所有已完成 hello 握手的去重在线用户名单 */
  function onlineList() {
    const names = new Set();
    for (const info of clients.values()) {
      if (info.name) names.add(info.name);
    }
    return Array.from(names);
  }

  /** 检查某个名字是否仍有连接在线 */
  function isNameOnline(name) {
    for (const info of clients.values()) {
      if (info.name === name) return true;
    }
    return false;
  }

  /** 按名字查找在线连接（优先精确匹配显示名，其次匹配基础账号名且排除自身） */
  function findClientByName(targetName, excludeWs = null) {
    for (const [w, info] of clients.entries()) {
      if (w !== excludeWs && info.name === targetName && w.readyState === w.OPEN) return [w, info];
    }
    for (const [w, info] of clients.entries()) {
      if (w !== excludeWs && info.cookieName === targetName && w.readyState === w.OPEN) return [w, info];
    }
    return null;
  }

  /** 检查某个连接对应的玩家存档是否曾开启过创造模式（双验证：读服务端存档 + 客户端上报兜底） */
  function hasEverCreative(clientInfo) {
    if (clientInfo.everCreative) return true;
    const accName = clientInfo.cookieName || (clientInfo.name ? clientInfo.name.split('#')[0] : null);
    if (accName && readUserSave) {
      const save = readUserSave(accName);
      if (save && (save.everCreative === true || save.mode === 'creative')) return true;
    }
    return false;
  }

  /** 规范化访客挖掘权限 */
  function normalizePerm(raw) {
    const mode = raw && (raw.mode === 'none' || raw.mode === 'all' || raw.mode === 'list') ? raw.mode : 'none';
    return { mode, fruitException: Boolean(raw?.fruitException) };
  }

  /** 发 JSON 消息给单个连接 */
  function sendMsg(ws, msg) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  /** 广播给除 exclude 以外所有已握手的连接 */
  function broadcast(msg, exclude = null) {
    const data = JSON.stringify(msg);
    for (const [ws, info] of clients.entries()) {
      if (ws !== exclude && info.name && ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    }
  }

  /** 当前队列名字列表 */
  function queueNames() {
    return hallQueue.map((w) => clients.get(w)?.name ?? '?');
  }

  /**
   * 广播当前大厅队列给所有已握手玩家（每人收到自己在队列中的 1-based 位置，未入队为 0）
   * 若队首发生变化，自动向新队首发送 hall.head
   */
  function broadcastQueue(prevHead = null) {
    const names = queueNames();
    for (const [ws, info] of clients.entries()) {
      if (!info.name || ws.readyState !== ws.OPEN) continue;
      const idx = hallQueue.indexOf(ws);
      sendMsg(ws, { t: 'hall.queue', queue: names, pos: idx >= 0 ? idx + 1 : 0 });
    }
    const newHead = hallQueue[0] ?? null;
    if (newHead && newHead !== prevHead) {
      sendMsg(newHead, { t: 'hall.head' });
    }
  }

  /** 从大厅队列移除某个连接；若队列有变化则广播并通知新队首 */
  function removeFromQueue(ws) {
    const idx = hallQueue.indexOf(ws);
    if (idx < 0) return false;
    const prevHead = hallQueue[0];
    hallQueue.splice(idx, 1);
    broadcastQueue(prevHead);
    return true;
  }

  /** 清理断开或超时的连接，移出队列与在线名单并广播 offline */
  function cleanup(ws, reason = 'disconnect') {
    const info = clients.get(ws);
    if (!info) return;
    removeFromQueue(ws);
    for (const [k, reqItem] of pendingVisits.entries()) {
      if (reqItem.fromWs === ws || reqItem.toWs === ws) {
        clearTimeout(reqItem.timer);
        pendingVisits.delete(k);
        if (reqItem.toWs === ws && reqItem.fromWs.readyState === reqItem.fromWs.OPEN) {
          sendMsg(reqItem.fromWs, { t: 'visit.denied', reason: 'offline' });
        }
      }
    }
    clients.delete(ws);
    const { name } = info;
    if (name) {
      console.log(`[ws] 玩家下线: ${name} (${reason})，当前在线: ${onlineList().length}`);
      if (!isNameOnline(name)) {
        broadcast({ t: 'offline', name, online: onlineList() });
      }
    } else {
      console.log(`[ws] 未握手连接断开 (${reason})`);
    }
  }

  server.on('upgrade', (req, socket, head) => {
    const url = (req.url ?? '/').split('?')[0];
    if (url !== '/ws') {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws, req) => {
    let cookieName = null;
    try {
      cookieName = resolveUser ? (resolveUser(req)?.name ?? null) : null;
    } catch {
      cookieName = null;
    }

    const info = { name: null, cookieName, lastSeen: Date.now(), everCreative: false };
    clients.set(ws, info);
    console.log(`[ws] 新连接建立 (来自 ${req.socket.remoteAddress ?? '?'})`);

    ws.on('message', (raw) => {
      info.lastSeen = Date.now();
      let msg;
      try {
        msg = JSON.parse(raw.toString('utf8'));
      } catch {
        return; // 非法 JSON 直接忽略，不崩进程
      }
      if (!msg || typeof msg.t !== 'string') return;

      if (msg.t === 'ping') {
        sendMsg(ws, { t: 'pong', ts: typeof msg.ts === 'number' ? msg.ts : Date.now() });
        return;
      }

      if (msg.t === 'hello') {
        if (typeof msg.everCreative === 'boolean') info.everCreative = msg.everCreative;
        const rawName = typeof msg.name === 'string' ? msg.name.trim().slice(0, NAME_MAX_LEN) : '';
        let baseName = info.cookieName || rawName || `guest-${Math.floor(1000 + Math.random() * 9000)}`;
        // 若同名已被其他活跃连接占用（如双标签页同账号），追加序号区分，方便双标签页同时排队
        let finalName = baseName;
        let suffix = 2;
        while (Array.from(clients.entries()).some(([otherWs, otherInfo]) => otherWs !== ws && otherInfo.name === finalName)) {
          finalName = `${baseName}#${suffix++}`;
        }
        const wasOnline = isNameOnline(finalName);
        info.name = finalName;
        const list = onlineList();
        console.log(`[ws] 玩家上线: ${finalName}，当前在线: ${list.length}`);
        sendMsg(ws, { t: 'welcome', name: finalName, online: list });
        const idx = hallQueue.indexOf(ws);
        sendMsg(ws, { t: 'hall.queue', queue: queueNames(), pos: idx >= 0 ? idx + 1 : 0 });
        if (!wasOnline) {
          broadcast({ t: 'online', name: finalName, online: list }, ws);
        }
        return;
      }

      // 以下命令要求已完成 hello 握手
      if (!info.name) return;

      if (msg.t === 'hall.join') {
        const existingIdx = hallQueue.indexOf(ws);
        if (existingIdx >= 0) {
          // 重复 join 幂等：回传当前队列状态，若已在队首则补发 hall.head
          sendMsg(ws, { t: 'hall.queue', queue: queueNames(), pos: existingIdx + 1 });
          if (existingIdx === 0) sendMsg(ws, { t: 'hall.head' });
          return;
        }
        if (hallQueue.length >= QUEUE_MAX) {
          sendMsg(ws, { t: 'hall.error', msg: '队列已满，请稍后再试' });
          return;
        }
        const prevHead = hallQueue[0] ?? null;
        hallQueue.push(ws);
        console.log(`[ws] ${info.name} 加入大厅队列 (第 ${hallQueue.length} 位)`);
        broadcastQueue(prevHead);
        return;
      }

      if (msg.t === 'hall.leave') {
        if (removeFromQueue(ws)) {
          console.log(`[ws] ${info.name} 离开大厅队列，剩余 ${hallQueue.length} 人`);
        }
        return;
      }

      if (msg.t === 'hall.ready') {
        if (hallQueue[0] === ws) {
          sendMsg(ws, { t: 'hall.head' });
        } else {
          sendMsg(ws, { t: 'hall.error', msg: '你不在队首，请等待排队' });
        }
        return;
      }

      if (msg.t === 'hall.random') {
        if (hallQueue[0] !== ws) {
          sendMsg(ws, { t: 'hall.error', msg: '只有队首可以发起随机匹配' });
          return;
        }
        const prevHead = hallQueue[0];
        hallQueue.shift();
        const islandId = allocIslandId();
        const islandType = pickIslandType();
        console.log(`[ws] ${info.name} 随机匹配成功 -> 岛 #${islandId} (${islandType})`);
        sendMsg(ws, { t: 'hall.matched', islandId, islandType });
        broadcastQueue(prevHead);
        return;
      }

      if (msg.t === 'visit.request') {
        if (typeof msg.everCreative === 'boolean') info.everCreative = msg.everCreative;
        const toRaw = typeof msg.to === 'string' ? msg.to.trim() : '';
        if (!toRaw || toRaw === info.name) {
          console.log(`[ws] 访岛被拒: ${info.name} -> "${toRaw || '(空)'}" (${toRaw === info.name ? 'self' : 'empty'})`);
          sendMsg(ws, { t: 'visit.denied', reason: toRaw === info.name ? 'self' : 'offline' });
          return;
        }
        const found = findClientByName(toRaw, ws);
        if (!found) {
          // 区分两种情况报不同的错：名单里有这个名字但连接刚断（幽灵）→ offline；连名字都没有 → noname（多半打错字）
          const exists = [...clients.entries()].some(([w, i]) => w !== ws && (i.name === toRaw || i.cookieName === toRaw));
          const reason = exists ? 'offline' : 'noname';
          console.log(`[ws] 访岛被拒(${reason}): ${info.name} -> "${toRaw}"，当前在线: ${onlineList().join('/') || '(空)'}`);
          sendMsg(ws, { t: 'visit.denied', reason, online: onlineList() });
          return;
        }
        const [toWs, toInfo] = found;
        const toName = toInfo.name;
        const key = `${info.name}->${toName}`;
        const old = pendingVisits.get(key);
        if (old) clearTimeout(old.timer);
        const timer = setTimeout(() => {
          pendingVisits.delete(key);
          sendMsg(ws, { t: 'visit.denied', reason: 'timeout' });
        }, VISIT_TIMEOUT_MS);
        timer.unref?.();
        pendingVisits.set(key, { fromWs: ws, toWs, fromName: info.name, toName, timer });
        console.log(`[ws] 访岛申请: ${info.name} -> ${toName}`);
        sendMsg(toWs, { t: 'visit.incoming', from: info.name });
        sendMsg(ws, { t: 'visit.requested', to: toName }); // 回执：证明申请真到了服务器，客户端靠它发现"发出去但没送到"的死管
        return;
      }

      if (msg.t === 'visit.reply') {
        if (typeof msg.everCreative === 'boolean') info.everCreative = msg.everCreative;
        const fromName = typeof msg.to === 'string' ? msg.to.trim() : '';
        const key = `${fromName}->${info.name}`;
        const pending = pendingVisits.get(key);
        if (!pending) return;
        clearTimeout(pending.timer);
        pendingVisits.delete(key);
        const { fromWs } = pending;
        const fromInfo = clients.get(fromWs);
        if (!fromInfo || fromWs.readyState !== fromWs.OPEN) return;

        if (!msg.accept) {
          console.log(`[ws] 访岛拒绝: ${info.name} 拒绝了 ${fromName}`);
          sendMsg(fromWs, { t: 'visit.denied', reason: 'rejected' });
          return;
        }

        // 双重验证：双方存档的 everCreative 都必须为 false
        if (hasEverCreative(fromInfo) || hasEverCreative(info)) {
          console.log(`[ws] 访岛双验证失败(creative): ${fromName} -> ${info.name}`);
          sendMsg(fromWs, { t: 'visit.denied', reason: 'creative' });
          return;
        }

        const ticket = randomBytes(16).toString('hex');
        const ownerAccount = info.cookieName || info.name.split('#')[0];
        const visitorAccount = fromInfo.cookieName || fromInfo.name.split('#')[0];
        visitTickets.set(ticket, {
          visitorAccount,
          visitorName: fromInfo.name,
          ownerAccount,
          ownerName: info.name,
          expiresAt: Date.now() + TICKET_TTL_MS,
        });
        removeFromQueue(fromWs);
        const perm = normalizePerm(msg.perm);
        console.log(`[ws] 访岛批准: ${fromName} -> ${info.name}，权限=${perm.mode}(fruitEx=${perm.fruitException})`);
        sendMsg(fromWs, { t: 'visit.approved', owner: info.name, perm, ticket });
        return;
      }
    });

    ws.on('close', () => cleanup(ws, 'close'));
    ws.on('error', (err) => {
      console.error('[ws] 连接错误:', err.message);
      cleanup(ws, 'error');
    });
  });

  // 定时清理超过 30 秒没有任何消息的僵尸连接
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ws, info] of clients.entries()) {
      if (now - info.lastSeen > HEARTBEAT_TIMEOUT_MS) {
        cleanup(ws, 'timeout');
        try { ws.terminate(); } catch { /* 忽略关闭异常 */ }
      }
    }
  }, HEARTBEAT_CHECK_MS);
  timer.unref?.();

  return wss;
}
