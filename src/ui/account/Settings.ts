/** 设置存储 — 玩家偏好（手册提示方式 / 提示语开关 / 自定义按键）
 *  两层存储：localStorage 当本地缓存（后端不在/没登录也能用），
 *  登录后服务器（GET/PUT /api/settings）才是准的——换电脑换浏览器键位跟着账号走 */

import { Action, KEYS } from '../../config';

export type ManualNotify = 'paper' | 'text' | 'off';

/** 自定义按键：只存和默认不一样的动作，动作 → 键码数组（最多主键+副键两个） */
export type KeyOverrides = Partial<Record<Action, string[]>>;

export interface GameSettings {
  /** 得到 DIY 手册时怎么提示：paper=弹大卡片 / text=只弹一行字 / off=不提示 */
  manual: ManualNotify;
  /** 大卡片停留秒数（1~15） */
  paperSeconds: number;
  /** 游戏里的提示语显不显示（"背包满了"这类小字） */
  tips: boolean;
  /** 改键表（空 = 全用默认键） */
  keymap: KeyOverrides;
  /** 新手教程看没看过（看过/跳过后新档不再自动弹，菜单里能重看） */
  tutorialDone: boolean;
}

const KEY = 'mc_settings_v1';
const DEFAULTS: GameSettings = { manual: 'paper', paperSeconds: 15, tips: true, keymap: {}, tutorialDone: false };

let cache: GameSettings | null = null;

/** 设置变了的听众（改键后 Controller 要重建键码反查表） */
const listeners = new Set<() => void>();
export function onSettingsChange(fn: () => void): void { listeners.add(fn); }
function notify(): void { listeners.forEach((fn) => fn()); }

function clampSeconds(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : DEFAULTS.paperSeconds;
  return Math.min(15, Math.max(1, v));
}

/** 键码格式：KeyP / Digit4 / Numpad4 / ArrowUp / Space 这种（浏览器 e.code） */
const CODE_RE = /^[A-Z][A-Za-z0-9]{0,31}$/;

/** 校验改键表：动作名要真、键码要合法、一个动作最多两个键 */
function normKeymap(raw: unknown): KeyOverrides {
  const out: KeyOverrides = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [a, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!(a in KEYS)) continue;
    const codes = (Array.isArray(v) ? v : [v])
      .filter((c): c is string => typeof c === 'string' && CODE_RE.test(c))
      .slice(0, 2);
    if (codes.length) out[a as Action] = codes;
  }
  return out;
}

/** 把一份来历不明的 JSON 洗成合法设置（本地缓存和服务器下发的都过这道） */
function normalize(raw: Partial<GameSettings>): GameSettings {
  return {
    manual: raw.manual === 'paper' || raw.manual === 'text' || raw.manual === 'off' ? raw.manual : DEFAULTS.manual,
    paperSeconds: clampSeconds(raw.paperSeconds),
    tips: raw.tips !== false,
    keymap: normKeymap(raw.keymap),
    tutorialDone: raw.tutorialDone === true,
  };
}

export function getSettings(): GameSettings {
  if (cache) return cache;
  let raw: Partial<GameSettings> = {};
  try { raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}; } catch { /* 坏数据就当没有 */ }
  cache = normalize(raw);
  return cache;
}

export function setSettings(patch: Partial<GameSettings>): GameSettings {
  const s = normalize({ ...getSettings(), ...patch });
  cache = s;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 存不下就算了，内存里还有 */ }
  notify();
  pushSettings();
  return s;
}

export function isTipsOn(): boolean {
  return getSettings().tips;
}

/* ---------------- 服务器同步（登录后才通；失败一律静默退回本地） ---------------- */

let pushTimer: ReturnType<typeof setTimeout> | null = null;

/** 写服务器：防抖，连着改好几下只发最后一次 */
function pushSettings(): void {
  if (pushTimer !== null) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void fetch('/api/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(getSettings()),
    }).catch(() => { /* 没登录/后端不在就只用本地 */ });
  }, 400);
}

/** 登录后拉一次：服务器是准的，整份接管本地并通知听众（菜单键位说明要重画） */
export async function pullSettings(): Promise<boolean> {
  try {
    const r = await fetch('/api/settings');
    if (!r.ok) return false;
    const d = (await r.json()) as { settings?: unknown };
    if (!d || typeof d.settings !== 'object' || d.settings === null || Array.isArray(d.settings)) return false;
    // 服务器是空的（新账号/从没存过）：别拿默认盖掉本地已设的，反把本地推上去
    if (Object.keys(d.settings as object).length === 0) { pushSettings(); return true; }
    cache = normalize(d.settings as Partial<GameSettings>);
    try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* 本地备份写不进就算了 */ }
    notify();
    return true;
  } catch {
    return false; // 后端没跑：纯本地模式
  }
}
