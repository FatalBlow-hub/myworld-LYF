/** 游戏日历 — 一个月 10 天、开局 7 月 8 日；四季按月份划分（12~2 冬 / 3~5 春 / 6~8 夏 / 9~11 秋）
 *  只做纯计算，不碰 DOM 和存档：谁需要日期就调 advanceDate / seasonOf。
 *
 *  用法:
 *   const tomorrow = advanceDate(today);      // 自动跨月、12 月过完回 1 月
 *   const s = seasonOf(today);                // 'summer'
 *   hud.setDate(dateLabel(today));            // '☀️ 7月8日 · 夏季'
 */

import { CALENDAR } from '../config';

/** 游戏里的一天：月份 1~12，日 1~MONTH_DAYS */
export interface GameDate {
  month: number;
  day: number;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** 季节中文名 */
export const SEASON_CN: Record<Season, string> = {
  spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季',
};

/** 季节图标：HUD 上跟日期一起显示，孩子一眼能认出 */
export const SEASON_ICON: Record<Season, string> = {
  spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️',
};

/** 开局日期（新档从这天开始） */
export const START_DATE: GameDate = { month: CALENDAR.START_MONTH, day: CALENDAR.START_DAY };

/** 这一天属于哪个季节：冬季跨年（12、1、2 月），其余按 3~5 / 6~8 / 9~11 */
export function seasonOf(d: GameDate): Season {
  if (d.month === 12 || d.month <= 2) return 'winter';
  if (d.month <= 5) return 'spring';
  if (d.month <= 8) return 'summer';
  return 'autumn';
}

/** 往后翻几天（自动跨月、12 月过完回到 1 月）；days 可以是负数，往前翻 */
export function advanceDate(d: GameDate, days = 1): GameDate {
  const perMonth = CALENDAR.MONTH_DAYS;
  const perYear = perMonth * 12;
  const index = (d.month - 1) * perMonth + (d.day - 1) + days;
  const wrapped = ((index % perYear) + perYear) % perYear;
  return { month: Math.floor(wrapped / perMonth) + 1, day: (wrapped % perMonth) + 1 };
}

/** "7月8日" */
export const formatDate = (d: GameDate): string => `${d.month}月${d.day}日`;

/** HUD 上那一行："☀️ 7月8日 · 夏季" */
export const dateLabel = (d: GameDate): string => {
  const s = seasonOf(d);
  return `${SEASON_ICON[s]} ${formatDate(d)} · ${SEASON_CN[s]}`;
};

/** 一共过了多少天（以 1 月 1 日为第 0 天）：按天数算季节/成长时用得上 */
export const dayOfYear = (d: GameDate): number => (d.month - 1) * CALENDAR.MONTH_DAYS + (d.day - 1);

/** 星期几：7 天一轮，0 = 周一。白萝卜炒股就靠它——周一进货、下周一全烂 */
export const weekdayOf = (d: GameDate): number => dayOfYear(d) % 7;
export const isMonday = (d: GameDate): boolean => weekdayOf(d) === 0;
/** 星期几中文名（HUD/商店提示用） */
export const WEEKDAY_CN = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;

/** 存档里读出来的日期：缺字段或数字不合法就当没存过，回到开局日期 */
export function normalizeDate(raw: unknown): GameDate {
  const r = raw as Partial<GameDate> | null | undefined;
  const month = Number(r?.month);
  const day = Number(r?.day);
  if (!Number.isInteger(month) || month < 1 || month > 12) return { ...START_DATE };
  if (!Number.isInteger(day) || day < 1 || day > CALENDAR.MONTH_DAYS) return { ...START_DATE };
  return { month, day };
}
