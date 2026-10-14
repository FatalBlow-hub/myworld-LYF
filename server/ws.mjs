/** WebSocket 联机服务 — 挂在现有 HTTP server 的 upgrade 事件上，管连接、心跳超时清理与在线名单 */

import { WebSocketServer } from 'ws';

const HEARTBEAT_CHECK_MS = 10_000; // 每 10 秒巡检一次超时连接
const HEARTBEAT_TIMEOUT_MS = 30_000; // 超过 30 秒没收到任何消息判定掉线
const MAX_MSG_BYTES = 16 * 1024; // 单条消息上限 16KB
const NAME_MAX_LEN = 24;

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

  /** 清理断开或超时的连接，移出在线名单并广播 offline */
  function cleanup(ws, reason = 'disconnect') {
    const info = clients.get(ws);
    if (!info) return;
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
        const finalName = info.cookieName || rawName || `guest-${Math.floor(1000 + Math.random() * 9000)}`;
        const wasOnline = isNameOnline(finalName);
        info.name = finalName;
        const list = onlineList();
        console.log(`[ws] 玩家上线: ${finalName}，当前在线: ${list.length}`);
        sendMsg(ws, { t: 'welcome', name: finalName, online: list });
        if (!wasOnline) {
          broadcast({ t: 'online', name: finalName, online: list }, ws);
        }
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
