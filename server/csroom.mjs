/** CS 联机房间 — 建房 / 加入 / 开始，服务端权威血量、回合胜负与成员广播
 *
 *  ws.mjs 只负责接消息转发过来：房间状态、血量结算、回合判定全在这个模块里做，
 *  客户端上报的伤害会被钳到 1~25 并且限制开枪频率，避免"自报挨打"被拿去开挂。 */

const MAX_HP = 20;          // 满血（和前端 HEALTH.MAX_HP 一致）
const WIN_ROUNDS = 3;       // 五局三胜
const PREP_SECONDS = 5;     // 每小局准备时间
const SWITCH_SECONDS = 3;   // 换局间隔
const FIRE_COOLDOWN_MS = 300; // 开枪最小间隔（防连点刷伤害）
const MAX_DAMAGE = 25;      // 单发伤害上限（步枪 25）
const ROOM_TTL_MS = 30 * 60_000; // 房间最长存活 30 分钟，超时自动回收

/** @type {Map<string, {code:string, mode:string, phase:string, round:number, scoreA:number, scoreB:number, members:Array, timer:any, updatedAt:number}>} */
const csRooms = new Map();
/** ws -> 房间号（断线清理用） */
const wsRoom = new Map();

const now = () => Date.now();

function newCode() {
  for (let i = 0; i < 200; i++) {
    const code = String(1000 + Math.floor(Math.random() * 9000));
    if (!csRooms.has(code)) return code;
  }
  return String(now() % 10000);
}

/** 房间快照（发给客户端渲染成员列表用） */
function roomView(room) {
  return {
    code: room.code,
    mode: room.mode,
    phase: room.phase,
    round: room.round,
    scoreA: room.scoreA,
    scoreB: room.scoreB,
    members: room.members.map((m) => ({
      name: m.name, team: m.team, hp: m.hp, alive: m.alive, host: m.host === true,
    })),
  };
}

function broadcast(room, msg, send) {
  for (const m of room.members) {
    if (m.ws && m.ws.readyState === m.ws.OPEN) send(m.ws, msg);
  }
}

function roomOf(ws) {
  const code = wsRoom.get(ws);
  return code ? csRooms.get(code) : undefined;
}

function memberOf(room, ws) {
  return room?.members.find((m) => m.ws === ws);
}

function clearTimer(room) {
  if (room.timer) { clearTimeout(room.timer); room.timer = null; }
}

/** 开始一小局：全员满血复活，先走准备阶段 */
function startRound(room, send) {
  clearTimer(room);
  room.round++;
  room.phase = 'prep';
  for (const m of room.members) { m.hp = MAX_HP; m.alive = true; m.lastFire = 0; }
  broadcast(room, { t: 'cs.room', room: roomView(room) }, send);
  broadcast(room, { t: 'cs.phase', phase: 'prep', seconds: PREP_SECONDS, round: room.round }, send);
  room.timer = setTimeout(() => {
    if (csRooms.get(room.code) !== room) return;
    room.phase = 'fight';
    broadcast(room, { t: 'cs.phase', phase: 'fight', round: room.round }, send);
  }, PREP_SECONDS * 1000);
}

/** 一队全灭：结算这一小局 */
function endRound(room, winnerTeam, send) {
  clearTimer(room);
  room.phase = 'between';
  if (winnerTeam === 'A') room.scoreA++; else room.scoreB++;
  broadcast(room, {
    t: 'cs.round', winner: winnerTeam, scoreA: room.scoreA, scoreB: room.scoreB, round: room.round,
  }, send);
  const done = room.scoreA >= WIN_ROUNDS || room.scoreB >= WIN_ROUNDS;
  if (done) {
    broadcast(room, { t: 'cs.end', winner: room.scoreA >= WIN_ROUNDS ? 'A' : 'B' }, send);
    room.phase = 'lobby';
    room.round = 0; room.scoreA = 0; room.scoreB = 0;
    for (const m of room.members) { m.hp = MAX_HP; m.alive = true; }
    broadcast(room, { t: 'cs.room', room: roomView(room) }, send);
    return;
  }
  room.timer = setTimeout(() => {
    if (csRooms.get(room.code) !== room) return;
    startRound(room, send);
  }, SWITCH_SECONDS * 1000);
}

/** 检查是不是有一队被清空了 */
function checkWipe(room, send) {
  if (room.phase !== 'fight') return;
  const aliveA = room.members.some((m) => m.team === 'A' && m.alive);
  const aliveB = room.members.some((m) => m.team === 'B' && m.alive);
  if (!aliveA && !aliveB) return; // 同时团灭（罕见）就先不结算，等下一次判定
  if (!aliveB) endRound(room, 'A', send);
  else if (!aliveA) endRound(room, 'B', send);
}

/**
 * 处理所有 cs.* 消息；返回 true 表示这条消息已被处理
 * @param {object} ctx { ws, info, msg, send }
 */
