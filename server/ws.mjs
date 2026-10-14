/** WebSocket 联机服务 — 挂在现有 HTTP server 的 upgrade 事件上，管连接、心跳超时清理、在线名单与大厅排队匹配 */

import { WebSocketServer } from 'ws';

const HEARTBEAT_CHECK_MS = 10_000; // 每 10 秒巡检一次超时连接
const HEARTBEAT_TIMEOUT_MS = 30_000; // 超过 30 秒没收到任何消息判定掉线
const MAX_MSG_BYTES = 16 * 1024; // 单条消息上限 16KB
const NAME_MAX_LEN = 24;
const QUEUE_MAX = 32; // 大厅队列人数上限
const ISLAND_TYPES = ['apple', 'peach', 'orange'];

/**
 * 把 WebSocket 服务挂到现有的 HTTP server 上（路径 /ws，不新开端口）
 * @param {import('node:http').Server} server
 * @param {(req: import('node:http').IncomingMessage) => { name: string } | null} [resolveUser]
 */
export function attachWs(server, resolveUser) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MSG_BYTES });

  /**
   * 活跃连接表：ws -> { name: string | null, cookieName: string | null, lastSeen: number }
   * @type {Map<import('ws').WebSocket, { name: string | null, cookieName: string | null, lastSeen: number }>}
   */
  const clients = new Map();

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

    const info = { name: null, cookieName, lastSeen: Date.now() };
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
