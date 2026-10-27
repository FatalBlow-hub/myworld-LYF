/** 季节换叶 — 树冠按四季换外观：春翠绿、夏粉樱花、秋橙黄、冬绿底积雪
 *  只改 BLOCKS 表里的贴图 key（网格重建时会按新 key 取图集格子），不改方块 ID，老存档不受影响。
 *
 *  用法:
 *   if (applySeasonLeaves(seasonOf(day.date))) { world.markAllDirty(); chunkMeshes.rebuildDirty(world); }
 */

import { BLOCKS, LEAVES } from './Block';
import {
  APPLE_LEAVES, BANANA_LEAVES, ORANGE_LEAVES, PEACH_LEAVES, PEAR_LEAVES, PERSIMMON_LEAVES,
} from './blocks.trees';
import { WILLOW_LEAVES } from './blocks.willow';

/** 季节名（与 core/Calendar 的 Season 一致；这里用字面量避免 world 反向依赖 core） */
type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';

/** 一张树冠在四季各用哪张贴图（夏季统一粉色樱花树冠，是设定原意） */
interface LeafSkin {
  id: number;
  spring: string;
  summer: string;
  autumn: string;
  winter: string;
}

const LEAF_SKINS: LeafSkin[] = [
  { id: LEAVES,            spring: 'leaves',                 summer: 'leaves_sakura', autumn: 'leaves_plain_autumn',   winter: 'leaves_plain_winter' },
  { id: APPLE_LEAVES,      spring: 'leaves_apple',           summer: 'leaves_sakura', autumn: 'leaves_apple_autumn',   winter: 'leaves_apple_winter' },
  { id: PEACH_LEAVES,      spring: 'leaves_peach',           summer: 'leaves_sakura', autumn: 'leaves_peach_autumn',   winter: 'leaves_peach_winter' },
  { id: ORANGE_LEAVES,     spring: 'leaves_orange',          summer: 'leaves_sakura', autumn: 'leaves_orange_autumn',  winter: 'leaves_orange_winter' },
  { id: PEAR_LEAVES,       spring: 'leaves_pear',            summer: 'leaves_sakura', autumn: 'leaves_pear_autumn',    winter: 'leaves_pear_winter' },
  { id: PERSIMMON_LEAVES,  spring: 'leaves_persimmon',       summer: 'leaves_sakura', autumn: 'leaves_persimmon_autumn', winter: 'leaves_persimmon_winter' },
  { id: BANANA_LEAVES,     spring: 'leaves_banana',          summer: 'leaves_sakura', autumn: 'leaves_banana_autumn',  winter: 'leaves_banana_winter' },
  { id: WILLOW_LEAVES,     spring: 'leaves_willow',          summer: 'leaves_sakura', autumn: 'leaves_willow_autumn',  winter: 'leaves_willow_winter' },
];

/** 上次应用过的季节：同一个季节重复调用直接返回 false，省掉无谓的全图重建 */
let applied: SeasonName | null = null;

/** 按季节换树冠贴图。返回 true = 贴图真的换了，调用方要重建区块网格 */
export function applySeasonLeaves(season: SeasonName): boolean {
  if (applied === season) return false;
  applied = season;
  for (const skin of LEAF_SKINS) {
    const def = BLOCKS[skin.id];
    if (!def) continue;
    const tex = skin[season];
    def.tex.top = tex;
    def.tex.side = tex;
  }
  return true;
}
