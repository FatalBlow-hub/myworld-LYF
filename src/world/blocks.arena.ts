/** 红焰大赛箱 — 大厅里的赛事入口，两格高，对着按 M 打开大赛面板
 *
 *  纯数据：箱子本体挖不动（大厅本来也不许挖），交互分派在 core/PlayerActions.ts。 */

import type { BlockDef } from './blocks.data';

export const ARENA_BOX = 348;

export const ARENA_BLOCKS: Record<number, BlockDef> = {
  [ARENA_BOX]: {
    cn: '红焰大赛箱',
    tex: { top: 'arena_box_top', side: 'arena_box', front: 'arena_box_front' },
    solid: true, seeThrough: false, hardness: 9999,
  },
};
