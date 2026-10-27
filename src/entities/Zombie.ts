/** 僵尸 — 绿皮怪：平时瞎逛，走近了会追玩家，贴脸就挠人；死了掉肉。
 *  夜里还出几种特殊怪：血尸（跑得快打得疼）、星空尸（3 秒瞬移、会发光）、
 *  腐败人（黑夜最后 10 秒出现，站着不动吐腐败老鼠）；老鼠血少跑得快 */

import * as THREE from 'three';
import { BLOODZOMBIE, CORRUPT, GHOST, POTION, RAT, STARZOMBIE, ZOMBIE } from '../config';
import { AIR, WATER } from '../world/Block';
import { World } from '../world/World';
import { heightAt } from '../world/TerrainGen';
import { collidesAABB, stepWalk } from '../player/Physics';
import { rayHitBox } from './hitbox';
import { TimedEffects } from '../player/TimedEffects';

const W = 0.7;  // 人形身体宽
const H = 1.8;  // 人形身高（和玩家一样高）
const RAT_W = 0.6; // 老鼠长（小个子，趴地上跑）
const RAT_H = 0.4;

/** 六种僵尸：normal 白天也刷；blood/star 只有黑夜出没天亮就消失；
 *  corrupt 黑夜尾巴上出现但出现了就不走；rat 是腐败人吐的小老鼠；
 *  ghost 是灵魂虚空里的幽灵鬼：半透明的发光小床单，飘着走 */
export type ZombieKind = 'normal' | 'blood' | 'star' | 'corrupt' | 'rat' | 'ghost';

/** 每种僵尸的中文名（提示文案用，别在业务里写三元链） */
export const ZOMBIE_NAMES: Record<ZombieKind, string> = {
  normal: '僵尸',
  blood: '血尸',
  star: '星空尸',
  corrupt: '腐败人',
  rat: '腐败老鼠',
  ghost: '幽灵鬼',
};

// 僵尸配色：绿皮 + 蓝裤子 + 青上衣 + 红眼睛
const NORMAL_SKIN = { skin: 0x54a35a, shirt: 0x3f8e8e, pants: 0x2e4a8a, eye: 0xa03030 };
// 血尸配色：浑身血红色，眼睛是刺眼的亮红
const BLOOD_SKIN = { skin: 0x6a1414, shirt: 0x8a2020, pants: 0x3a0d0d, eye: 0xff3020 };
// 星空尸配色：深夜蓝紫身体 + 发光的青白眼睛（整只都微微发光）
const STAR_SKIN = { skin: 0x2b2a6e, shirt: 0x4a4ab0, pants: 0x1d1d4f, eye: 0x7fe8f8 };
// 腐败人配色：烂掉的紫黑身体 + 发光的紫眼睛（黑夜里一眼能看见）
const CORRUPT_SKIN = { skin: 0x4a3a4a, shirt: 0x2a1a2a, pants: 0x181018, eye: 0xb050ff };

/** 每种僵尸的数值表：血/星空尸只活一个晚上，数值写在配置里 */
const KIND_STATS: Record<ZombieKind, { speed: number; damage: number; hp: number }> = {
  normal: { speed: ZOMBIE.SPEED, damage: ZOMBIE.DAMAGE, hp: ZOMBIE.HP },
  blood: { speed: BLOODZOMBIE.SPEED, damage: BLOODZOMBIE.DAMAGE, hp: BLOODZOMBIE.HP },
  star: { speed: 0, damage: STARZOMBIE.DAMAGE, hp: STARZOMBIE.HP },
  corrupt: { speed: 0, damage: 0, hp: CORRUPT.HP },   // 不走路不挠人，只会吐老鼠
  rat: { speed: RAT.SPEED, damage: ZOMBIE.DAMAGE, hp: RAT.HP },
  ghost: { speed: GHOST.SPEED, damage: GHOST.DAMAGE, hp: GHOST.HP },
};

