/** 黄金物品编号 — 集中保存新增物品 ID 和黄金手册文字 */

import {
  DYE_BLACK, DYE_BLOOD, DYE_BLUE, DYE_DEEPGREEN, DYE_GRAY, DYE_GREEN, DYE_LIGHTGREEN,
  DYE_ORANGE, DYE_PINK, DYE_PURPLE, DYE_RED, DYE_STAR, DYE_SWAN, DYE_WHITE, DYE_YELLOW,
  SOUL_DYE,
} from '../blocks/Block';

/** 黄金编号搬去 blocks.data.ts 的 ID 段了（那边要用，反过来 import 会成环），这里转进转出保持 import 路径不变 */
import {
  BAG_GOLD, DIY_GOLD_CHEM_DECOMP, DIY_GOLD_CRAFT_TABLE, DIY_GOLD_DYE_TABLE, DIY_GOLD_MANUAL,
  DIY_GOLD_PICKAXE, DYE_GOLD, GOLD_CHEM_DECOMP, GOLD_CRAFT_TABLE, GOLD_DYE_TABLE, GOLD_PICKAXE,
  ICE_MOLECULE, POTION_ICE,
} from '../blocks/data';
export {
  BAG_GOLD, DIY_GOLD_CHEM_DECOMP, DIY_GOLD_CRAFT_TABLE, DIY_GOLD_DYE_TABLE, DIY_GOLD_MANUAL,
  DIY_GOLD_PICKAXE, DYE_GOLD, GOLD_CHEM_DECOMP, GOLD_CRAFT_TABLE, GOLD_DYE_TABLE, GOLD_PICKAXE,
  ICE_MOLECULE, POTION_ICE,
};

export const GOLDEN_RANDOM_MANUALS = [
  '合成：黄颜料×1 + 金粒×1 → 金色颜料×1',
  '合成：金色颜料×1 + 羊毛背包×1 → 金色腰包×1（10格）',
];

export const GOLDEN_TASK_MANUALS: Record<number, string> = {
  [DIY_GOLD_CRAFT_TABLE]: '合成：工作台×1 + 金块×1 → 黄金工作台×1（只作装饰）',
  [DIY_GOLD_DYE_TABLE]: '合成：星空染色台×1 + 金块×1 → 黄金地毯染色台×1',
  [DIY_GOLD_CHEM_DECOMP]: '合成：化学拆解器×1 + 金粒×2 → 金色分解器×1；金色分解器能把冰分解成冰分子',
  [DIY_GOLD_PICKAXE]: '合成：金粒×3 + 木棍×2（3×3格上排三个金粒，中间列下面两个木棍）→ 金稿子×1；挖掘速度×3，每挖一块停0.5秒',
};

export const ALL_GOLD_DYES = [
  SOUL_DYE, DYE_RED, DYE_YELLOW, DYE_BLUE, DYE_GREEN, DYE_PINK, DYE_ORANGE,
  DYE_BLACK, DYE_GRAY, DYE_WHITE, DYE_PURPLE, DYE_SWAN, DYE_LIGHTGREEN,
  DYE_STAR, DYE_BLOOD, DYE_DEEPGREEN, DYE_GOLD,
];
