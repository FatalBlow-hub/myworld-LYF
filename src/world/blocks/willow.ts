/** 柳树一族 — 沙滩专属柳树（树干 / 柳叶 / 三阶段树苗）+ 柳絮孢子 / 柳条 / 柳絮腰包
 *
 *  纯数据、无逻辑：被 blocks.data.ts 合并进 BLOCKS 表，被 blocks.trees.ts 当成 willow 树种取用。
 *  注意：本文件不许 import blocks.data 的运行时值（会形成循环），只允许 import type。 */

import type { BlockDef } from './data';

// —— 柳树本体（340~344）：树干、垂挂柳叶、三阶段树苗 ——
export const WILLOW_WOOD = 340;
export const WILLOW_LEAVES = 341;
export const WILLOW_SAP1 = 342;
export const WILLOW_SAP2 = 343;
export const WILLOW_SAP3 = 344;

// —— 柳絮产物（345~347）：春天飘的孢子、树上的柳条、柳絮腰包 ——
export const WILLOW_FLUFF = 345;
export const WILLOW_BRANCH = 346;
export const WILLOW_BAG = 347;

const itemDef = (cn: string, tex: string): BlockDef => ({
  cn, tex: { top: tex, side: tex }, solid: false, seeThrough: true, hardness: 0, item: true,
});

export const WILLOW_BLOCKS: Record<number, BlockDef> = {
  [WILLOW_WOOD]:   { cn: '柳树干', tex: { top: 'willow_log_top', side: 'willow_log' }, solid: true, seeThrough: false, hardness: 1.2 },
  [WILLOW_LEAVES]: { cn: '柳树叶', tex: { top: 'leaves_willow', side: 'leaves_willow' }, solid: true, seeThrough: false, hardness: 0.25 },
  [WILLOW_SAP1]:   { cn: '柳树苗', tex: { top: 'sap_willow_1', side: 'sap_willow_1' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true },
  [WILLOW_SAP2]:   { cn: '柳树幼树', tex: { top: 'sap_willow_2', side: 'sap_willow_2' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true, drop: WILLOW_SAP1 },
  [WILLOW_SAP3]:   { cn: '柳树半成熟树', tex: { top: 'sap_willow_3', side: 'sap_willow_3' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true, drop: WILLOW_SAP1 },
  [WILLOW_FLUFF]:  itemDef('柳絮孢子', 'willow_fluff'),
  [WILLOW_BRANCH]: itemDef('柳条', 'willow_branch'),
  [WILLOW_BAG]:    itemDef('柳絮腰包', 'bag_willow'),
};
