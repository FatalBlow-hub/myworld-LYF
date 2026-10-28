/** 鼠标视角（PC 端）— 点一下画面锁定鼠标，之后移动鼠标就是转视角，跟主流沙盒一致。
 *
 *  为什么必须"点一下才锁"：浏览器只在用户手势（click）里才允许 requestPointerLock，
 *  页面一进来就锁会被拒绝，所以第一次要玩家点一下画面。
 *
 *  只在非手机版启用 —— 手机上没有鼠标，指针锁定还会把触摸事件吃掉，
 *  而虚拟按键（摇杆 + ▲▼）本来就能转视角。
 *
 *  用法：
 *    const look = new MouseLook(renderer.domElement);
 *    look.applyTo(body);   // 每帧、在 stepPhysics 之前调用，把攒下的鼠标位移加到朝向上
 *    look.exit();          // 开面板 / 暂停时必须解锁，否则鼠标点不到界面按钮
 */

import { MOUSE, PLAYER } from '../../config';
import type { PlayerBody } from './Physics';

/** requestPointerLock 在各浏览器返回值不一致：新版是 Promise，老版是 undefined */
type Lockable = HTMLElement & { requestPointerLock(): unknown };

export class MouseLook {
  private dx = 0; // 攒下的鼠标位移（像素），applyTo 时一次性取走
  private dy = 0;
  private locked = false;

  /** 锁定状态变化时回调（可以用来更新界面提示） */
  onLockChange: ((locked: boolean) => void) | null = null;
  /** 锁定被浏览器拒绝时回调（刚解锁的冷却期、隐私策略等），不能静默——否则玩家点了没反应还不知道为啥 */
  onLockFail: (() => void) | null = null;

  constructor(private el: HTMLElement) {
    el.addEventListener('click', () => {
      if (this.locked) return;
      try {
        const r = (this.el as Lockable).requestPointerLock();
        // 老版返回 undefined，新版返回 Promise；被拒时不能静默，要让玩家知道"这一下没锁上"
        if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => this.onLockFail?.());
      } catch {
        this.onLockFail?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.el;
      // 解锁瞬间丢掉攒下的位移，免得下次一锁定视角就突然跳一下
      if (!this.locked) { this.dx = 0; this.dy = 0; }
      this.onLockChange?.(this.locked);
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
  }

  /** 现在锁着吗 */
  get isLocked(): boolean {
    return this.locked;
  }

  /** 解锁（开背包、暂停、回菜单时用） */
  exit(): void {
    if (document.pointerLockElement === this.el) document.exitPointerLock();
  }

  /** 把攒下的鼠标位移加到玩家朝向上；没锁定或没位移就什么都不做 */
  applyTo(body: PlayerBody): void {
    if (!this.locked || (this.dx === 0 && this.dy === 0)) {
      this.dx = 0;
      this.dy = 0;
      return;
    }
    // 鼠标右移 = 右转（和 turnRight 一样是 yaw 减小）；鼠标上移 = 抬头（pitch 增大）
    // 喝了颠倒香蕉液（flipT > 0）左右转也反着来
    body.yaw -= (body.flipT > 0 ? -1 : 1) * this.dx * MOUSE.SENS;
    body.pitch += this.dy * (MOUSE.INVERT_Y ? 1 : -1) * MOUSE.SENS;
    body.pitch = Math.max(-PLAYER.LOOK_LIMIT, Math.min(PLAYER.LOOK_LIMIT, body.pitch));
    this.dx = 0;
    this.dy = 0;
  }
}
