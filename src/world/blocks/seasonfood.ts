/** 四季节日道具 — 春卷 / 菖蒲叶与两件佩戴物 / 丰收拼盘 / 三色珠子与圣诞甜饼 / 彩珠礼花
 *
 *  纯数据、无逻辑：春卷等节日食物只在自由岛能用（大赛里背包本来就被清空）。
 *  菖蒲叶是长在水面的方块，挖掉直接得本体；珠子是挖冬季树叶时有概率掉的装饰品。 */

import type { BlockDef } from './data';

export const CHUNK_ROLL = 359;        // 春卷（踏青节）
export const CALAMUS = 360;           // 菖蒲叶（方块：夏季长在水面）
export const POUCH_CALAMUS = 361;     // 菖蒲香囊（佩戴：4 格内怪物每 4 秒扣 1 血）
export const SHIELD_CALAMUS = 362;    // 菖蒲护盾（佩戴：踩柳条陷阱不触发）
export const HARVEST_PLATTER = 363;   // 丰收拼盘（丰收节）
export const BEAD_RED = 364;          // 装饰珠子·红
export const BEAD_YELLOW = 365;       // 装饰珠子·黄
export const BEAD_BLUE = 366;         // 装饰珠子·蓝
export const XMAS_COOKIE = 367;       // 圣诞甜饼（冬季节日）
export const BEAD_FIREWORK = 368;     // 彩珠礼花（放下就炸，无伤害）

/** 三种珠子（甜饼任意一种都能做；礼花要三色齐全） */
export const BEAD_IDS = [BEAD_RED, BEAD_YELLOW, BEAD_BLUE];

const itemDef = (cn: string, tex: string): BlockDef => ({
  cn, tex: { top: tex, side: tex }, solid: false, seeThrough: true, hardness: 0, item: true,
});

export const SEASON_FOOD_BLOCKS: Record<number, BlockDef> = {
  [CHUNK_ROLL]:       itemDef('春卷', 'chunk_roll'),
  [POUCH_CALAMUS]:    itemDef('菖蒲香囊', 'pouch_calamus'),
  [SHIELD_CALAMUS]:   itemDef('菖蒲护盾', 'shield_calamus'),
  [HARVEST_PLATTER]:  itemDef('丰收拼盘', 'harvest_platter'),
  [BEAD_RED]:         itemDef('装饰珠子·红', 'bead_red'),
  [BEAD_YELLOW]:      itemDef('装饰珠子·黄', 'bead_yellow'),
  [BEAD_BLUE]:        itemDef('装饰珠子·蓝', 'bead_blue'),
  [XMAS_COOKIE]:      itemDef('圣诞甜饼', 'xmas_cookie'),
  [BEAD_FIREWORK]:    itemDef('彩珠礼花', 'firework'),
  // 菖蒲叶：交叉薄片，只长在水面上（挖掉得本体，能当材料）
  [CALAMUS]: {
    cn: '菖蒲叶', tex: { top: 'calamus', side: 'calamus' },
    solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true,
  },
};
