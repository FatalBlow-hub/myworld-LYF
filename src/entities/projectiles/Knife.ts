/** 枫叶飞刀 — 一次性投掷物：按 P 甩出去，走一条很浅的抛物线，命中活物扣 2 点血
 *
 *  只认怪和动物，不打小战士/弓箭手（"不会误伤队友"）；扔空/撞墙/超射程就直接消失，不返还。 */

import * as THREE from 'three';
import { KNIFE, PLAYER } from '../../config';
import { KNIFE_MAPLE, isSolid } from '../../world/blocks/Block';
import { World } from '../../world/World';
import { PlayerBody } from '../../player/motion/Physics';
import { Controller } from '../../player/motion/Controller';
import { Inventory } from '../../player/Inventory';
import { Hud } from '../../ui/hud/Hud';
import { Mobs } from '../mobs/Mobs';
import { Zombie } from '../mobs/Zombie';
import { Animal } from '../creatures/Animal';

interface FlyingKnife {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  left: number; // 还能飞多远（格）
  mesh: THREE.Mesh;
}

export class Knife {
  private flying: FlyingKnife[] = [];

  constructor(
    private scene: THREE.Scene,
    private mobs: Mobs,
    private onHit: (msg: string) => void,
  ) {}

  /** 手里拿着飞刀时按 P 甩出去；返回 true 表示这帧的攻击输入被它接管 */
  handleInput(controller: Controller, inventory: Inventory, slot: number, body: PlayerBody, hud: Hud): boolean {
    const held = inventory.hotbar[slot];
    if (!held || held.id !== KNIFE_MAPLE) return false;
    if (controller.take('mine')) {
      this.throw(body);
      if (!inventory.infinite) {
        held.count--;
        if (held.count <= 0) inventory.hotbar[slot] = null;
      }
      hud.showMessage('飞刀出手！', 0.6);
    }
    return true;
  }

  private throw(body: PlayerBody): void {
    const cp = Math.cos(body.pitch);
    const dx = -Math.sin(body.yaw) * cp;
    const dy = Math.sin(body.pitch);
    const dz = -Math.cos(body.yaw) * cp;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.04, 0.34),
      new THREE.MeshLambertMaterial({ color: 0xc8422a }),
    );
    mesh.position.set(body.x, body.y + PLAYER.EYE, body.z);
    this.scene.add(mesh);
    this.flying.push({
      x: body.x, y: body.y + PLAYER.EYE, z: body.z,
      vx: dx * KNIFE.SPEED, vy: dy * KNIFE.SPEED, vz: dz * KNIFE.SPEED,
      left: KNIFE.RANGE,
      mesh,
    });
  }

  /** 每帧：分步推进，撞墙/命中/超程就停下；扔空的不返还 */
  update(dt: number, world: World): void {
    for (const k of this.flying) {
      for (let remaining = dt; remaining > 0 && k.left > 0;) {
        const step = Math.min(remaining, KNIFE.STEP);
        remaining -= step;
        k.vy -= KNIFE.GRAVITY * step;
        k.left -= Math.hypot(k.vx, k.vy, k.vz) * step;
        k.x += k.vx * step; k.y += k.vy * step; k.z += k.vz * step;
        if (isSolid(world.getBlock(Math.floor(k.x), Math.floor(k.y), Math.floor(k.z)))) { k.left = -1; break; }
        const target = this.hitTarget(k);
        if (target) {
          target.hurt(KNIFE.DAMAGE, Math.atan2(-k.vx, -k.vz));
          if (target.dead) this.mobs.kill(target);
          else this.onHit(`飞刀命中，扣了 ${KNIFE.DAMAGE} 点血`);
          k.left = -1;
          break;
        }
        if (k.left <= 0 || k.y < 0) { k.left = -1; break; }
      }
      k.mesh.position.set(k.x, k.y, k.z);
      k.mesh.rotation.z += dt * 22;
    }
    for (const k of this.flying) {
      if (k.left > 0) continue;
      this.scene.remove(k.mesh);
      k.mesh.geometry.dispose();
      (k.mesh.material as THREE.Material).dispose();
    }
    this.flying = this.flying.filter((k) => k.left > 0);
  }

  /** 命中判定：只认怪和动物（小战士/弓箭手是队友，不挨刀） */
  private hitTarget(k: FlyingKnife): Zombie | Animal | null {
    for (const m of [...this.mobs.zombies, ...this.mobs.animals]) {
      if (m.dead) continue;
      const halfW = (m.w * m.group.scale.x) / 2 + 0.1;
      const halfD = (m.w * m.group.scale.z) / 2 + 0.1;
      if (Math.abs(k.x - m.x) < halfW && Math.abs(k.z - m.z) < halfD &&
          k.y >= m.y && k.y <= m.y + m.h * m.group.scale.y) {
        return m;
      }
    }
    return null;
  }
}
