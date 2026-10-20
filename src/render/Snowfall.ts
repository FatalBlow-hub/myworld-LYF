/** 冬季降雪 — 玩家周围飘一层小雪花（纯粒子，不写世界数据）
 *  只在「冬季 + 站在雪地上」时由 Game 打开，离岛/换季自动关掉。
 *
 *  用法:
 *   snow.setActive(true, body.x, body.y, body.z);
 *   snow.update(dt, body.x, body.y, body.z);
 */

import * as THREE from 'three';
import { SNOWFALL } from '../config';

export class Snowfall {
  readonly object: THREE.Points;
  private pos: Float32Array;
  private attr: THREE.BufferAttribute;
  private active = false;

  constructor(scene: THREE.Scene) {
    const count = SNOWFALL.PARTICLES;
    this.pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) this.scatter(i, 0, 0, 0);
    const geo = new THREE.BufferGeometry();
    this.attr = new THREE.BufferAttribute(this.pos, 3);
    geo.setAttribute('position', this.attr);
    const mat = new THREE.PointsMaterial({
      color: SNOWFALL.COLOR,
      size: SNOWFALL.SIZE,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.object = new THREE.Points(geo, mat);
    this.object.frustumCulled = false; // 粒子一直跟着玩家，别被视锥体误裁
    this.object.visible = false;
    scene.add(this.object);
  }

  /** 开/关降雪：打开时把雪花直接铺到玩家周围，不用等它们慢慢落下来 */
  setActive(on: boolean, x = 0, y = 0, z = 0): void {
    if (on === this.active) return;
    this.active = on;
    this.object.visible = on;
    if (!on) return;
    for (let i = 0; i < SNOWFALL.PARTICLES; i++) this.scatter(i, x, y, z);
    this.attr.needsUpdate = true;
  }

  /** 每帧：雪花往下飘、横向微飘；落到脚下或飘出范围就回玩家头顶重生 */
  update(dt: number, x: number, y: number, z: number): void {
    if (!this.active) return;
    const half = SNOWFALL.AREA / 2;
    for (let i = 0; i < SNOWFALL.PARTICLES; i++) {
      const j = i * 3;
      this.pos[j + 1] -= SNOWFALL.FALL_SPEED * dt;
      this.pos[j] += SNOWFALL.DRIFT * dt;
      if (this.pos[j + 1] < y - SNOWFALL.BELOW
        || Math.abs(this.pos[j] - x) > half
        || Math.abs(this.pos[j + 2] - z) > half) {
        this.scatter(i, x, y, z);
      }
    }
    this.attr.needsUpdate = true;
  }

  /** 随机放到玩家周围的一处（头顶到脚下之间） */
  private scatter(i: number, x: number, y: number, z: number): void {
    const j = i * 3;
    this.pos[j] = x + (Math.random() - 0.5) * SNOWFALL.AREA;
    this.pos[j + 1] = y - SNOWFALL.BELOW + Math.random() * (SNOWFALL.HEIGHT + SNOWFALL.BELOW);
    this.pos[j + 2] = z + (Math.random() - 0.5) * SNOWFALL.AREA;
  }
}
