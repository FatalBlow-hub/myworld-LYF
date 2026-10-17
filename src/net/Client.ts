/** 联机客户端（Client） — 管理 WebSocket 长连接、JSON 收发、心跳检测、指数退避重连、在线名单与大厅排队收发 */

import type { IslandType, VisitPerm } from '../config';
import { C2SMsg, NetStatus, S2CMsg, S2CVisitPeerMsg, VisitDenyReason } from './Protocol';

const CLIENT_VER = 'coscreen-1017'; // 客户端代码版本号：hello 上报，日志里能看出谁还在跑旧缓存
const PING_INTERVAL_MS = 10_000;   // 客户端每 10 秒发一次 ping
const TIMEOUT_MS = 30_000;         // 30 秒没收到任何消息判定掉线
const WATCHDOG_CHECK_MS = 2_000;   // 检查超时定时器的轮询间隔
const RECONNECT_BASE_MS = 3_000;   // 初始重连间隔 3 秒
const RECONNECT_MAX_MS = 30_000;   // 指数退避上限 30 秒

export interface NetClientCallbacks {
  /** 连接状态变化时触发（已去重，状态真正改变才调） */
  onStatusChange?: (status: NetStatus, prev: NetStatus) => void;
  /** 在线名单或上下线事件变化时触发 */
  onOnlineChange?: (online: string[], event?: { type: 'welcome' | 'online' | 'offline'; name: string }) => void;
  /** 大厅排队名单或我的排队位置变化时触发 */
  onHallQueue?: (queue: string[], pos: number) => void;
  /** 轮到我当队首时触发 */
  onHallHead?: () => void;
  /** 随机匹配成功、分配到副本岛时触发 */
  onHallMatched?: (islandId: number, islandType: IslandType) => void;
  /** 大厅报错时触发 */
  onHallError?: (msg: string) => void;
  /** 岛主收到访客上岛申请时触发 */
  onVisitIncoming?: (from: string) => void;
  /** 访客收到岛主批准时触发（pos = 岛主上报的落地参考点，落在本人附近） */
  onVisitApproved?: (owner: string, perm: VisitPerm, ticket?: string, pos?: { x: number; y: number; z: number }) => void;
  /** 岛主收到通知：你批准的客人正在上岛（同屏会话已接通） */
  onVisitGuest?: (guest: string, perm: VisitPerm) => void;
  /** 同屏对端的实时位置更新 */
  onVisitPeer?: (msg: S2CVisitPeerMsg) => void;
  /** 同屏对端改的一批方块 [x, y, z, id, meta][] */
  onVisitBlocks?: (cells: number[][]) => void;
  /** 同屏会话结束（对方离开或掉线） */
  onVisitEnd?: (reason: 'left' | 'offline', name?: string) => void;
  /** 服务器确认收到访岛申请（申请在死管里丢掉时，客户端靠"没回执"发现） */
  onVisitRequested?: (to: string) => void;
  /** 访客收到拒绝/超时/验证失败/不在线时触发 */
  onVisitDenied?: (reason: VisitDenyReason) => void;
  /** 收到任意服务端消息时触发 */
  onMessage?: (msg: S2CMsg) => void;
}

export class NetClient {
  private ws: WebSocket | null = null;
  private status: NetStatus = 'disconnected';
  private name: string;
  private online: string[] = [];
  private hallQueue: string[] = [];
  private hallPos = 0;
  private pingTimer: number | null = null;
  private watchdogTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private lastRecvTime = 0;
  private retryCount = 0;
  private manualClosed = false;
  private everCreative = false;

  constructor(name?: string, private callbacks: NetClientCallbacks = {}, everCreative = false) {
    const trimmed = (name ?? '').trim();
    this.name = trimmed || `guest-${Math.floor(1000 + Math.random() * 9000)}`;
    this.everCreative = everCreative;
    document.addEventListener('visibilitychange', this.onVisible);
  }

