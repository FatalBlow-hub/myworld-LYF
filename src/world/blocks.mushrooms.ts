/** 蘑菇一族 — 四种蘑菇 + 蘑菇孢子（只秋季长、入冬全消，规则与概率见 world/mushrooms.ts）
 *
 *  蘑菇是交叉薄片方块：能放地上、能挖、也能直接吃（食用效果在 config 的 EAT_HP）。
 *  孢子是物品：对着草方块按 L 种下去，长出随机一种蘑菇。
 */

import type { BlockDef } from './blocks.data';

export const MUSHROOM_SPORE = 291;    // 蘑菇孢子：拆解蘑菇得到，种下去长蘑菇
export const MUSHROOM_SHIITAKE = 292; // 香菇：+1 饥饿，售价 1
export const MUSHROOM_ENOKI = 293;    // 金针菇：+1 颗心（2 血），售价 1
export const MUSHROOM_OYSTER = 294;   // 平菇：+0.5 颗心 + 3 秒 ×1.25 移速，售价 1
export const MUSHROOM_RED = 295;      // 红伞伞：+1 饥饿但会中毒（10 秒共扣 4 血），售价 2

/** 交叉薄片蘑菇：贴图透明底，挖掉掉自己 */
const mushroomDef = (cn: string, tex: string): BlockDef => ({
  cn, tex: { top: tex, side: tex }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true,
});

export const MUSHROOM_BLOCKS: Record<number, BlockDef> = {
  [MUSHROOM_SPORE]: {
    cn: '蘑菇孢子', tex: { top: 'mushroom_spore', side: 'mushroom_spore' }, solid: false, seeThrough: true, hardness: 0, item: true,
  },
  [MUSHROOM_SHIITAKE]: mushroomDef('香菇', 'mush_shiitake'),
  [MUSHROOM_ENOKI]: mushroomDef('金针菇', 'mush_enoki'),
  [MUSHROOM_OYSTER]: mushroomDef('平菇', 'mush_oyster'),
  [MUSHROOM_RED]: mushroomDef('红伞伞', 'mush_red'),
};
