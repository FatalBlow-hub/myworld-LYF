/** 小战士 — 买蛋召唤出来的保镖：跟着主人跑，优先打「正在打主人的怪」，其次打「主人正在打的怪」
 *
 *  三档数值基准就是普通僵尸（`ZOMBIE.HP` / `ZOMBIE.DAMAGE`）：
 *  普通 ×1/×1（每 8 秒 2% 攒一次暴击）、高级 ×2/×1（每 10 秒 4% 回血）、
 *  绝世 ×3/×2（每 3 秒 10% 秒杀、每 5 秒 5% 回一口血）。外观按档换色，绝世还带自发光。
 */

import * as THREE from 'three';
import { WARRIOR, ZOMBIE } from '../config';
import { EGG_WARRIOR_ADVANCED, EGG_WARRIOR_EPIC, EGG_WARRIOR_NORMAL } from '../world/Block';
import { heightAt } from '../world/TerrainGen';
import { World } from '../world/World';
import { collidesAABB, stepWalk } from '../player/Physics';
import { Zombie } from './Zombie';

/** 三档品质 */
export type WarriorTier = 'normal' | 'advanced' | 'epic';

/** 品质中文名（提示文案用） */
export const WARRIOR_TIER_NAMES: Record<WarriorTier, string> = {
  normal: '普通', advanced: '高级', epic: '绝世',
};

/** 召唤蛋 → 品质 */
export const TIER_OF_EGG: Record<number, WarriorTier> = {
  [EGG_WARRIOR_NORMAL]: 'normal',
  [EGG_WARRIOR_ADVANCED]: 'advanced',
  [EGG_WARRIOR_EPIC]: 'epic',
};

/** 品质 → 蛋（存档里只存品质，读档时换回蛋 ID 也行） */
export const EGG_OF_TIER: Record<WarriorTier, number> = {
  normal: EGG_WARRIOR_NORMAL, advanced: EGG_WARRIOR_ADVANCED, epic: EGG_WARRIOR_EPIC,
};

/** 三档的配色：护甲 / 镶边 / 剑刃；绝世整只发光 */
const TIER_COLORS: Record<WarriorTier, { armor: number; trim: number; skin: number; blade: number; glow: boolean }> = {
  normal: { armor: 0x3f74c0, trim: 0xc8d4e4, skin: 0xe0b088, blade: 0xd8d8e0, glow: false },
  advanced: { armor: 0x7a4fd0, trim: 0xf0d060, skin: 0xe0b088, blade: 0xe8e0c0, glow: false },
  epic: { armor: 0xc23828, trim: 0xffd24a, skin: 0xe0b088, blade: 0xfff0b0, glow: true },
};

const W = 0.5;   // 碰撞盒宽（比玩家瘦一圈）
const H = 1.2;   // 身高（小个子，一眼能跟玩家区分开）

export class Warrior {
  readonly group = new THREE.Group();
  readonly tier: WarriorTier;
  /** 攻击力（绝世翻倍） */
  readonly dmg: number;
  maxHp: number;
  hp: number;
  dead = false;
  x: number; y: number; z: number;
  private vy = 0;
  private yaw = Math.random() * Math.PI * 2;
  private attackT = 0;
  private skillT = 0;      // 特技判定计时（普通=暴击、高级=回血、绝世=秒杀）
  private regenT = 0;      // 绝世回血计时
  private critReady = false; // 普通：攒好了，下一次攻击翻倍
  /** 打不过了：血低就后退养伤，回血回够了再上（带上下两个阈值，免得来回抖） */
  private fleeing = false;
  /** 刚才打的是谁（给 HUD 提示用） */
  lastHitTier = '';

  constructor(tier: WarriorTier, x: number, y: number, z: number) {
    this.tier = tier;
    this.x = x; this.y = y; this.z = z;
    const s = WARRIOR.TIERS[tier];
    this.maxHp = ZOMBIE.HP * s.hpMult;
    this.hp = this.maxHp;
    this.dmg = ZOMBIE.DAMAGE * s.dmgMult;
    this.buildMesh();
    this.syncMesh();
  }

  /** 挨打（僵尸挠的）：掉血，掉光就倒下 */
  hurt(dmg: number): void {
    this.hp = Math.max(0, this.hp - dmg);
    if (this.hp <= 0) this.dead = true;
  }

