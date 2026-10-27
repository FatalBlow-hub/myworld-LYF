/** 竞技场地图 — 极限季节挑战的两张图：冰天雪地（雪原）与星空的世界（悬空石台）
 *
 *  和 buildHall 一个套路：关掉地形生成，手写一个区块的方块。
 *  雪原图正好一个区块（16×16），四周两格围墙防止跑出去；
 *  虚空图是一小块悬空石台，掉下去由 Game 传回台面（不扣血不判死）。 */

import { ARENA } from '../config';
import { AIR, DIRT, SNOW, STONE } from './Block';
import { Chunk } from './Chunk';
import { World } from './World';

type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';

/** 这两种极限图各自只在哪些季节开放（设定：冰天雪地春/冬、星空夏/秋） */
export function arenaOpen(kind: 'snow' | 'void', season: SeasonName): boolean {
  return kind === 'snow'
    ? season === 'spring' || season === 'winter'
    : season === 'summer' || season === 'autumn';
}

/** 雪原图出生点（平台正中央） */
export const SNOW_SPAWN = { x: ARENA.SNOW_SIZE / 2 + 0.5, y: ARENA.FLOOR_Y + 1, z: ARENA.SNOW_SIZE / 2 + 0.5 };
/** 虚空图出生点（石台正中央） */
export const VOID_ARENA_SPAWN = { x: Math.floor(ARENA.VOID_SIZE / 2) + 0.5, y: ARENA.FLOOR_Y + 1, z: Math.floor(ARENA.VOID_SIZE / 2) + 0.5 };

/** 把区块 0,0 清空并标脏 */
function resetChunk(world: World): Uint16Array {
  world.terrainGen = false;
  const chunk = world.ensureChunk(0, 0);
  chunk.data.fill(AIR);
  chunk.dirty = true;
  world.dirtyChunks.add(World.key(0, 0));
  return chunk.data;
}

/** 冰天雪地：一整块雪地 + 四周两格高雪墙（外面看就是一片雪原） */
export function buildSnowArena(world: World): void {
  const data = resetChunk(world);
  const S = ARENA.SNOW_SIZE;
  const y = ARENA.FLOOR_Y;
  for (let x = 0; x < S; x++) {
    for (let z = 0; z < S; z++) {
      data[Chunk.index(x, y, z)] = SNOW;
      data[Chunk.index(x, y - 1, z)] = DIRT;
      const edge = x === 0 || x === S - 1 || z === 0 || z === S - 1;
      if (edge) {
        for (let i = 1; i <= ARENA.SNOW_WALL; i++) data[Chunk.index(x, y + i, z)] = SNOW;
      }
    }
  }
}

/** 星空的世界：一小块悬空石台，四周全是空气，掉下去不会死 */
export function buildVoidArena(world: World): void {
  const data = resetChunk(world);
  const S = ARENA.VOID_SIZE;
  const y = ARENA.FLOOR_Y;
  for (let x = 0; x < S; x++) {
    for (let z = 0; z < S; z++) {
      data[Chunk.index(x, y, z)] = STONE;
    }
  }
}
