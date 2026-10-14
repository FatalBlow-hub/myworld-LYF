/** 物理 — 玩家是个长方体盒子：受重力、撞方块会停下、水里能游、能自动跨上一格台阶 */

import { BOOST, PLAYER, SKATES, TANK, WAISTBAG } from '../config';
import { LADDER, SWAMP_DROWN, WATER, isSwamp } from '../world/Block';
import { World } from '../world/World';
import { Controller } from './Controller';

export interface PlayerBody {
  /** 脚底位置 */
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  /** 朝向：yaw 左右转，pitch 抬头低头 */
  yaw: number; pitch: number;
  onGround: boolean;
  inWater: boolean;
  headInWater: boolean;
  /** 创造模式开着：无重力悬浮，空格升 Shift 降 */
  flying: boolean;
  /** 离地后到达过的最高点，用来算摔了多远 */
  fellFrom: number;
  /** 吃腌菜桶的加速倒计时：>0 时走路快一半 */
  speedBoostT: number;
  /** 穿着轮滑鞋（装备栏靴子格里是真货）→ 走路速度 ×1.5 */
  skating: boolean;
  /** 轮滑摔倒爬不起来的剩余秒数（>0 = 正躺着） */
  skateFallT: number;
  /** 玻璃腰包穿在腰包格时减速 */
  glassBag: boolean;
  /** 开着坦克：速度乘 2 */
  driving: boolean;
  /** 身体泡着的泽液 ID（0 = 没在泽液里），碰泽液扣血就靠它 */
  swampId: number;
  /** 幻泽液头晕倒计时：>0 时镜头左右摇摆 */
  swayT: number;
  swayPhase: number;
  /** 防溺药水倒计时：>0 时水下不耗氧气 */
  breathT: number;
  frozenT: number;
}

export function createBody(x: number, y: number, z: number): PlayerBody {
  return { x, y, z, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, onGround: false, inWater: false, headInWater: false, flying: false, fellFrom: y, speedBoostT: 0, skating: false, skateFallT: 0, glassBag: false, driving: false, swampId: 0, swayT: 0, swayPhase: 0, breathT: 0, frozenT: 0 };
}

export interface FrameEvents {
  /** 本帧落地的掉落距离，没落地为 0 */
  fallDistance: number;
  /** 本帧实际水平移动距离（撞墙不算滑行） */
  horizontalDistance: number;
}

/** 宽 w、高 h 的盒子在 (x,y,z) 会不会卡进实心方块（玩家和动物共用，含异形碰撞盒） */
export function collidesAABB(world: World, x: number, y: number, z: number, w: number, h: number): boolean {
  const hw = w / 2;
  return world.hitsBox(x - hw, y, z - hw, x + hw, y + h, z + hw);
}

/** 玩家的盒子占没占实心方块 */
function collides(world: World, x: number, y: number, z: number): boolean {
  return collidesAABB(world, x, y, z, PLAYER.WIDTH, PLAYER.HEIGHT);
}

/** 会走路的盒子（动物/僵尸共用）水平挪一步：撞墙就试试抬 1 格跨上去 */
export function stepWalk(
  world: World,
  x: number, y: number, z: number,
  dx: number, dz: number,
  w: number, h: number,
): { x: number; y: number; z: number; moved: boolean } {
  if (!collidesAABB(world, x + dx, y, z + dz, w, h)) {
    return { x: x + dx, y, z: z + dz, moved: true };
  }
  if (!collidesAABB(world, x + dx, y + 1, z + dz, w, h) &&
      !collidesAABB(world, x, y + 1, z, w, h)) {
    return { x: x + dx, y: y + 1, z: z + dz, moved: true };
  }
  return { x, y, z, moved: false };
}

function isWaterAt(world: World, x: number, y: number, z: number): boolean {
  const id = world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
  return id === WATER || id === SWAMP_DROWN; // 溺泽液和水一样：能游泳也会憋气
}

/** 这格是什么泽液（不是泽液返回 0） */
function swampAt(world: World, x: number, y: number, z: number): number {
  const half = PLAYER.WIDTH / 2;
  for (let bx = Math.floor(x - half); bx < x + half; bx++) {
    for (let bz = Math.floor(z - half); bz < z + half; bz++) {
      for (let by = Math.floor(y); by < y + PLAYER.HEIGHT; by++) {
        const id = world.getBlock(bx, by, bz);
        if (isSwamp(id)) return id;
      }
    }
  }
  return 0;
}

function isLadderAt(world: World, x: number, y: number, z: number): boolean {
  return world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)) === LADDER;
}

/** 一轴一轴地挪，撞了就退回；水平撞墙且在地面时尝试跨上一格 */
function moveAxis(body: PlayerBody, world: World, axis: 'x' | 'y' | 'z', delta: number): boolean {
  if (delta === 0) return false;
  const old = body[axis];
  body[axis] += delta;
  if (!collides(world, body.x, body.y, body.z)) return false;
  body[axis] = old;

  // 水平方向撞墙 + 站地上 → 试试抬高 1 格走过去（走楼梯的感觉）
  if (axis !== 'y' && body.onGround) {
    body.y += 1;
    body[axis] += delta;
    if (!collides(world, body.x, body.y, body.z)) return false;
    body[axis] = old;
    body.y -= 1;
  }
  return true; // 真撞上了
}

