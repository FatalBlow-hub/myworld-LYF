/** 鱼 — 海里的四种鱼：在水里慢慢游，玩家下水按 P 打，打死掉生鱼；河豚凑近会扎人 */

import * as THREE from 'three';
import { FISH, SEA_LEVEL } from '../../config';
import { FISH_CLOWN, FISH_COD, FISH_PUFFER, FISH_SALMON, WATER } from '../../world/blocks/Block';
import { World } from '../../world/World';
import { heightAt } from '../../world/terrain/TerrainGen';
import { collidesAABB } from '../../player/motion/Physics';
import { rayHitBox } from '../objects/hitbox';

export type FishKind = 'clown' | 'cod' | 'salmon' | 'puffer';

/** 每种鱼：打死掉的物品 + 碰撞盒宽高（鱼是趴在水里游的，w 取身体最长的那一边） */
const KINDS: Record<FishKind, { item: number; w: number; h: number }> = {
  clown:  { item: FISH_CLOWN,  w: 0.45, h: 0.28 },
  cod:    { item: FISH_COD,    w: 0.58, h: 0.28 },
  salmon: { item: FISH_SALMON, w: 0.58, h: 0.28 },
  puffer: { item: FISH_PUFFER, w: 0.42, h: 0.42 },
};

/** 打死掉的物品（Mobs.kill 用） */
export const FISH_ITEM: Record<FishKind, number> = {
  clown: KINDS.clown.item, cod: KINDS.cod.item, salmon: KINDS.salmon.item, puffer: KINDS.puffer.item,
};

/** 刷鱼时各种鱼的中签率：河豚稀少（会扎人，刷多了海没法下） */
const SPAWN_WEIGHTS: [FishKind, number][] = [['clown', 3], ['cod', 3], ['salmon', 3], ['puffer', 1]];
const TOTAL_WEIGHT = SPAWN_WEIGHTS.reduce((s, [, w]) => s + w, 0);

/** 按中签率随机抽一种鱼：普通三种常见，河豚少见（刷鱼和钓鱼保底共用） */
export function randomFishKind(): FishKind {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const [k, w] of SPAWN_WEIGHTS) { r -= w; if (r <= 0) return k; }
  return 'clown';
}

export class Fish {
  readonly kind: FishKind;
  readonly group = new THREE.Group();
  hp = FISH.HP;
  dead = false;
  readonly w: number;
  readonly h: number;
  x: number; y: number; z: number;
  private yaw = Math.random() * Math.PI * 2;
  private wanderT = 0;
  private idleT = 0;
  private vy = 0;        // 上下游动的速度（水里慢悠悠漂）
  private stingT = 0;    // 河豚扎人冷却
  private dryT = 0;      // 离水扑腾计时

  constructor(kind: FishKind, x: number, y: number, z: number) {
    this.kind = kind;
    this.w = KINDS[kind].w;
    this.h = KINDS[kind].h;
    this.x = x; this.y = y; this.z = z;
    this.buildMesh();
    this.syncMesh();
  }

  /** 挨打：扣血 + 在水里被打得漂开一点 */
  hurt(dmg: number, fromYaw: number): void {
    this.hp -= dmg;
    const nx = this.x - Math.sin(fromYaw) * 0.3;
    const nz = this.z - Math.cos(fromYaw) * 0.3;
    // 在水里才被打退，岸上扑腾就行
    this.x = nx; this.z = nz; this.vy = 1.5;
    if (this.hp <= 0) this.dead = true;
  }

  /** 中心那格是不是水：鱼只能待在水里 */
  private inWater(world: World, x: number, y: number, z: number): boolean {
    return world.getBlock(Math.floor(x), Math.floor(y + this.h / 2), Math.floor(z)) === WATER;
  }

