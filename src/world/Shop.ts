/** 商店逻辑 — 售卖机商品表 + 收购箱折算价（单位：岛币） */

import { SELL_PRICE, SHOP } from '../config';
import { EGG_WARRIOR_ADVANCED, EGG_WARRIOR_EPIC, EGG_WARRIOR_NORMAL, JUICE_APPLE, JUICE_CARROT, JUICE_COCONUT, JUICE_MELON, JUICE_ORANGE, JUICE_PEACH, WARRIOR_EGG_IDS, WINE } from './Block';

/** 售卖机货架上的一格商品 */
export interface ShopGood {
  id: number;      // 商品对应的物品/方块 ID（图标和名字都从 BLOCKS 表取）
  price: number;   // 买价（岛币）
  note?: string;   // 商品下面的小字说明（比如抽蛋概率）
  /** 显示名（不填就用方块表里的名字；特殊物品售卖机用它把三档蛋合成一行「小战士召唤蛋」） */
  label?: string;
  /** 抽奖池：买了不一定拿到 id，而是按权重从池子里抽一个（小战士蛋的 80/19/1） */
  pool?: { id: number; weight: number }[];
}

/** 饮料售卖机货架：果汁 4 岛币、酒 5、椰子汁/西瓜汁/胡萝卜汁 3 */
export const DRINK_GOODS: ShopGood[] = [
  { id: JUICE_APPLE, price: 4 },
  { id: JUICE_ORANGE, price: 4 },
  { id: JUICE_PEACH, price: 4 },
  { id: WINE, price: 5 },
  { id: JUICE_COCONUT, price: 3 },
  { id: JUICE_MELON, price: 3 },
  { id: JUICE_CARROT, price: 3 },
];

/** 特殊物品售卖机货架：就一行「小战士召唤蛋」，买的时候按 80/19/1 抽品质 */
export const SPECIAL_GOODS: ShopGood[] = [
  {
    id: EGG_WARRIOR_NORMAL,
    price: SHOP.EGG_PRICE,
    label: '小战士召唤蛋',
    note: '普通 80% / 高级 19% / 绝世 1%',
    pool: [
      { id: EGG_WARRIOR_NORMAL, weight: SHOP.EGG_ROLL[0] },
      { id: EGG_WARRIOR_ADVANCED, weight: SHOP.EGG_ROLL[1] },
      { id: EGG_WARRIOR_EPIC, weight: SHOP.EGG_ROLL[2] },
    ],
  },
];

/** 买下这格商品实际到手的东西：有抽奖池就按权重抽，没有就是它本身 */
export function rollGood(g: ShopGood): number {
  if (!g.pool?.length) return g.id;
  const total = g.pool.reduce((sum, p) => sum + p.weight, 0);
  if (total <= 0) return g.id;
  let r = Math.random() * total;
  for (const p of g.pool) {
    r -= p.weight;
    if (r <= 0) return p.id;
  }
  return g.pool[g.pool.length - 1].id;
}

/**
 * 这个东西收购箱收不收、一份（per 个）换多少岛币。
 * 价目表里没有的：三种召唤蛋固定收 EGG_SELL；饮料 = 买价 × DRINK_SELL_MULT；其他不收。
 */
export function sellPriceOf(id: number): { coins: number; per: number } | null {
  if (id in SELL_PRICE) return SELL_PRICE[id];
  if (WARRIOR_EGG_IDS.includes(id)) return { coins: SHOP.EGG_SELL, per: 1 };
  const drink = DRINK_GOODS.find((g) => g.id === id);
  if (drink) return { coins: Math.round(drink.price * SHOP.DRINK_SELL_MULT * 100) / 100, per: 1 };
  return null;
}

/** 收购箱收不收这个东西 */
export const isSellable = (id: number): boolean => sellPriceOf(id) !== null;

/** 显示岛币数量：整数不带小数点，有小数最多留两位（0.75 显示 0.75 而不是 0.75000001） */
export function fmtCoins(n: number): string {
  return String(Math.round(n * 100) / 100);
}
