/** 染色木板一族 — 深色/浅色/灵魂蓝三种木板（可放置的实心方块，跟普通木板一样能盖房子）

 *  配方都是「木板×1 + 颜料×1」：黑颜料→深色木板、白颜料→浅色木板、灵魂蓝颜料→灵魂蓝木板。
 *  灵魂蓝木板和灵魂蓝木台阶用同一张 soul_planks 贴图，是同一种材料。 */

import type { BlockDef } from './blocks.data';

export const PLANKS_DARK = 326;  // 深色木板：木板 + 黑颜料
export const PLANKS_LIGHT = 327; // 浅色木板：木板 + 白颜料
export const SOUL_PLANKS = 328;  // 灵魂蓝木板：木板 + 灵魂蓝颜料
export const SOUL_PORTAL = 329;  // 灵魂传送门：门框内腔被灵魂打火石点燃后填上的方块，只能由代码放置

export const DYED_PLANK_IDS = [PLANKS_DARK, PLANKS_LIGHT, SOUL_PLANKS];

const plankDef = (cn: string, tex: string): BlockDef => ({
  cn, tex: { top: tex, side: tex }, solid: true, seeThrough: false, hardness: 1,
});

export const PLANK_BLOCKS: Record<number, BlockDef> = {
  [PLANKS_DARK]:  plankDef('深色木板',   'planks_dark'),
  [PLANKS_LIGHT]: plankDef('浅色木板',   'planks_light'),
  [SOUL_PLANKS]:  plankDef('灵魂蓝木板', 'soul_planks'),
  // 传送门方块：能穿过去（不挡路）、瞄不准（targetable 缺省=false 挖不到也点不到）、不在 ALL_ITEMS 里所以创造面板也没有
  [SOUL_PORTAL]:  { cn: '灵魂传送门', tex: { top: 'soul_portal', side: 'soul_portal' }, solid: false, seeThrough: true, alphaBlend: true, hardness: 0 },
};
