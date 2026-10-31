/** 丝线 DIY 配方 — 猫掉的丝线做出来的四件套 + 三根钓鱼竿 + 狼之利爪（2026-11-01 设定批次）
 *
 *  ⚠️ 这一段必须整段展开在 RECIPES 数组**末尾**：手册条目下标是存档键，插中间会把老档的已学记录全打乱。 */

import {
  BANDAGE, FISH_ROD, GOLD_FISH_ROD, GOLD_NUGGET, IRON_FISH_ROD, IRON_NUGGET, LEAVES, LEAD_ROPE,
  ROPE, SILK, SLOW_NET, STICK, WOOL_IDS, WOLF_CLAW, WOLF_STAR_SHARD,
} from '../blocks/Block';
import type { Recipe } from './Recipes';

export const SILK_RECIPES: Recipe[] = [
  { out: BANDAGE, outCount: 1, needs: [[SILK, 1], [LEAVES, 1]] },       // 速修绷带 = 丝线×1 + 树叶×1
  { out: LEAD_ROPE, outCount: 1, needs: [[ROPE, 1], [SILK, 1]] },       // 牵引绳索 = 绳索×1 + 丝线×1（怪物也能拴）
  { out: SLOW_NET, outCount: 1, needs: [[SILK, 2], [LEAVES, 2]] },      // 减速网 = 丝线×2 + 树叶×2（3×3 平地才能铺）
  { out: FISH_ROD, outCount: 1, needs: [[STICK, 2], [SILK, 1]] },       // 钓鱼竿 = 木棍×2 + 丝线×1
  { out: IRON_FISH_ROD, outCount: 1, needs: [[FISH_ROD, 2], [IRON_NUGGET, 2]] }, // 铸铁钓鱼竿 = 钓鱼竿×2 + 铁粒×2（普通 DIY 手册）
  // 金色钓鱼竿 = 钓鱼竿×1 + 金粒×2：只进金色 DIY 手册（quiet 不进普通手册池），文案在 GoldenItems
  { out: GOLD_FISH_ROD, outCount: 1, needs: [[FISH_ROD, 1], [GOLD_NUGGET, 2]], quiet: true },
  // 狼之利爪 = 狼星碎片×3 + 羊毛×1：每种羊毛各一条，只有第一条进手册
  ...WOOL_IDS.map((wool, i) => ({
    out: WOLF_CLAW, outCount: 1, quiet: i > 0,
    needs: [[WOLF_STAR_SHARD, 3], [wool, 1]] as [number, number][],
  })),
];