export class Zombie {
  readonly group = new THREE.Group();
  /** 哪种僵尸：normal 白天也刷，blood/star/corrupt/rat 是黑夜特殊怪 */
  readonly kind: ZombieKind;
  /** 挠一下扣玩家多少血（血尸更疼，星空尸/老鼠和普通一样，腐败人不挠人） */
  readonly damage: number;
  /** 自己的碰撞盒宽高：老鼠比人小一圈 */
  readonly w: number;
  readonly h: number;
  private speed: number;
  hp: number;
  dead = false;
  x: number; y: number; z: number;
  private vy = 0;
  private yaw = Math.random() * Math.PI * 2;
  private wanderT = 0;
  private attackT = 0;
  private tpT = 0; // 星空尸瞬移倒计时
  summonT = 0;     // 腐败人吐老鼠倒计时（归 Mobs 管）
  private lifeT: number; // 腐败人寿命：出来 100 秒就自己消失
  /** 挑战房的怪：打死了不掉任何东西 */
  noLoot = false;
  /** 寿终正寝（自己烂掉）：dead 了但不清掉落——毒死/打死才掉东西 */
  silent = false;
  /** 最后一下是小战士砍死的：战利品不落地，直接进主人背包（Mobs 判断用） */
  killedByWarrior = false;
  /** 挑战房里刷出来的怪：只认玩家，不理小战士（小战士也不打它） */
  inChallenge = false;
  /** 幻药瓶减速倒计时：>0 时速度减半 */
  slowT = 0;
  frozenT = 0;
  /** 踩到柳条陷阱被禁锢的剩余秒数（>0 时原地不动） */
  trapT = 0;
  /** 小战士排攻击优先级用：最近挠过主人，还剩几秒算「正在打主人」 */
  hurtOwnerT = 0;
  /** 小战士排攻击优先级用：主人最近打过它，还剩几秒算「主人正在打的怪」 */
  hurtByPlayerT = 0;
  /** 中的毒：每 every 秒扣 dmg 血，还剩 left 秒 */
  private poisons = new TimedEffects();
  /** 幽灵鬼的漂浮相位：每只错开一点，飘起来不会齐刷刷 */
  private hoverT = Math.random() * 6;

  constructor(x: number, y: number, z: number, kind: ZombieKind = 'normal') {
    this.x = x; this.y = y; this.z = z;
    this.kind = kind;
    const s = KIND_STATS[kind];
    this.speed = s.speed;
    this.damage = s.damage;
    this.hp = s.hp;
    this.w = kind === 'rat' ? RAT_W : W;
    this.h = kind === 'rat' ? RAT_H : H;
    this.lifeT = kind === 'corrupt' ? CORRUPT.LIVE_SECONDS : Infinity;
    this.buildMesh();
    this.syncMesh();
  }

  /** 挨打：扣血 + 被打退一点 */
  hurt(dmg: number, fromYaw: number): void {
    this.hp -= dmg;
    this.x -= Math.sin(fromYaw) * 0.4;
    this.z -= Math.cos(fromYaw) * 0.4;
    this.vy = 4;
    if (this.hp <= 0) this.dead = true;
  }

  /** 中药水毒：每 every 秒扣 dmg，持续 dur 秒 */
  addPoison(dmg: number, every: number, dur: number): void {
    this.poisons.add(dmg, every, dur);
  }

