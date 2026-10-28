/** 果树与树苗数据表 — 梨/柿子水果、5 种果树树叶、6 种树 × 3 阶段树苗。
 *
 *  纯数据、无逻辑（种树/生长代码在 Trees.ts）。从 blocks.data.ts 拆出来的子模块：
 *  那边已经超行数上限，新加的果树一族全放这里，再被 BLOCKS 表合并进去。
 *  注意：本文件不许 import blocks.data 的运行时值（会形成循环），ID 一律写字面量。 */

import type { BlockDef } from './data';
import { WILLOW_LEAVES, WILLOW_SAP1, WILLOW_SAP2, WILLOW_SAP3, WILLOW_WOOD } from './willow';

// —— 新水果（259~260）：梨 +3 饥饿、柿子 +2.5 血 ——
export const PEAR = 259;
export const PERSIMMON = 260;

// —— 五种果树树叶（261~265）：各自带颜色 + 果实斑点，一眼就能分清品种 ——
export const APPLE_LEAVES = 261;
export const PEACH_LEAVES = 262;
export const ORANGE_LEAVES = 263;
export const PEAR_LEAVES = 264;
export const PERSIMMON_LEAVES = 265;

// —— 树苗三阶段（266~283）：小苗 → 幼树 → 半成熟树，再往后就长成整棵大树 ——
export const APPLE_SAP1 = 266;
export const APPLE_SAP2 = 267;
export const APPLE_SAP3 = 268;
export const PEACH_SAP1 = 269;
export const PEACH_SAP2 = 270;
export const PEACH_SAP3 = 271;
export const ORANGE_SAP1 = 272;
export const ORANGE_SAP2 = 273;
export const ORANGE_SAP3 = 274;
export const PEAR_SAP1 = 275;
export const PEAR_SAP2 = 276;
export const PEAR_SAP3 = 277;
export const PERSIMMON_SAP1 = 278;
export const PERSIMMON_SAP2 = 279;
export const PERSIMMON_SAP3 = 280;
export const COCONUT_SAP1 = 281;
export const COCONUT_SAP2 = 282;
export const COCONUT_SAP3 = 283;
// —— 香蕉（286~290）：只在香蕉岛长，登录出生永远分配不到香蕉岛 ——
export const BANANA_LEAVES = 286;
export const BANANA = 287;
export const BANANA_SAP1 = 288;
export const BANANA_SAP2 = 289;
export const BANANA_SAP3 = 290;

/** 一个树种的所有静态信息：树叶/果实/三阶段树苗 + 树冠参数 + 种植限制 */
export interface TreeSpecies {
  /** 英文 key，也当贴图前缀用（leaves_apple / sap_apple_1…） */
  key: 'apple' | 'peach' | 'orange' | 'pear' | 'persimmon' | 'coconut' | 'banana' | 'willow';
  /** 树干方块（缺省用 WOOD；柳树用自己的柳树干） */
  wood?: number;
  /** 树苗物品名，比如「苹果树苗」 */
  cn: string;
  /** 树叶方块 ID（4 片合 1 树苗；椰子树用已有的 243 椰子叶） */
  leaf: number;
  /** 果实物品 ID（挖树叶概率掉落） */
  fruit: number;
  /** 树苗三个阶段：小苗 / 幼树 / 半成熟树 */
  stages: [number, number, number];
  /** 树干高度（格） */
  trunk: number;
  /** 树冠层上下界（相对树顶）：-1~1 = 标准一坨 */
  dyMin: number;
  dyMax: number;
  /** 树冠大小：|dx|+|dz|+|dy| 不超过这个数才算树冠 */
  canopyR: number;
  /** 椰子树 = 棕榈造型，不走圆树冠 */
  palm?: boolean;
  /** 只能种在沙子上（椰子树限定沙滩） */
  sandOnly?: boolean;
}

/** 六种可种果树：苹果/桃子/橙子/梨/柿子 + 椰子（椰子只能种沙滩） */
export const TREE_SPECIES: TreeSpecies[] = [
  { key: 'apple',     cn: '苹果树苗',   leaf: APPLE_LEAVES,     fruit: 236 /* APPLE */,    stages: [APPLE_SAP1, APPLE_SAP2, APPLE_SAP3],         trunk: 4, dyMin: -1, dyMax: 1, canopyR: 3 },
  { key: 'peach',     cn: '桃树苗',     leaf: PEACH_LEAVES,     fruit: 237 /* PEACH */,    stages: [PEACH_SAP1, PEACH_SAP2, PEACH_SAP3],         trunk: 4, dyMin: -1, dyMax: 1, canopyR: 4 },
  { key: 'orange',    cn: '橘子树苗',   leaf: ORANGE_LEAVES,    fruit: 238 /* ORANGE */,   stages: [ORANGE_SAP1, ORANGE_SAP2, ORANGE_SAP3],      trunk: 4, dyMin: -1, dyMax: 2, canopyR: 3 },
  { key: 'pear',      cn: '梨树苗',     leaf: PEAR_LEAVES,      fruit: PEAR,               stages: [PEAR_SAP1, PEAR_SAP2, PEAR_SAP3],            trunk: 5, dyMin: -1, dyMax: 1, canopyR: 3 },
  { key: 'persimmon', cn: '柿子树苗',   leaf: PERSIMMON_LEAVES, fruit: PERSIMMON,          stages: [PERSIMMON_SAP1, PERSIMMON_SAP2, PERSIMMON_SAP3], trunk: 4, dyMin: -1, dyMax: 1, canopyR: 3 },
  { key: 'banana',    cn: '香蕉树苗',   leaf: BANANA_LEAVES,    fruit: BANANA,             stages: [BANANA_SAP1, BANANA_SAP2, BANANA_SAP3],      trunk: 3, dyMin: -1, dyMax: 1, canopyR: 4 },
  { key: 'coconut',   cn: '椰子树苗',   leaf: 243 /* PALM_LEAVES */, fruit: 244 /* COCONUT */, stages: [COCONUT_SAP1, COCONUT_SAP2, COCONUT_SAP3], trunk: 6, dyMin: 0, dyMax: 0, canopyR: 0, palm: true, sandOnly: true },
  // 柳树：沙滩专属，树干用自己的柳树干，不结正常果实（fruit = 0 表示"挖树叶不掉果"）
  { key: 'willow',    cn: '柳树苗',     leaf: WILLOW_LEAVES,    fruit: 0,                  stages: [WILLOW_SAP1, WILLOW_SAP2, WILLOW_SAP3],        trunk: 4, dyMin: -1, dyMax: 1, canopyR: 3, sandOnly: true, wood: WILLOW_WOOD },
];

