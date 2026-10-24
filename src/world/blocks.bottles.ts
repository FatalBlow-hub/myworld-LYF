/** 玻璃瓶装的液体一族 — 玻璃瓶对着液体按挖键就装进去一格，按放键倒出来又变回空瓶
 *
 *  玻璃瓶（GLASS_BOTTLE=152，定义在 blocks.data.ts）只能装 1 格液体（铁桶/玻璃桶能装 3 格），
 *  什么液体都能装：清水、五种泽液都行。装满的瓶子是物品，不能放到世界里。 */

import type { BlockDef } from './blocks.data';

export const BOTTLE_WATER = 330;      // 玻璃瓶(水)
export const BOTTLE_SW_LIGHT = 331;   // 玻璃瓶(淡沼泽液)
export const BOTTLE_SW_MID = 332;     // 玻璃瓶(沼泽液)
export const BOTTLE_SW_PHANTOM = 333; // 玻璃瓶(幻泽液)
export const BOTTLE_SW_DEEP = 334;    // 玻璃瓶(深泽液)
export const BOTTLE_SW_DROWN = 335;   // 玻璃瓶(溺泽液)

const bottleDef = (cn: string, tex: string): BlockDef => ({
  cn, tex: { top: tex, side: tex }, solid: false, seeThrough: true, hardness: 0, item: true,
});

export const BOTTLE_BLOCKS: Record<number, BlockDef> = {
  [BOTTLE_WATER]:      bottleDef('玻璃瓶(水)',       'bottle_water'),
  [BOTTLE_SW_LIGHT]:   bottleDef('玻璃瓶(淡沼泽液)', 'gbottle_sw_light'),
  [BOTTLE_SW_MID]:     bottleDef('玻璃瓶(沼泽液)',   'gbottle_sw_mid'),
  [BOTTLE_SW_PHANTOM]: bottleDef('玻璃瓶(幻泽液)',   'gbottle_sw_phantom'),
  [BOTTLE_SW_DEEP]:    bottleDef('玻璃瓶(深泽液)',   'gbottle_sw_deep'),
  [BOTTLE_SW_DROWN]:   bottleDef('玻璃瓶(溺泽液)',   'gbottle_sw_drown'),
};
