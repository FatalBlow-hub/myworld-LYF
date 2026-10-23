/** 黑色售卖机 — 每个游戏日随机只进一种货（三选一均等，抽到弓再均等抽形态）
 *
 *  规则（2026-10-24 用户设定）：
 *  - 按游戏内一天刷新一次，到第二天必定换货，前一天没买的直接清空
 *  - 当天只有 1 件，买掉就售罄，等明天
 *  状态随存档走（`blackMarket` 字段），大厅里买也能落盘（saveCarryOnly 会带上）。
 */

import { SHOP } from '../config';
import { BLACK_PICKAXE, WARRIOR_BOW, WARRIOR_BOW_FIRE, WARRIOR_BOW_ICE } from './blocks.black';
import { DYE_BLACK } from './blocks.data';

/** 黑色售卖机的候选商品（各 1/3：黑色木镐 / 黑颜料 / 弓，抽到弓再抽形态） */
const BLACK_MARKET_BASE = [BLACK_PICKAXE, DYE_BLACK, WARRIOR_BOW];

/** 存档里的黑色售卖机状态：day = 游戏日键；item = 今天的货（null = 售罄/还没进） */
export interface BlackMarketState {
  day: number;
  item: number | null;
}

/** 游戏日 → 数字键（同一游戏日同一键；不 import core/Calendar，world 层不往上翻） */
export const blackDayKey = (d: { month: number; day: number }): number => d.month * 100 + d.day;

/** 随机抽一件：1/3 黑色木镐、1/3 黑颜料、1/3 弓（弓形态再各 1/3） */
export function rollBlackItem(): number {
  const base = BLACK_MARKET_BASE[Math.floor(Math.random() * BLACK_MARKET_BASE.length)];
  if (base === WARRIOR_BOW) {
    // 抽到的是「弓」这一类：普通/火/冰再均等抽一张
    const bows = [WARRIOR_BOW, WARRIOR_BOW_FIRE, WARRIOR_BOW_ICE];
    return bows[Math.floor(Math.random() * bows.length)];
  }
  return base;
}

/** 拿「今天」的货架状态：跨了游戏日（或第一次开张）就重新抽一件，昨天的货直接作废 */
export function refreshBlackMarket(
  state: BlackMarketState | undefined,
  date: { month: number; day: number },
): BlackMarketState {
  const day = blackDayKey(date);
  if (state && state.day === day) return state;
  return { day, item: rollBlackItem() };
}

/** 黑色售卖机每件货的卖价（岛币） */
export function blackPriceOf(id: number): number {
  if (id === BLACK_PICKAXE) return SHOP.BLACK_PICKAXE_PRICE;
  if (id === DYE_BLACK) return SHOP.BLACK_DYE_PRICE;
  return SHOP.BLACK_BOW_PRICE; // 三张弓同价
}
