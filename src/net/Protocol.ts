/** 联机协议（Protocol） — 客户端与服务端 WebSocket JSON 消息的纯类型定义 */

/** 连接状态：connected=已连接、reconnecting=重连中、disconnected=已断开 */
export type NetStatus = 'connected' | 'reconnecting' | 'disconnected';

/* ---------------- 客户端 → 服务端（C2S） ---------------- */

/** 握手上报身份 */
export interface C2SHelloMsg {
  t: 'hello';
  name: string;
}

/** 客户端心跳 */
export interface C2SPingMsg {
  t: 'ping';
  ts?: number;
}

/** 预留命名空间：后续排队/匹配/访客/同步消息（本期不实现逻辑） */
export interface C2SReservedMsg {
  t: 'queue.join' | 'queue.leave' | 'room.visit' | 'world.sync';
  [key: string]: unknown;
}

export type C2SMsg = C2SHelloMsg | C2SPingMsg | C2SReservedMsg;
export type C2SMsgType = C2SMsg['t'];

/* ---------------- 服务端 → 客户端（S2C） ---------------- */

/** 握手回应：确认名字 + 当前在线名单 */
export interface S2CWelcomeMsg {
  t: 'welcome';
  name: string;
  online: string[];
}

/** 服务端心跳回应 */
export interface S2CPongMsg {
  t: 'pong';
  ts?: number;
}

/** 有人上线广播 */
export interface S2COnlineMsg {
  t: 'online';
  name: string;
  online?: string[];
}

/** 有人下线广播 */
export interface S2COfflineMsg {
  t: 'offline';
  name: string;
  online?: string[];
}

/** 预留命名空间：后续房间/匹配/世界同步广播（本期不实现逻辑） */
export interface S2CReservedMsg {
  t: 'match.found' | 'room.state' | 'world.patch';
  [key: string]: unknown;
}

export type S2CMsg =
  | S2CWelcomeMsg
  | S2CPongMsg
  | S2COnlineMsg
  | S2COfflineMsg
  | S2CReservedMsg;
export type S2CMsgType = S2CMsg['t'];
