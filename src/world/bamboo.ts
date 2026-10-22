/**
 * 竹子规则 — 扎根条件（地形生成 / 玩家种植 / 地面被挖走后塌方三处共用）
 *
 * 竹竿不能悬空：最底下一节必须踩在泥土、草方块（冬季岛的雪块）上，
 * 上面的节接着下面那节竹子。规则写在一处，避免三份判断各写一遍还写不一致。
 */

import { BAMBOO, DIRT, GRASS, SNOW } from './Block';

/** 竹根能扎进去的地面 */
const ROOT_SOIL: readonly number[] = [GRASS, DIRT, SNOW];

/** 这个方块能当竹根的地面吗 */
export function canRootIn(ground: number): boolean {
  return ROOT_SOIL.includes(ground);
}

/** 读方块用的最小世界接口（这里只要 getBlock，免得 world 和 block 层互相 import） */
export interface BlockReader {
  getBlock(x: number, y: number, z: number): number;
}

/** (x,y,z) 这格竹子站不站得住：脚下是土地，或者接着下面那节竹子 */
export function bambooStandable(world: BlockReader, x: number, y: number, z: number): boolean {
  const below = world.getBlock(x, y - 1, z);
  return canRootIn(below) || below === BAMBOO;
}

/** (x,y,z) 头上还接着几节竹子：挖断这节时上面会跟着倒，这些要照数还给玩家 */
export function bambooAbove(world: BlockReader, x: number, y: number, z: number): number {
  let n = 0;
  while (n < 64 && world.getBlock(x, y + 1 + n, z) === BAMBOO) n++;
  return n;
}