  /** 页面回到前台：手机后台时连接多半已经死了但 readyState 还装着 OPEN，立刻体检重连，不等 30 秒看门狗 */
  private onVisible = () => {
    if (document.visibilityState !== 'visible' || this.manualClosed) return;
    const alive = this.ws && this.ws.readyState === WebSocket.OPEN && Date.now() - this.lastRecvTime <= TIMEOUT_MS;
    if (alive || this.status === 'disconnected') return;
    console.log('[net] 页面回到前台，连接已陈旧，立即重连');
    this.clearReconnectTimer();
    this.retryCount = 0;
    this.setStatus('reconnecting');
    this.openSocket();
  };

  /** 当前连接状态 */
  getStatus(): NetStatus {
    return this.status;
  }

  /** 当前使用的身份名（服务端 welcome 确认后会更新） */
  getName(): string {
    return this.name;
  }

  /** 当前在线玩家列表（只读副本） */
  getOnlineList(): string[] {
    return [...this.online];
  }

  /** 当前大厅排队列表与我的位置（pos=0 表示不在队列中，pos=1 表示队首） */
  getHallQueueState(): { queue: string[]; pos: number } {
    return { queue: [...this.hallQueue], pos: this.hallPos };
  }

  /** 大厅：请求加入排队（重复调用幂等） */
  joinHallQueue(): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.send({ t: 'hall.join' });
    return true;
  }

  /** 大厅：请求离开排队 */
  leaveHallQueue(): void {
    this.hallPos = 0;
    this.send({ t: 'hall.leave' });
  }

  /** 大厅：请求确认自己是否队首 */
  readyHallQueue(): void {
    this.send({ t: 'hall.ready' });
  }

  /** 大厅：队首发起随机陌生岛匹配 */
  requestRandomIsland(): void {
    this.send({ t: 'hall.random' });
  }

  /** 好友访岛：发起访问申请；返回是否真的发出去了 */
  requestVisit(to: string, everCreative?: boolean): boolean {
    if (everCreative !== undefined) this.everCreative = everCreative;
    return this.send({ t: 'visit.request', to: to.trim(), everCreative: this.everCreative });
  }

  /** 好友访岛：岛主回应同意/拒绝（同意时附带挖掘权限 + 自己岛上的位置，让访客落在本人附近） */
  replyVisit(to: string, accept: boolean, perm?: VisitPerm, everCreative?: boolean, pos?: { x: number; y: number; z: number }): void {
    if (everCreative !== undefined) this.everCreative = everCreative;
    this.send({ t: 'visit.reply', to, accept, perm, pos, everCreative: this.everCreative });
  }

  /** 同屏访岛：上报自己的实时位置（服务器原样转发给对端） */
  sendVisitPos(m: { x: number; y: number; z: number; yaw: number; pitch: number; kind?: string; day?: number }): void {
    this.send({ t: 'visit.pos', ...m });
  }

  /** 同屏访岛：上报本地一批方块改动 [x, y, z, id, meta][] */
  sendVisitBlocks(cells: number[][]): void {
    this.send({ t: 'visit.blocks', cells });
  }

  /** 同屏访岛：主动离开会话（回大厅/回本岛前打声招呼，对端好收摊） */
  sendVisitLeave(to: string): void {
    this.send({ t: 'visit.leave', to });
  }

  /** 更新本档是否曾开启创造模式标记 */
  setEverCreative(everCreative: boolean): void {
    this.everCreative = everCreative;
  }

  /** 更新身份名；若已连接则重新发 hello 同步给服务端 */
  setName(name: string): void {
    const trimmed = name.trim();
    if (!trimmed || trimmed === this.name) return;
    this.name = trimmed;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ t: 'hello', name: this.name, everCreative: this.everCreative, ver: CLIENT_VER });
    }
  }

  /** 发起 WebSocket 连接 */
  connect(): void {
    this.manualClosed = false;
    this.clearReconnectTimer();
    this.openSocket();
  }

  /** 主动关闭连接且不再自动重连 */
  close(): void {
    this.manualClosed = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    if (this.ws) {
      try { this.ws.close(); } catch { /* 忽略关闭错误 */ }
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  /** 当前 WebSocket 是否真的能发消息（status 是 connected 也可能瞬间断了没来得及切换） */
  isOpen(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /** 立刻重连（申请没回音、自检发现死管时调用），不等看门狗 */
  forceReconnect(): void {
    if (this.manualClosed) return;
    this.clearReconnectTimer();
    this.retryCount = 0;
    this.setStatus('reconnecting');
    this.openSocket();
  }

  /** 回收死管（30 秒没收到消息但 readyState 还装 OPEN 的那种），并安排重连 */
  private recycleSocket(): void {
    this.stopHeartbeat();
    this.online = [];
    if (this.ws) {
      const dead = this.ws;
      this.ws = null;
      try { dead.close(); } catch { /* 忽略 */ }
    }
    this.scheduleReconnect();
  }

  /** 发送 JSON 消息给服务端；返回是否真的发出去了（false = 连接是死的，消息被丢） */
  send(msg: C2SMsg): boolean {
    // 手机切后台/切网络后 TCP 变"死管"：readyState 还装 OPEN，但发啥都进黑洞——30 秒没收到消息就当成死的
    if (this.ws && this.ws.readyState === WebSocket.OPEN && Date.now() - this.lastRecvTime > TIMEOUT_MS) {
      this.recycleSocket();
      console.warn('[net] 发现死管（30秒无响应），回收并重连，本次消息未发出:', msg.t);
      return false;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
      return true;
    }
    console.warn('[net] 连接不可用，消息未发出:', msg.t);
    return false;
  }

  private openSocket(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      try { this.ws.close(); } catch { /* 忽略 */ }
      this.ws = null;
    }

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${location.host}/ws`;
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = socket;

    socket.onopen = () => {
      if (this.ws !== socket) return;
      this.retryCount = 0;
      this.lastRecvTime = Date.now();
      console.log(`[net] WebSocket 已连接 (${url})，身份: ${this.name}`);
      this.setStatus('connected');
      this.send({ t: 'hello', name: this.name, everCreative: this.everCreative, ver: CLIENT_VER });
      this.startHeartbeat();
    };

    socket.onmessage = (ev) => {
      if (this.ws !== socket) return;
      this.lastRecvTime = Date.now();
      if (typeof ev.data !== 'string') return;
      let msg: S2CMsg;
      try {
        msg = JSON.parse(ev.data) as S2CMsg;
      } catch {
        return;
      }
      if (!msg || typeof msg.t !== 'string') return;
      this.handleMessage(msg);
    };

    socket.onclose = () => {
      if (this.ws !== socket) return;
      this.ws = null;
      this.online = []; // 名单是旧连接的遗物，留着会显示"幽灵在线"，清空等 welcome 重发
      this.stopHeartbeat();
      if (this.manualClosed) {
        this.setStatus('disconnected');
        return;
      }
      console.log('[net] WebSocket 连接断开，准备重连…');
      this.scheduleReconnect();
    };

    socket.onerror = () => {
      // 浏览器在 onerror 后通常会紧跟触发 onclose，由 onclose 统一触发重连
    };
  }

  private handleMessage(msg: S2CMsg): void {
    switch (msg.t) {
      case 'welcome': {
        this.name = msg.name || this.name;
        this.online = Array.isArray(msg.online) ? [...msg.online] : [];
        console.log(`[net] 握手完成: ${this.name}，当前在线:`, this.online);
        this.callbacks.onOnlineChange?.(this.getOnlineList(), { type: 'welcome', name: this.name });
        // 防沉迷：服务端说今天额度用完 → 转全局事件给 AddictGuard 锁屏
        if (msg.locked) window.dispatchEvent(new CustomEvent('addict-locked'));
        break;
      }
      case 'addict.locked':
        // 防沉迷到点推送：同样转全局事件（Game 不感知，保持其零改动）
        window.dispatchEvent(new CustomEvent('addict-locked'));
        break;
      case 'pong':
        break;
      case 'online': {
        if (Array.isArray(msg.online)) {
          this.online = [...msg.online];
        } else if (msg.name && !this.online.includes(msg.name)) {
          this.online.push(msg.name);
        }
        console.log(`[net] 玩家上线: ${msg.name}，当前在线:`, this.online);
        this.callbacks.onOnlineChange?.(this.getOnlineList(), { type: 'online', name: msg.name });
        break;
      }
      case 'offline': {
        if (Array.isArray(msg.online)) {
          this.online = [...msg.online];
        } else {
          this.online = this.online.filter((n) => n !== msg.name);
        }
        console.log(`[net] 玩家下线: ${msg.name}，当前在线:`, this.online);
        this.callbacks.onOnlineChange?.(this.getOnlineList(), { type: 'offline', name: msg.name });
        break;
      }
      case 'hall.queue': {
        this.hallQueue = Array.isArray(msg.queue) ? [...msg.queue] : [];
        this.hallPos = typeof msg.pos === 'number' ? msg.pos : 0;
        this.callbacks.onHallQueue?.([...this.hallQueue], this.hallPos);
        break;
      }
      case 'hall.head': {
        this.callbacks.onHallHead?.();
        break;
      }
      case 'hall.matched': {
        this.hallPos = 0;
        this.callbacks.onHallMatched?.(msg.islandId, msg.islandType);
        break;
      }
      case 'hall.error': {
        this.callbacks.onHallError?.(msg.msg);
        break;
      }
      case 'visit.incoming': {
        this.callbacks.onVisitIncoming?.(msg.from);
        break;
      }
      case 'visit.requested': {
        this.callbacks.onVisitRequested?.(msg.to);
        break;
      }
      case 'visit.approved': {
        this.hallPos = 0;
        this.callbacks.onVisitApproved?.(msg.owner, msg.perm, msg.ticket, msg.pos);
        break;
      }
      case 'visit.guest': {
        this.callbacks.onVisitGuest?.(msg.guest, msg.perm);
        break;
      }
      case 'visit.peer': {
        this.callbacks.onVisitPeer?.(msg);
        break;
      }
      case 'visit.blocks': {
        this.callbacks.onVisitBlocks?.(msg.cells);
        break;
      }
      case 'visit.end': {
        this.callbacks.onVisitEnd?.(msg.reason, msg.name);
        break;
      }
      case 'visit.denied': {
        // offline 拒答会带当前真实在线名单（对方可能是刚掉线还没广播的"幽灵"），顺手刷新名单
        if (Array.isArray(msg.online)) {
          this.online = [...msg.online];
          this.callbacks.onOnlineChange?.(this.getOnlineList());
        }
        this.callbacks.onVisitDenied?.(msg.reason);
        break;
      }
      default:
        break;
    }
    this.callbacks.onMessage?.(msg);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingTimer = window.setInterval(() => {
      this.send({ t: 'ping', ts: Date.now() });
    }, PING_INTERVAL_MS);

    this.watchdogTimer = window.setInterval(() => {
      if (Date.now() - this.lastRecvTime > TIMEOUT_MS) {
        console.warn('[net] 超过 30 秒未收到服务端消息，判定掉线并重连');
        this.recycleSocket();
      }
    }, WATCHDOG_CHECK_MS);
  }

  private stopHeartbeat(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.watchdogTimer !== null) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.manualClosed) return;
    this.setStatus('reconnecting');
    if (this.reconnectTimer !== null) return;
    // 指数退避：3s -> 6s -> 12s -> 24s -> 30s（封顶）
    const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, this.retryCount), RECONNECT_MAX_MS);
    this.retryCount++;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setStatus(next: NetStatus): void {
    if (this.status === next) return;
    const prev = this.status;
    this.status = next;
    this.callbacks.onStatusChange?.(next, prev);
  }
}
