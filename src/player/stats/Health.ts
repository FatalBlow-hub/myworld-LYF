/** 生命 — 血条、氧气、伤害结算；创造模式同一套事件进来但全部免疫 */

import { EAT_HP, FoodEffect, HEALTH, SWAMP_HURT, SWAY } from '../../config';
import { SWAMP_DEEP, SWAMP_LIGHT, SWAMP_MID, SWAMP_PHANTOM } from '../../world/blocks/Block';
import { PlayerBody } from '../motion/Physics';
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
  private nightT = 0;                   // 夜视剩余秒数（吃夜光蓝菇）
  private slowT = 0;                    // 食物给的缓慢回血剩余秒数（红花蜜茶/水果拼盘）
  private slowRate = 0;                 // 缓慢回血每秒回多少
  private slowAcc = 0;                  // 攒够 1 点再回，别把血算成小数
  private swampId = 0;
  /** 春节卷：免伤期间也不消耗饥饿 */
  noHungerT = 0;
  /** 负面豁免剩余秒数（春卷/圣诞甜饼）：沼泽扣血与星空尸主动攻击都失效 */
  cleanseT = 0;
  private atkT = 0;
  private atkMult = 1;
  /** 伤害拦截器（菖蒲护盾）：传入原伤害返回实扣血量（0 = 这次全挡了）；不设就原样扣 */
  damageBlocker: ((amount: number) => number) | null = null;

  constructor(private mode: GameMode, private onRespawn?: () => void) {}

  /** 统一的伤害入口：摔落/溺水/以后的怪物攻击都走这里 */
  damage(amount: number): boolean {
    if (this.mode === 'creative' || this.invincible > 0) return false;
    if (this.damageBlocker) amount = this.damageBlocker(amount);
    if (amount <= 0) return false;
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
    this.noHungerT = Math.max(0, this.noHungerT - dt);
    this.cleanseT = Math.max(0, this.cleanseT - dt);
    this.atkT = Math.max(0, this.atkT - dt);

    // 泡在泽液里按各自的节奏掉血（离开泽液计时清零；春卷/甜饼的负面豁免期间不掉）
    if (this.swampId !== body.swampId) this.swampT = 0;
    this.swampId = body.swampId;
    const rule = SWAMP_RULE[body.swampId];
    if (rule && this.cleanseT <= 0) {
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
    this.nightT = Math.max(0, this.nightT - dt); // 夜视倒计时

    // 食物给的缓慢回血：按每秒速率攒，攒够 1 点回一次（红花蜜茶 6 秒回 2 点 = 每 3 秒 1 点）
    if (this.slowT > 0) {
      this.slowT = Math.max(0, this.slowT - dt);
      this.slowAcc += dt * this.slowRate;
      if (this.slowAcc >= 1) {
        const gain = Math.floor(this.slowAcc);
        this.slowAcc -= gain;
        if (this.mode !== 'creative') this.hp = Math.min(HEALTH.MAX_HP, this.hp + gain);
      }
      if (this.slowT <= 0) this.slowAcc = 0;
    }
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

  /** 夜视：接下来 dur 秒里看得见黑夜（吃夜光蓝菇 / 蘑菇拼盘的柔光照明） */
  nightVision(dur: number): void {
    this.nightT = Math.max(this.nightT, dur);
  }

  /** 缓慢回血：接下来 seconds 秒里一共回 total 点（红花蜜茶 / 水果拼盘） */
  slowHeal(seconds: number, total: number): void {
    if (!(seconds > 0) || !(total > 0)) return;
    this.slowT = Math.max(this.slowT, seconds);
    this.slowRate = Math.max(this.slowRate, total / seconds);
  }

  /** 解毒：把身上中的毒一次清掉，返回清掉了几份（蒲公英凉茶） */
  curePoison(): number {
    return this.poisons.clear();
  }

  /** 现在是不是夜视生效中（Game 用来把世界调亮） */
  get isNightVision(): boolean {
    return this.nightT > 0;
  }

  /** 春卷 / 圣诞甜饼：seconds 秒免伤、noHunger 秒不消耗饥饿、cleanse 秒负面豁免 */
  seasonShield(seconds: number, noHunger: number, cleanse: number): void {
    this.invincible = Math.max(this.invincible, seconds);
    this.noHungerT = Math.max(this.noHungerT, noHunger);
    this.cleanseT = Math.max(this.cleanseT, cleanse);
  }

  /** 丰收拼盘：接下来 seconds 秒里攻击力乘 mult */
  attackBoost(seconds: number, mult: number): void {
    this.atkT = Math.max(this.atkT, seconds);
    this.atkMult = Math.max(this.atkMult, mult);
  }

  /** 当前攻击倍率（MobCombat 用；没加成时是 1） */
  get attackMultiplier(): number {
    return this.atkT > 0 ? this.atkMult : 1;
  }

  /** 负面豁免生效中：沼泽/幻泽液扣血与星空尸主动攻击都不生效 */
  get isCleanse(): boolean {
    return this.cleanseT > 0;
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
    this.slowT = 0;
    this.slowRate = 0;
    this.slowAcc = 0;
    this.invincible = HEALTH.RESPAWN_INVINCIBLE;
    this.onRespawn?.();
  }
}
