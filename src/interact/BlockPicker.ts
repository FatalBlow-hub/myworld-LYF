/** 方块拾取 — 从眼睛沿视线发射线找方块，执行挖掘 / 放置 / 开关门 */

import { CHUNK, PLAYER } from '../config';
import { AIR, BAMBOO, BLOCKS, CARROT_SEED, DIRT, DOOR_CLOSED, GRASS, RICE_SEED, SEAWEED, STAR_WOOL, WATER, dropOf, isBed, isDoor, isLiquid, isPlant, isSolid, toggleDoor } from '../world/Block';
import { bambooStandable } from '../world/bamboo';
import { META_DIRS } from '../world/Shapes';
import { World } from '../world/World';
import { PlayerBody } from '../player/Physics';

export interface BlockHit {
  /** 指到的方块格子 */
  x: number; y: number; z: number;
  /** 进入这个格子时穿过的面 → 放方块要放在相邻格 */
  nx: number; ny: number; nz: number;
}

/** 体素射线（DDA 算法）：一格一格往前走，找到第一个实心方块或门 */
export function raycastBlock(world: World, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxDist: number): BlockHit | null {
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
  const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
  const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;
  let tMaxX = dx !== 0 ? ((dx > 0 ? x + 1 - ox : ox - x) * tDeltaX) : Infinity;
  let tMaxY = dy !== 0 ? ((dy > 0 ? y + 1 - oy : oy - y) * tDeltaY) : Infinity;
  let tMaxZ = dz !== 0 ? ((dz > 0 ? z + 1 - oz : oz - z) * tDeltaZ) : Infinity;
  let nx = 0, ny = 0, nz = 0, t = 0;

  while (t <= maxDist) {
    const id = world.getBlock(x, y, z);
    // 开着的门/告示牌不挡人但要点得到，不然没法关门/拆牌子
    if (isSolid(id) || isDoor(id) || BLOCKS[id]?.targetable) return { x, y, z, nx, ny, nz };
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX; t = tMaxX; tMaxX += tDeltaX;
      nx = -stepX; ny = 0; nz = 0;
    } else if (tMaxY < tMaxZ) {
      y += stepY; t = tMaxY; tMaxY += tDeltaY;
      nx = 0; ny = -stepY; nz = 0;
    } else {
      z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ;
      nx = 0; ny = 0; nz = -stepZ;
    }
  }
  return null;
}

/** 从玩家眼睛位置朝看的方向发射线 */
export function pick(world: World, body: PlayerBody): BlockHit | null {
  const cp = Math.cos(body.pitch);
  const dx = -Math.sin(body.yaw) * cp;
  const dy = Math.sin(body.pitch);
  const dz = -Math.cos(body.yaw) * cp;
  return raycastBlock(world, body.x, body.y + PLAYER.EYE, body.z, dx, dy, dz, PLAYER.REACH);
}

/** 指到的那格液体：水和泽液不挡射线所以用另一套找法——沿路走过去，第一格液体就是它（桶盛水/盛泽液用） */
export function pickWater(world: World, body: PlayerBody): BlockHit | null {
  const cp = Math.cos(body.pitch);
  const dx = -Math.sin(body.yaw) * cp;
  const dy = Math.sin(body.pitch);
  const dz = -Math.cos(body.yaw) * cp;
  const ox = body.x, oy = body.y + PLAYER.EYE, oz = body.z;
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
  const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
  const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;
  let tMaxX = dx !== 0 ? ((dx > 0 ? x + 1 - ox : ox - x) * tDeltaX) : Infinity;
  let tMaxY = dy !== 0 ? ((dy > 0 ? y + 1 - oy : oy - y) * tDeltaY) : Infinity;
  let tMaxZ = dz !== 0 ? ((dz > 0 ? z + 1 - oz : oz - z) * tDeltaZ) : Infinity;
  let nx = 0, ny = 0, nz = 0, t = 0;

  while (t <= PLAYER.REACH) {
    const id = world.getBlock(x, y, z);
    if (isLiquid(id)) return { x, y, z, nx, ny, nz }; // 碰到液体就停：盛这格
    if (isSolid(id) || isDoor(id) || BLOCKS[id]?.targetable) return null; // 被实心方块挡住，够不到液体
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX; t = tMaxX; tMaxX += tDeltaX;
      nx = -stepX; ny = 0; nz = 0;
    } else if (tMaxY < tMaxZ) {
      y += stepY; t = tMaxY; tMaxY += tDeltaY;
      nx = 0; ny = -stepY; nz = 0;
    } else {
      z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ;
      nx = 0; ny = 0; nz = -stepZ;
    }
  }
  return null;
}

