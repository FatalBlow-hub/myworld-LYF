/** 键表 —— 默认键位（config/player.ts 的 KEYS）+ 玩家改键（Settings.keymap 只存改动）
 *  动作名不变（Controller/触屏按钮都按动作走），变的只是"哪个键码触发哪个动作"。
 *  改键结果经 setSettings 写本地 + 同步服务器（Settings.ts 里那条线） */

import { Action, KEYS } from '../../config';
import { getSettings, setSettings } from './Settings';

/** 不许改键的动作：ESC 解锁鼠标是浏览器定死的，pause 永远钉在 Escape 上 */
const LOCKED = new Set<Action>(['pause']);

/** 不许绑的键码：浏览器/系统接管拦不住的（ESC 走取消、功能键、系统键、浏览器导航） */
const BANNED_CODES = new Set([
  'Escape', 'MetaLeft', 'MetaRight', 'OSLeft', 'OSRight',
  'F5', 'F11', 'F12', 'BrowserBack', 'BrowserForward', 'BrowserRefresh',
]);

/** 键码 → 给人看的名字（菜单玩法介绍和设置面板都用它） */
export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `小键盘${code.slice(6)}`;
  if (code.startsWith('Arrow')) return { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' }[code] ?? code;
  const named: Record<string, string> = {
    Space: '空格', ShiftLeft: 'Shift', ShiftRight: 'Shift', Escape: 'ESC',
    Enter: '回车', Tab: 'Tab', Backspace: '退格', CapsLock: '大写锁',
    ControlLeft: 'Ctrl', ControlRight: 'Ctrl', AltLeft: 'Alt', AltRight: 'Alt',
    Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';',
    Quote: "'", Backquote: '`', Backslash: '\\', Comma: ',', Period: '.', Slash: '/',
  };
  return named[code] ?? code;
}

/** 当前生效的键表 = 默认 + 玩家改动覆盖 */
export function getKeymap(): Record<Action, readonly string[]> {
  const overrides = getSettings().keymap;
  const map = {} as Record<Action, string[]>;
  for (const a of Object.keys(KEYS) as Action[]) {
    map[a] = overrides[a]?.length ? overrides[a]! : [...KEYS[a]];
  }
  return map;
}

/** 一个动作现在的键位串（多个键用 / 隔开，重名去重——ShiftLeft+ShiftRight 都显示 Shift） */
export function bindingLabel(a: Action): string {
  const labels = getKeymap()[a].map(keyLabel);
  return [...new Set(labels)].join('/');
}

/** 这个键码现在归哪个动作（改键撞车时找"是谁占了"用） */
export function conflictOf(code: string, except?: Action): Action | null {
  const map = getKeymap();
  for (const a of Object.keys(map) as Action[]) {
    if (a !== except && map[a].includes(code)) return a;
  }
  return null;
}

export type BindResult = 'ok' | 'locked' | 'banned' | { conflict: Action };

/**
 * 给动作改键：slot 0=主键 1=副键。
 * 撞键不抢，返回占了键的动作名让界面提示；改完自动存（本地+服务器）。
 */
export function bindKey(a: Action, slot: 0 | 1, code: string): BindResult {
  if (LOCKED.has(a)) return 'locked';
  if (BANNED_CODES.has(code)) return 'banned';
  const owner = conflictOf(code, a);
  if (owner) return { conflict: owner };

  const list = [...getKeymap()[a]];
  const dup = list.indexOf(code);
  if (dup >= 0) list.splice(dup, 1); // 同一个动作里换个位置绑，先摘掉旧的
  if (slot >= list.length) list.push(code); else list[slot] = code;
  writeOverride(a, list.slice(0, 2));
  return 'ok';
}

/** 摘掉一个键位（只能摘到还剩一个——主键不能空） */
export function unbindKey(a: Action, slot: 0 | 1): boolean {
  const list = [...getKeymap()[a]];
  if (list.length <= 1 || slot >= list.length) return false;
  list.splice(slot, 1);
  writeOverride(a, list);
  return true;
}

/** 一键恢复全部默认键位 */
export function resetKeys(): void {
  setSettings({ keymap: {} });
}

export function isLocked(a: Action): boolean {
  return LOCKED.has(a);
}

/** 写改动：结果跟默认一样就不留痕（keymap 只存 diff） */
function writeOverride(a: Action, list: string[]): void {
  const overrides = { ...getSettings().keymap };
  const def = KEYS[a] as readonly string[];
  const same = list.length === def.length && list.every((c, i) => c === def[i]);
  if (same) delete overrides[a]; else overrides[a] = list;
  setSettings({ keymap: overrides });
}

/** 动作的中文名（设置面板列表用，顺序跟 KEYS 走） */
export const ACTION_LABEL: Record<Action, string> = {
  forward: '往前走', back: '往后退', turnLeft: '向左转', turnRight: '向右转',
  strafeLeft: '向左横移', strafeRight: '向右横移',
  lookUp: '抬头', lookDown: '低头', jump: '跳 / 往上升', descend: '飞的时候往下降',
  mine: '挖方块 / 打人', place: '放方块 / 用东西', door: '开关门 / 上下车',
  prevSlot: '选上一格', nextSlot: '选下一格', inventory: '打开背包', split: '拆分物品',
  eat: '吃东西', toggleHunger: '饥饿开关', toggleZombieSpawn: '僵尸生成开关',
  pause: '暂停', save: '手动存档', respawn: '回重生点', book: '制作方法',
  quit: '回主菜单', hall: '进出大厅', settings: '打开设置',
  board: '大厅留言板', mail: '我的信箱', give: '送礼物', chat: '聊天',
};
