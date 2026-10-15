/** 坦克 — 能开的车：L 放地上，对着按 M 上车（两倍速），P 开炮（消耗炮弹），再按 M 下车；
 *  炮弹是直线飞的小铁弹，打到活物算三拳的伤 */

import * as THREE from 'three';
import { TANK } from '../config';
import { AIR, isSolid } from '../world/Block';
import { World } from '../world/World';
import { rayHitBox } from './hitbox';
import type { Mobs } from './Mobs';

const W = 1.7; // 坦克宽（撞墙上车前指着它的判定盒）
const H = 1.2; // 坦克高

export class Tank {
  readonly group = new THREE.Group();
  /** 脸朝哪边（开车时跟玩家的视线走） */
  yaw = 0;
  /** 弹药舱：拿炮弹对着坦克按 L 装进去，开炮只打这里面的 */
  ammo = 0;

  constructor(public x: number, public y: number, public z: number) {
    this.buildMesh();
    this.syncMesh();
  }

  /** 挪到新位置+新朝向并刷新模型 */
  setPose(x: number, y: number, z: number, yaw: number): void {
    this.x = x; this.y = y; this.z = z; this.yaw = yaw;
    this.syncMesh();
  }

  private syncMesh(): void {
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.yaw;
  }

  /** 拼模型：黑履带灰轮子 + 绿车身 + 炮塔炮管 + 小红星；前方是 -z（和僵尸一个约定） */
  private buildMesh(): void {
    const mat = (c: number) => new THREE.MeshLambertMaterial({ color: c });
    const box = (w: number, h: number, l: number, x: number, y: number, z: number, c: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat(c));
      m.position.set(x, y, z);
      m.castShadow = true;
      this.group.add(m);
    };
    // 两条黑色履带
    box(0.42, 0.42, 2.2, -0.68, 0.21, 0, 0x141416);
    box(0.42, 0.42, 2.2, 0.68, 0.21, 0, 0x141416);
    // 履带外侧露出的灰轮子（一边三个）
    for (const s of [-1, 1]) for (const dz of [-0.7, 0, 0.7]) box(0.44, 0.24, 0.28, s * 0.68, 0.2, dz, 0x9aa0a8);
    // 绿色车身
    box(1.4, 0.34, 2.0, 0, 0.58, 0, 0x3e6b2e);
    box(1.44, 0.08, 2.04, 0, 0.72, 0, 0x2c4e20); // 车身边一圈深色护板
    // 炮塔 + 朝前的炮管
    box(0.85, 0.32, 1.0, 0, 0.92, 0.1, 0x4e8539);
    box(0.12, 0.12, 1.1, 0, 0.92, -0.9, 0x2c4e20);
    box(0.16, 0.16, 0.14, 0, 0.92, -1.42, 0x141416); // 炮口
    // 炮塔侧面的小红星
    box(0.05, 0.14, 0.14, -0.45, 0.92, 0.1, 0xb03a2e);
    box(0.05, 0.14, 0.14, 0.45, 0.92, 0.1, 0xb03a2e);
  }
}

/** 指着坦克：和指动物一样的射线判定 */
export function rayHitTank(
  tanks: Tank[],
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  maxDist: number,
): { tank: Tank; dist: number } | null {
  const r = rayHitBox(tanks, W, H, ox, oy, oz, dx, dy, dz, maxDist);
  return r ? { tank: r.target, dist: r.dist } : null;
}

/** 炮弹：从炮口直线飞出去的小铁弹；撞到活物掉血、撞到方块消失、飞太远也消失 */
export class Bullet {
  readonly mesh: THREE.Mesh;
  private x: number; private y: number; private z: number;
  private yaw: number;
  private flown = 0;

  constructor(
    x: number, y: number, z: number,
    private dx: number, private dy: number, private dz: number,
  ) {
    this.x = x; this.y = y; this.z = z;
    this.yaw = Math.atan2(-dx, -dz);
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x2e2e33 }), // 黑铁弹，发光好认
    );
    this.mesh.position.set(x, y, z);
    this.mesh.rotation.y = this.yaw;
  }

  /** 飞一帧：撞到活物（掉血）/方块/超射程 → false 消失 */
  update(dt: number, world: World, mobs: Mobs): boolean {
    const step = TANK.BULLET_SPEED * dt;
    // 先测这一段路上有没有活物（活物判定放宽一点，别擦着头皮飞过去）
    const hit = mobs.rayHit(this.x, this.y, this.z, this.dx, this.dy, this.dz, step + 0.3);
    if (hit) {
      hit.mob.hurt(TANK.BULLET_DAMAGE, this.yaw);
      if (hit.mob.dead) mobs.kill(hit.mob);
      return false;
    }
    this.x += this.dx * step;
    this.y += this.dy * step;
    this.z += this.dz * step;
    this.flown += step;
    this.mesh.position.set(this.x, this.y, this.z);
    // 撞实心方块消失（水和空气随便穿）
    const id = world.getBlock(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z));
    if (id !== AIR && isSolid(id)) return false;
    return this.flown <= TANK.BULLET_RANGE;
  }
}
