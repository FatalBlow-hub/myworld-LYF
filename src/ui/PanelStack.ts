/** 面板管理器 — 统一管"现在哪个界面占着画面 / 按键交给谁 / 占着画面时世界暂停" */

import type { Action } from '../config';
import type { Controller } from '../player/Controller';

/** 一个能独占画面的界面：背包、箱子/熔炉、染色台、收集册、睡觉黑屏 */
export interface PanelEntry {
  /** 面板名字（查状态、防重复注册用） */
  name: string;
  /** 现在开着吗 */
  isOpen(): boolean;
  /** 关掉它（睡觉黑屏这种关不掉的，传空实现） */
  close(): void;
  /** 开着时每帧要做的事：熔炉继续烧、黑屏动画推进…… */
  update?(dt: number): void;
  /** 开着时的按键处理；关门键已被管理器吃掉，这里只管面板内部操作 */
  keys?(controller: Controller): void;
  /** 除了 9 / ESC 之外还能关掉它的键（B 关收集册、M 关箱子） */
  closeKeys?: Action[];
}

export class PanelStack {
  private entries: PanelEntry[] = [];

  /** 注册一个界面；注册顺序 = 优先级，越靠前越先接管画面（同名覆盖，方便换档重开） */
  register(entry: PanelEntry): void {
    const i = this.entries.findIndex((e) => e.name === entry.name);
    if (i >= 0) this.entries[i] = entry; else this.entries.push(entry);
  }

  /** 当前占着画面的界面，没有返回 null */
  top(): PanelEntry | null {
    return this.entries.find((e) => e.isOpen()) ?? null;
  }

  /** 有界面占着画面吗（有就说明世界该暂停） */
  get busy(): boolean {
    return this.top() !== null;
  }

  /** 指定名字的界面开着吗 */
  isOpen(name: string): boolean {
    return this.entries.find((e) => e.name === name)?.isOpen() ?? false;
  }

  /** 全部关掉（退出/换档时用） */
  closeAll(): void {
    for (const e of this.entries) if (e.isOpen()) e.close();
  }

  /**
   * 每帧：有界面开着就接管本帧（先判关门键，再交给面板按键，最后跑它自己的 update）
   * @returns true = 画面被接管，世界暂停，本帧到此为止
   */
  handleFrame(dt: number, controller: Controller): boolean {
    const top = this.top();
    if (!top) return false;
    const closing = controller.take('inventory') || controller.take('pause')
      || (top.closeKeys ?? []).some((key) => controller.take(key));
    if (closing) top.close();
    else top.keys?.(controller);
    top.update?.(dt);
    return true;
  }
}