  /**
   * 每帧：选目标 → 走过去砍 / 跟着主人；顺便跑三档的特技。
   * 返回这一帧有没有打死怪（用来给 HUD 提示）。
   */
  update(dt: number, world: World, owner: { x: number; y: number; z: number }, zombies: Zombie[]): boolean {
    if (this.dead) return false;
    this.attackT -= dt;
    const skill = WARRIOR.TIERS[this.tier];

    // —— 选目标：① 正在打主人的 → ② 主人正在打的 → ③ 最近的 ——
    const target = this.pickTarget(zombies);
    const ox = owner.x, oz = owner.z;
    const ownerDist = Math.hypot(ox - this.x, oz - this.z);

    // —— 打不过就往后退：血少了先撤，撤离危险再回来（回血只在他退着的时候生效） ——
    if (this.hp <= this.maxHp * WARRIOR.RETREAT_HP) this.fleeing = true;
    else if (this.hp >= this.maxHp * WARRIOR.RECOVER_HP) this.fleeing = false;
    if (this.fleeing) this.hp = Math.min(this.maxHp, this.hp + WARRIOR.RETREAT_HEAL * dt);

    let tx: number, tz: number, speed: number;
    if (this.fleeing) {
      // 朝背离那只怪的方向退三格；没有目标就往主人身边靠
      const ax = target ? this.x - target.x : ox - this.x;
      const az = target ? this.z - target.z : oz - this.z;
      const len = Math.hypot(ax, az) || 1;
      tx = this.x + (ax / len) * 3;
      tz = this.z + (az / len) * 3;
      // 别为了躲怪把主人丢了：离主人太远就直接退回主人身边
      if (Math.hypot(tx - ox, tz - oz) > WARRIOR.RETREAT_RANGE) { tx = ox; tz = oz; }
      speed = WARRIOR.SPEED * WARRIOR.CHASE_MULT;
    } else if (target) {
      tx = target.x; tz = target.z;
      speed = WARRIOR.SPEED;
    } else {
      tx = ox; tz = oz;
      // 跟主人：站太近就不动，离太远加速追
      if (ownerDist <= WARRIOR.FOLLOW_DIST) { tx = this.x; tz = this.z; }
      speed = ownerDist > WARRIOR.FAR_DIST ? WARRIOR.SPEED * WARRIOR.CHASE_MULT : WARRIOR.SPEED;
    }

    // 离主人太远直接闪现回去，别把人走丢在野外
    if (ownerDist > WARRIOR.TELEPORT_DIST) this.blink(world, ox, oz);

    const ddx = tx - this.x, ddz = tz - this.z;
    const dist = Math.hypot(ddx, ddz);
    if (dist > 0.05) {
      this.yaw = Math.atan2(-ddx, -ddz);
      this.step(world, -Math.sin(this.yaw) * speed * dt, 0);
      this.step(world, 0, -Math.cos(this.yaw) * speed * dt);
    }

    // 垂直：重力 + 落地
    this.vy -= 24 * dt;
    const ny = this.y + this.vy * dt;
    if (collidesAABB(world, this.x, ny, this.z, W, H)) this.vy = 0;
    else this.y = ny;
    this.syncMesh();

    let killed = false;
    // 贴到怪身上就砍（正在后撤养伤的时候不出手）
    if (!this.fleeing && target && dist < WARRIOR.ATTACK_DIST && this.attackT <= 0) {
      this.attackT = WARRIOR.ATTACK_EVERY;
      killed = this.strike(target, false);
    }

    // —— 三档特技 ——
    if (this.tier === 'normal' && 'critEvery' in skill) {
      this.skillT -= dt;
      if (this.skillT <= 0) {
        this.skillT = skill.critEvery;
        if (Math.random() < skill.critChance) this.critReady = true;
      }
    }
    if (this.tier === 'advanced' && 'healEvery' in skill) {
      this.skillT -= dt;
      if (this.skillT <= 0) {
        this.skillT = skill.healEvery;
        if (Math.random() < skill.healChance && this.hp < this.maxHp) {
          // 低于半血回到半血，高于半血直接回满
          this.hp = this.hp < this.maxHp / 2 ? this.maxHp / 2 : this.maxHp;
        }
      }
    }
    if (this.tier === 'epic') {
      const epic = WARRIOR.TIERS.epic;
      this.skillT -= dt;
      if (this.skillT <= 0) {
        this.skillT = epic.killEvery;
        // 10% 直接秒掉正在打的怪（后撤养伤的时候不触发）
        if (!this.fleeing && target && Math.random() < epic.killChance) killed = this.strike(target, true) || killed;
      }
      this.regenT -= dt;
      if (this.regenT <= 0) {
        this.regenT = epic.regenEvery;
        if (Math.random() < epic.regenChance) {
          this.hp = Math.min(this.maxHp, this.hp + epic.regenAmount);
        }
      }
    }
    return killed;
  }