  /**
   * 每帧：水里闲逛；离水了扑腾几秒死掉。
   * 返回 true = 河豚这帧扎到玩家了（扣血归 Game 管）
   */
  update(dt: number, world: World, px?: number, py?: number, pz?: number): boolean {
    this.stingT = Math.max(0, this.stingT - dt);
    // 河豚扎人：够近就扎一下（在水里才扎得着）
    let stung = false;
    if (this.kind === 'puffer' && this.stingT <= 0 && px !== undefined && py !== undefined && pz !== undefined) {
      const d = Math.hypot(px - this.x, py - this.y, pz - this.z);
      if (d < FISH.STING_RANGE) { this.stingT = FISH.STING_COOLDOWN; stung = true; }
    }

    if (!this.inWater(world, this.x, this.y, this.z)) {
      // 离水了：往下掉 + 扑腾，撑不过 DRY_SECONDS 秒
      this.dryT += dt;
      if (this.dryT >= FISH.DRY_SECONDS) { this.dead = true; return stung; }
      this.vy -= 20 * dt;
      const ny = this.y + this.vy * dt;
      if (collidesAABB(world, this.x, ny, this.z, this.w, this.h)) this.vy = 0;
      else this.y = ny;
      this.syncMesh();
      return stung;
    }
    this.dryT = 0;

    // 闲逛：隔几秒换个方向，偶尔停着发呆
    this.wanderT -= dt;
    if (this.wanderT <= 0) {
      this.wanderT = 2 + Math.random() * 3;
      if (Math.random() < 0.3) this.idleT = 0.8 + Math.random() * 1.5;
      else {
        this.yaw = Math.random() * Math.PI * 2;
        this.vy = (Math.random() - 0.5) * 0.8; // 顺便决定往上游还是往下沉
      }
    }

    if (this.idleT > 0) {
      this.idleT -= dt;
      this.vy *= 1 - Math.min(1, 3 * dt);
    } else {
      // 往前游：前面不是水就拐弯
      const sp = FISH.SPEED;
      const nx = this.x - Math.sin(this.yaw) * sp * dt;
      const nz = this.z - Math.cos(this.yaw) * sp * dt;
      if (this.inWater(world, nx, this.y, nz)) { this.x = nx; this.z = nz; }
      else this.yaw += Math.PI / 2;
      // 上下游：前面不是水就掉头（浮到水面 / 沉到海底都会停）
      const ny = this.y + this.vy * dt;
      if (this.inWater(world, this.x, ny, this.z)) this.y = ny;
      else this.vy = -this.vy;
    }
    this.syncMesh();
    return stung;
  }

  private syncMesh(): void {
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.yaw;
  }

