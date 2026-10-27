/** CS 大赛的 AI 士兵 — 两队各若干个，会朝目标跑、会开枪、会被闪光弹晃瞎
 *
 *  形象复用玩家那套方块小人（队友史蒂夫、对手艾力克斯）；不做复杂寻路，
 *  直线朝目标跑，撞墙就沿一个轴滑过去，有视线且进射程才开枪。 */

import * as THREE from 'three';
import { CS } from '../config';
import { isSolid } from '../world/Block';
import type { World } from '../world/World';
import { CharacterKind, CharacterModel, createCharacter } from './Character';
import { raycastBlock } from '../interact/BlockPicker';
import { CS_EDGE } from '../world/CsMaps';

export type CsTeam = 'ally' | 'enemy';

export class Soldier {
  readonly group: THREE.Group;
  x: number; y: number; z: number;
  yaw = 0;
  hp = CS.SOLDIER_HP;
  dead = false;
  /** 被闪光弹晃瞎的剩余秒数（>0 时不动也不开枪） */
  flashT = 0;
  private shootT = 0;
  private model: CharacterModel;

  constructor(readonly team: CsTeam, x: number, y: number, z: number) {
    const kind: CharacterKind = team === 'ally' ? 'steve' : 'alex';
    this.model = createCharacter(kind, team === 'ally' ? '队友' : '对手');
    this.group = this.model.group;
    this.x = x; this.y = y; this.z = z;
    this.group.position.set(x, y, z);
  }

  /** 每帧：朝目标靠近 / 有视线时开枪；onFire 在开枪那一刻回调（扣血由外面判） */
  update(dt: number, world: World, target: { x: number; y: number; z: number } | null, onFire: (s: Soldier) => void): void {
    if (this.dead) return;
    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt);
      this.shootT = Math.max(0, this.shootT - dt);
      this.model.update(dt);
      return;
    }
    this.shootT = Math.max(0, this.shootT - dt);
    if (target) {
      const dx = target.x - this.x;
      const dz = target.z - this.z;
      const dist = Math.hypot(dx, dz);
      this.yaw = Math.atan2(-dx, -dz);
      // 离得远就往前压，太近了就往后拉开一点（别贴脸站着）
      if (dist > CS.SOLDIER_RANGE * 0.7) this.move(dt, world, dx / dist, dz / dist);
      else if (dist < 3) this.move(dt, world, -dx / dist, -dz / dist);
      this.group.position.set(this.x, this.y, this.z);
      this.model.faceTo(target.x, target.z);
      // 有视线 + 进射程 + 冷却好了 → 开一枪
      if (dist <= CS.SOLDIER_RANGE && this.shootT <= 0 && this.canSee(world, target)) {
        this.shootT = CS.SOLDIER_EVERY;
        onFire(this);
      }
    }
    this.model.update(dt);
    this.group.position.set(this.x, this.y, this.z);
  }

  /** 扣血（打到 0 就阵亡，由外面统一收尸） */
  hurt(dmg: number): void {
    if (this.dead) return;
    this.hp = Math.max(0, this.hp - dmg);
    if (this.hp <= 0) this.dead = true;
  }

  /** 被闪光弹晃到 */
  blind(seconds: number): void {
    this.flashT = Math.max(this.flashT, seconds);
  }

  dispose(): void {
    this.model.dispose();
  }

  private move(dt: number, world: World, nx: number, nz: number): void {
    const step = CS.SOLDIER_SPEED * dt;
    const tx = this.x + nx * step;
    const tz = this.z + nz * step;
    // 撞墙就只走一个轴（另一个轴被挡就不动），顺便夹在地图边界内
    const free = (x: number, z: number) => {
      if (x < CS_EDGE.min || x > CS_EDGE.max || z < CS_EDGE.min || z > CS_EDGE.max) return false;
      return !isSolid(world.getBlock(Math.floor(x), Math.floor(this.y), Math.floor(z)));
    };
    if (free(tx, tz)) { this.x = tx; this.z = tz; return; }
    if (free(tx, this.z)) { this.x = tx; return; }
    if (free(this.x, tz)) { this.z = tz; }
  }

  private canSee(world: World, target: { x: number; y: number; z: number }): boolean {
    const dx = target.x - this.x;
    const dy = target.y + 0.9 - (this.y + 0.9);
    const dz = target.z - this.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.01) return true;
    return !raycastBlock(world, this.x, this.y + 0.9, this.z, dx / dist, dy / dist, dz / dist, dist);
  }
}
