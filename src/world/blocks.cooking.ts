/** 美食烹饪一族 — 美食工作台（376）+ 食材/料理物品（377~392）
 *
 *  纯数据、无逻辑：食用效果在 config.ts 的 EAT_HP，售价在同文件 SELL_PRICE，
 *  配方在 world/Recipes.ts 末尾，一律 bench:'food'（只能在美食工作台做）。 */

import type { BlockDef } from './blocks.data';

/** 美食工作台：只做美食配方的独立功能台（普通工作台做不了美食，它也做不了道具） */
export const FOOD_TABLE = 376;
/** 面粉：加工食材，不可食用、不可售卖 */
export const FLOUR = 377;
/** 面团：加工食材，不可食用、不可售卖 */
export const DOUGH = 380;

/** 生菌汤：任意两种蘑菇煮一锅 */
export const SOUP_MUSHROOM = 378;
/** 火腿：两块熟肉腌成一块 */
export const HAM = 379;
/** 法式面包棍 */
export const BAGUETTE = 381;
/** 法式三明治 */
export const SANDWICH = 382;
/** 南瓜饼 */
export const PUMPKIN_PIE = 383;
/** 河豚汤：喝完跑得更快 */
export const SOUP_PUFFER = 384;
/** 煎小丑鱼 */
export const FISH_CLOWN_FRIED = 385;
/** 炖鲑鱼 */
export const SALMON_STEW = 386;
/** 炸鳕鱼排 */
export const COD_CUTLET = 387;
/** 肉夹馍 */
export const ROUJIAOMO = 388;
/** 竹筒饭 */
export const BAMBOO_RICE = 389;
/** 胡萝卜肉饺（一次做 3 个） */
export const DUMPLING_CARROT = 390;
/** 胡萝卜蛋糕：吃完缓慢回血 */
export const CARROT_CAKE = 391;
/** 胡萝卜炒蘑菇 */
export const CARROT_MUSHROOM = 392;

/** 加工食材（不可食用、不可售卖） */
export const COOKING_MAT_IDS = [FLOUR, DOUGH];
/** 料理（进手册「美食」页、有售价） */
export const COOKING_FOOD_IDS = [
  SOUP_MUSHROOM, HAM, BAGUETTE, SANDWICH, PUMPKIN_PIE, SOUP_PUFFER,
  FISH_CLOWN_FRIED, SALMON_STEW, COD_CUTLET, ROUJIAOMO, BAMBOO_RICE,
  DUMPLING_CARROT, CARROT_CAKE, CARROT_MUSHROOM,
];

const itemDef = (cn: string, tex: string): BlockDef => ({
  cn, tex: { top: tex, side: tex }, solid: false, seeThrough: true, hardness: 0, item: true,
});

export const COOKING_BLOCKS: Record<number, BlockDef> = {
  [FOOD_TABLE]: { cn: '美食工作台', tex: { top: 'food_table_top', side: 'food_table_side' }, solid: true, seeThrough: false, hardness: 1.2 },
  [FLOUR]:   itemDef('面粉', 'flour'),
  [DOUGH]:   itemDef('面团', 'dough'),
  [SOUP_MUSHROOM]:   itemDef('生菌汤', 'soup_mushroom'),
  [HAM]:             itemDef('火腿', 'ham'),
  [BAGUETTE]:        itemDef('法式面包棍', 'baguette'),
  [SANDWICH]:        itemDef('法式三明治', 'sandwich'),
  [PUMPKIN_PIE]:     itemDef('南瓜饼', 'pumpkin_pie'),
  [SOUP_PUFFER]:     itemDef('河豚汤', 'soup_puffer'),
  [FISH_CLOWN_FRIED]: itemDef('煎小丑鱼', 'fish_clown_fried'),
  [SALMON_STEW]:     itemDef('炖鲑鱼', 'salmon_stew'),
  [COD_CUTLET]:      itemDef('炸鳕鱼排', 'cod_cutlet'),
  [ROUJIAOMO]:       itemDef('肉夹馍', 'roujiamo'),
  [BAMBOO_RICE]:     itemDef('竹筒饭', 'bamboo_rice'),
  [DUMPLING_CARROT]: itemDef('胡萝卜肉饺', 'dumpling_carrot'),
  [CARROT_CAKE]:     itemDef('胡萝卜蛋糕', 'carrot_cake'),
  [CARROT_MUSHROOM]: itemDef('胡萝卜炒蘑菇', 'carrot_mushroom'),
};
