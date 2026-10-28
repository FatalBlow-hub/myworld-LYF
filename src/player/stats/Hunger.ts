/** 饥饿 — 7 格鸡腿条、消耗计时、O 键开关、归零扣血判定与食物加速辅助 */

import { BOOST, HUNGER, POTION } from '../../config';
import { GameMode } from './Health';
import { PlayerBody } from '../motion/Physics';

export class Hunger {
  /** 当前饥饿值（0 ~ HUNGER.MAX） */
  value = HUNGER.MAX;
  /** 饥饿模式开关（每档独立，默认关闭；关闭时暂停消耗、保留当前值） */
  enabled = false;
  private drainTimer = 0;
  private starveTimer = 0;
  private potionT = 0;      // 药水效果剩余秒数（喝药水时登记）
  private potionDrainT = 0; // 药水扣饥饿计时

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

  /** 喝了药水：接下来 seconds 秒里效果持续，期间每 POTION.HUNGER_EVERY 秒多扣 1 点饥饿 */
  setPotion(seconds: number): void {
    if (!(seconds > 0)) return;
    this.potionT = Math.max(this.potionT, seconds);
    this.potionDrainT = 0;
  }

  /** 每帧更新：开启时每 60 秒掉 1 格；药水效果期间每 10 秒多扣 1 格；归零后每 2 秒触发一次饥饿扣血，返回本帧应扣的总血量 */
  update(dt: number): number {
    if (this.mode === 'creative' || !this.enabled) return 0;
    this.potionT = Math.max(0, this.potionT - dt);

    if (this.value > 0) {
      this.starveTimer = 0;
      this.drainTimer += dt;
      while (this.drainTimer >= HUNGER.DRAIN_EVERY && this.value > 0) {
        this.drainTimer -= HUNGER.DRAIN_EVERY;
        this.value = Math.max(0, this.value - 1);
      }
      // 药水扣饥饿（2026-10-29 设定）：效果期间每 10 秒多扣 1 点
      if (this.potionT > 0) {
        this.potionDrainT += dt;
        while (this.potionDrainT >= POTION.HUNGER_EVERY && this.value > 0) {
          this.potionDrainT -= POTION.HUNGER_EVERY;
          this.value = Math.max(0, this.value - 1);
        }
      } else {
        this.potionDrainT = 0;
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
    this.potionT = 0;
    this.potionDrainT = 0;
  }
}

/** 给玩家施加食物速度加成（复用 body.speedBoostT 与 body.speedBoostMult） */
export function applySpeedBoost(body: PlayerBody, seconds: number, mult = BOOST.ORANGE_MULT): void {
  body.speedBoostT = Math.max(body.speedBoostT, seconds);
  body.speedBoostMult = mult;
}
