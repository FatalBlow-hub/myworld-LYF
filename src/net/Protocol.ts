/** 联机协议（Protocol） — 客户端与服务端 WebSocket JSON 消息的纯类型定义 */

import type { IslandType, VisitPerm } from '../config';

/** 连接状态：connected=已连接、reconnecting=重连中、disconnected=已断开 */
export type NetStatus = 'connected' | 'reconnecting' | 'disconnected';

/** 好友访岛被拒/作废原因：noname=在线名单里没这个名字（多半打错），offline=名字在但连接刚断 */
export type VisitDenyReason = 'offline' | 'rejected' | 'creative' | 'timeout' | 'self' | 'nosave' | 'noname';

/* ---------------- 客户端 → 服务端（C2S） ---------------- */

/** 握手上报身份（可附带本档是否曾开启过创造模式，供双标签页/本地档双重验证兜底） */
export interface C2SHelloMsg {
  t: 'hello';
  name: string;
  everCreative?: boolean;
}

/** 客户端心跳 */
export interface C2SPingMsg {
  t: 'ping';
  ts?: number;
}

/** 大厅排队：加入队列（幂等） */
export interface C2SHallJoinMsg {
  t: 'hall.join';
}

/** 大厅排队：离开队列 */
export interface C2SHallLeaveMsg {
  t: 'hall.leave';
}

/** 大厅排队：请求确认自己是否队首 */
export interface C2SHallReadyMsg {
  t: 'hall.ready';
}

/** 大厅排队：队首发起随机陌生岛匹配（客户端已扣铁锭） */
export interface C2SHallRandomMsg {
  t: 'hall.random';
}

/** 好友访岛：访客发起申请 */
export interface C2SVisitRequestMsg {
  t: 'visit.request';
  to: string;
  everCreative?: boolean;
}

/** 好友访岛：岛主同意/拒绝（同意时带权限配置） */
export interface C2SVisitReplyMsg {
  t: 'visit.reply';
  to: string;
  accept: boolean;
  perm?: VisitPerm;
  ticket?: string;
  everCreative?: boolean;
}

/** 预留命名空间：后续访客/同步消息（本期不实现逻辑） */
export interface C2SReservedMsg {
  t: 'room.visit' | 'world.sync';
  [key: string]: unknown;
}

export type C2SMsg =
  | C2SHelloMsg
  | C2SPingMsg
  | C2SHallJoinMsg
  | C2SHallLeaveMsg
  | C2SHallReadyMsg
  | C2SHallRandomMsg
  | C2SVisitRequestMsg
  | C2SVisitReplyMsg
  | C2SReservedMsg;
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

/** 大厅队列状态广播：队列名单 + 我排第几位（0 表示未在队列中，1 表示队首） */
export interface S2CHallQueueMsg {
  t: 'hall.queue';
  queue: string[];
  pos: number;
}

/** 大厅通知：你是队首，可以弹出选择框了 */
export interface S2CHallHeadMsg {
  t: 'hall.head';
}

/** 大厅随机匹配成功：分配副本岛 ID 与类型 */
export interface S2CHallMatchedMsg {
  t: 'hall.matched';
  islandId: number;
  islandType: IslandType;
}

/** 大厅操作错误提示 */
export interface S2CHallErrorMsg {
  t: 'hall.error';
  msg: string;
}

/** 好友访岛：推给岛主，有人想上岛 */
export interface S2CVisitIncomingMsg {
  t: 'visit.incoming';
  from: string;
}

/** 好友访岛：访客收到批准，凭 ticket 拉取岛主世界 */
export interface S2CVisitApprovedMsg {
  t: 'visit.approved';
  owner: string;
  perm: VisitPerm;
  ticket?: string;
}

/** 好友访岛：拒绝 / 验证失败（creative）/ 超时 / 不在线；offline 时附带当前真实在线名单帮客户端刷新 */
export interface S2CVisitDeniedMsg {
  t: 'visit.denied';
  reason: VisitDenyReason;
  online?: string[];
}

/** 预留命名空间：后续房间/世界同步广播（本期不实现逻辑） */
export interface S2CReservedMsg {
  t: 'room.state' | 'world.patch';
  [key: string]: unknown;
}

export type S2CMsg =
  | S2CWelcomeMsg
  | S2CPongMsg
  | S2COnlineMsg
  | S2COfflineMsg
  | S2CHallQueueMsg
  | S2CHallHeadMsg
  | S2CHallMatchedMsg
  | S2CHallErrorMsg
  | S2CVisitIncomingMsg
  | S2CVisitApprovedMsg
  | S2CVisitDeniedMsg
  | S2CReservedMsg;
export type S2CMsgType = S2CMsg['t'];
