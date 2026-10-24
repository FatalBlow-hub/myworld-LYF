/** 手册卡片分类 — 每条 DIY 方法归到哪个 Tab、要不要贴季节小标记
 *
 *  分类规则：
 *  - 装备：武器/工具/穿戴/载具（剑、镐子、轮滑鞋、腰包、弓、坦克、打火石、玻璃锥）
 *  - 建筑方块：能摆到世界里的方块（自动判定：不是纯物品的方块都算）
 *  - 食物：能吃能喝的（果汁、茶、拼盘、酒、熟食、柿子饼）
 *  - 小物件：剩下能用的小东西（瓶子、桶、颜料、种子、碎片……）
 *  - 其他：不是配方的小知识（掉落、地形、用法说明）
 *
 *  季节标记：材料里有雪花 → 雪花标记（冬天）；有蘑菇/南瓜/柿子 → 南瓜标记（秋天） */

import {
  BLACK_PICKAXE, BLOCKS, COOKED_MEAT, FIRESTARTER_IDS, FOOD_IDS, GLASS_CONE, GLOW_SHROOM, GOLD_PICKAXE,
  JUICE_APPLE, JUICE_CARROT, JUICE_COCONUT, JUICE_MELON, JUICE_ORANGE, JUICE_PEACH, JUICE_PEAR,
  MUSHROOM_ENOKI, MUSHROOM_OYSTER, MUSHROOM_RED, MUSHROOM_SHIITAKE,
  PERSIMMON, PERSIMMON_CAKE, PUMPKIN, PUMPKIN_SLICE, ROLLER_SKATES, SNOWFLAKE,
  SPORE_ENOKI, SPORE_OYSTER, SPORE_RED, SPORE_SHIITAKE, GLOW_SPORE,
  SWORD_IDS, TANK, WAISTBAG_IDS, WARRIOR_BOW, WARRIOR_BOW_FIRE, WARRIOR_BOW_ICE, WINE,
} from './blocks.data';

export type TutorialCat = 'equip' | 'build' | 'small' | 'food' | 'misc';
export type FestTag = 'snow' | 'pumpkin';

const EQUIP = new Set<number>([
  ...SWORD_IDS, ROLLER_SKATES, ...WAISTBAG_IDS, BLACK_PICKAXE, GOLD_PICKAXE,
  WARRIOR_BOW, WARRIOR_BOW_FIRE, WARRIOR_BOW_ICE, GLASS_CONE, TANK, ...FIRESTARTER_IDS,
]);

const FOOD = new Set<number>([
  ...FOOD_IDS,
  JUICE_APPLE, JUICE_ORANGE, JUICE_PEACH, JUICE_PEAR, JUICE_COCONUT, JUICE_MELON, JUICE_CARROT,
  WINE, PERSIMMON_CAKE, COOKED_MEAT,
]);

const AUTUMN_MATS = new Set<number>([
  PUMPKIN, PUMPKIN_SLICE, PERSIMMON, PERSIMMON_CAKE,
  MUSHROOM_SHIITAKE, MUSHROOM_ENOKI, MUSHROOM_OYSTER, MUSHROOM_RED, GLOW_SHROOM,
  GLOW_SPORE, SPORE_SHIITAKE, SPORE_OYSTER, SPORE_ENOKI, SPORE_RED,
]);

/** 这个产物的配方属于哪一页 */
export function catOf(id: number): TutorialCat {
  if (FOOD.has(id)) return 'food';
  if (EQUIP.has(id)) return 'equip';
  if (BLOCKS[id] && !BLOCKS[id].item) return 'build';
  return 'small';
}

/** 材料里带季节特产就贴个小标记：雪花=冬天、南瓜=秋天 */
export function festOf(needs: [number, number][]): FestTag | undefined {
  if (needs.some(([id]) => id === SNOWFLAKE)) return 'snow';
  if (needs.some(([id]) => AUTUMN_MATS.has(id))) return 'pumpkin';
  return undefined;
}