/** 盛液体：容器对着水或泽液按挖键，这格液体进容器里，原地变空气 */
export function scoopWater(world: World, hit: BlockHit): boolean {
  const id = world.getBlock(hit.x, hit.y, hit.z);
  if (!isLiquid(id)) return false;
  world.setBlock(hit.x, hit.y, hit.z, AIR);
  return true;
}

/** 倒液体：对着方块按放键，在它旁边的空格里放一格液体（悬空的液体会自己往下流） */
export function pourWater(world: World, hit: BlockHit, liquid: number = WATER): boolean {
  const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
  if (y < 0 || y >= CHUNK.HEIGHT || !isLiquid(liquid)) return false;
  const cur = world.getBlock(x, y, z);
  if (cur !== AIR && !isPlant(cur)) return false; // 只能倒进空气/花草里
  world.setBlock(x, y, z, liquid);
  return true;
}

/** 种水草：指着水底的实地，水草种在它头顶那格水里（水草要扎根在水底） */
export function placeSeaweed(world: World, hit: BlockHit): boolean {
  const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
  if (world.getBlock(x, y, z) !== WATER) return false;              // 得种在水里
  if (!isSolid(world.getBlock(x, y - 1, z))) return false;          // 脚下是实地才扎得住根
  world.setBlock(x, y, z, SEAWEED);
  return true;
}

/** 挖方块：门会连另一半一起拆但只掉 1 个；世界是无限的，最底层也能挖穿（掉下去会摔出世界）。返回掉落的方块 ID */
export function mine(world: World, hit: BlockHit): number {
  const id = world.getBlock(hit.x, hit.y, hit.z);
  // 先记住朝向：setBlock 会把这格的 meta 清掉，床要靠它找另一半
  const m = world.getMeta(hit.x, hit.y, hit.z);
  const drop = dropOf(id);
  world.setBlock(hit.x, hit.y, hit.z, AIR);
  if (isDoor(id)) {
    // 门是两格高，另一半在头上或脚下
    if (isDoor(world.getBlock(hit.x, hit.y + 1, hit.z))) world.setBlock(hit.x, hit.y + 1, hit.z, AIR);
    if (isDoor(world.getBlock(hit.x, hit.y - 1, hit.z))) world.setBlock(hit.x, hit.y - 1, hit.z, AIR);
  }
  if (isBed(id)) {
    // 床横着占两格：床尾 meta=方向，床头 meta=方向+4；把配对的另一半也拆了
    const dir = m % 4;
    const [dx, , dz] = META_DIRS[dir];
    const ox = hit.x + (m >= 4 ? -dx : dx);
    const oz = hit.z + (m >= 4 ? -dz : dz);
    // 另一半的 meta 得正好对上才拆（不然可能是旧存档的独格床或旁边另一张床）
    if (isBed(world.getBlock(ox, hit.y, oz)) && world.getMeta(ox, hit.y, oz) === (m >= 4 ? dir : dir + 4)) {
      world.setBlock(ox, hit.y, oz, AIR);
    }
  }
  return drop;
}

