/** 蘑菇规则 — 孢子长成哪种蘑菇、自然生成概率、星空尸掉落（用户 2026-10-22 设定）
 *
 *  地图自动生成：**只按日期季节**——秋季长（普通菇 0.2%/草方块 + 夜光蓝菇 0.1%/草方块），
 *  进入冬季全部消失（Game.onNewDay 调 World.clearBlocks）。
 *  玩家亲手种的：10 秒后长成，**冬天不会消失**。
 */

import { GLOW_SHROOM, MUSHROOM_ENOKI, MUSHROOM_OYSTER, MUSHROOM_RED, MUSHROOM_SHIITAKE } from './blocks.mushrooms';

/** 四种普通蘑菇（夜光蓝菇单独按 0.1% 生成，不进这个池） */
export const MUSHROOM_IDS = [MUSHROOM_SHIITAKE, MUSHROOM_ENOKI, MUSHROOM_OYSTER, MUSHROOM_RED];

/** 冬天要清场的所有蘑菇（含夜光蓝菇） */
export const ALL_MUSHROOM_IDS = [...MUSHROOM_IDS, GLOW_SHROOM];

/** 草地上自然长普通蘑菇的概率（每个草方块），只在秋季判定 */
export const MUSHROOM_GROW_CHANCE = 0.002;

/** 草地上自然长夜光蓝菇的概率（每个草方块），只在秋季判定、不限夜晚 */
export const GLOW_SHROOM_CHANCE = 0.001;

/** 孢子长成哪种普通蘑菇：香菇/金针菇/平菇各 30%，红伞伞 10% */
const ROLL: { id: number; weight: number }[] = [
  { id: MUSHROOM_SHIITAKE, weight: 0.3 },
  { id: MUSHROOM_ENOKI, weight: 0.3 },
  { id: MUSHROOM_OYSTER, weight: 0.3 },
  { id: MUSHROOM_RED, weight: 0.1 },
];

/** 按权重抽一种普通蘑菇；rand 可注入（地形生成用确定性 hash，种植用 Math.random） */
export function pickMushroom(rand: () => number = Math.random): number {
  const total = ROLL.reduce((sum, r) => sum + r.weight, 0);
  let p = rand() * total;
  for (const r of ROLL) {
    p -= r.weight;
    if (p <= 0) return r.id;
  }
  return ROLL[ROLL.length - 1].id;
}

/** 拆解一个蘑菇能得到几个孢子（红伞伞/夜光蓝菇 2，其余 3） */
export const SPORE_YIELD: Record<number, number> = {
  [MUSHROOM_SHIITAKE]: 3,
  [MUSHROOM_ENOKI]: 3,
  [MUSHROOM_OYSTER]: 3,
  [MUSHROOM_RED]: 2,
  [GLOW_SHROOM]: 2,
};

/** 孢子 → 种下的"生长中孢子" → 10 秒后长成的蘑菇 */
export const SPORE_TO_PLANT: Record<number, number> = {
  300: 304, // 香菇孢子
  301: 305, // 平菇孢子
  302: 306, // 金针菇孢子
  303: 307, // 红伞伞孢子
  299: 308, // 夜光蓝菇孢子
};

/** 孢子 → 长成的蘑菇 */
export const MUSHROOM_OF_SPORE: Record<number, number> = {
  300: MUSHROOM_SHIITAKE,
  301: MUSHROOM_OYSTER,
  302: MUSHROOM_ENOKI,
  303: MUSHROOM_RED,
  299: GLOW_SHROOM,
};

/** 生长中的孢子 → 长成的蘑菇（读档催熟、长成判定都用它） */
export const PLANT_TO_MUSHROOM: Record<number, number> = Object.fromEntries(
  Object.entries(SPORE_TO_PLANT).map(([spore, plant]) => [plant, MUSHROOM_OF_SPORE[+spore]]),
);

/** 所有能种的孢子 ID */
export const SPORE_IDS = Object.keys(SPORE_TO_PLANT).map(Number);

/** 所有"生长中的孢子" ID */
export const SPORE_PLANT_IDS = Object.values(SPORE_TO_PLANT);

/** 像蘑菇的方块全集：五种蘑菇 + 五个"生长中的孢子"（判断玩家种的位置是否还成立） */
export const MUSHROOM_LIKE_IDS = [...ALL_MUSHROOM_IDS, ...SPORE_PLANT_IDS];

/** 孢子种下到长成蘑菇要几秒（玩家种的不受季节影响，冬天也不消失） */
export const SPORE_GROW_SECONDS = 10;

/** 击杀星空尸掉落夜光蓝菇的概率 */
export const STAR_ZOMBIE_GLOW_CHANCE = 0.1;
