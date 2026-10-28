/** 季节换叶 — 树冠按四季换外观：普通树春绿/夏樱花/秋黄/冬细沙；果树只有秋冬变黄
 *  只改 BLOCKS 表里的贴图 key（网格重建时会按新 key 取图集格子），不改方块 ID，老存档不受影响。
 *
 *  用法:
 *   if (applySeasonLeaves(seasonOf(day.date))) { world.markAllDirty(); chunkMeshes.rebuildDirty(world); }
 */

import { BLOCKS, LEAVES } from '../blocks/Block';
import {
  APPLE_LEAVES, BANANA_LEAVES, ORANGE_LEAVES, PEACH_LEAVES, PEAR_LEAVES, PERSIMMON_LEAVES,
} from '../blocks/trees';
import { WILLOW_LEAVES } from '../blocks/willow';

/** 季节名（与 core/Calendar 的 Season 一致；这里用字面量避免 world 反向依赖 core） */
type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';

/** 一张树冠在四季各用哪张贴图 */
interface LeafSkin {
  id: number;
  spring: string;
  summer: string;
  autumn: string;
  winter: string;
}

const LEAF_SKINS: LeafSkin[] = [
  // 普通树：夏天樱花叶、秋天黄叶、冬天树叶带细沙质感（2026-10-28 设定）
  { id: LEAVES,            spring: 'leaves',                 summer: 'leaves_sakura', autumn: 'leaves_plain_autumn',   winter: 'leaves_plain_sand' },
  // 六种果树：只有秋季、冬季树叶才变黄（共用一张黄叶），春夏保持本色
  { id: APPLE_LEAVES,      spring: 'leaves_apple',           summer: 'leaves_apple',           autumn: 'leaves_fruit_yellow',   winter: 'leaves_fruit_yellow' },
  { id: PEACH_LEAVES,      spring: 'leaves_peach',           summer: 'leaves_peach',           autumn: 'leaves_fruit_yellow',   winter: 'leaves_fruit_yellow' },
  { id: ORANGE_LEAVES,     spring: 'leaves_orange',          summer: 'leaves_orange',          autumn: 'leaves_fruit_yellow',   winter: 'leaves_fruit_yellow' },
  { id: PEAR_LEAVES,       spring: 'leaves_pear',            summer: 'leaves_pear',            autumn: 'leaves_fruit_yellow',   winter: 'leaves_fruit_yellow' },
  { id: PERSIMMON_LEAVES,  spring: 'leaves_persimmon',       summer: 'leaves_persimmon',       autumn: 'leaves_fruit_yellow',   winter: 'leaves_fruit_yellow' },
  { id: BANANA_LEAVES,     spring: 'leaves_banana',          summer: 'leaves_banana',          autumn: 'leaves_fruit_yellow',   winter: 'leaves_fruit_yellow' },
  // 柳树：四季四态照旧（樱花夏、橙黄秋、积雪冬）
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