  /** 每帧：看到玩家就追，贴近了挠一下。返回 true = 这帧抓到玩家了；hostile=false 就只会瞎逛
   *  注意 px/pz 是「当前要追的目标」的位置——小战士在旁边时传的是小战士的位置 */
  update(dt: number, world: World, px: number, pz: number, hostile = true): boolean {
    this.wanderT -= dt;
    this.attackT -= dt;
    this.hoverT += dt;
    this.slowT = Math.max(0, this.slowT - dt);
    this.frozenT = Math.max(0, this.frozenT - dt);
    this.trapT = Math.max(0, this.trapT - dt);
    this.hurtOwnerT = Math.max(0, this.hurtOwnerT - dt);
    this.hurtByPlayerT = Math.max(0, this.hurtByPlayerT - dt);
    // 毒发：每种的毒自己数秒，毒死了正常掉东西
    this.poisons.update(dt, (amount) => {
      this.hp = Math.max(0, this.hp - amount);
      if (this.hp <= 0) this.dead = true;
    });
    if (this.dead) { this.syncMesh(); return false; }
    if (this.frozenT > 0) { this.vy = 0; this.syncMesh(); return false; }
    if (this.trapT > 0) { this.vy = 0; this.syncMesh(); return false; } // 柳条陷阱：原地困住
    const speed = this.speed * (this.slowT > 0 ? POTION.SLOW.mult : 1); // 幻药瓶砸中：走路慢一半
    const ddx = px - this.x;
    const ddz = pz - this.z;
    const dist = Math.hypot(ddx, ddz);

    if (this.kind === 'star') {
      // 星空尸没有速度不会走路：看到玩家就每 3 秒瞬移到他身边
      if (hostile && dist < STARZOMBIE.AGGRO) {
        this.yaw = Math.atan2(-ddx, -ddz); // 脸朝着玩家
        this.tpT -= dt;
        if (this.tpT <= 0) {
          this.tpT = STARZOMBIE.TELEPORT_EVERY;
          this.teleport(world, px, pz);
        }
      }
    } else if (this.kind === 'corrupt') {
      // 腐败人站着不动：玩家走近了只负责转头盯着，吐老鼠归 Mobs 管
      if (dist < CORRUPT.RANGE * 2) this.yaw = Math.atan2(-ddx, -ddz);
      // 出来 100 秒就自己烂掉消失（不掉东西）
      this.lifeT -= dt;
      if (this.lifeT <= 0) { this.dead = true; this.silent = true; }
    } else if (hostile && dist < ZOMBIE.AGGRO) {
      // 追人：脸朝玩家走过去
      this.yaw = Math.atan2(-ddx, -ddz);
      this.step(world, -Math.sin(this.yaw) * speed * dt, 0);
      this.step(world, 0, -Math.cos(this.yaw) * speed * dt);
    } else {
      // 没人就瞎逛
      if (this.wanderT <= 0) {
        this.wanderT = 2 + Math.random() * 3;
        this.yaw = Math.random() * Math.PI * 2;
      }
      if (!this.step(world, -Math.sin(this.yaw) * speed * 0.5 * dt, 0)) this.yaw += Math.PI / 2;
      if (!this.step(world, 0, -Math.cos(this.yaw) * speed * 0.5 * dt)) this.yaw += Math.PI / 2;
    }

    // 垂直：掉下去或落地
    this.vy -= 24 * dt;
    const ny = this.y + this.vy * dt;
    if (collidesAABB(world, this.x, ny, this.z, this.w, this.h)) {
      this.vy = 0;
    } else {
      this.y = ny;
    }
    this.syncMesh();

    // 贴近了才挠人（腐败人不挠人，它只吐老鼠）
    if (hostile && this.kind !== 'corrupt' && dist < ZOMBIE.ATTACK_DIST && this.attackT <= 0) {
      this.attackT = ZOMBIE.ATTACK_EVERY;
      return true;
    }
    return false;
  }

  private step(world: World, dx: number, dz: number): boolean {
    const r = stepWalk(world, this.x, this.y, this.z, dx, dz, this.w, this.h);
    this.x = r.x; this.y = r.y; this.z = r.z;
    return r.moved;
  }