  /** 砍一刀：crit = 普通攒的暴击；instakill = 绝世的秒杀 */
  private strike(target: Zombie, instakill: boolean): boolean {
    if (target.dead) return false;
    let dmg = this.dmg;
    let tag = '';
    if (instakill) {
      dmg = target.hp + 999;
      tag = '秒杀';
    } else if (this.critReady) {
      dmg *= 2;
      this.critReady = false;
      tag = '暴击';
    }
    target.hurt(dmg, this.yaw);
    // 这一下把它打死了：记一笔，战利品由 Mobs 直接送进主人背包
    if (target.dead) target.killedByWarrior = true;
    this.lastHitTier = tag;
    return target.dead;
  }

  /** 挑一只怪来打：正在打主人的最优先，其次主人正在打的，最后打最近的 */
  private pickTarget(zombies: Zombie[]): Zombie | null {
    let best: Zombie | null = null;
    let bestRank = 9;
    let bestDist = Infinity;
    for (const z of zombies) {
      // 挑战房的怪不归小战士管：那是玩家自己的 4 关
      if (z.dead || z.silent || z.inChallenge) continue;
      const d = Math.hypot(z.x - this.x, z.z - this.z);
      if (d > WARRIOR.AGGRO) continue;
      const rank = z.hurtOwnerT > 0 ? 0 : z.hurtByPlayerT > 0 ? 1 : 2;
      if (rank < bestRank || (rank === bestRank && d < bestDist)) {
        best = z; bestRank = rank; bestDist = d;
      }
    }
    return best;
  }

  private step(world: World, dx: number, dz: number): boolean {
    const r = stepWalk(world, this.x, this.y, this.z, dx, dz, W, H);
    this.x = r.x; this.y = r.y; this.z = r.z;
    return r.moved;
  }

  /** 离主人太远：找主人脚边一个站得住的空位闪过去 */
  private blink(world: World, px: number, pz: number): void {
    for (let i = 0; i < 8; i++) {
      const ang = Math.random() * Math.PI * 2;
      const d = 1.5 + Math.random() * 2;
      const nx = px + Math.cos(ang) * d;
      const nz = pz + Math.sin(ang) * d;
      const h = heightAt(Math.floor(nx), Math.floor(nz));
      if (!collidesAABB(world, nx, h + 0.05, nz, W, H)) {
        this.x = nx; this.y = h + 0.05; this.z = nz;
        this.vy = 0;
        return;
      }
    }
  }

  private syncMesh(): void {
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.yaw;
  }

  /** 搭模型：小个子铁甲人 + 一把剑，三档换色（绝世自发光） */
  private buildMesh(): void {
    const col = TIER_COLORS[this.tier];
    const mat = (c: number) =>
      new THREE.MeshLambertMaterial(col.glow ? { color: c, emissive: c, emissiveIntensity: 0.55 } : { color: c });
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, c: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
      m.position.set(x, y, z);
      m.castShadow = true;
      this.group.add(m);
    };
    box(0.34, 0.34, 0.34, 0, 0.91, 0, col.skin);          // 头
    box(0.36, 0.06, 0.36, 0, 1.09, 0, col.trim);          // 头盔顶
    box(0.38, 0.06, 0.38, 0, 0.72, 0, col.trim);          // 肩甲
    box(0.4, 0.4, 0.24, 0, 0.54, 0, col.armor);           // 胸甲
    box(0.11, 0.34, 0.11, -0.255, 0.57, 0, col.armor);    // 左臂
    box(0.11, 0.34, 0.11, 0.255, 0.57, 0, col.armor);     // 右臂
    box(0.14, 0.34, 0.14, -0.1, 0.17, 0, col.armor);      // 左腿
    box(0.14, 0.34, 0.14, 0.1, 0.17, 0, col.armor);       // 右腿
    box(0.05, 0.42, 0.05, 0.29, 0.8, 0, col.blade);       // 剑刃
    box(0.16, 0.05, 0.05, 0.29, 0.62, 0, col.trim);       // 剑格
  }
}
