/** 昼夜 + 睡觉 — 一天 120 秒，第 80 秒天黑；天黑了对床按 M，黑屏一秒变早上（顺带过一天） */

import { DAY } from '../../config';
import { Renderer } from '../../render/Renderer';
import { advanceDate, GameDate, START_DATE } from './Calendar';

export class DayCycle {
  /** 今天第几秒（0~120，80 以后是黑夜） */
  time = 0;
  /** 游戏内日期：走过零点、睡过夜都会往后翻一天（开局 7 月 8 日） */
  date: GameDate = { ...START_DATE };
  /** 睡觉黑屏进度：-1 = 没睡；0~SLEEP_SECONDS 是黑屏动画 */
  private sleepT = -1;
  private sleepSwapped = false;
  private el: HTMLDivElement;

  /** onNightfall：刚天黑时喊一声（显示提示）；onWake：黑屏放完该起床了；onNewDay：翻到新的一天了 */
  constructor(
    private onNightfall: () => void,
    private onWake?: () => void,
    private onNewDay?: (d: GameDate) => void,
  ) {
    this.el = document.createElement('div');
    this.el.id = 'sleepfade';
    document.body.appendChild(this.el);
  }

  /** 睡觉中（黑屏动画在播，世界该暂停） */
  get sleeping(): boolean {
    return this.sleepT >= 0;
  }

  /** 现在有多亮：1 = 大白天，0 = 深夜；黄昏/黎明各渐变 RAMP 秒 */
  daylight(): number {
    const t = this.time;
    const duskStart = DAY.NIGHT_FROM - DAY.RAMP;
    const dawnStart = DAY.LENGTH - DAY.RAMP;
    if (t < duskStart) return 1;
    if (t < DAY.NIGHT_FROM) return 1 - (t - duskStart) / DAY.RAMP;
    if (t < dawnStart) return 0;
    return (t - dawnStart) / DAY.RAMP;
  }

  /** 对床按 M：天黑才睡得着；返回睡没睡成 */
  trySleep(): boolean {
    if (this.time < DAY.NIGHT_FROM) return false;
    this.sleepT = 0;
    this.sleepSwapped = false;
    this.el.style.display = 'block';
    this.el.style.opacity = '0';
    return true;
  }

  /** 每帧：睡觉就放黑屏动画（中途拨到早上）；没睡就让时间走、天黑了喊一声 */
  update(dt: number, renderer: Renderer): void {
    if (this.sleepT >= 0) {
      this.sleepT += dt;
      const p = Math.min(1, this.sleepT / DAY.SLEEP_SECONDS);
      this.el.style.opacity = String(Math.sin(p * Math.PI)); // 先黑下去再亮回来
      if (p >= 0.5 && !this.sleepSwapped) {
        this.sleepSwapped = true;
        this.time = 0; // 一觉睡到早上
        this.nextDay(); // 睡过夜也算过了一天（季节会跟着往前推）
      }
      if (p >= 1) {
        this.sleepT = -1;
        this.el.style.display = 'none';
        this.onWake?.(); // 起床：把玩家放回床边
      }
      renderer.setDaylight(this.daylight());
      return;
    }
    const wasDay = this.time < DAY.NIGHT_FROM;
    const next = this.time + dt;
    if (next >= DAY.LENGTH) this.nextDay(); // 走过零点，翻到第二天
    this.time = next % DAY.LENGTH;
    if (wasDay && this.time >= DAY.NIGHT_FROM) this.onNightfall();
    renderer.setDaylight(this.daylight());
  }

  /** 读档：把日期设成存档里的那一天 */
  setDate(d: GameDate): void {
    this.date = { ...d };
  }

  /** 往后翻一天：零点跨天和睡过夜都走这里，翻完喊一声让 HUD 刷新 */
  private nextDay(): void {
    this.date = advanceDate(this.date);
    this.onNewDay?.(this.date);
  }
}