  /** 瞬移：找玩家脚边 2~3 格内一个站得住的空地闪过去；找不到就原地待着 */
  private teleport(world: World, px: number, pz: number): void {
    for (let i = 0; i < STARZOMBIE.TELEPORT_TRIES; i++) {
      const ang = Math.random() * Math.PI * 2;
      const d = 1 + Math.random() * (STARZOMBIE.TELEPORT_NEAR - 1);
      const nx = px + Math.cos(ang) * d;
      const nz = pz + Math.sin(ang) * d;
      const h = heightAt(Math.floor(nx), Math.floor(nz));
      // 瞬移高度跟地表走（和刷怪同一个算法），别闪到山里面
      if (!collidesAABB(world, nx, h + 0.05, nz, this.w, this.h)) {
        this.x = nx; this.y = h + 0.05; this.z = nz;
        this.vy = 0;
        return;
      }
    }
  }

  private syncMesh(): void {
    // 幽灵鬼是飘的：模型整体抬离地面一截，还慢悠悠地上下浮
    const lift = this.kind === 'ghost' ? 0.28 + Math.sin(this.hoverT * 2) * 0.12 : 0;
    this.group.position.set(this.x, this.y + lift, this.z);
    this.group.rotation.y = this.yaw;
  }

  /** 搭模型：人形怪是头+身+前伸手+两条腿；老鼠是趴地上的小身子+头+尾巴；幽灵鬼是半透明床单 */
  private buildMesh(): void {
    if (this.kind === 'rat') { this.buildRat(); return; }
    if (this.kind === 'ghost') { this.buildGhost(); return; }
    const { skin, shirt, pants, eye } =
      this.kind === 'blood' ? BLOOD_SKIN
        : this.kind === 'star' ? STAR_SKIN
          : this.kind === 'corrupt' ? CORRUPT_SKIN : NORMAL_SKIN;
    // 星空尸和腐败人会发光：材质带自发光，黑夜里亮晶晶的
    const glow = this.kind === 'star' || this.kind === 'corrupt';
    const mat = (c: number) =>
      new THREE.MeshLambertMaterial(glow ? { color: c, emissive: c, emissiveIntensity: 0.8 } : { color: c });
    const box = (w: number, h: number, l: number, x: number, y: number, z: number, c: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat(c));
      m.position.set(x, y, z);
      m.castShadow = true;
      this.group.add(m);
    };
    box(0.42, 0.42, 0.42, 0, 1.55, 0, skin);              // 头
    box(0.07, 0.07, 0.02, -0.11, 1.6, -0.22, eye);        // 左眼
    box(0.07, 0.07, 0.02, 0.11, 1.6, -0.22, eye);         // 右眼
    box(0.5, 0.7, 0.28, 0, 0.98, 0, shirt);               // 身体
    box(0.14, 0.14, 0.55, -0.32, 1.18, -0.28, skin);      // 左手前伸
    box(0.14, 0.14, 0.55, 0.32, 1.18, -0.28, skin);       // 右手前伸
    box(0.2, 0.75, 0.2, -0.14, 0.37, 0, pants);           // 左腿
    box(0.2, 0.75, 0.2, 0.14, 0.37, 0, pants);            // 右腿
  }

  /** 老鼠：灰扑扑的小身子贴地跑，红眼睛发光，后面拖根尾巴 */
  private buildRat(): void {
    const fur = 0x5a5058;      // 灰里透紫的毛
    const mat = (c: number, glow = false) =>
      new THREE.MeshLambertMaterial(glow ? { color: c, emissive: c, emissiveIntensity: 1 } : { color: c });
    const box = (w: number, h: number, l: number, x: number, y: number, z: number, c: number, glow = false) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat(c, glow));
      m.position.set(x, y, z);
      m.castShadow = true;
      this.group.add(m);
    };
    box(0.3, 0.22, 0.5, 0, 0.16, 0, fur);                 // 趴着的身子
    box(0.22, 0.2, 0.22, 0, 0.2, -0.32, fur);             // 头（朝前）
    box(0.05, 0.05, 0.02, -0.06, 0.22, -0.44, 0xff3020, true); // 左红眼（发光）
    box(0.05, 0.05, 0.02, 0.06, 0.22, -0.44, 0xff3020, true);  // 右红眼
    box(0.07, 0.09, 0.04, -0.07, 0.34, -0.3, fur);        // 左耳
    box(0.07, 0.09, 0.04, 0.07, 0.34, -0.3, fur);         // 右耳
    box(0.05, 0.05, 0.4, 0, 0.1, 0.42, 0x8a6a72);         // 细尾巴拖后面
  }

  /** 幽灵鬼：半透明的青色发光"床单"，头顶镂空黑眼，底下飘着几根尾巴穗（灵魂虚空特产） */
  private buildGhost(): void {
    const sheet = 0x8fd8e8; // 床单色：发光的淡青蓝
    const sheetMat = new THREE.MeshLambertMaterial({
      color: sheet, emissive: 0x3a8ea8, emissiveIntensity: 0.9,
      transparent: true, opacity: 0.82,
    });
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x081018 }); // 镂空眼：不透光的小黑洞
    const box = (w: number, h: number, l: number, x: number, y: number, z: number, m: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), m);
      mesh.position.set(x, y, z);
      this.group.add(mesh);
    };
    box(0.56, 0.5, 0.44, 0, 1.42, 0, sheetMat);            // 圆乎乎的头顶（床单最鼓的地方）
    box(0.66, 0.55, 0.5, 0, 0.92, 0, sheetMat);            // 床单身子
    box(0.42, 0.3, 0.32, 0, 0.5, 0, sheetMat);             // 收窄的尾巴根
    box(0.17, 0.26, 0.15, -0.17, 0.24, 0, sheetMat);       // 尾巴穗·左
    box(0.17, 0.3, 0.15, 0.02, 0.22, 0.06, sheetMat);      // 尾巴穗·中
    box(0.17, 0.24, 0.15, 0.19, 0.26, -0.04, sheetMat);    // 尾巴穗·右
    box(0.15, 0.13, 0.34, -0.4, 1.02, -0.08, sheetMat);    // 小短手·左（朝前飘）
    box(0.15, 0.13, 0.34, 0.4, 1.02, -0.08, sheetMat);     // 小短手·右
    box(0.1, 0.16, 0.02, -0.14, 1.46, -0.23, eyeMat);      // 左眼洞
    box(0.1, 0.16, 0.02, 0.14, 1.46, -0.23, eyeMat);       // 右眼洞
    box(0.08, 0.1, 0.02, 0, 1.32, -0.23, eyeMat);          // 张着的小嘴洞
  }
}

