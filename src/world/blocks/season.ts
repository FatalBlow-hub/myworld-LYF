/** 季节限定小物 — 雪花（冬季岛满地雪，挖雪地极小概率掉一朵）
 *  按设定「每一个雪块有 0.1% 概率产出雪花」实现成可收集的小物品，挖到就是赚到。
 */

import type { BlockDef } from './data';

export const SNOWFLAKE = 296; // 雪花：纯收藏/可出售的小东西，挖雪地 0.1% 掉

export const SNOW_BLOCKS: Record<number, BlockDef> = {
  [SNOWFLAKE]: {
    cn: '雪花', tex: { top: 'snowflake', side: 'snowflake' }, solid: false, seeThrough: true, hardness: 0, item: true,
  },
};
