/** 键盘输入 — 持续按着的键算"按住"，刚按下的键算"点了一下" */

import { Action, KEYS } from '../config';

export class Controller {
  private down = new Set<Action>();
  private pressed = new Set<Action>();
  private codeToAction = new Map<string, Action>();
  /** 菜单界面时关掉，免得按键乱触发 */
  active = false;

  constructor() {
    for (const action of Object.keys(KEYS) as Action[]) {
      for (const code of KEYS[action]) {
        this.codeToAction.set(code, action);
      }
    }

    addEventListener('keydown', (e) => {
      const action = this.codeToAction.get(e.code);
      if (!action || !this.active) return;
      e.preventDefault();
      if (!e.repeat) this.pressed.add(action);
      this.down.add(action);
    });
    addEventListener('keyup', (e) => {
      const action = this.codeToAction.get(e.code);
      if (action) this.down.delete(action);
    });
    // 切走窗口时松开所有键，不然会"卡键"
    addEventListener('blur', () => this.down.clear());
  }

  /** 触屏按钮按下：等于键盘按下（菜单没开始时按了也不算） */
  press(action: Action): void {
    if (!this.active) return;
    this.pressed.add(action);
    this.down.add(action);
  }

  /** 触屏按钮松开：等于键盘抬起 */
  release(action: Action): void {
    this.down.delete(action);
  }

  /** 这个键现在正按着吗（移动、转向用） */
  isDown(action: Action): boolean {
    return this.down.has(action);
  }

  /** 这一帧有没有"刚按下"（挖掘、放置用），取走一次就清掉 */
  take(action: Action): boolean {
    const had = this.pressed.has(action);
    this.pressed.delete(action);
    return had;
  }

  /** 每帧结束时清掉"刚按下"标记 */
  endFrame(): void {
    this.pressed.clear();
  }
}
