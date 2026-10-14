/** 玩家镜头效果 — 幻泽液摇头、轮滑摔倒时侧倾 */

import { SKATES, SWAY } from '../config';

/** 幻泽液头晕：左 30°（1秒）→ 右 30°（1秒）→ 回正（1秒），循环 */
export function cameraYawSway(swayT: number, elapsed = SWAY.CYCLE - (swayT % SWAY.CYCLE)): number {
  if (swayT <= 0) return 0;
  const t = elapsed % SWAY.CYCLE;
  const phase = SWAY.CYCLE / 3;
  if (t < phase) return SWAY.ANGLE * t / phase;
  if (t < phase * 2) return SWAY.ANGLE * (1 - 2 * ((t - phase) / phase));
  return SWAY.ANGLE * ((t - SWAY.CYCLE) / phase);
}

/** 第一人称镜头向侧边倒下，停一会儿，再慢慢扶正 */
export function cameraFallRoll(remaining: number): number {
  if (remaining <= 0) return 0;
  const elapsed = SKATES.FALL_SECONDS - remaining;
  const tilt = SKATES.FALL_TILT_SECONDS;
  const ease = (t: number) => t * t * (3 - 2 * t);
  if (elapsed < tilt) return SKATES.FALL_ANGLE * ease(elapsed / tilt);
  if (remaining < tilt) return SKATES.FALL_ANGLE * ease(remaining / tilt);
  return SKATES.FALL_ANGLE;
}
