/** 商店限量 — 每个账号每天对每种限量商品只能买 N 个（当前 N = SHOP.STORE_STOCK = 1）
 *  独立于价格/货架/UI，改限量规则只动这里与 config 一行。
 *
 *  记档方式：`{ day: 'YYYY-MM-DD', bought: { 物品ID: 已买几个 } }`
 *  - 按**本地日期**记，跨天整张清零（孩子第二天又能买）
 *  - 存进存档：换设备、断线重连都算数（不是只看内存）
 *  - 买皮肤/蛋这类"买一次就永久有"的商品不走这里（购买处各自判断）
 */

import { SHOP } from '../../config';

export interface ShopQuota {
  day: string;
  bought: Record<number, number>;
}

/** 今天的键（本地时区）：同一天复用同一张记录，跨天自动换新的 */
export function todayKey(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** 拿"今天"的限量记录：空 / 昨天的都退回来一张新的（不可变，别改传入对象） */
export function todayQuota(raw: ShopQuota | undefined, day = todayKey()): ShopQuota {
  if (!raw || raw.day !== day) return { day, bought: {} };
  return raw;
}

/** 这个商品今天还能买几个：没记录过就是满额 */
export function remainingOf(raw: ShopQuota | undefined, id: number, limit = SHOP.STORE_STOCK, day = todayKey()): number {
  const q = todayQuota(raw, day);
  return Math.max(0, limit - (q.bought[id] ?? 0));
}

/** 记一次购买（返回新对象，调用方直接存回存档） */
export function consumeQuota(raw: ShopQuota | undefined, id: number, n = 1, day = todayKey()): ShopQuota {
  const q = todayQuota(raw, day);
  return { ...q, bought: { ...q.bought, [id]: (q.bought[id] ?? 0) + n } };
}
