/** 科技 DIY 配方 — 芯片/电脑/无尽之剑（2026-11-01 设定批次·二）
 *
 *  ⚠️ 这一段必须整段展开在 RECIPES 数组**末尾**：手册条目下标是存档键，插中间会把老档的已学记录全打乱。 */

import {
  CHIP, COMPUTER, ENDLESS_BLOCK, IRON_NUGGET, STICK, SWORD_ENDLESS, WOLF_STAR_SHARD,
} from '../blocks/Block';
import type { Recipe } from './Recipes';

export const TECH_RECIPES: Recipe[] = [
  { out: CHIP, outCount: 1, needs: [[WOLF_STAR_SHARD, 1], [IRON_NUGGET, 2]] },      // 芯片 = 狼星碎片×1 + 铁粒×2
  { out: COMPUTER, outCount: 1, needs: [[CHIP, 1], [IRON_NUGGET, 10]] },            // 电脑 = 芯片×1 + 铁粒×10
  { out: SWORD_ENDLESS, outCount: 1, needs: [[ENDLESS_BLOCK, 2], [STICK, 1]] },     // 无尽之剑 = 无尽方块×2 + 木棍×1
];
