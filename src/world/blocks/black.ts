/**
 * 黑色售卖机一族（ID 315~319）— 2026-10-24 用户设定的新卖法
 *
 * 单独成表是因为 blocks.data.ts 已过 500 行红线（与 blocks.food.ts 同一策略）。
 * 这里只管数据：机器方块、黑色木镐、三形态小战士弓；每日随机刷新的货架逻辑在
 * `world/blackMarket.ts`，弓箭手召唤物 AI 在 `entities/Archer.ts`。
 */

import type { BlockDef } from './data';

/** 黑色售卖机：大厅北墙第五台机器，每天只随机卖一种货（游戏内一天刷新） */
export const VENDING_BLACK = 315;
/** 黑色木镐：能挖 30 个方块，挖满就坏；挖速是徒手的 1.75 倍 */
export const BLACK_PICKAXE = 316;
/** 小战士弓（普通形态）：用掉后召唤一名弓箭手小战士，永久跟随守在岛上 */
export const WARRIOR_BOW = 317;
/** 火弓：普通弓全部属性，攻击 ×1.5（无附加燃烧） */
export const WARRIOR_BOW_FIRE = 318;
/** 冰弓：普通弓全部属性，命中先冻结 0.5 秒再减速 0.5 秒 */
export const WARRIOR_BOW_ICE = 319;

/** 三张弓（黑色售卖机抽到弓时再等概率抽形态） */
export const WARRIOR_BOW_IDS = [WARRIOR_BOW, WARRIOR_BOW_FIRE, WARRIOR_BOW_ICE];

export const BLACK_BLOCKS: Record<number, BlockDef> = {
  [VENDING_BLACK]: { cn: '黑色售卖机', tex: { top: 'vend_black_top', side: 'vend_black_side', front: 'vend_black_front' }, solid: true, seeThrough: false, hardness: Infinity },
  [BLACK_PICKAXE]:  { cn: '黑色木镐', tex: { top: 'pick_black', side: 'pick_black' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [WARRIOR_BOW]:      { cn: '小战士弓', tex: { top: 'bow_warrior', side: 'bow_warrior' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [WARRIOR_BOW_FIRE]: { cn: '小战士火弓', tex: { top: 'bow_fire', side: 'bow_fire' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [WARRIOR_BOW_ICE]:  { cn: '小战士冰弓', tex: { top: 'bow_ice', side: 'bow_ice' }, solid: false, seeThrough: true, hardness: 0, item: true },
};