/** 放方块：放在指着的那面的相邻格；指着花草时直接顶替；门要占两格高；带朝向的记 meta。返回是否放成功 */
export function place(world: World, hit: BlockHit, blockId: number, body: PlayerBody, meta = 0): boolean {
  if (BLOCKS[blockId]?.item) return false; // 物品不能放到世界里
  // 指着草/花放东西 → 放在它自己那格（不然花草会挡着放不了）
  const soft = isPlant(world.getBlock(hit.x, hit.y, hit.z));
  const x = soft ? hit.x : hit.x + hit.nx;
  const y = soft ? hit.y : hit.y + hit.ny;
  const z = soft ? hit.z : hit.z + hit.nz;
  const cur = world.getBlock(x, y, z);
  if (cur !== AIR && cur !== WATER && !isPlant(cur)) return false; // 只能放进空气/水/花草里
  // 花草只能种在草方块或泥土上
  if (isPlant(blockId)) {
    const below = world.getBlock(x, y - 1, z);
    if (below !== GRASS && below !== DIRT) return false;
  }
  // 星空羊毛不能离开地面悬空放：脚底下那格必须是实心方块
  if (blockId === STAR_WOOL && !isSolid(world.getBlock(x, y - 1, z))) return false;
  // 竹子也一样不许悬空：脚下得是泥土/草方块，或者接着下面那节竹子（能往上接高）
  if (blockId === BAMBOO && !bambooStandable(world, x, y, z)) return false;
  if (blockId === DOOR_CLOSED) {
    const up = world.getBlock(x, y + 1, z);
    if (up !== AIR && up !== WATER) return false; // 门的上半截没地方放
  }
  let head: [number, number, number] | null = null;
  if (isBed(blockId)) {
    // 床横着占两格：指着的这格是床尾（被子），床头（枕头）往你脸朝的方向再伸一格
    head = META_DIRS[meta % 4];
    const c2 = world.getBlock(x + head[0], y, z + head[2]);
    if ((c2 !== AIR && c2 !== WATER && !isPlant(c2)) || overlapsPlayer(body, x + head[0], y, z + head[2])) {
      return false; // 床头那格没地方放
    }
  }
  if (overlapsPlayer(body, x, y, z)) return false;  // 不能把自己埋进去
  world.setBlock(x, y, z, blockId);
  if (BLOCKS[blockId].oriented) world.setMeta(x, y, z, meta);
  if (blockId === DOOR_CLOSED) world.setBlock(x, y + 1, z, DOOR_CLOSED);
  if (head) {
    world.setBlock(x + head[0], y, z + head[2], blockId);
    world.setMeta(x + head[0], y, z + head[2], (meta % 4) + 4); // meta+4 = 这格是床头
  }
  return true;
}

/** 种稻谷：拿着稻粒对水按 L。顺着水柱往上蹚到水面，种子落在水面上一格；根泡不到水就种不了 */
export function plantSeed(world: World, hit: BlockHit): boolean {
  let y = hit.y + hit.ny;
  const x = hit.x + hit.nx;
  const z = hit.z + hit.nz;
  while (world.getBlock(x, y, z) === WATER) y++; // 水有多深就蹚多高，直到冒出水面
  if (world.getBlock(x, y, z) !== AIR) return false;
  if (world.getBlock(x, y - 1, z) !== WATER) return false; // 脚下那格必须是水
  world.setBlock(x, y, z, RICE_SEED);
  return true;
}

/** 种胡萝卜：拿着胡萝卜对草地/泥土按 L，苗长在土上面那格（那格得是空的） */
export function plantCarrot(world: World, hit: BlockHit): boolean {
  const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
  if (world.getBlock(x, y, z) !== AIR) return false;
  const soil = world.getBlock(x, y - 1, z);
  if (soil !== GRASS && soil !== DIRT) return false; // 只认草地和泥土
  world.setBlock(x, y, z, CARROT_SEED);
  return true;
}

/** 开门/关门：门和它的另一半一起翻状态 */
export function useDoor(world: World, hit: BlockHit): boolean {
  const id = world.getBlock(hit.x, hit.y, hit.z);
  if (!isDoor(id)) return false;
  const next = toggleDoor(id);
  world.setBlock(hit.x, hit.y, hit.z, next);
  if (isDoor(world.getBlock(hit.x, hit.y + 1, hit.z))) world.setBlock(hit.x, hit.y + 1, hit.z, next);
  if (isDoor(world.getBlock(hit.x, hit.y - 1, hit.z))) world.setBlock(hit.x, hit.y - 1, hit.z, next);
  return true;
}

/** 要放的格子会不会把玩家套进去 */
function overlapsPlayer(body: PlayerBody, x: number, y: number, z: number): boolean {
  const w = PLAYER.WIDTH / 2;
  return x + 1 > body.x - w && x < body.x + w &&
         y + 1 > body.y && y < body.y + PLAYER.HEIGHT &&
         z + 1 > body.z - w && z < body.z + w;
}