/** 树叶 → 对应的树（地形生成按岛型查它） */
export const SPECIES_BY_LEAF: Record<number, TreeSpecies> = Object.fromEntries(
  TREE_SPECIES.map((s) => [s.leaf, s]),
);

/** 小苗方块 ID → 对应的树（种树苗时查它） */
export const SPECIES_BY_SAPLING: Record<number, TreeSpecies> = Object.fromEntries(
  TREE_SPECIES.map((s) => [s.stages[0], s]),
);

/** 所有能拿在手上种的小苗（阶段一） */
export const SAPLING_IDS = TREE_SPECIES.map((s) => s.stages[0]);

/** 树叶 → 它结的果实（挖树叶掉水果用；椰子叶不算，椰子挂树上直接摘） */
export const FRUIT_OF_LEAF: Record<number, number> = Object.fromEntries(
  // fruit = 0 的树种（柳树）不结正常果实，不进这张表，否则会映射到空气
  TREE_SPECIES.filter((s) => !s.palm && s.fruit > 0).map((s) => [s.leaf, s.fruit]),
);

/** 小苗生长链：小苗 → 幼树，幼树 → 半成熟树；半成熟树不在表里，要建树看 SAPLING_MATURE */
export const SAPLING_NEXT: Record<number, number> = Object.fromEntries(
  TREE_SPECIES.flatMap((s) => [[s.stages[0], s.stages[1]], [s.stages[1], s.stages[2]]] as [number, number][]),
);

/** 半成熟树苗 → 要长成什么树（长树前还要检查周围空位够不够） */
export const SAPLING_MATURE: Record<number, TreeSpecies> = Object.fromEntries(
  TREE_SPECIES.map((s) => [s.stages[2], s]),
);

/** 所有果树树叶（含椰子叶）：访客「水果例外」判定时一起保护 */
export const FRUIT_LEAF_IDS = TREE_SPECIES.map((s) => s.leaf);

const leafDef = (cn: string, tex: string): BlockDef => ({ cn, tex: { top: tex, side: tex }, solid: true, seeThrough: false, hardness: 0.25 });
const sapDef = (cn: string, tex: string, drop?: number): BlockDef => ({ cn, tex: { top: tex, side: tex }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true, drop });
const itemDef = (cn: string, tex: string): BlockDef => ({ cn, tex: { top: tex, side: tex }, solid: false, seeThrough: true, hardness: 0, item: true });

/** 果树一族的方块属性：合并进 blocks.data.ts 的 BLOCKS 表 */
export const TREE_BLOCKS: Record<number, BlockDef> = {
  // —— 新水果 ——
  [PEAR]:      itemDef('梨', 'pear'),
  [PERSIMMON]: itemDef('柿子', 'persimmon'),
  [BANANA]:    itemDef('香蕉', 'banana'),
  // —— 六种果树树叶：颜色 + 果实斑点都不一样，远看就能认品种 ——
  [APPLE_LEAVES]:     leafDef('苹果树叶', 'leaves_apple'),
  [PEACH_LEAVES]:     leafDef('桃树叶',   'leaves_peach'),
  [ORANGE_LEAVES]:    leafDef('橘子树叶', 'leaves_orange'),
  [PEAR_LEAVES]:      leafDef('梨树叶',   'leaves_pear'),
  [PERSIMMON_LEAVES]: leafDef('柿子树叶', 'leaves_persimmon'),
  [BANANA_LEAVES]:    leafDef('香蕉树叶', 'leaves_banana'),
  // —— 树苗三阶段：交叉薄片小花苗，打掉都退回一棵小苗（柳树的三阶段在 blocks.willow.ts 里，这里跳过） ——
  ...Object.fromEntries(TREE_SPECIES.filter((s) => s.key !== 'willow').flatMap((s) => {
    const [s1, s2, s3] = s.stages;
    const base = s.cn.replace('树苗', '');
    return [
      [s1, sapDef(s.cn, `sap_${s.key}_1`)],
      [s2, sapDef(`${base}幼树`, `sap_${s.key}_2`, s1)],
      [s3, sapDef(`${base}半成熟树`, `sap_${s.key}_3`, s1)],
    ] as [number, BlockDef][];
  })),
};
