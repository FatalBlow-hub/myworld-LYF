/** 商店逻辑 — 售卖机商品表 + 收购箱折算价（单位：岛币） */

import { SELL_PRICE, SHOP } from '../config';
import type { CharacterKind } from '../entities/Character';
import {
  BANANA_FLIP, BLOCKS, BRICK, CHEST, COAL_CHUNK, COBBLE, DIRT, EGG_WARRIOR_ADVANCED, EGG_WARRIOR_EPIC,
  EGG_WARRIOR_NORMAL, FRUIT_PLATTER, GLASS, GRASS_CAKE, JUICE_APPLE, JUICE_CARROT, JUICE_COCONUT,
  JUICE_MELON, JUICE_ORANGE, JUICE_PEACH, LADDER, MUSHROOM_PLATTER, PLANKS, SAND, SANDSTONE, STONE,
  TEA_DANDELION, TEA_RED, WARRIOR_EGG_IDS, WINE, WOOD, WOOD_SLAB, WOOL_WHITE,
} from './Block';

/** 售卖机货架上的一格商品 */
export interface ShopGood {
  id?: number;     // 商品对应的物品/方块 ID（图标和名字都从 BLOCKS 表取）；皮肤商品没有，用 unlock
  unlock?: CharacterKind; // 皮肤商品：买下后永久解锁这个人物形象（图标用皮肤头像）
  price: number;   // 买价（岛币）
  note?: string;   // 商品下面的小字说明（比如抽蛋概率）
  /** 显示名（不填就用方块表里的名字；特殊物品售卖机用它把三档蛋合成一行「小战士召唤蛋」） */
  label?: string;
  /** 抽奖池：买了不一定拿到 id，而是按权重从池子里抽一个（小战士蛋的 80/19/1） */
  pool?: { id: number; weight: number }[];
  /** 每天最多能买几个（杂货铺用；不填 = 不限量） */
  dailyLimit?: number;
  /** 还剩几件（黑色售卖机用：一天只进一件，卖完即止；不填 = 不限件数） */
  stock?: () => number;
  /** 买掉一件后要做的记账（黑色售卖机用它把当天货架清空） */
  afterBuy?: () => void;
  /** 卖空后按钮旁边的提示语（默认「今天买过了」） */
  soldNote?: string;
  /** 回收价（白萝卜用）：这一行不是卖给你东西，是机器按这个价收你手里的东西 */
  sellPrice?: number;
  /** 回收行显示"你手里有几个"（点一下全卖掉） */
  have?: () => number;
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

/** 自制吃食（只能自己合成，售卖机不卖）：收购箱按这里的「名义价 × 半价」收，别让它们烂在背包里 */
export const CRAFT_FOOD_PRICE: Record<number, number> = {
  [TEA_RED]: 4,
  [TEA_DANDELION]: 4,
  [BANANA_FLIP]: 5,
  [GRASS_CAKE]: 2,
  [FRUIT_PLATTER]: 10,
  [MUSHROOM_PLATTER]: 8,
};

/** 特殊物品售卖机货架：小战士召唤蛋（买的时候按 80/19/1 抽品质）+ 两款皮肤（买一次永久解锁） */
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
  { unlock: 'prismarine', price: SHOP.SKIN_PRISMARINE_PRICE, label: '海晶史蒂夫皮肤', note: '买一次永久有' },
  { unlock: 'ender', price: SHOP.SKIN_ENDER_PRICE, label: '末影史蒂夫皮肤', note: '买一次永久有' },
  { unlock: 'bloodmoon', price: SHOP.SKIN_BLOODMOON_PRICE, label: '血月史蒂夫皮肤', note: '买一次永久有' },
  { unlock: 'white', price: SHOP.SKIN_WHITE_PRICE, label: '白衣使者皮肤', note: '买一次永久有' },
  { unlock: 'tech', price: SHOP.SKIN_TECH_PRICE, label: '科技史蒂夫皮肤', note: '买一次永久有' },
  { unlock: 'crystal', price: SHOP.SKIN_CRYSTAL_PRICE, label: '蓝色水晶盔甲史蒂夫皮肤', note: '买一次永久有' },
  { unlock: 'dog', price: SHOP.SKIN_DOG_PRICE, label: '嘉宾犬人皮肤', note: '买一次永久有' },
  { unlock: 'rainbow', price: SHOP.SKIN_RAINBOW_PRICE, label: '彩色史蒂夫皮肤', note: '买一次永久有' },
  { unlock: 'ghost', price: SHOP.SKIN_GHOST_PRICE, label: '万圣节鬼版皮肤', note: '买一次永久有' },
  { unlock: 'pumpkin', price: SHOP.SKIN_PUMPKIN_PRICE, label: '万圣节南瓜头皮肤', note: '买一次永久有' },
];

/** 杂货铺货架：**只卖方块本身，不再卖物品**（2026-10-24 设定）——工作台/熔炉/告示牌/床
 *  这些功能方块也下了架（按 M 就能用，不用买），材料与食物去岛上自己挣。
 *  新定价：圆石 2 / 木头 1 / 沙子 0.1 / 煤块 0.75；其余维持原价。每种每天限购 1 个（world/shopLimits.ts） */
const STORE_RAW: [number, number][] = [
  // —— 泥土石头木头：造家最基本的料 ——
  [DIRT, 1],          // 泥土
  [STONE, 2],         // 石头
  [SAND, 0.1],        // 沙子
  [COBBLE, 2],        // 圆石
  [PLANKS, 1],        // 木板
  [WOOD, 1],          // 木头
  [LADDER, 2],        // 木梯
  [SANDSTONE, 2],     // 砂岩
  [BRICK, 3],         // 红砖
  [GLASS, 2],         // 玻璃
  [COAL_CHUNK, 0.75], // 煤块
  // —— 能放进岛上的容器与装饰方块 ——
  [CHEST, 3],         // 箱子
  [WOOD_SLAB, 1],     // 木台阶
  [WOOL_WHITE, 3],    // 白羊毛
];

export const STORE_GOODS: ShopGood[] = STORE_RAW.map(([id, price]) => ({ id, price, dailyLimit: SHOP.STORE_STOCK }));

/** 买下这格商品实际到手的东西：有抽奖池就按权重抽，没有就是它本身（皮肤商品不走这里） */
export function rollGood(g: ShopGood): number {
  if (!g.pool?.length) return g.id!;
  const total = g.pool.reduce((sum, p) => sum + p.weight, 0);
  if (total <= 0) return g.id!;
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
  const craft = CRAFT_FOOD_PRICE[id];
  if (craft !== undefined) return { coins: Math.round(craft * SHOP.DRINK_SELL_MULT * 100) / 100, per: 1 };
  return null;
}

/** 收购箱收不收这个东西 */
export const isSellable = (id: number): boolean => sellPriceOf(id) !== null;

/** 显示岛币数量：整数不带小数点，有小数最多留两位（0.75 显示 0.75 而不是 0.75000001） */
export function fmtCoins(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** 收购箱面板顶上的价目表文字：从 SELL_PRICE 自动生成，改价格不用动这里 */
export function sellListText(): string {
  const parts = Object.entries(SELL_PRICE).map(([id, p]) =>
    `${BLOCKS[+id]?.cn ?? id}${p.per > 1 ? `${p.per}个` : ''}=${p.coins}`);
  parts.push(`召唤蛋=${SHOP.EGG_SELL}`, '饮料=半价', '自制吃食=半价');
  return parts.join('　');
}
