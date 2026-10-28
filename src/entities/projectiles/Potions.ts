/** 扔出去的药水瓶 — 一条小抛物线，撞到活物或方块就碎开，溅到周围的僵尸 */

import * as THREE from 'three';
import { GOLDEN, PLAYER, POTION } from '../../config';
import { POTION_BREATH, POTION_DEADLY, POTION_PHANTOM, POTION_POISON, POTION_IDS, isSolid } from '../../world/blocks/Block';
import { POTION_ICE } from '../../world/recipes/GoldenItems';
import { World } from '../../world/World';
import { PlayerBody } from '../../player/motion/Physics';
import { Mobs } from '../mobs/Mobs';
import { raycastBlock } from '../../interact/BlockPicker';
import { Controller } from '../../player/motion/Controller';
import { Inventory } from '../../player/Inventory';
import { Hud } from '../../ui/hud/Hud';

/** 每种药水的颜色（飞行小瓶子和溅到的效果都靠它认） */
const POTION_COLOR: Record<number, number> = {
  [POTION_POISON]: 0x5a8a46,
  [POTION_PHANTOM]: 0x9a68c6,
  [POTION_DEADLY]: 0x1a4a1e,
  [POTION_BREATH]: 0x3d6fb0,
  [POTION_ICE]: 0x8fe8ff,
};

interface Flying {
  kind: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  left: number; // 还能飞多远（格）
  mesh: THREE.Mesh;
}

export class Potions {
  private flying: Flying[] = [];

  constructor(
    private scene: THREE.Scene,
    private mobs: Mobs,
    /** 药水砸中僵尸时给玩家看的提示 */
    private onSplash: (msg: string) => void,
  ) {}

  /** 按 P 把手里的药水瓶扔出去：从眼睛朝看的方向飞，走个小抛物线 */
  throwPotion(kind: number, body: PlayerBody): void {
    const cp = Math.cos(body.pitch);
    const dx = -Math.sin(body.yaw) * cp;
    const dy = Math.sin(body.pitch);
    const dz = -Math.cos(body.yaw) * cp;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.24, 0.18),
      new THREE.MeshLambertMaterial({ color: POTION_COLOR[kind] ?? 0x888888 }),
    );
    mesh.position.set(body.x, body.y + PLAYER.EYE, body.z);
    this.scene.add(mesh);
    this.flying.push({
      kind,
      x: body.x, y: body.y + PLAYER.EYE, z: body.z,
      vx: dx * POTION.THROW_SPEED, vy: dy * POTION.THROW_SPEED + POTION.LIFT, vz: dz * POTION.THROW_SPEED,
      left: POTION.RANGE,
      mesh,
    });
  }

  /** 拿着药水瓶时，P 扔瓶子；返回 true 表示这帧由药水接管瞄准/挖掘输入 */
  handleInput(
    controller: Controller, inventory: Inventory, slot: number, body: PlayerBody, hud: Hud,
    hit: { x: number; y: number; z: number } | null, highlight: THREE.LineSegments,
  ): boolean {
    const held = inventory.hotbar[slot];
    if (!held || !POTION_IDS.includes(held.id)) return false;
    if (hit) {
      highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
      highlight.visible = true;
    } else {
      highlight.visible = false;
    }
    hud.setProgress(0);
    if (controller.take('mine')) {
      this.throwPotion(held.id, body);
      if (!inventory.infinite) {
        held.count--;
        if (held.count <= 0) inventory.hotbar[slot] = null;
      }
      hud.showMessage('扔出去了！', 0.5);
    }
    return true;
  }

  /** 每帧：瓶子往前飞，撞到东西就碎开生效 */
  update(dt: number, world: World): void {
    for (const p of this.flying) {
      for (let remaining = dt; remaining > 0 && p.left > 0;) {
        const step = Math.min(remaining, POTION.STEP);
        remaining -= step;
        const previous = { x: p.x, y: p.y, z: p.z };
        p.vy -= POTION.GRAVITY * step;
        p.left -= Math.hypot(p.vx, p.vy, p.vz) * step;
        p.x += p.vx * step; p.y += p.vy * step; p.z += p.vz * step;
        const hitBlock = isSolid(world.getBlock(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)));
        const hitMob = [...this.mobs.zombies, ...this.mobs.animals].some((m) => !m.dead &&
          Math.abs(p.x - m.x) < m.w * m.group.scale.x / 2 + 0.09 &&
          Math.abs(p.z - m.z) < m.w * m.group.scale.z / 2 + 0.09 &&
          p.y >= m.y && p.y <= m.y + m.h * m.group.scale.y,
        );
        if (hitBlock || hitMob || p.left <= 0 || p.y < 0) {
          const at = hitBlock ? previous : p;
          this.splash(p.kind, at.x, at.y, at.z, world);
          this.scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          (p.mesh.material as THREE.Material).dispose();
          p.left = -1;
        }
      }
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.x += dt * 8;
    }
    this.flying = this.flying.filter((p) => p.left > 0);
  }

  /** 瓶子碎了：溅到周围 1.6 格内的所有僵尸都吃效果 */
  private splash(kind: number, x: number, y: number, z: number, world: World): void {
    const near = [...this.mobs.zombies, ...this.mobs.animals].filter((m) => {
      if (m.dead) return false;
      const dx = m.x - x, dy = m.y + m.h * m.group.scale.y / 2 - y, dz = m.z - z;
      const distance = Math.hypot(dx, dy, dz);
      return distance <= POTION.SPLASH && (distance === 0 ||
        !raycastBlock(world, x, y, z, dx / distance, dy / distance, dz / distance, distance));
    });
    if (near.length === 0) return;
    for (const m of near) {
      if (kind === POTION_POISON) m.addPoison(POTION.POISON.dmg, POTION.POISON.every, POTION.POISON.dur);
      else if (kind === POTION_DEADLY) m.addPoison(POTION.DEADLY.dmg, POTION.DEADLY.every, POTION.DEADLY.dur);
      else if (kind === POTION_PHANTOM) {
        m.slowT = POTION.SLOW.dur;
        m.addPoison(POTION.PHANTOM_DAMAGE.dmg, POTION.PHANTOM_DAMAGE.every, POTION.SLOW.dur); // 幻药瓶：每 5 秒 -1 血 + 速度减半
      } else if (kind === POTION_ICE) {
        m.hp = Math.max(0, m.hp - GOLDEN.FREEZE_DAMAGE);
        m.frozenT = Math.max(m.frozenT, GOLDEN.FREEZE_SECONDS);
        if (m.hp <= 0) m.dead = true;
      }
      // 防溺瓶扔僵尸没用——僵尸本来就不怕水
    }
    const what = kind === POTION_POISON ? '中毒了' : kind === POTION_DEADLY ? '中了剧毒' : kind === POTION_PHANTOM ? '晕乎乎变慢了' : kind === POTION_ICE ? '被冻住并扣了2点血' : '啥事没有';
    this.onSplash(`药水瓶碎了！${near.length} 个目标${what}`);
  }
}
