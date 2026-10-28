/** CS 投掷物 — 手雷 / 闪光弹 / 毒药瓶，一条抛物线，落到东西上就生效
 *
 *  三样共用一条弹道：手雷炸开有范围伤害、闪光弹晃瞎身边的人、毒药瓶砸中直接扣血。 */

import * as THREE from 'three';
import { CS } from '../../config';
import { isSolid } from '../../world/blocks/Block';
import type { World } from '../../world/World';
import { PlayerBody } from '../../player/motion/Physics';

export type CsThrownKind = 'grenade' | 'flash' | 'toxic';

const COLOR: Record<CsThrownKind, number> = { grenade: 0x3e5a2e, flash: 0xc8ccd4, toxic: 0x3a6a3a };

interface Flying {
  kind: CsThrownKind;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  left: number;
  mesh: THREE.Mesh;
}

export class CsThrown {
  private flying: Flying[] = [];

  constructor(private scene: THREE.Scene) {}

  /** 从眼睛位置朝看的方向甩出去 */
  throwItem(kind: CsThrownKind, body: PlayerBody): void {
    const cp = Math.cos(body.pitch);
    const dx = -Math.sin(body.yaw) * cp;
    const dy = Math.sin(body.pitch);
    const dz = -Math.cos(body.yaw) * cp;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 0.18),
      new THREE.MeshLambertMaterial({ color: COLOR[kind] }),
    );
    mesh.position.set(body.x, body.y + 0.9, body.z);
    this.scene.add(mesh);
    this.flying.push({
      kind,
      x: body.x, y: body.y + 0.9, z: body.z,
      vx: dx * CS.THROW_SPEED, vy: dy * CS.THROW_SPEED + 2, vz: dz * CS.THROW_SPEED,
      left: CS.THROW_RANGE,
      mesh,
    });
  }

  /** 每帧：分步推进；撞方块/落地/超程就把落点交出去（命中判定由 CsMatch 做） */
  update(dt: number, world: World, onLand: (kind: CsThrownKind, x: number, y: number, z: number) => void): void {
    for (const p of this.flying) {
      for (let remaining = dt; remaining > 0 && p.left > 0;) {
        const step = Math.min(remaining, CS.THROW_STEP);
        remaining -= step;
        p.vy -= CS.THROW_GRAVITY * step;
        p.left -= Math.hypot(p.vx, p.vy, p.vz) * step;
        p.x += p.vx * step; p.y += p.vy * step; p.z += p.vz * step;
        if (isSolid(world.getBlock(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)))) { p.left = -1; break; }
        if (p.left <= 0 || p.y < 0) { p.left = -1; break; }
      }
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.x += dt * 10;
      p.mesh.rotation.y += dt * 6;
    }
    for (const p of this.flying) {
      if (p.left > 0) continue;
      onLand(p.kind, p.x, p.y, p.z);
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.flying = this.flying.filter((p) => p.left > 0);
  }

  clear(): void {
    for (const p of this.flying) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.flying = [];
  }
}
