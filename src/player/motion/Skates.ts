/** 轮滑鞋模块 — 穿靴子格走路×1.5，连续滑会摔跤，摔 3 次鞋烂掉 */

import { SKATES } from '../../config';
import { ROLLER_SKATES, Slots } from '../../world/blocks/Block';
import { PlayerBody } from './Physics';

/** 滑行计时和摔倒次数结算 */
export class SkateSystem {
  private timer = 0;

  update(body: PlayerBody, armor: Slots, dt: number, moved: boolean): string | null {
    const result = tickSkates(body, armor, dt, this.timer, moved);
    this.timer = result.skateT;
    return result.msg;
  }

  reset(): void {
    this.timer = 0;
  }
}

/** 靴子格里现在穿的是不是轮滑鞋 */
export function wearingSkates(armor: Slots): boolean {
  return armor[3]?.id === ROLLER_SKATES;
}

/**
 * 每帧结算滑行计时（要在 stepPhysics 之后调，才看得到这一帧真实速度）。
 * 返回新的计时和要弹给玩家的提示（null = 没事）。
 */
export function tickSkates(body: PlayerBody, armor: Slots, dt: number, skateT: number, moved: boolean): { skateT: number; msg: string | null } {
  if (body.skateFallT > 0) return { skateT: 0, msg: null };
  // 没穿鞋 / 站住了 / 在空中：连续滑行中断，计时归零
  if (!body.skating || !moved || !body.onGround) return { skateT: 0, msg: null };
  skateT += dt;
  if (skateT < SKATES.SLIP_EVERY) return { skateT, msg: null };
  const boots = armor[3];
  if (!boots || boots.id !== ROLLER_SKATES) return { skateT: 0, msg: null };
  boots.durability = Math.max(0, (boots.durability ?? SKATES.MAX_FALLS) - 1);
  body.skateFallT = SKATES.FALL_SECONDS;
  if (boots.durability <= 0) {
    armor[3] = null;
    return { skateT: 0, msg: '摔了 3 次，轮滑鞋摔烂啦！' };
  }
  return { skateT: 0, msg: `摔了一跤！轮滑鞋还剩 ${boots.durability} 次耐久` };
}

