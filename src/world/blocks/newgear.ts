/** 四季 DIY 道具 — 樱花药包 / 枫叶腰包 / 枫叶飞刀 / 柳条陷阱（含五种伪装形态）
 *
 *  纯数据、无逻辑：樱花剑在 blocks.swords.ts（350）里，因为要进剑属性表。
 *  柳条陷阱放下后变成 354~358 之一（外观和原版方块一模一样），踩上去禁锢 3 秒后自毁；
 *  挖掉不会掉出伪装方块，而是把「柳条陷阱」本体（353）还给玩家。 */

import type { BlockDef } from './data';
import { TRAP } from '../../config';

// —— 两个腰包 + 投掷物 + 陷阱本体 ——
export const BAG_SAKURA = 349;   // 樱花药包：储物 6 格
export const BAG_MAPLE = 351;    // 枫叶腰包：储物 6 格
export const KNIFE_MAPLE = 352;  // 枫叶飞刀：一次性投掷物
export const WILLOW_TRAP = 353;  // 柳条陷阱（物品本体，放置时选伪装）

// —— 放下后的五种伪装形态 ——
export const TRAP_SAND = 354;
export const TRAP_SNOW = 355;
export const TRAP_GRASS = 356;
export const TRAP_DIRT = 357;
export const TRAP_COBBLE = 358;

export const TRAP_BLOCK_IDS = [TRAP_SAND, TRAP_SNOW, TRAP_GRASS, TRAP_DIRT, TRAP_COBBLE];
/** 放置面板里的五种伪装：显示名 + 放下后的方块 ID（贴图直接复用原版方块，保证看不出差别） */
export const TRAP_FORMS: { cn: string; id: number }[] = [
  { cn: '沙子', id: TRAP_SAND },
  { cn: '雪块', id: TRAP_SNOW },
  { cn: '草方块', id: TRAP_GRASS },
  { cn: '泥土', id: TRAP_DIRT },
  { cn: '圆石', id: TRAP_COBBLE },
];

const itemDef = (cn: string, tex: string): BlockDef => ({
  cn, tex: { top: tex, side: tex }, solid: false, seeThrough: true, hardness: 0, item: true,
});

/** 陷阱方块：外观照抄原版（贴图 key 相同），能站上去、能挖掉 */
const trapDef = (cn: string, top: string, side: string, front?: string): BlockDef => ({
  cn, tex: { top, side, front }, solid: true, seeThrough: false, hardness: TRAP.HARDNESS, targetable: true,
});

export const NEWGEAR_BLOCKS: Record<number, BlockDef> = {
  [BAG_SAKURA]:  itemDef('樱花药包', 'bag_sakura'),
  [BAG_MAPLE]:   itemDef('枫叶腰包', 'bag_maple'),
  [KNIFE_MAPLE]: itemDef('枫叶飞刀', 'maple_knife'),
  [WILLOW_TRAP]: itemDef('柳条陷阱', 'trap_willow'),

  [TRAP_SAND]:   trapDef('柳条陷阱', 'sand', 'sand'),
  [TRAP_SNOW]:   trapDef('柳条陷阱', 'snow', 'snow'),
  [TRAP_GRASS]:  trapDef('柳条陷阱', 'grass_top', 'grass_side', 'grass_side'),
  [TRAP_DIRT]:   trapDef('柳条陷阱', 'dirt', 'dirt'),
  [TRAP_COBBLE]: trapDef('柳条陷阱', 'cobble', 'cobble'),
};
