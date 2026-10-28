/** 装饰方块一族 — 长得好看但没有新功能的方块
 *
 *  藤蔓梯子：木梯子缠上藤蔓，纯装饰，爬起来跟普通梯子一模一样（isLadder 认两种）。
 *  以后再有"换个皮肤"的装饰方块也放这里。 */

import type { BlockDef } from './data';

export const VINE_LADDER = 336; // 藤蔓梯子

export const DECO_BLOCKS: Record<number, BlockDef> = {
  [VINE_LADDER]: {
    cn: '藤蔓梯子', tex: { top: 'vine_ladder', side: 'vine_ladder' },
    solid: false, seeThrough: true, hardness: 0.4, shape: 'ladder', oriented: true, targetable: true,
  },
};
