/** 树冠季节产物 — 夏天挖树冠掉樱花花瓣、秋天掉枫叶（春天/冬天仍掉树叶本体）
 *
 *  纯物品，不进世界。DIY 配方（樱花药包 / 枫叶腰包 / 枫叶飞刀）在下一批接。 */

import type { BlockDef } from './blocks.data';

export const PETAL_SAKURA = 338; // 樱花花瓣：夏季树冠采下来的（337 是白萝卜，别占用）
export const MAPLE_LEAF = 339;   // 枫叶：秋季树冠采下来的

const itemDef = (cn: string, tex: string): BlockDef => ({
  cn, tex: { top: tex, side: tex }, solid: false, seeThrough: true, hardness: 0, item: true,
});

export const LEAF_DROP_BLOCKS: Record<number, BlockDef> = {
  [PETAL_SAKURA]: itemDef('樱花花瓣', 'petal_sakura'),
  [MAPLE_LEAF]:   itemDef('枫叶', 'maple_leaf'),
};
