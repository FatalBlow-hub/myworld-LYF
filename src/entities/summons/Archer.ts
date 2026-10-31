/** 弓箭手小战士 — 拿「小战士弓/火弓/冰弓」召唤的远程保镖（2026-10-24 设定）
 *
 *  和普通小战士同一套选怪优先级，但不贴脸：走到离怪约 4 格停下自动射箭，怪走远继续追。
 *  数值：血量/攻击 = 普通僵尸，移速 = 僵尸一半（火弓攻击 ×1.5）。
 *  是个哨兵：不跟主人跑，永久守在岗位上；玩家回重生点时才挪去重生点，被怪打死就没了。
 *  箭只认僵尸，不会误伤玩家，玩家也打不到它。
 */

import * as THREE from 'three';
import { ARCHER, ZOMBIE } from '../../config';
import { WARRIOR_BOW, WARRIOR_BOW_FIRE, WARRIOR_BOW_ICE } from '../../world/blocks/black';
import { World } from '../../world/World';
import { isSolid } from '../../world/blocks/Block';
import { collidesAABB, stepWalk } from '../../player/motion/Physics';
import { raycastBlock } from '../../interact/BlockPicker';
import { Zombie } from '../mobs/Zombie';

/** 三张弓对应的形态 */
export type BowForm = 'normal' | 'fire' | 'ice';

/** 弓 ID → 形态 */
export const BOW_FORM_OF: Record<number, BowForm> = {
  [WARRIOR_BOW]: 'normal',
  [WARRIOR_BOW_FIRE]: 'fire',
  [WARRIOR_BOW_ICE]: 'ice',
};

/** 形态中文名（提示文案用） */
export const BOW_FORM_NAMES: Record<BowForm, string> = {
  normal: '小战士弓', fire: '火弓', ice: '冰弓',
};

/** 三形态配色：护甲 / 镶边 / 弓身；火/冰自发光，黑夜里一眼认出 */
const FORM_COLORS: Record<BowForm, { armor: number; trim: number; bow: number; glow: boolean }> = {
  normal: { armor: 0x3a4a66, trim: 0xc8d4e4, bow: 0x6a4a28, glow: false },
  fire:   { armor: 0x7a2a18, trim: 0xffb050, bow: 0xa03028, glow: true },
  ice:    { armor: 0x2a5a7a, trim: 0xa8ecff, bow: 0x3d84b8, glow: true },
};

const W = 0.5;   // 碰撞盒宽（和小战士同款小个子）
const H = 1.2;

/** 在飞的一支箭 */
interface Arrow {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  left: number; // 还能飞几格
  mesh: THREE.Mesh;
}

export class Archer {
  readonly group = new THREE.Group();
  readonly form: BowForm;
  readonly dmg: number;
  maxHp = ZOMBIE.HP;      // 血量和普通僵尸一样
  hp = ZOMBIE.HP;
  dead = false;
  x: number; y: number; z: number;
  /** 岗位（没怪的时候站这儿；玩家回重生点会把岗位挪过去） */
  postX: number; postY: number; postZ: number;
  private vy = 0;
  private yaw = Math.random() * Math.PI * 2;
  private shootT = 0;
  private arrows: Arrow[] = [];

  constructor(form: BowForm, x: number, y: number, z: number) {
    this.form = form;
    this.x = x; this.y = y; this.z = z;
    this.postX = x; this.postY = y; this.postZ = z;
    this.dmg = ARCHER.DMG[form]; // 普通弓 1 / 火弓 1.5（无特效不叠加）/ 冰弓 1（带冻结减速）
    this.buildMesh();
    this.syncMesh();
  }

  /** 挨打（僵尸挠的）：掉血，掉光就倒下（战利品归怪，玩家啥也不掉） */
  hurt(dmg: number): void {
    this.hp = Math.max(0, this.hp - dmg);
    if (this.hp <= 0) this.dead = true;
  }

  /** 第二天刷新（2026-10-29 设定：召唤物一直存在，第二天刷新替换）：血量回满、回到重生点当岗位 */
  refresh(x: number, y: number, z: number): void {
    this.hp = this.maxHp;
    this.dead = false;
    this.x = x; this.y = y; this.z = z;
    this.vy = 0;
    this.goTo(x, y, z);
    this.syncMesh();
  }

  /** 挪岗：玩家回重生点时把岗位改到重生点，它会自己走过去 */
  goTo(x: number, y: number, z: number): void {
    this.postX = x; this.postY = y; this.postZ = z;
  }

  /** 收摊：清掉还在飞的箭（本体 group 由 Mobs 从场景里摘） */
  dispose(): void {
    for (const a of this.arrows) {
      a.mesh.parent?.remove(a.mesh);
      a.mesh.geometry.dispose();
      (a.mesh.material as THREE.Material).dispose();
    }
    this.arrows = [];
  }

