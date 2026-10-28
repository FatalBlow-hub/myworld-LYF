/**
 * 新食物与饮品（ID 309~314）— 2026-10-23 用户设定的一批自制吃食
 *
 * 单独成表是因为 blocks.data.ts 已过 500 行红线；这里只管数据，食用效果在
 * `config.ts` 的 EAT_HP 里，配方在 `world/Recipes.ts` 末尾（手册下标不能插队）。
 */

import type { BlockDef } from './data';

/** 红花蜜茶：小红花 + 玻璃瓶，回 1 饥饿并缓慢回 2 血 */
export const TEA_RED = 309;
/** 蒲公英凉茶：蒲公英 ×3 + 玻璃瓶，回 1 饥饿并解毒 */
export const TEA_DANDELION = 310;
/** 草饼：杂草 + 稻粒，新手口粮，回 2 饥饿 */
export const GRASS_CAKE = 311;
/** 颠倒香蕉液：香蕉 ×2 + 玻璃瓶，方向反过来 8 秒 */
export const BANANA_FLIP = 312;
/** 水果拼盘：五种水果各一，回 5 饥饿 + 6 秒跑得快/挖得快/缓慢回血 */
export const FRUIT_PLATTER = 313;
/** 蘑菇拼盘：四种好蘑菇各一（红伞伞不许放），回 4 饥饿 + 6 秒柔光照明 */
export const MUSHROOM_PLATTER = 314;

export const FOOD_IDS = [TEA_RED, TEA_DANDELION, GRASS_CAKE, BANANA_FLIP, FRUIT_PLATTER, MUSHROOM_PLATTER];

/** 三种饮品（会进饮料售卖机、吃法同果汁：喝完不退瓶） */
export const DRINK_FOOD_IDS = [TEA_RED, TEA_DANDELION, BANANA_FLIP];

export const FOOD_BLOCKS: Record<number, BlockDef> = {
  [TEA_RED]:          { cn: '红花蜜茶',   tex: { top: 'tea_red', side: 'tea_red' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [TEA_DANDELION]:    { cn: '蒲公英凉茶', tex: { top: 'tea_dandelion', side: 'tea_dandelion' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [GRASS_CAKE]:       { cn: '草饼',       tex: { top: 'grass_cake', side: 'grass_cake' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [BANANA_FLIP]:      { cn: '颠倒香蕉液', tex: { top: 'banana_flip', side: 'banana_flip' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [FRUIT_PLATTER]:    { cn: '水果拼盘',   tex: { top: 'fruit_platter', side: 'fruit_platter' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [MUSHROOM_PLATTER]: { cn: '蘑菇拼盘',   tex: { top: 'mushroom_platter', side: 'mushroom_platter' }, solid: false, seeThrough: true, hardness: 0, item: true },
};
