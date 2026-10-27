/** CS 大赛地图 — 16×16 沙漠地形：沙地 + 沙石矮墙当掩体，两队各占一个对角
 *
 *  和 buildHall 一个套路：关掉地形生成，手写一个区块。
 *  地图里不许挖方块（挖/放都在 PlayerActions 里拦掉），所以掩体位置是死的。 */

import { AIR, SAND, SANDSTONE } from './Block';
import { Chunk } from './Chunk';
import { World } from './World';

const FLOOR_Y = 20;

/** 我方出生点（左下角）与敌方出生点（右上角） */
export const CS_SPAWN_ALLY = { x: 2.5, y: FLOOR_Y + 1, z: 2.5 };
export const CS_SPAWN_ENEMY = { x: 13.5, y: FLOOR_Y + 1, z: 13.5 };
/** 我方两名 AI 队友、敌方三个出生点（三个敌人分开站，别叠在一起） */
export const CS_ALLY_SPOTS: { x: number; z: number }[] = [{ x: 4, z: 2 }, { x: 2, z: 4 }];
export const CS_ENEMY_SPOTS: { x: number; z: number }[] = [
  { x: 13, z: 13 }, { x: 12, z: 14 }, { x: 14, z: 12 },
];

/** 掩体：几段 2 格高的沙石矮墙，摆成能绕圈跑的样子 */
const COVERS: { x: number; z: number; w: number; d: number }[] = [
  { x: 5, z: 6, w: 4, d: 1 },
  { x: 10, z: 4, w: 1, d: 4 },
  { x: 7, z: 10, w: 1, d: 4 },
  { x: 11, z: 10, w: 3, d: 1 },
  { x: 3, z: 9, w: 2, d: 1 },
];

export function buildCsArena(world: World): void {
  world.terrainGen = false;
  const chunk = world.ensureChunk(0, 0);
  chunk.data.fill(AIR);
  const S = 16;
  for (let x = 0; x < S; x++) {
    for (let z = 0; z < S; z++) {
      chunk.data[Chunk.index(x, FLOOR_Y, z)] = SAND;
      chunk.data[Chunk.index(x, FLOOR_Y - 1, z)] = SANDSTONE;
      // 四周两格高的沙石围墙：跑不出地图
      if (x === 0 || x === S - 1 || z === 0 || z === S - 1) {
        for (let i = 1; i <= 2; i++) chunk.data[Chunk.index(x, FLOOR_Y + i, z)] = SANDSTONE;
      }
    }
  }
  for (const c of COVERS) {
    for (let dx = 0; dx < c.w; dx++) {
      for (let dz = 0; dz < c.d; dz++) {
        for (let i = 1; i <= 2; i++) chunk.data[Chunk.index(c.x + dx, FLOOR_Y + i, c.z + dz)] = SANDSTONE;
      }
    }
  }
  chunk.dirty = true;
  world.dirtyChunks.add(World.key(0, 0));
}

/** 沙漠图的地面高度（放士兵用） */
export const CS_GROUND_Y = FLOOR_Y + 1;
/** 士兵/玩家不许跑出去的边界（围墙内侧） */
export const CS_EDGE = { min: 1.5, max: 14.5 };
