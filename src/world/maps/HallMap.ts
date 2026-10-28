/** 大厅地图 — 生成固定 16×16 木板平台、四周栅栏边界与中央双层木桌 */

import { HALL } from '../../config';
import { AIR, FENCE, PLANKS } from '../blocks/Block';
import { Chunk } from '../Chunk';
import { World } from '../World';

/** 生成大厅世界：1 个区块（0,0）内铺设 16×16 木板平台、四周一圈栅栏、中央 3 格双层木桌 */
export function buildHall(world: World): void {
  world.terrainGen = false;
  const chunk = world.ensureChunk(0, 0);
  chunk.data.fill(AIR);

  const size = HALL.SIZE;
  const floorY = HALL.FLOOR_Y;

  // 16×16 木板平台 + 四周一圈木栅栏边界
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      chunk.data[Chunk.index(x, floorY, z)] = PLANKS;
      if (x === 0 || x === size - 1 || z === 0 || z === size - 1) {
        chunk.data[Chunk.index(x, floorY + 1, z)] = FENCE;
      }
    }
  }

  // 中间放桌子：底层 3 格（左右各一格木板、中间空），第二层填满 3 格木板
  const [tx0, tx1, tx2] = HALL.TABLE_X;
  const tz = HALL.TABLE_Z;
  chunk.data[Chunk.index(tx0, floorY + 1, tz)] = PLANKS;
  chunk.data[Chunk.index(tx1, floorY + 1, tz)] = AIR;
  chunk.data[Chunk.index(tx2, floorY + 1, tz)] = PLANKS;
  chunk.data[Chunk.index(tx0, floorY + 2, tz)] = PLANKS;
  chunk.data[Chunk.index(tx1, floorY + 2, tz)] = PLANKS;
  chunk.data[Chunk.index(tx2, floorY + 2, tz)] = PLANKS;

  // 沿北墙一排机器（售卖机/收购箱/杂货铺/黑市/红焰大赛箱），对着按 M 使用；
  // 标了 tall 的机器占两格高（红焰大赛箱就是这种）
  for (const m of HALL.MACHINES) {
    chunk.data[Chunk.index(m.x, floorY + 1, m.z)] = m.id;
    if (m.tall) chunk.data[Chunk.index(m.x, floorY + 2, m.z)] = m.id;
  }

  chunk.dirty = true;
  world.dirtyChunks.add(World.key(0, 0));
}
