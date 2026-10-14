/** 生命 — 血条、氧气、伤害结算；创造模式同一套事件进来但全部免疫 */

import { EAT_HP, FoodEffect, HEALTH, SWAMP_HURT, SWAY } from '../config';
import { SWAMP_DEEP, SWAMP_LIGHT, SWAMP_MID, SWAMP_PHANTOM } from '../world/Block';
import { PlayerBody } from './Physics';
import { TimedEffects } from './TimedEffects';

export type GameMode = 'survival' | 'creative';

export interface HealthEvents {
  /** 本帧死了吗（血量扣到 0） */
  died: boolean;
  /** 本帧受伤了吗（HUD 可以闪一下） */
  hurt: boolean;
}

/** 每种泽液的扣血节奏表（溺泽液不在表里——它是"水"，憋气扣血走溺水那套） */
const SWAMP_RULE: Record<number, { dmg: number; every: number }> = {
  [SWAMP_LIGHT]: SWAMP_HURT.LIGHT,
  [SWAMP_MID]: SWAMP_HURT.MID,
  [SWAMP_PHANTOM]: SWAMP_HURT.PHANTOM,
  [SWAMP_DEEP]: SWAMP_HURT.DEEP,
};

export class Health {
  hp = HEALTH.MAX_HP;
  oxygen = HEALTH.OXYGEN_MAX;
  private drownTimer = 0;
  private invincible = 0;
  private regenT = 0; // 自动回血计时
  private swampT = 0; // 泡在泽液里的扣血计时
  private poisons = new TimedEffects(); // 中的毒（药水瓶砸的/喝的）
  private swampId = 0;

  constructor(private mode: GameMode, private onRespawn?: () => void) {}

  /** 统一的伤害入口：摔落/溺水/以后的怪物攻击都走这里 */
  damage(amount: number): boolean {
    if (this.mode === 'creative' || this.invincible > 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    return true;
  }

  get hearts(): number {
    return Math.ceil(this.hp / 2);
  }

  get showStats(): boolean {
    return this.mode === 'survival';
  }

  update(dt: number, body: PlayerBody, fallDistance: number): HealthEvents {
    const ev: HealthEvents = { died: false, hurt: false };
    this.invincible = Math.max(0, this.invincible - dt);

    // 泡在泽液里按各自的节奏掉血（离开泽液计时清零）
    if (this.swampId !== body.swampId) this.swampT = 0;
    this.swampId = body.swampId;
    const rule = SWAMP_RULE[body.swampId];
    if (rule) {
      this.swampT += dt;
      while (this.swampT + 1e-9 >= rule.every) {
        this.swampT = Math.max(0, this.swampT - rule.every);
        if (this.damage(rule.dmg)) ev.hurt = true;
      }
      if (body.swampId === SWAMP_PHANTOM) body.swayT = SWAY.LINGER; // 泡幻泽液一直头晕
    } else {
      this.swampT = 0;
    }

    // 中毒效果发作：每种的毒自己数自己的秒
    this.poisons.update(dt, (amount) => { if (this.damage(amount)) ev.hurt = true; });
    body.swayPhase = body.swayT > 0 ? (body.swayPhase + dt) % SWAY.CYCLE : 0;

    // 氧气：头在水里慢慢耗，露出水面快速回满；喝了防溺瓶不耗氧
    if (body.headInWater && body.breathT <= 0) {
      this.oxygen = Math.max(0, this.oxygen - dt);
    } else {
      this.oxygen = Math.min(HEALTH.OXYGEN_MAX, this.oxygen + dt * 4);
      this.drownTimer = 0;
    }

    // 缺氧后按节奏扣血（防溺瓶没过期就不会缺氧）
    if (this.oxygen <= 0 && body.headInWater && body.breathT <= 0) {
      this.drownTimer += dt;
      if (this.drownTimer >= HEALTH.DROWN_INTERVAL) {
        this.drownTimer = 0;
        if (this.damage(HEALTH.DROWN_DAMAGE)) ev.hurt = true;
      }
    }

    // 摔落：超过安全高度才扣血
    if (fallDistance > HEALTH.FALL_SAFE) {
      const dmg = Math.round((fallDistance - HEALTH.FALL_SAFE) * HEALTH.FALL_DAMAGE);
      if (dmg > 0 && this.damage(dmg)) ev.hurt = true;
    }

    // 自动回血：活着且没满血时，慢慢攒着回
    if (this.mode !== 'creative' && this.hp > 0 && this.hp < HEALTH.MAX_HP) {
      this.regenT += dt;
      if (this.regenT >= HEALTH.REGEN_EVERY) {
        this.regenT = 0;
        this.hp = Math.min(HEALTH.MAX_HP, this.hp + HEALTH.REGEN_HP);
      }
    }

    if (this.hp <= 0) ev.died = true;
    return ev;
  }

  /** 中一份毒：每 every 秒扣 dmg，持续 dur 秒（毒药用） */
  poison(dmg: number, every: number, dur: number): void {
    this.poisons.add(dmg, every, dur);
  }

  /** 吃东西：按 EAT_HP 表回血/扣血，返回食物效果（不能吃返回 null） */
  eat(itemId: number): FoodEffect | null {
    const fx = EAT_HP[itemId];
    if (fx === undefined) return null;
    if (this.mode !== 'creative') {
      this.hp = Math.min(HEALTH.MAX_HP, Math.max(0, this.hp + fx.hp));
    }
    return fx;
  }

  /** 重生：满血满氧，毒也解了，送几秒无敌（顺便通知饥饿复位） */
  respawn(): void {
    this.hp = HEALTH.MAX_HP;
    this.oxygen = HEALTH.OXYGEN_MAX;
    this.drownTimer = 0;
    this.swampT = 0;
    this.poisons.clear();
    this.swampId = 0;
    this.regenT = 0;
    this.invincible = HEALTH.RESPAWN_INVINCIBLE;
    this.onRespawn?.();
  }
}