  /** 每帧：选怪 → 保持距离放风筝 → 射箭 → 推进所有在飞的箭 */
  update(dt: number, world: World, zombies: Zombie[]): void {
    if (this.dead) return;
    this.shootT -= dt;
    const target = this.pickTarget(zombies);

    // 走位：有怪就放风筝——太远追上去、被贴脸就退开，稳定保持 4~4.5 格安全距离（2026-10-31 设定）
    let tx = this.x, tz = this.z, walk = false;
    if (target) {
      const dist = Math.hypot(target.x - this.x, target.z - this.z);
      this.yaw = Math.atan2(-(target.x - this.x), -(target.z - this.z));
      if (dist > ARCHER.KEEP_DIST + 0.5) { tx = target.x; tz = target.z; walk = true; }
      else if (dist < ARCHER.KEEP_DIST) {
        // 怪贴到 4 格以内：面朝怪、倒退两格拉开距离，回到安全区继续射
        const ax = (this.x - target.x) / (dist || 1);
        const az = (this.z - target.z) / (dist || 1);
        tx = this.x + ax * 2;
        tz = this.z + az * 2;
        walk = true;
      }
    } else {
      const dPost = Math.hypot(this.postX - this.x, this.postZ - this.z);
      if (dPost > 1.2) { tx = this.postX; tz = this.postZ; walk = true; }
    }
    if (walk) {
      const ddx = tx - this.x, ddz = tz - this.z;
      const len = Math.hypot(ddx, ddz) || 1;
      this.step(world, (ddx / len) * ARCHER.SPEED * dt, (ddz / len) * ARCHER.SPEED * dt);
    }

    // 垂直：重力 + 落地
    this.vy -= 24 * dt;
    const ny = this.y + this.vy * dt;
    if (collidesAABB(world, this.x, ny, this.z, W, H)) this.vy = 0;
    else this.y = ny;
    this.syncMesh();

    // 开火：怪进了射程、看得见、冷却好了就放一箭（射速分形态：普通 2 秒 / 火 1.5 秒 / 冰 1.75 秒）
    if (target) {
      const dist = Math.hypot(target.x - this.x, target.z - this.z);
      if (dist <= ARCHER.SHOOT_RANGE && this.shootT <= 0 && this.canSee(world, target)) {
        this.shootT = ARCHER.SHOOT_EVERY[this.form];
        this.shoot(target);
      }
    }

    this.updateArrows(dt, world, zombies);
  }

  /** 挑怪：优先级和普通小战士一致（正在打主人的 → 主人正在打的 → 最近的） */
  private pickTarget(zombies: Zombie[]): Zombie | null {
    let best: Zombie | null = null;
    let bestRank = 9;
    let bestDist = Infinity;
    for (const z of zombies) {
      if (z.dead || z.silent || z.inChallenge) continue; // 挑战房的怪不归它管
      const d = Math.hypot(z.x - this.x, z.z - this.z);
      if (d > ARCHER.AGGRO) continue;
      const rank = z.hurtOwnerT > 0 ? 0 : z.hurtByPlayerT > 0 ? 1 : 2;
      if (rank < bestRank || (rank === bestRank && d < bestDist)) {
        best = z; bestRank = rank; bestDist = d;
      }
    }
    return best;
  }

  /** 中间有没有墙挡着（射不穿墙，绕位是它自己的事） */
  private canSee(world: World, target: Zombie): boolean {
    const ox = this.x, oy = this.y + 0.95, oz = this.z;
    const tx = target.x, ty = target.y + target.h * 0.6, tz = target.z;
    const dist = Math.hypot(tx - ox, ty - oy, tz - oz);
    if (dist <= 0) return true;
    return !raycastBlock(world, ox, oy, oz, (tx - ox) / dist, (ty - oy) / dist, (tz - oz) / dist, dist);
  }

