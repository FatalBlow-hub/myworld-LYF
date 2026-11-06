/** 新手教程 — 顶部大横幅，一次只推一条当前任务
 *  「必会」7 步落地就能做完；「进阶」3 步（吃/门/睡）得先有东西，什么时候做到什么时候算
 *  提前做了后面的步骤会默默记上，横幅永远指向"最前一条没做的"
 *  「看过教程」记进账号设置（Settings.tutorialDone 跟账号走），毕业或点「跳过」后新档不再自动弹 */

import { PlayerBody } from '../../player/motion/Physics';
import { bindingLabel } from '../account/Keymap';
import { setSettings } from '../account/Settings';
import { isMobile } from '../touch/Platform';

export type TutorialStep =
  | 'move' | 'look' | 'dig' | 'place' | 'inventory' | 'book' | 'save'
  | 'eat' | 'door' | 'sleep';

interface Step { id: TutorialStep; text: () => string }

/** 必会：新档落地就能做的一串（文字跟着当前键表走，改过键显示新键） */
const MUST: Step[] = [
  { id: 'move', text: () => isMobile() ? '推着左下摇杆走几步' : `按 ${bindingLabel('forward')}${bindingLabel('strafeLeft')}${bindingLabel('back')}${bindingLabel('strafeRight')} 走几步` },
  { id: 'look', text: () => isMobile() ? '在屏幕空白处拖动，看看四周' : '点一下画面锁住鼠标，动动鼠标看四周' },
  { id: 'dig', text: () => isMobile() ? '指着方块按住「挖」，挖掉一个' : `指着方块按住 ${bindingLabel('mine')}，挖掉一个` },
  { id: 'place', text: () => isMobile() ? '按「放」把挖到的方块放出来' : `按 ${bindingLabel('place')} 把挖到的方块放出来` },
  { id: 'inventory', text: () => isMobile() ? '按「包」打开背包看看' : `按 ${bindingLabel('inventory')} 打开背包看看` },
  { id: 'book', text: () => isMobile() ? '按「书」翻翻制作方法' : `按 ${bindingLabel('book')} 翻翻制作方法` },
  { id: 'save', text: () => isMobile() ? '按「存」手动存个档' : `按 ${bindingLabel('save')} 手动存个档` },
];

/** 进阶：手里得先有吃的/门/床才做得了，不着急 */
const BONUS: Step[] = [
  { id: 'eat', text: () => isMobile() ? '弄到吃的后，拿着按「吃」' : `弄到吃的后，拿着按 ${bindingLabel('eat')} 吃一口` },
  { id: 'door', text: () => isMobile() ? '有了门以后，对着它按「用」开关' : `有了门以后，对着它按 ${bindingLabel('door')} 开关` },
  { id: 'sleep', text: () => isMobile() ? '天黑了对着床按「用」睡觉' : `天黑了对着床按 ${bindingLabel('door')} 睡觉` },
];

const ORDER = [...MUST, ...BONUS];
const MOVE_DIST = 4;  // 走出几格算"会走路了"
const LOOK_RAD = 2;   // 累计转多少弧度算"会看四周了"
const CHEER_MS = 800; // 打钩后 ✅ 闪多久再推下一条

export class Tutorial {
  private el: HTMLDivElement | null = null;
  private taskEl: HTMLDivElement | null = null;
  private progEl: HTMLSpanElement | null = null;
  private badgeEl: HTMLSpanElement | null = null;
  private done = new Set<TutorialStep>();
  private anchor: { x: number; z: number } | null = null;
  private lastYaw = 0;
  private lastPitch = 0;
  private lookAcc = 0;
  /** 打钩庆祝中：庆祝期间不刷新任务文字，免得 ✅ 一闪就换 */
  private cheering = false;
  private mustCheered = false;
  /** 呼吸光圈动画：收横幅时要手动停，不然无限动画吊着元素不放 */
  private glow: Animation | null = null;

  get active(): boolean { return this.el !== null; }

