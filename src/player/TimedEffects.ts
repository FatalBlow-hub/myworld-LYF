/** 定时伤害 — 玩家和生物共用，精确结算最后一次伤害且不受帧率影响 */

/** 一份中毒效果：每 every 秒扣 dmg 血，还剩 left 秒 */
interface Poison {
  dmg: number;
  every: number;
  t: number;
  left: number;
}

export class TimedEffects {
  private effects: Poison[] = [];

  add(dmg: number, every: number, dur: number): void {
    if (![dmg, every, dur].every(Number.isFinite) || dmg <= 0 || every <= 0 || dur <= 0) return;
    this.effects.push({ dmg, every, t: 0, left: dur });
  }

  update(dt: number, damage: (amount: number) => void): void {
    for (const p of this.effects) {
      const elapsed = Math.min(Math.max(0, dt), p.left);
      p.left = Math.max(0, p.left - elapsed);
      p.t += elapsed;
      const ticks = Math.floor((p.t + 1e-9) / p.every);
      if (ticks > 0) {
        p.t = Math.max(0, p.t - ticks * p.every);
        damage(p.dmg * ticks);
      }
    }
    this.effects = this.effects.filter((p) => p.left > 1e-9);
  }

  clear(): void {
    this.effects = [];
  }
}
