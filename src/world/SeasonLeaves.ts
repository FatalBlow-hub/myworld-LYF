/** 季节换叶 — 秋天把五种果树树叶换成秋叶贴图，其他季节换回本色
 *  只改 BLOCKS 表里的贴图 key（网格重建时会按新 key 取图集格子），不改方块 ID，老存档不受影响。
 *
 *  用法:
 *   if (applySeasonLeaves(seasonOf(day.date))) { world.markAllDirty(); chunkMeshes.rebuildDirty(world); }
 */

import { BLOCKS } from './Block';
import { APPLE_LEAVES, BANANA_LEAVES, ORANGE_LEAVES, PEACH_LEAVES, PEAR_LEAVES, PERSIMMON_LEAVES } from './blocks.trees';

/** 季节名（与 core/Calendar 的 Season 一致；这里用字面量避免 world 反向依赖 core） */
type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';

/** 每种果树树叶：本色贴图 ↔ 秋叶贴图 */
const LEAF_SKINS: { id: number; normal: string; autumn: string }[] = [
  { id: APPLE_LEAVES, normal: 'leaves_apple', autumn: 'leaves_apple_autumn' },
  { id: PEACH_LEAVES, normal: 'leaves_peach', autumn: 'leaves_peach_autumn' },
  { id: ORANGE_LEAVES, normal: 'leaves_orange', autumn: 'leaves_orange_autumn' },
  { id: PEAR_LEAVES, normal: 'leaves_pear', autumn: 'leaves_pear_autumn' },
  { id: PERSIMMON_LEAVES, normal: 'leaves_persimmon', autumn: 'leaves_persimmon_autumn' },
  { id: BANANA_LEAVES, normal: 'leaves_banana', autumn: 'leaves_banana_autumn' },
];

/** 上次应用过的季节：同一个季节重复调用直接返回 false，省掉无谓的全图重建 */
let applied: SeasonName | null = null;

/** 按季节换树叶贴图。返回 true = 贴图真的换了，调用方要重建区块网格 */
export function applySeasonLeaves(season: SeasonName): boolean {
  if (applied === season) return false;
  applied = season;
  const autumn = season === 'autumn';
  for (const skin of LEAF_SKINS) {
    const def = BLOCKS[skin.id];
    if (!def) continue;
    const tex = autumn ? skin.autumn : skin.normal;
    def.tex.top = tex;
    def.tex.side = tex;
  }
  return true;
}