  private shoot(target: Zombie): void {
    const ox = this.x, oy = this.y + 0.95, oz = this.z;
    const tx = target.x, ty = target.y + target.h * 0.6, tz = target.z;
    const dist = Math.hypot(tx - ox, ty - oy, tz - oz) || 1;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.06, 0.5),
      new THREE.MeshLambertMaterial({ color: this.form === 'fire' ? 0xff8830 : this.form === 'ice' ? 0xa8ecff : 0xd8c8a0 }),
    );
    mesh.position.set(ox, oy, oz);
    mesh.lookAt(tx, ty, tz);
    this.group.parent?.add(mesh); // 挂到本体所在的场景
    this.arrows.push({
      x: ox, y: oy, z: oz,
      vx: ((tx - ox) / dist) * ARCHER.ARROW_SPEED,
      vy: ((ty - oy) / dist) * ARCHER.ARROW_SPEED,
      vz: ((tz - oz) / dist) * ARCHER.ARROW_SPEED,
      left: ARCHER.ARROW_RANGE,
      mesh,
    });
  }

  /** 推进在飞的箭：撞墙消失，碰到僵尸结算（伤害 + 冰弓冻结减速） */
  private updateArrows(dt: number, world: World, zombies: Zombie[]): void {
    for (const a of this.arrows) {
      for (let remaining = dt; remaining > 0 && a.left > 0;) {
        const step = Math.min(remaining, 1 / 60);
        remaining -= step;
        a.x += a.vx * step; a.y += a.vy * step; a.z += a.vz * step;
        a.left -= ARCHER.ARROW_SPEED * step;
        const hitBlock = isSolid(world.getBlock(Math.floor(a.x), Math.floor(a.y), Math.floor(a.z)));
        const hit = hitBlock ? null : zombies.find((z) => !z.dead &&
          Math.abs(a.x - z.x) < z.w / 2 + 0.15 &&
          Math.abs(a.z - z.z) < z.w / 2 + 0.15 &&
          a.y >= z.y && a.y <= z.y + z.h);
        if (hitBlock || hit || a.left <= 0 || a.y < 0) {
          if (hit) this.hitZombie(hit, a);
          a.left = -1;
        }
      }
      a.mesh.position.set(a.x, a.y, a.z);
      a.mesh.lookAt(a.x + a.vx, a.y + a.vy, a.z + a.vz);
    }
    const alive = this.arrows.filter((a) => a.left > 0);
    for (const a of this.arrows) {
      if (a.left > 0) continue;
      a.mesh.parent?.remove(a.mesh);
      a.mesh.geometry.dispose();
      (a.mesh.material as THREE.Material).dispose();
    }
    this.arrows = alive;
  }

  /** 一箭命中：伤害照结；冰弓只在上一轮冻/减速完全走完后才开新一轮（伤害不受此限制） */
  private hitZombie(z: Zombie, a: Arrow): void {
    const yaw = Math.atan2(-a.vx, -a.vz); // 箭的来向，击退用
    z.hurt(this.dmg, yaw);
    if (z.dead) z.killedByWarrior = true; // 战利品直接进主人背包，和小战士一个待遇
    if (this.form === 'ice' && z.frozenT <= 0 && z.slowT <= 0) {
      z.frozenT = ARCHER.ICE_FREEZE;                 // 先冻住
      z.slowT = ARCHER.ICE_FREEZE + ARCHER.ICE_SLOW; // 冻的期间减速表也在走：冻完正好剩 ICE_SLOW 秒半速
    }
  }

  private step(world: World, dx: number, dz: number): void {
    const r = stepWalk(world, this.x, this.y, this.z, dx, dz, W, H);
    this.x = r.x; this.y = r.y; this.z = r.z;
  }

  private syncMesh(): void {
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.yaw;
  }

  /** 搭模型：和小战士同款小个子铁甲人，剑换成一张弓，背上多一筒箭 */
  private buildMesh(): void {
    const col = FORM_COLORS[this.form];
    const mat = (c: number) =>
      new THREE.MeshLambertMaterial(col.glow ? { color: c, emissive: c, emissiveIntensity: 0.45 } : { color: c });
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, c: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
      m.position.set(x, y, z);
      m.castShadow = true;
      this.group.add(m);
    };
    box(0.34, 0.34, 0.34, 0, 0.91, 0, 0xe0b088);          // 头
    box(0.36, 0.06, 0.36, 0, 1.09, 0, col.trim);          // 头盔顶（插一根小羽毛）
    box(0.05, 0.14, 0.05, 0.1, 1.18, 0, col.trim);
    box(0.38, 0.06, 0.38, 0, 0.72, 0, col.trim);          // 肩甲
    box(0.4, 0.4, 0.24, 0, 0.54, 0, col.armor);           // 胸甲
    box(0.11, 0.34, 0.11, -0.255, 0.57, 0, col.armor);    // 左臂
    box(0.11, 0.34, 0.11, 0.255, 0.5, -0.12, col.armor);  // 右臂（前伸端着弓）
    box(0.14, 0.34, 0.14, -0.1, 0.17, 0, col.armor);      // 左腿
    box(0.14, 0.34, 0.14, 0.1, 0.17, 0, col.armor);       // 右腿
    box(0.05, 0.42, 0.05, 0.29, 0.72, -0.2, col.bow);     // 弓：一条竖着的弓臂
    box(0.03, 0.03, 0.16, 0.29, 0.72, -0.1, col.trim);    // 弦
    box(0.08, 0.3, 0.08, -0.22, 0.72, -0.18, col.bow);    // 背后的箭筒
    for (let i = 0; i < 3; i++) box(0.03, 0.24, 0.03, -0.22 + (i - 1) * 0.03, 0.76, -0.14, col.trim); // 箭筒里三支箭
  }
}
