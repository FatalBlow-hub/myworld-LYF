/** 联机协议（Protocol） — 客户端与服务端 WebSocket JSON 消息的纯类型定义 */

import type { IslandType, VisitPerm } from '../config';

/** 连接状态：connected=已连接、reconnecting=重连中、disconnected=已断开 */
export type NetStatus = 'connected' | 'reconnecting' | 'disconnected';

/** 好友访岛被拒/作废原因：noname=在线名单里没这个名字（多半打错），offline=名字在但连接刚断，gone=回应时对方已经掉线申请作废 */
export type VisitDenyReason = 'offline' | 'rejected' | 'creative' | 'timeout' | 'self' | 'nosave' | 'noname' | 'gone';

/* ---------------- 客户端 → 服务端（C2S） ---------------- */

/** 握手上报身份（可附带本档是否曾开启过创造模式，供双标签页/本地档双重验证兜底；ver = 客户端代码版本号，排查旧缓存用） */
export interface C2SHelloMsg {
  t: 'hello';
  name: string;
  everCreative?: boolean;
  ver?: string;
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

/** 同屏访岛：打到对方一下（岛主开了「误伤」才允许发；服务器原样转发给对端，伤害由对端自己结算） */
export interface C2SVisitHitMsg {
  t: 'visit.hit';
}

/** 同屏访岛：送礼物给对端（coins = 送岛币；itemId+count = 送物品；二选一，服务器校验后转发） */
export interface C2SVisitGiveMsg {
  t: 'visit.give';
  coins?: number;
  itemId?: number;
  count?: number;
}

/** 同屏访岛：发聊天消息给对端（服务器截断长度后转发） */
export interface C2SVisitChatMsg {
  t: 'visit.chat';
  text: string;
}

/** 电脑「躲避 TNT」双人同屏小游戏的联机小包：
 *  invite=我先按了这台电脑在等你、join=我也按了同一台、start=主机定种子开局（t=已进行的秒数，中途加入用）、
 *  pos=我小人现在在第几列、dead/quit=我炸了或退出了 */
export type TntPacket =
  | { m: 'invite' | 'join'; x: number; y: number; z: number }
  | { m: 'start'; x: number; y: number; z: number; seed: number; t?: number }
  | { m: 'pos'; c: number }
  | { m: 'dead' | 'quit' };

/** 同屏访岛：TNT 小游戏消息（服务器原样转发 d 给对端） */
export interface C2SVisitTntMsg {
  t: 'visit.tnt';
  d: TntPacket;
}

/** 预留命名空间：后续访客/同步消息（本期不实现逻辑） */
export interface C2SReservedMsg {
  t: 'room.visit' | 'world.sync';
  [key: string]: unknown;
}

/* ---------------- CS 联机房间 ---------------- */

/** 房间里的一个人（服务端下发的快照） */
export interface CsMemberView {
  name: string;
  team: 'A' | 'B';
  hp: number;
  alive: boolean;
  host: boolean;
}

/** 房间快照 */
export interface CsRoomView {
  code: string;
  mode: '1v1' | '3v3';
  phase: 'lobby' | 'prep' | 'fight' | 'between';
  round: number;
  scoreA: number;
  scoreB: number;
  members: CsMemberView[];
}

export interface C2SCsCreateMsg { t: 'cs.create'; mode: '1v1' | '3v3' }
export interface C2SCsJoinMsg { t: 'cs.join'; code: string }
export interface C2SCsLeaveMsg { t: 'cs.leave' }
export interface C2SCsStartMsg { t: 'cs.start' }
export interface C2SCsPosMsg { t: 'cs.pos'; x: number; y: number; z: number; yaw: number }
/** 命中上报：伤害由服务端钳位并结算，客户端只报"我打中了谁" */
export interface C2SCsHitMsg { t: 'cs.hit'; target: string; damage: number }

export interface S2CCsRoomMsg { t: 'cs.room'; room: CsRoomView }
export interface S2CCsErrorMsg { t: 'cs.error'; msg: string }
export interface S2CCsPhaseMsg { t: 'cs.phase'; phase: 'lobby' | 'prep' | 'fight' | 'between'; seconds?: number; round: number }
export interface S2CCsPosMsg { t: 'cs.pos'; name: string; x: number; y: number; z: number; yaw: number }
export interface S2CCsHitMsg { t: 'cs.hit'; from: string; target: string; damage: number; hp: number; alive: boolean }
export interface S2CCsRoundMsg { t: 'cs.round'; winner: 'A' | 'B'; scoreA: number; scoreB: number; round: number }
export interface S2CCsEndMsg { t: 'cs.end'; winner: 'A' | 'B' }

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
  | C2SVisitHitMsg
  | C2SVisitGiveMsg
  | C2SVisitChatMsg
  | C2SVisitTntMsg
  | C2SReservedMsg
  | C2SCsCreateMsg
  | C2SCsJoinMsg
  | C2SCsLeaveMsg
  | C2SCsStartMsg
  | C2SCsPosMsg
  | C2SCsHitMsg;
export type C2SMsgType = C2SMsg['t'];

/* ---------------- 服务端 → 客户端（S2C） ---------------- */

/** 握手回应：确认名字 + 当前在线名单（locked = 防沉迷今天额度已用完，服务端随后踢下线） */
export interface S2CWelcomeMsg {
  t: 'welcome';
  name: string;
  online: string[];
  locked?: boolean;
}

/** 服务端心跳回应 */
export interface S2CPongMsg {
  t: 'pong';
  ts?: number;
}

/** 幼儿防沉迷 / 账号封停：服务端通知"今天额度已用完"或"账号被停用"，客户端锁屏（WS 层已随后踢下线） */
export interface S2CAddictLockedMsg {
  t: 'addict.locked';
  /** locked=当天额度用完（家长加时后自动放开）；banned=账号被停用（只能等家长解封后重新登录） */
  reason?: 'locked' | 'banned';
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

/** 同屏访岛：对方打了你一下（误伤开启时才有；name = 谁打的，伤害固定走 PVP.DAMAGE） */
export interface S2CVisitHitMsg {
  t: 'visit.hit';
  name: string;
}

/** 同屏访岛：对方送你东西（name = 谁送的；coins 或 itemId+count 二选一） */
export interface S2CVisitGiveMsg {
  t: 'visit.give';
  name: string;
  coins?: number;
  itemId?: number;
  count?: number;
}

/** 同屏访岛：对方发来的聊天（name = 谁说的，text = 内容） */
export interface S2CVisitChatMsg {
  t: 'visit.chat';
  name: string;
  text: string;
}

/** 同屏访岛：对方发来的 TNT 小游戏消息（name = 谁发的） */
export interface S2CVisitTntMsg {
  t: 'visit.tnt';
  name: string;
  d: TntPacket;
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
  | S2CAddictLockedMsg
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
  | S2CVisitHitMsg
  | S2CVisitGiveMsg
  | S2CVisitChatMsg
  | S2CVisitTntMsg
  | S2CReservedMsg
  | S2CCsRoomMsg
  | S2CCsErrorMsg
  | S2CCsPhaseMsg
  | S2CCsPosMsg
  | S2CCsHitMsg
  | S2CCsRoundMsg
  | S2CCsEndMsg;
export type S2CMsgType = S2CMsg['t'];
