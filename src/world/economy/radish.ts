/** 白萝卜 — 黑色售卖机每周一进货的"炒股"道具，只能买卖不能吃不能摆
 *
 *  玩法（用户设定 2026-10-24；价格 2026-10-29 改为买入 4~10 / 卖出 2~12）：
 *  - 每周一黑色售卖机多一行白萝卜进货价（4~10 岛币随机），是唯一的入手时机
 *  - 价格每个玩家（按账号名）每天都不一样；同一天内价格固定，
 *    用「名字 + 第几天」当种子摇出来，退出重进也不会变卦
 *  - 周二往后机器只回收（回收价每天 2~12 岛币随机），看哪天价格高就全卖了赚差价
 *  - 翻到下周一还没卖 → 全部烂掉，一颗不剩 */

import { RADISH } from '../../config';
import type { BlockDef } from '../blocks/data';

export const WHITE_RADISH = 337; // 白萝卜：只能倒买倒卖

export const RADISH_BLOCKS: Record<number, BlockDef> = {
  [WHITE_RADISH]: {
    cn: '白萝卜', tex: { top: 'white_radish', side: 'white_radish' },
    solid: false, seeThrough: true, hardness: 0, item: true,
  },
};

/** 名字搅成一个数：同一个名字每次算出同一个值（萝卜价的个人种子） */
export function hashName(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h = (h ^ name.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** 价格骰子：线性同余搅几轮让相邻两天价格乱跳；salt 用来把买入价和回收价岔开 */
function priceRoll(nameHash: number, dayIndex: number, salt: number): number {
  let v = (nameHash ^ Math.imul(dayIndex + 1, 2654435761) ^ Math.imul(salt, 40503)) >>> 0;
  v = Math.imul(v ^ (v >>> 15), 2246822519) >>> 0;
  v = (v ^ (v >>> 13)) >>> 0;
  return v;
}

/** 某人某天的白萝卜买入价：4~10 岛币，同一个人同一天永远是这个价（周一进货用） */
export function radishBuyPrice(nameHash: number, dayIndex: number): number {
  return RADISH.BUY_MIN + (priceRoll(nameHash, dayIndex, 1) % (RADISH.BUY_MAX - RADISH.BUY_MIN + 1));
}

/** 某人某天的白萝卜回收价：2~12 岛币（收购行用；和买入价各摇各的，不串价格） */
export function radishSellPrice(nameHash: number, dayIndex: number): number {
  return RADISH.SELL_MIN + (priceRoll(nameHash, dayIndex, 7919) % (RADISH.SELL_MAX - RADISH.SELL_MIN + 1));
}
