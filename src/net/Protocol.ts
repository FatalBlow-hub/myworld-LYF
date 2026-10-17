/** 联机协议（Protocol） — 客户端与服务端 WebSocket JSON 消息的纯类型定义 */

import type { IslandType, VisitPerm } from '../config';

/** 连接状态：connected=已连接、reconnecting=重连中、disconnected=已断开 */
export type NetStatus = 'connected' | 'reconnecting' | 'disconnected';

/** 好友访岛被拒/作废原因：noname=在线名单里没这个名字（多半打错），offline=名字在但连接刚断，gone=回应时对方已经掉线申请作废 */
export type VisitDenyReason = 'offline' | 'rejected' | 'creative' | 'timeout' | 'self' | 'nosave' | 'noname' | 'gone';

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

/** 好友访岛：岛主同意/拒绝（同意时带权限配置；pos = 访客落地参考点——岛主在自己岛上就报实时位置，否则报存档里的位置） */
export interface C2SVisitReplyMsg {
  t: 'visit.reply';
  to: string;
  accept: boolean;
  perm?: VisitPerm;
  pos?: { x: number; y: number; z: number };
  ticket?: string;
  everCreative?: boolean;
}

/** 同屏访岛：实时位置上报（服务器转发给同屏对端；kind 让对方画出正确小人，day 只有岛主发——访客的钟表跟着岛主走） */
export interface C2SVisitPosMsg {
  t: 'visit.pos';
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  kind?: string;
  day?: number;
}

/** 同屏访岛：本地一批方块改动上报（挖/放/开关门/流水），cells = [x, y, z, id, meta][] */
export interface C2SVisitBlocksMsg {
  t: 'visit.blocks';
  cells: number[][];
}

/** 同屏访岛：主动离开（回大厅/回自己岛），to = 对端名字防误杀新会话 */
export interface C2SVisitLeaveMsg {
  t: 'visit.leave';
  to: string;
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
  | C2SVisitPosMsg
  | C2SVisitBlocksMsg
  | C2SVisitLeaveMsg
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

/** 好友访岛：服务器回执——申请确实送到了（申请丢失时客户端能靠"没收到回执"发现死管） */
export interface S2CVisitRequestedMsg {
  t: 'visit.requested';
  to: string;
}

/** 好友访岛：访客收到批准，凭 ticket 拉取岛主世界（pos = 岛主上报的落地参考点，落在本人附近） */
export interface S2CVisitApprovedMsg {
  t: 'visit.approved';
  owner: string;
  perm: VisitPerm;
  ticket?: string;
  pos?: { x: number; y: number; z: number };
}

/** 同屏访岛：发给岛主——你批准的客人正在上岛（客人拉完世界就会出现在你面前） */
export interface S2CVisitGuestMsg {
  t: 'visit.guest';
  guest: string;
  perm: VisitPerm;
}

/** 同屏访岛：对端转发来的实时位置（kind/见 C2SVisitPosMsg 说明） */
export interface S2CVisitPeerMsg {
  t: 'visit.peer';
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  kind?: string;
  day?: number;
}

/** 同屏访岛：对端改的一批方块，cells = [x, y, z, id, meta][] */
export interface S2CVisitBlocksMsg {
  t: 'visit.blocks';
  cells: number[][];
}

/** 同屏访岛：会话结束（对端离开或掉线，自己退回"看快照"模式） */
export interface S2CVisitEndMsg {
  t: 'visit.end';
  reason: 'left' | 'offline';
  name?: string;
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
  | S2CVisitRequestedMsg
  | S2CVisitApprovedMsg
  | S2CVisitDeniedMsg
  | S2CVisitGuestMsg
  | S2CVisitPeerMsg
  | S2CVisitBlocksMsg
  | S2CVisitEndMsg
  | S2CReservedMsg;
export type S2CMsgType = S2CMsg['t'];
