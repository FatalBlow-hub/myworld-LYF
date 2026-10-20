/** 蘑菇规则 — 秋季才长、孢子长成哪种蘑菇的概率、拆解能得几个孢子
 *  设定：香菇/金针菇/平菇各 30%、红伞伞 10%；蘑菇只在秋季出现，进入冬季全部消失。
 */

import { MUSHROOM_ENOKI, MUSHROOM_OYSTER, MUSHROOM_RED, MUSHROOM_SHIITAKE } from './blocks.mushrooms';

/** 四种蘑菇（清场、随机池都用它） */
export const MUSHROOM_IDS = [MUSHROOM_SHIITAKE, MUSHROOM_ENOKI, MUSHROOM_OYSTER, MUSHROOM_RED];

/** 草地自然长出蘑菇的概率（每个草方块一格），只在秋季判定 */
export const MUSHROOM_GROW_CHANCE = 0.002;

/** 孢子长成哪种蘑菇：香菇/金针菇/平菇各 30%，红伞伞 10% */
const ROLL: { id: number; weight: number }[] = [
  { id: MUSHROOM_SHIITAKE, weight: 0.3 },
  { id: MUSHROOM_ENOKI, weight: 0.3 },
  { id: MUSHROOM_OYSTER, weight: 0.3 },
  { id: MUSHROOM_RED, weight: 0.1 },
];

/** 按权重抽一种蘑菇；rand 可注入（地形生成用确定性 hash，种植用 Math.random） */
export function pickMushroom(rand: () => number = Math.random): number {
  const total = ROLL.reduce((sum, r) => sum + r.weight, 0);
  let p = rand() * total;
  for (const r of ROLL) {
    p -= r.weight;
    if (p <= 0) return r.id;
  }
  return ROLL[ROLL.length - 1].id;
}

/** 拆解一个蘑菇能得到几个孢子：红伞伞 2 个，其余 3 个 */
export const SPORE_YIELD: Record<number, number> = {
  [MUSHROOM_SHIITAKE]: 3,
  [MUSHROOM_ENOKI]: 3,
  [MUSHROOM_OYSTER]: 3,
  [MUSHROOM_RED]: 2,
};
