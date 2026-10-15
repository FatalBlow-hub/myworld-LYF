/** 触屏控制 — 手机/平板上显示的虚拟按键：左下摇杆管走路转向，右边按钮管挖/放/跳，
 *  顶上小按钮管 书/存/家/尸/停。所有按钮最终都喂给 Controller，跟键盘按一样 */

import { Action } from '../config';
import { Controller } from '../player/Controller';

/** 摇杆死区（像素）：推过这段距离才算按下那个方向 */
const DEADZONE = 14;

export class TouchControls {
  private held: Action[] = []; // 摇杆当前推着的方向

  constructor(private controller: Controller) {
    const root = document.createElement('div');
    root.className = 'touch-ui';
    root.innerHTML = `
      <div class="stick"><div class="stick-knob"></div></div>
      <div class="trow trow-slots">
        <button class="tbtn" data-act="prevSlot">◀</button>
        <button class="tbtn" data-act="eat">吃</button>
        <button class="tbtn" data-act="inventory">包</button>
        <button class="tbtn" data-act="nextSlot">▶</button>
      </div>
      <div class="tcol tcol-act">
        <button class="tbtn big" data-act="mine">挖</button>
        <button class="tbtn big" data-act="place">放</button>
        <button class="tbtn" data-act="door">用</button>
      </div>
      <div class="tcol tcol-look">
        <button class="tbtn" data-act="lookUp">▲</button>
        <button class="tbtn" data-act="jump">跳</button>
        <button class="tbtn" data-act="lookDown">▼</button>
        <button class="tbtn" data-act="descend">降</button>
      </div>
      <div class="trow trow-top">
        <button class="tbtn sm" data-act="book">书</button>
        <button class="tbtn sm" data-act="save">存</button>
        <button class="tbtn sm" data-act="respawn">家</button>
        <button class="tbtn sm" data-act="hall">厅</button>
        <button class="tbtn sm" data-act="toggleZombieSpawn">尸</button>
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
      if (dx < -DEADZONE) want.push('turnLeft');
      if (dx > DEADZONE) want.push('turnRight');
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

    document.body.appendChild(root);
  }
}
