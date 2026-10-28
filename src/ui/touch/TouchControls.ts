/** 触屏控制 — 手机/平板上显示的虚拟按键：左下摇杆管走路转向，右边按钮管挖/放/跳，
 *  顶上小按钮管 书/存/家/尸/停。所有按钮最终都喂给 Controller，跟键盘按一样 */

import { Action, PLAYER, TOUCH } from '../../config';
import { Controller } from '../../player/motion/Controller';
import type { PlayerBody } from '../../player/motion/Physics';

/** 摇杆死区（像素）：推过这段距离才算按下那个方向 */
const DEADZONE = 14;

export class TouchControls {
  private held: Action[] = []; // 摇杆当前推着的方向
  private lookDx = 0;          // 视角板上攒下的拖动位移（像素）
  private lookDy = 0;
  private padId = -1;          // 跟着视角板的那根手指
  private rootEl: HTMLElement | null = null;

  constructor(private controller: Controller) {
    const root = document.createElement('div');
    root.className = 'touch-ui';
    this.rootEl = root;
    // 视角板放最前面：按钮和摇杆是它的兄弟节点、排在后面，自然盖在它上面，
    // 所以按按钮不会被视角板吃掉，拖空白处才转视角
    root.innerHTML = `
      <div class="lookpad"></div>
      <div class="stick"><div class="stick-knob"></div></div>
      <!-- 换格子不用 ◀▶ 了：直接点快捷栏那一格就行（见 Hud.onSlotPick），比一格格挪快得多 -->
      <div class="trow trow-slots">
        <button class="tbtn" data-act="eat">吃</button>
        <button class="tbtn" data-act="inventory">包</button>
      </div>
      <div class="tcol tcol-act">
        <button class="tbtn big" data-act="mine">挖</button>
        <button class="tbtn big" data-act="place">放</button>
        <button class="tbtn" data-act="door">用</button>
      </div>
      <div class="tcol tcol-extra">
        <button class="tbtn" data-act="jump">跳</button>
        <button class="tbtn" data-act="descend">降</button>
      </div>
      <!-- 转身按钮放右下角：摇杆左右已经改成横移了，转身需要有个明确的按钮。
           用 ↺↻ 而不是 ◀▶，免得跟下面「◀ 吃 包 ▶」那排的换格子键撞脸 -->
      <div class="trow trow-turn">
        <button class="tbtn sm" data-act="turnLeft">↺</button>
        <button class="tbtn sm" data-act="turnRight">↻</button>
      </div>
      <div class="trow trow-top">
        <button class="tbtn sm" data-act="give">给</button>
        <button class="tbtn sm" data-act="chat">聊</button>
        <button class="tbtn sm" data-act="book">书</button>
        <button class="tbtn sm" data-act="save">存</button>
        <button class="tbtn sm" data-act="respawn">家</button>
        <button class="tbtn sm" data-act="hall">厅</button>
        <button class="tbtn sm" data-act="toggleZombieSpawn">尸</button>
        <button class="tbtn sm" data-act="settings">设</button>
        <button class="tbtn sm" data-act="pause">停</button>
      </div>
      <div class="rotate-tip">横过来玩更舒服～</div>
    `;

    // —— 普通按钮：按下 = 键盘按下，抬手 = 抬起（setPointerCapture 保证手指划出按钮也能收到抬手） ——
    root.querySelectorAll<HTMLElement>('[data-act]').forEach((el) => {
      const act = el.dataset.act as Action;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { el.setPointerCapture(e.pointerId); } catch { /* 个别浏览器认生，不碍事 */ }
        this.controller.press(act);
      });
      const up = (e: PointerEvent) => {
        e.preventDefault();
        this.controller.release(act);
      };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      // 手指按着划出按钮也算松开（没 capture 上的情况下兜底）
      el.addEventListener('pointerleave', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault()); // 长按别弹菜单
    });

    // —— 摇杆：按方向映射成 前/后/左转/右转 四个键 ——
    const stick = root.querySelector<HTMLElement>('.stick')!;
    const knob = root.querySelector<HTMLElement>('.stick-knob')!;
    let pid = -1; // 跟着摇杆的那根手指
    const clear = () => {
      this.held.forEach((d) => this.controller.release(d));
      this.held = [];
      knob.style.transform = '';
    };
    const steer = (e: PointerEvent) => {
      const r = stick.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2);
      let dy = e.clientY - (r.top + r.height / 2);
      const max = r.width / 2 - 10; // 摇杆头别跑出圈
      const len = Math.hypot(dx, dy) || 1;
      const k = Math.min(len, max) / len;
      dx *= k; dy *= k;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const want: Action[] = [];
      if (dy < -DEADZONE) want.push('forward');
      if (dy > DEADZONE) want.push('back');
      // 左右推 = 横移（平移身子），不再是转身 —— 转身交给右侧拖动的视角板
      if (dx < -DEADZONE) want.push('strafeLeft');
      if (dx > DEADZONE) want.push('strafeRight');
      this.held.filter((d) => !want.includes(d)).forEach((d) => this.controller.release(d));
      want.filter((d) => !this.held.includes(d)).forEach((d) => this.controller.press(d));
      this.held = want;
    };
    stick.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      pid = e.pointerId;
      try { stick.setPointerCapture(pid); } catch { /* 同上 */ }
      steer(e);
    });
    stick.addEventListener('pointermove', (e) => { if (e.pointerId === pid) steer(e); });
    const end = (e: PointerEvent) => { if (e.pointerId === pid) { pid = -1; clear(); } };
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);
    stick.addEventListener('contextmenu', (e) => e.preventDefault());

    // —— 视角板：整屏空白处拖动就转视角，等于给手机配了个"鼠标" ——
    const pad = root.querySelector<HTMLElement>('.lookpad')!;
    let padX = 0;
    let padY = 0;
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.padId = e.pointerId;
      padX = e.clientX;
      padY = e.clientY;
      try { pad.setPointerCapture(this.padId); } catch { /* 个别浏览器认生，不碍事 */ }
    });
    pad.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.padId) return;
      this.lookDx += e.clientX - padX;
      this.lookDy += e.clientY - padY;
      padX = e.clientX;
      padY = e.clientY;
    });
    const padEnd = (e: PointerEvent) => { if (e.pointerId === this.padId) this.padId = -1; };
    pad.addEventListener('pointerup', padEnd);
    pad.addEventListener('pointercancel', padEnd);

    document.body.appendChild(root);
  }

  /** 暂停 / 开面板时把攒下的拖动丢掉 —— 这些帧不应用视角，留着会在恢复那一瞬间跳一下 */
  cancelLook(): void {
    this.lookDx = 0;
    this.lookDy = 0;
  }

  /** 创造模式才显示「降」：descend 只在飞行时生效，生存模式下它是个废键，不占地方 */
  setFlying(flying: boolean): void {
    const btn = this.rootEl?.querySelector<HTMLElement>('[data-act="descend"]');
    if (btn) btn.style.display = flying ? '' : 'none';
  }

  /** 僵尸攻击关着就不显示「尸」：生成开关跟着攻击走，不能单独调，点不开的按钮不如藏起来 */
  setZombieSpawnVisible(on: boolean): void {
    const btn = this.rootEl?.querySelector<HTMLElement>('[data-act="toggleZombieSpawn"]');
    if (btn) btn.style.display = on ? '' : 'none';
  }

  /** 把视角板上攒下的拖动加到玩家朝向上（每帧、在 stepPhysics 之前调一次） */
  applyLookTo(body: PlayerBody): void {
    if (this.lookDx === 0 && this.lookDy === 0) return;
    body.yaw -= (body.flipT > 0 ? -1 : 1) * this.lookDx * TOUCH.LOOK_SENS; // 颠倒香蕉液：左右转反着来
    body.pitch += this.lookDy * (TOUCH.INVERT_Y ? 1 : -1) * TOUCH.LOOK_SENS;
    body.pitch = Math.max(-PLAYER.LOOK_LIMIT, Math.min(PLAYER.LOOK_LIMIT, body.pitch));
    this.lookDx = 0;
    this.lookDy = 0;
  }
}
