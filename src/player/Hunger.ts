/** 饥饿 — 7 格鸡腿条、消耗计时、O 键开关、归零扣血判定与食物加速辅助 */

import { BOOST, HUNGER } from '../config';
import { GameMode } from './Health';
import { PlayerBody } from './Physics';

export class Hunger {
  /** 当前饥饿值（0 ~ HUNGER.MAX） */
  value = HUNGER.MAX;
  /** 饥饿模式开关（每档独立，默认关闭；关闭时暂停消耗、保留当前值） */
  enabled = false;
  private drainTimer = 0;
  private starveTimer = 0;

  constructor(private mode: GameMode) {}

  /** 切换饥饿模式开关，返回切换后的状态 */
  toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  /** 吃东西恢复饥饿值（夹在 0 ~ HUNGER.MAX 之间） */
  eat(delta: number): void {
    if (this.mode === 'creative') return;
    this.value = Math.min(HUNGER.MAX, Math.max(0, this.value + delta));
    if (this.value > 0) this.starveTimer = 0;
  }

  /** 每帧更新：开启时每 60 秒掉 1 格；归零后每 2 秒触发一次饥饿扣血，返回本帧应扣的总血量 */
  update(dt: number): number {
    if (this.mode === 'creative' || !this.enabled) return 0;

    if (this.value > 0) {
      this.starveTimer = 0;
      this.drainTimer += dt;
      while (this.drainTimer >= HUNGER.DRAIN_EVERY && this.value > 0) {
        this.drainTimer -= HUNGER.DRAIN_EVERY;
        this.value = Math.max(0, this.value - 1);
      }
      if (this.value === 0) {
        this.drainTimer = 0;
      }
      return 0;
    }

    this.starveTimer += dt;
    let dmg = 0;
    while (this.starveTimer >= HUNGER.STARVE_EVERY) {
      this.starveTimer -= HUNGER.STARVE_EVERY;
      dmg += HUNGER.STARVE_DAMAGE;
    }
    return dmg;
  }

  /** 死亡重生：饥饿回满 7 格，计时清零（开关状态保持不变） */
  respawn(): void {
    this.value = HUNGER.MAX;
    this.drainTimer = 0;
    this.starveTimer = 0;
  }
}

/** 给玩家施加食物速度加成（复用 body.speedBoostT；为 A11 橙子 3 秒 ×1.25 预留） */
export function applySpeedBoost(body: PlayerBody, seconds: number, _mult = BOOST.ORANGE_MULT): void {
  body.speedBoostT = Math.max(body.speedBoostT, seconds);
}
