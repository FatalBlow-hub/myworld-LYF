/** 玩家伤害统一入口 — 只负责扣血并报告结果，提示与重生交给上层（这样 player 层不用反向依赖 ui/core） */

import { Health } from './Health';

export interface DamageResult {
  /** 真的扣血了吗（创造模式 / 无敌帧返回 false） */
  hurt: boolean;
  /** 扣完血是不是死了 */
  died: boolean;
}

/**
 * 对玩家造成伤害
 * @returns 受伤与死亡结果；调用方按自己的方式提示与重生
 */
export function hurtPlayer(health: Health, amount: number): DamageResult {
  const hurt = health.damage(amount);
  return { hurt, died: health.hp <= 0 };
}