/** 射线打僵尸：和打动物同一套，只是盒子更高 */
export function rayHitZombie(
  zombies: Zombie[],
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  maxDist: number,
): { zombie: Zombie; dist: number } | null {
  const r = rayHitBox(zombies, W, H, ox, oy, oz, dx, dy, dz, maxDist);
  return r ? { zombie: r.target, dist: r.dist } : null;
}

/** 在 (cx,cz) 周围 rMin~rMax 格的圆环里刷僵尸：什么地面都行，水里不行；kind 指定刷哪种 */
export function spawnZombies(
  world: World,
  scene: THREE.Scene,
  cx: number,
  cz: number,
  count: number,
  rMin: number,
  rMax: number,
  kind: ZombieKind = 'normal',
): Zombie[] {
  const out: Zombie[] = [];
  let tries = 0;
  while (out.length < count && tries++ < count * 15) {
    const ang = Math.random() * Math.PI * 2;
    const dist = rMin + Math.random() * (rMax - rMin);
    const x = cx + Math.cos(ang) * dist;
    const z = cz + Math.sin(ang) * dist;
    const h = heightAt(Math.floor(x), Math.floor(z));
    const ground = world.getBlock(Math.floor(x), h - 1, Math.floor(z));
    if (ground === AIR || ground === WATER) continue;
    const zb = new Zombie(x, h + 0.1, z, kind);
    scene.add(zb.group);
    out.push(zb);
  }
  return out;
}
