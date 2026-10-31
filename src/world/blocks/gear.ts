/** 猎装与丝线一族 — 猫身上掉丝线，丝线 DIY 出绷带/牵引绳索/减速网/三根鱼竿；腐败人掉狼星碎片合狼之利爪
 *
 *  纯数据、无逻辑：被 blocks.data.ts 合并进 BLOCKS 表。
 *  注意：本文件不许 import blocks.data 的运行时值（会形成循环），只允许 import type。 */

import type { BlockDef } from './data';

// —— 丝线与 DIY（394~397）——
export const SILK = 394;      // 丝线：猫身上摸下来的，能卖 3 岛币
export const BANDAGE = 395;   // 速修绷带：按 E 使用，瞬间回 2 血
export const LEAD_ROPE = 396; // 牵引绳索：普通绳索 + 丝线加固，怪物也能拴（掉落物依旧不行）
export const SLOW_NET = 397;  // 减速网：铺在 3×3 平整空地上，怪踩进范围慢一半

// —— 三根钓鱼竿（398~400）：收杆窗口/耐久见 config/food.ts 的 FISHING ——
export const FISH_ROD = 398;      // 普通钓鱼竿
export const GOLD_FISH_ROD = 399; // 金色钓鱼竿（金色 DIY 手册产物）
export const IRON_FISH_ROD = 400; // 铸铁钓鱼竿

// —— 狼星碎片与狼之利爪（401~402）——
export const WOLF_STAR_SHARD = 401; // 灰白色的星星碎片：腐败人身上掉
export const WOLF_CLAW = 402;       // 狼之利爪：戴在香囊那格的配饰，攻击 ×2

const itemDef = (cn: string, tex: string): BlockDef => ({
  cn, tex: { top: tex, side: tex }, solid: false, seeThrough: true, hardness: 0, item: true,
});

export const GEAR_BLOCKS: Record<number, BlockDef> = {
  [SILK]:          itemDef('丝线', 'silk'),
  [BANDAGE]:       itemDef('速修绷带', 'bandage'),
  [LEAD_ROPE]:     itemDef('牵引绳索', 'lead_rope'),
  // 减速网：放下后是平贴地面的网（carpet 形状），要 3×3 平整空地才铺得下
  [SLOW_NET]:      { cn: '减速网', tex: { top: 'slow_net', side: 'slow_net' }, solid: false, seeThrough: true, hardness: 0.4, shape: 'carpet', targetable: true },
  [FISH_ROD]:      itemDef('钓鱼竿', 'rod_fish'),
  [GOLD_FISH_ROD]: itemDef('金色钓鱼竿', 'rod_gold'),
  [IRON_FISH_ROD]: itemDef('铸铁钓鱼竿', 'rod_iron'),
  [WOLF_STAR_SHARD]: itemDef('狼星碎片', 'wolf_star_shard'),
  [WOLF_CLAW]:     itemDef('狼之利爪', 'wolf_claw'),
};