export function handleCsMessage({ ws, info, msg, send }) {
  const name = info.name;
  if (!name) return false;

  // 建房：房主默认进 A 队
  if (msg.t === 'cs.create') {
    const room0 = roomOf(ws);
    if (room0) leaveRoom(ws, send);
    const mode = msg.mode === '3v3' ? '3v3' : '1v1';
    const code = newCode();
    const room = {
      code, mode, phase: 'lobby', round: 0, scoreA: 0, scoreB: 0,
      members: [{ ws, name, team: 'A', hp: MAX_HP, alive: true, host: true, lastFire: 0 }],
      timer: null, updatedAt: now(),
    };
    csRooms.set(code, room);
    wsRoom.set(ws, code);
    console.log(`[cs] ${name} 建房 ${code} (${mode})`);
    send(ws, { t: 'cs.room', room: roomView(room) });
    return true;
  }

  // 加入：人数满了就拒绝
  if (msg.t === 'cs.join') {
    const code = String(msg.code ?? '').trim();
    const room = csRooms.get(code);
    if (!room) { send(ws, { t: 'cs.error', msg: '房间不存在' }); return true; }
    if (room.phase !== 'lobby') { send(ws, { t: 'cs.error', msg: '比赛已经开始，进不去了' }); return true; }
    const cap = room.mode === '3v3' ? 6 : 2;
    if (room.members.length >= cap) { send(ws, { t: 'cs.error', msg: '房间人数满了' }); return true; }
    if (room.members.some((m) => m.name === name)) { send(ws, { t: 'cs.room', room: roomView(room) }); return true; }
    const room0 = roomOf(ws);
    if (room0) leaveRoom(ws, send);
    // 分队：A 队先坐满（1v1 各 1 人、3v3 各 3 人）
    const per = room.mode === '3v3' ? 3 : 1;
    const countA = room.members.filter((m) => m.team === 'A').length;
    const team = countA < per ? 'A' : 'B';
    room.members.push({ ws, name, team, hp: MAX_HP, alive: true, host: false, lastFire: 0 });
    wsRoom.set(ws, code);
    room.updatedAt = now();
    console.log(`[cs] ${name} 加入房间 ${code} (${team} 队，${room.members.length} 人)`);
    broadcast(room, { t: 'cs.room', room: roomView(room) }, send);
    return true;
  }

  if (msg.t === 'cs.leave') {
    leaveRoom(ws, send);
    return true;
  }

  const room = roomOf(ws);
  if (!room) return true; // 不在房间里，其余指令忽略
  room.updatedAt = now();

  // 房主开赛：至少 2 人
  if (msg.t === 'cs.start') {
    const me = memberOf(room, ws);
    if (!me?.host) { send(ws, { t: 'cs.error', msg: '只有房主能开赛' }); return true; }
    if (room.members.length < 2) { send(ws, { t: 'cs.error', msg: '至少两个人才能开赛' }); return true; }
    room.round = 0; room.scoreA = 0; room.scoreB = 0;
    startRound(room, send);
    console.log(`[cs] 房间 ${room.code} 开赛 (${room.mode}，${room.members.length} 人)`);
    return true;
  }

  // 位置：转发给同房间里其他人
  if (msg.t === 'cs.pos') {
    const x = Number(msg.x), y = Number(msg.y), z = Number(msg.z);
    const yaw = Number(msg.yaw);
    if (![x, y, z, yaw].every(Number.isFinite)) return true;
    for (const m of room.members) {
      if (m.ws === ws || !m.ws || m.ws.readyState !== m.ws.OPEN) continue;
      send(m.ws, { t: 'cs.pos', name, x, y, z, yaw });
    }
    return true;
  }

  // 开枪命中：服务端权威扣血（伤害钳位 + 开枪冷却）
  if (msg.t === 'cs.hit') {
    if (room.phase !== 'fight') return true;
    const me = memberOf(room, ws);
    const target = room.members.find((m) => m.name === msg.target);
    if (!me || !target || me === target || !me.alive || !target.alive) return true;
    if (me.team === target.team) return true;                    // 不打自己人
    const t = now();
    if (me.lastFire && t - me.lastFire < FIRE_COOLDOWN_MS) return true;
    me.lastFire = t;
    const dmg = Math.min(MAX_DAMAGE, Math.max(1, Math.floor(Number(msg.damage)) || 1));
    target.hp = Math.max(0, target.hp - dmg);
    if (target.hp === 0) target.alive = false;                   // 阵亡：等下一小局
    broadcast(room, {
      t: 'cs.hit', from: name, target: target.name, damage: dmg, hp: target.hp, alive: target.alive,
    }, send);
    if (!target.alive) checkWipe(room, send);
    return true;
  }

  return true;
}

/** 离开房间（主动退出 / 断线都会走这里） */
export function leaveRoom(ws, send) {
  const code = wsRoom.get(ws);
  if (!code) return;
  wsRoom.delete(ws);
  const room = csRooms.get(code);
  if (!room) return;
  const me = memberOf(room, ws);
  room.members = room.members.filter((m) => m.ws !== ws);
  if (room.members.length === 0) {
    clearTimer(room);
    csRooms.delete(code);
    console.log(`[cs] 房间 ${code} 已解散`);
    return;
  }
  if (me?.host) room.members[0].host = true; // 房主走了就交给第一个人
  broadcast(room, { t: 'cs.room', room: roomView(room) }, send);
  checkWipe(room, send);
}

/** 断线：按设定直接判定死亡 */
export function dropFromRooms(ws, send) {
  const room = roomOf(ws);
  if (room && room.phase === 'fight') {
    const me = memberOf(room, ws);
    if (me && me.alive) {
      me.alive = false;
      me.hp = 0;
      broadcast(room, { t: 'cs.hit', from: '掉线', target: me.name, damage: 0, hp: 0, alive: false }, send);
    }
  }
  leaveRoom(ws, send);
}

/** 定时回收没人动的空房间（心跳巡检里顺手调） */
export function sweepCsRooms() {
  const t = now();
  for (const [code, room] of csRooms.entries()) {
    const deadLinks = room.members.every((m) => !m.ws || m.ws.readyState !== m.ws.OPEN);
    if (deadLinks || t - room.updatedAt > ROOM_TTL_MS) {
      clearTimer(room);
      csRooms.delete(code);
    }
  }
}