/** 每帧更新：读按键意图 → 改速度 → 移动+碰撞 → 返回本帧事件 */
export function stepPhysics(body: PlayerBody, world: World, input: Controller, dt: number): FrameEvents {
  // 转向与视线（键盘当摇杆用）
  if (input.isDown('turnLeft')) body.yaw += PLAYER.TURN_SPEED * dt;
  if (input.isDown('turnRight')) body.yaw -= PLAYER.TURN_SPEED * dt;
  if (input.isDown('lookUp')) body.pitch += PLAYER.LOOK_SPEED * dt;
  if (input.isDown('lookDown')) body.pitch -= PLAYER.LOOK_SPEED * dt;
  body.pitch = Math.max(-PLAYER.LOOK_LIMIT, Math.min(PLAYER.LOOK_LIMIT, body.pitch));

  // 身体在水里吗：脚踩水或腰泡水算游泳，眼泡水算"头在水里"
  body.inWater = isWaterAt(world, body.x, body.y + 0.2, body.z) || isWaterAt(world, body.x, body.y + 0.9, body.z);
  body.headInWater = isWaterAt(world, body.x, body.y + PLAYER.EYE, body.z);
  // 人站在梯子格子里就算在爬（梯子不是实心，能走进去贴着墙）
  const onLadder =
    isLadderAt(world, body.x, body.y + 0.1, body.z) ||
    isLadderAt(world, body.x, body.y + 0.9, body.z) ||
    isLadderAt(world, body.x, body.y + PLAYER.EYE, body.z);

  // 泡在什么泽液里：脚踩到或腰泡到都算"碰到"（扣血按泽液种类来）
  body.swampId = swampAt(world, body.x, body.y, body.z);
  body.inWater ||= body.swampId !== 0;
  body.headInWater ||= body.swampId === SWAMP_DROWN;

  // 水平速度：直接给速度（街机手感），水里打个折，吃腌菜桶跑得快
  body.speedBoostT = Math.max(0, body.speedBoostT - dt);
  body.swayT = Math.max(0, body.swayT - dt);   // 幻泽液头晕倒计时
  body.breathT = Math.max(0, body.breathT - dt); // 防溺药水倒计时
  body.frozenT = Math.max(0, body.frozenT - dt);
  const fwd = body.frozenT > 0 ? 0 : (input.isDown('forward') ? 1 : 0) - (input.isDown('back') ? 1 : 0);
  const fx = -Math.sin(body.yaw);
  const fz = -Math.cos(body.yaw);
  const boost = body.speedBoostT > 0 ? BOOST.MULT : 1;
  const skateMult = body.skating && !body.driving ? SKATES.SPEED_MULT : 1;
  const bagMult = body.glassBag ? WAISTBAG.GLASS_SPEED : 1;
  const speed = PLAYER.SPEED * boost * (body.driving ? TANK.SPEED_MULT : 1) * skateMult * bagMult * (body.inWater ? 0.55 : body.flying ? PLAYER.FLY_MOVE : 1);
  body.vx = fwd * speed * fx;
  body.vz = fwd * speed * fz;
  // 轮滑摔倒躺着：动不了也跳不了（倒计时结束自己站起来）
  if (body.skateFallT > 0) {
    body.skateFallT = Math.max(0, body.skateFallT - dt);
    body.vx = 0; body.vz = 0;
  }

  // 垂直速度：摔倒期间保持躺着，其他时候按飞行/水中/陆地规则更新
  if (body.skateFallT > 0 || body.frozenT > 0) {
    body.vy = 0;
  } else if (body.flying && !body.inWater) {
    const rise = (input.isDown('jump') ? 1 : 0) - (input.isDown('descend') ? 1 : 0);
    body.vy = rise * PLAYER.FLY_SPEED;
  } else if (body.inWater) {
    body.vy -= PLAYER.WATER_GRAVITY * dt;
    body.vy *= Math.max(0, 1 - PLAYER.WATER_DRAG * dt);
    if (input.isDown('jump')) body.vy = PLAYER.SWIM_UP;
  } else if (onLadder) {
    // 爬梯子：按住↑往上爬、↓往下爬，松开就挂住不动（也不会摔）
    body.vy = fwd * PLAYER.CLIMB;
  } else {
    body.vy -= PLAYER.GRAVITY * dt;
    if (input.isDown('jump') && body.onGround && body.skateFallT <= 0) {
      body.vy = PLAYER.JUMP;
      body.onGround = false;
    }
  }

  // 离地后记住最高点，落地时算摔落距离；在梯子上不算"悬空"，摔不了
  if (!body.onGround && body.y > body.fellFrom) body.fellFrom = body.y;
  if (onLadder) body.fellFrom = body.y;

  const events: FrameEvents = { fallDistance: 0, horizontalDistance: 0 };
  const wasFalling = body.vy < 0;

  const startX = body.x;
  const startZ = body.z;
  moveAxis(body, world, 'x', body.vx * dt);
  moveAxis(body, world, 'z', body.vz * dt);
  events.horizontalDistance = Math.hypot(body.x - startX, body.z - startZ);
  const hitY = moveAxis(body, world, 'y', body.vy * dt);
  if (hitY) {
    if (wasFalling && !body.onGround && !body.inWater) {
      events.fallDistance = Math.max(0, body.fellFrom - body.y);
    }
    if (body.vy < 0) {
      body.onGround = true;
      body.fellFrom = body.y;
    }
    body.vy = 0;
  } else if (body.vy !== 0 || body.inWater) {
    body.onGround = false;
  }

  // 掉出世界兜底：拉回出生高度（理论上一辈子不该触发）
  if (body.y < -10) {
    body.y = 80;
    body.vy = 0;
  }

  return events;
}
