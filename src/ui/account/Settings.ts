/** 设置存储 — 玩家偏好（手册提示方式 / 提示语开关），localStorage 记住，换存档也在 */

export type ManualNotify = 'paper' | 'text' | 'off';

export interface GameSettings {
  /** 得到 DIY 手册时怎么提示：paper=弹大卡片 / text=只弹一行字 / off=不提示 */
  manual: ManualNotify;
  /** 大卡片停留秒数（1~15） */
  paperSeconds: number;
  /** 游戏里的提示语显不显示（"背包满了"这类小字） */
  tips: boolean;
}

const KEY = 'mc_settings_v1';
const DEFAULTS: GameSettings = { manual: 'paper', paperSeconds: 15, tips: true };

let cache: GameSettings | null = null;

function clampSeconds(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : DEFAULTS.paperSeconds;
  return Math.min(15, Math.max(1, v));
}

export function getSettings(): GameSettings {
  if (cache) return cache;
  let raw: Partial<GameSettings> = {};
  try { raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}; } catch { /* 坏数据就当没有 */ }
  cache = {
    manual: raw.manual === 'paper' || raw.manual === 'text' || raw.manual === 'off' ? raw.manual : DEFAULTS.manual,
    paperSeconds: clampSeconds(raw.paperSeconds),
    tips: raw.tips !== false,
  };
  return cache;
}

export function setSettings(patch: Partial<GameSettings>): GameSettings {
  const s = { ...getSettings(), ...patch };
  s.paperSeconds = clampSeconds(s.paperSeconds);
  cache = s;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 存不下就算了，内存里还有 */ }
  return s;
}

export function isTipsOn(): boolean {
  return getSettings().tips;
}
