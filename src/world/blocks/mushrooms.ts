/** 蘑菇一族 — 五种蘑菇 + 五种孢子 + 五种"生长中的孢子"
 *  （用户 2026-10-22 下发的蘑菇全套设定：孢子分种类、种下 10 秒长成、新增夜光蓝菇）
 *
 *  蘑菇 = cross 薄片方块，能放地上、能挖（掉自己）、也能直接吃（效果在 config 的 EAT_HP）。
 *  孢子 = 物品：能拆解得到、能卖、拿着按 L 种到草地/泥土上。
 *  生长中的孢子 = 种下后的 cross 方块，10 秒后长成对应蘑菇（计时在 World.sporeTimers）。
 */

import type { BlockDef } from './data';

// —— 五种蘑菇（291 是早期的"蘑菇孢子"，现在改名香菇孢子）——
export const MUSHROOM_SPORE = 291;        // 香菇孢子（旧档里的通用孢子名，顺延成香菇孢子）
export const MUSHROOM_SHIITAKE = 292;     // 香菇：+1 饥饿
export const MUSHROOM_ENOKI = 293;        // 金针菇：+1 饥饿（旧版是回血，按新设定改）
export const MUSHROOM_OYSTER = 294;       // 平菇：半颗心 + 3 秒 ×1.25 移速
export const MUSHROOM_RED = 295;          // 红伞伞：+1 饥饿但会中毒
export const GLOW_SHROOM = 298;           // 夜光蓝菇：+1 饥饿 + 5 秒夜视，方块自带微光

// —— 拆解得到的各种孢子（夜光蓝菇 299，其余 300~303）——
export const GLOW_SPORE = 299;            // 夜光蓝菇孢子
export const SPORE_SHIITAKE = 300;        // 香菇孢子
export const SPORE_OYSTER = 301;          // 平菇孢子
export const SPORE_ENOKI = 302;           // 金针菇孢子
export const SPORE_RED = 303;             // 红伞伞孢子

// —— 种下去"还在长"的孢子（304~308）：cross 薄片，挖掉掉回孢子，10 秒后长成蘑菇 ——
export const SPORE_PLANT_SHIITAKE = 304;
export const SPORE_PLANT_OYSTER = 305;
export const SPORE_PLANT_ENOKI = 306;
export const SPORE_PLANT_RED = 307;
export const SPORE_PLANT_GLOW = 308;

/** cross 薄片蘑菇：贴图透明底，挖掉掉自己 */
const mushroomDef = (cn: string, tex: string, glow = false): BlockDef => ({
  cn, tex: { top: tex, side: tex }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true, glow,
});

/** 孢子物品：拿在手上能种（见 PlayerActions），也能拆解/出售 */
const sporeDef = (cn: string, tex: string): BlockDef => ({
  cn, tex: { top: tex, side: tex }, solid: false, seeThrough: true, hardness: 0, item: true,
});

/** 生长中的孢子：cross 薄片，打掉退回孢子（drop = 孢子），10 秒后长成蘑菇 */
const sporePlantDef = (cn: string, tex: string, drop: number, glow = false): BlockDef => ({
  cn, tex: { top: tex, side: tex }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true, drop, glow,
});

export const MUSHROOM_BLOCKS: Record<number, BlockDef> = {
  // —— 五种蘑菇 ——
  [MUSHROOM_SHIITAKE]: mushroomDef('香菇', 'mush_shiitake'),
  [MUSHROOM_ENOKI]: mushroomDef('金针菇', 'mush_enoki'),
  [MUSHROOM_OYSTER]: mushroomDef('平菇', 'mush_oyster'),
  [MUSHROOM_RED]: mushroomDef('红伞伞', 'mush_red'),
  [GLOW_SHROOM]: mushroomDef('夜光蓝菇', 'mush_glow', true), // 夜里会微微发亮
  // —— 五种孢子（拆解得到，种下去 10 秒长出蘑菇）——
  [MUSHROOM_SPORE]: sporeDef('香菇孢子', 'spore_shiitake'),
  [GLOW_SPORE]: sporeDef('夜光蓝菇孢子', 'spore_glow'),
  [SPORE_SHIITAKE]: sporeDef('香菇孢子', 'spore_shiitake'),
  [SPORE_OYSTER]: sporeDef('平菇孢子', 'spore_oyster'),
  [SPORE_ENOKI]: sporeDef('金针菇孢子', 'spore_enoki'),
  [SPORE_RED]: sporeDef('红伞伞孢子', 'spore_red'),
  // —— 生长中的孢子（各品种共用孢子贴图，靠贴图色区分）——
  [SPORE_PLANT_SHIITAKE]: sporePlantDef('生长中的香菇孢子', 'spore_shiitake', SPORE_SHIITAKE),
  [SPORE_PLANT_OYSTER]: sporePlantDef('生长中的平菇孢子', 'spore_oyster', SPORE_OYSTER),
  [SPORE_PLANT_ENOKI]: sporePlantDef('生长中的金针菇孢子', 'spore_enoki', SPORE_ENOKI),
  [SPORE_PLANT_RED]: sporePlantDef('生长中的红伞伞孢子', 'spore_red', SPORE_RED),
  [SPORE_PLANT_GLOW]: sporePlantDef('生长中的夜光蓝菇孢子', 'spore_glow', GLOW_SPORE, true),
};