  /** 搭鱼模型：四种鱼四种长相，头都朝 -z（跟 yaw=0 的方向一致） */
  private buildMesh(): void {
    const mat = (c: number) => new THREE.MeshLambertMaterial({ color: c });
    const box = (w: number, h: number, l: number, x: number, y: number, z: number, c: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat(c));
      m.position.set(x, y, z);
      this.group.add(m);
      return m;
    };
    const cy = this.h / 2; // 身子中心高度（y 是碰撞盒底部）
    switch (this.kind) {
      case 'clown': {
        box(0.2, 0.2, 0.34, 0, cy, -0.03, 0xe8681c);              // 橙身子
        box(0.21, 0.21, 0.05, 0, cy, -0.12, 0xf2f2f2);            // 头后白条纹
        box(0.21, 0.21, 0.05, 0, cy, 0.02, 0xf2f2f2);             // 中间白条纹
        box(0.04, 0.14, 0.14, 0, cy, 0.22, 0xf2f2f2);             // 白尾巴
        box(0.1, 0.05, 0.16, 0, cy + 0.12, -0.02, 0xd85510);      // 背鳍
        box(0.05, 0.05, 0.02, -0.08, cy + 0.03, -0.19, 0x1a1a1a); // 左眼
        box(0.05, 0.05, 0.02, 0.08, cy + 0.03, -0.19, 0x1a1a1a);  // 右眼
        break;
      }
      case 'cod': {
        box(0.22, 0.14, 0.48, 0, cy + 0.04, 0, 0x6f9173);         // 青灰背
        box(0.2, 0.09, 0.44, 0, cy - 0.07, 0, 0xe8e0cc);          // 米白肚
        box(0.04, 0.15, 0.16, 0, cy, 0.3, 0x5a7a5e);              // 尾巴
        box(0.06, 0.06, 0.18, 0, cy + 0.14, -0.02, 0x4a6350);     // 背鳍
        box(0.05, 0.05, 0.02, -0.09, cy + 0.05, -0.24, 0x1a1a1a); // 左眼
        box(0.05, 0.05, 0.02, 0.09, cy + 0.05, -0.24, 0x1a1a1a);  // 右眼
        break;
      }
      case 'salmon': {
        box(0.22, 0.14, 0.48, 0, cy + 0.04, 0, 0xe07052);         // 粉红背
        box(0.2, 0.09, 0.44, 0, cy - 0.07, 0, 0xf2c4a8);          // 浅粉肚
        box(0.04, 0.15, 0.16, 0, cy, 0.3, 0xc2503c);              // 尾巴
        box(0.06, 0.06, 0.18, 0, cy + 0.14, -0.02, 0xa83828);     // 背鳍
        box(0.05, 0.05, 0.02, -0.09, cy + 0.05, -0.24, 0x1a1a1a); // 左眼
        box(0.05, 0.05, 0.02, 0.09, cy + 0.05, -0.24, 0x1a1a1a);  // 右眼
        break;
      }
      case 'puffer': {
        box(0.34, 0.34, 0.34, 0, cy, 0, 0xd8b048);                // 黄圆身子
        box(0.28, 0.1, 0.28, 0, cy - 0.1, -0.02, 0xf2e0b0);       // 浅肚皮
        // 六个方向各扎一根刺
        box(0.05, 0.12, 0.05, 0, cy + 0.22, 0, 0x8a6a28);         // 头顶
        box(0.12, 0.05, 0.05, -0.22, cy, 0, 0x8a6a28);            // 左侧
        box(0.12, 0.05, 0.05, 0.22, cy, 0, 0x8a6a28);             // 右侧
        box(0.05, 0.12, 0.05, -0.1, cy + 0.2, -0.1, 0x8a6a28);    // 左前上
        box(0.05, 0.12, 0.05, 0.1, cy + 0.2, -0.1, 0x8a6a28);     // 右前上
        box(0.05, 0.12, 0.05, 0, cy - 0.02, -0.22, 0x8a6a28);     // 嘴前面
        box(0.06, 0.1, 0.1, 0, cy, 0.24, 0x6a4f1c);               // 小尾巴
        box(0.06, 0.06, 0.02, -0.08, cy + 0.06, -0.18, 0x1a1a1a); // 左眼
        box(0.06, 0.06, 0.02, 0.08, cy + 0.06, -0.18, 0x1a1a1a);  // 右眼
        break;
      }
    }
  }
}

/** 射线打鱼：返回最近被打中的鱼和距离 */
export function rayHitFish(
  fish: Fish[],
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  maxDist: number,
): { fish: Fish; dist: number } | null {
  const r = rayHitBox(fish, 0.45, 0.3, ox, oy, oz, dx, dy, dz, maxDist);
  return r ? { fish: r.target, dist: r.dist } : null;
}

/**
 * 在 (cx,cz) 周围 rMin~rMax 格的圆环里往海里撒鱼：
 * 找水够深的地方（水底比海平面低 2 格以上），在水体中层随机放
 */
export function spawnFish(
  world: World,
  scene: THREE.Scene,
  cx: number,
  cz: number,
  count: number,
  rMin = 0,
  rMax = 15,
): Fish[] {
  const out: Fish[] = [];
  let tries = 0;
  while (out.length < count && tries++ < count * 20) {
    const ang = Math.random() * Math.PI * 2;
    const dist = rMin + Math.random() * (rMax - rMin);
    const x = cx + Math.cos(ang) * dist;
    const z = cz + Math.sin(ang) * dist;
    const ground = heightAt(Math.floor(x), Math.floor(z));
    // 水太浅（水底离海面不到 2 格）鱼待不下
    if (ground >= SEA_LEVEL - 1) continue;
    const y = ground + 0.3 + Math.random() * (SEA_LEVEL - 1 - ground);
    // 落点那格得真的是水（防止算出来在岸上或空气里）
    if (world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)) !== WATER) continue;
    const f = new Fish(randomFishKind(), x, y, z);
    scene.add(f.group);
    out.push(f);
  }
  return out;
}