  /** 开局挂上横幅；body 用来认"走没走、转没转" */
  start(body: PlayerBody): void {
    this.stop(false);
    this.done.clear();
    this.lookAcc = 0;
    this.cheering = false;
    this.mustCheered = false;
    this.anchor = { x: body.x, z: body.z };
    this.lastYaw = body.yaw;
    this.lastPitch = body.pitch;

    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed', zIndex: '40', left: '50%', transform: 'translateX(-50%)',
      top: isMobile() ? '56px' : '14px',
      minWidth: '300px', maxWidth: isMobile() ? '88vw' : '460px',
      background: 'rgba(20,22,30,0.88)', border: '1px solid #8ec07c',
      borderRadius: '12px', padding: '10px 16px', textAlign: 'center',
      color: '#f2f4f8', fontSize: '15px',
    } as Partial<CSSStyleDeclaration>);
    // 呼吸光圈：提醒"这儿有任务要做"，不影响布局
    this.glow = this.el.animate(
      [{ boxShadow: '0 0 0 rgba(142,192,124,0)' }, { boxShadow: '0 0 18px rgba(142,192,124,0.55)' }],
      { duration: 1400, iterations: Infinity, direction: 'alternate' },
    );

    const head = document.createElement('div');
    Object.assign(head.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: '12px', opacity: '0.85', marginBottom: '2px',
    });
    this.badgeEl = document.createElement('span');
    const title = document.createElement('span');
    title.textContent = '📒 新手任务';
    this.progEl = document.createElement('span');
    head.append(this.badgeEl, title, this.progEl);
    this.el.appendChild(head);

    this.taskEl = document.createElement('div');
    Object.assign(this.taskEl.style, { fontSize: '16px', fontWeight: '700', lineHeight: '1.5' });
    this.el.appendChild(this.taskEl);

    const skip = document.createElement('button');
    skip.textContent = '跳过教程';
    Object.assign(skip.style, {
      marginTop: '4px', padding: '2px 10px', border: 'none', borderRadius: '6px', fontSize: '11px',
      background: 'transparent', color: '#f2f4f8', cursor: 'pointer', opacity: '0.55',
      textDecoration: 'underline',
    } as Partial<CSSStyleDeclaration>);
    skip.addEventListener('click', () => this.stop());
    this.el.appendChild(skip);

    document.body.appendChild(this.el);
    this.refresh();
  }

  /** 收横幅；记「看过了」（start 里重建时不记） */
  stop(markSeen = true): void {
    this.glow?.cancel();
    this.glow = null;
    this.el?.remove();
    this.el = null;
    if (markSeen) setSettings({ tutorialDone: true });
  }

  /** 游戏事件进来打钩（挖/放/吃/门/睡/背包/书/存档从事件来） */
  mark(id: TutorialStep): void {
    if (!this.el || this.done.has(id)) return;
    this.done.add(id);
    if (id === this.nextStep()?.id) this.cheer('✅ 完成！');
    this.refresh();
  }

  /** 每帧查"走没走、转没转"（这俩没有现成事件，看身体数值） */
  frame(body: PlayerBody): void {
    if (!this.el || !this.anchor) return;
    if (!this.done.has('move') && Math.hypot(body.x - this.anchor.x, body.z - this.anchor.z) >= MOVE_DIST) {
      this.mark('move');
    }
    if (!this.done.has('look')) {
      // 累加转过的角度（yaw 跨过 ±π 要绕回来算）
      let dy = body.yaw - this.lastYaw;
      dy -= Math.round(dy / (Math.PI * 2)) * Math.PI * 2;
      this.lookAcc += Math.abs(dy) + Math.abs(body.pitch - this.lastPitch);
      if (this.lookAcc >= LOOK_RAD) this.mark('look');
    }
    this.lastYaw = body.yaw;
    this.lastPitch = body.pitch;
  }

  /** 最前一条没做的（横幅永远指它） */
  private nextStep(): Step | null {
    return ORDER.find((s) => !this.done.has(s.id)) ?? null;
  }

  /** 刷新横幅：当前任务 + 进度 + 组别；全毕业 → 庆祝收摊 */
  private refresh(): void {
    if (!this.el || !this.taskEl || !this.progEl || !this.badgeEl || this.cheering) return;
    const next = this.nextStep();
    if (!next) {
      this.taskEl.textContent = '🎉 教程全完成，毕业啦！';
      this.badgeEl.textContent = '';
      this.progEl.textContent = `${ORDER.length}/${ORDER.length}`;
      setTimeout(() => this.stop(), 2500);
      return;
    }
    // 必会刚全绿：多夸一句再推第一条进阶（庆祝文字不能被下面盖掉，提前返回）
    if (!this.mustCheered && MUST.every((s) => this.done.has(s.id))) {
      this.mustCheered = true;
      this.cheer('必会全完成！后面是进阶挑战～');
      return;
    }
    this.badgeEl.textContent = BONUS.includes(next) ? '进阶' : '必会';
    this.progEl.textContent = `${this.done.size}/${ORDER.length}`;
    this.taskEl.textContent = next.text();
  }

  /** 打钩庆祝：大字闪一下再推下一条 */
  private cheer(text: string): void {
    if (!this.taskEl) return;
    this.cheering = true;
    this.taskEl.textContent = text;
    this.taskEl.style.color = '#8ec07c';
    setTimeout(() => {
      this.cheering = false;
      if (this.taskEl) this.taskEl.style.color = '';
      this.refresh();
    }, CHEER_MS);
  }
}
