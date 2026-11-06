/** 钓鱼 — 手持鱼竿按 P 抛竿：浮标飞进水面漂着，咬钩时浮标猛地下沉，限时收杆才钓得到
 *
 *  三根竿共用这套流程，只差收杆窗口和耐久（普通 1 秒/20、铸铁 1.5 秒/66、金色 2 秒/99，见 config FISHING）。
 *  对着水面直接抛，不要求附近有鱼；收杆时附近有真鱼就把那只算作钓到的（按 FISH_ITEM 换成对应的生鱼），
 *  没有就按刷鱼中签率给一条随机鱼。
 *  挂在 Game 的输入链上（和药水瓶同款 handleInput 模式），持竿时 P 全归钓鱼管。 */

import * as THREE from 'three';
import { FISHING } from '../../config';
import { AIR, BLOCKS, FISH_ROD, GOLD_FISH_ROD, IRON_FISH_ROD, WATER } from '../../world/blocks/Block';
import type { Stack } from '../../world/blocks/Block';
import { FISH_ITEM, Fish, randomFishKind } from '../../entities/creatures/Fish';
import { Mobs } from '../../entities/mobs/Mobs';
import { World } from '../../world/World';
import { PlayerBody } from '../../player/motion/Physics';
import { Controller } from '../../player/motion/Controller';
import { Inventory } from '../../player/Inventory';
import { Hud } from '../../ui/hud/Hud';

/** 三根竿的档位（收杆窗口/耐久按档查 FISHING 表） */
type RodGrade = 'normal' | 'iron' | 'gold';

const ROD_GRADE_OF: Record<number, RodGrade> = {
  [FISH_ROD]: 'normal', [IRON_FISH_ROD]: 'iron', [GOLD_FISH_ROD]: 'gold',
};

type Phase = 'idle' | 'flying' | 'waiting' | 'biting';

export class Fishing {
  private phase: Phase = 'idle';
  private grade: RodGrade = 'normal';
  private biteT = 0;   // 等咬钩倒计时（waiting 阶段）
  private reelT = 0;   // 收杆窗口倒计时（biting 阶段）
  private flyT = 0;    // 浮标飞行进度 0→1
  private bobT = Math.random() * 6; // 浮标上下漂的相位
  private from = { x: 0, y: 0, z: 0 }; // 飞行起点（玩家眼睛）
  private to = { x: 0, y: 0, z: 0 };   // 水面落点
  private bobber: THREE.Mesh;

  constructor(
    private scene: THREE.Scene,
    private mobs: Mobs,
    /** 咬钩/钓到/跑掉这些提示（Game 接给 HUD） */
    private msg: (text: string) => void,
  ) {
    this.bobber = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xe8503a }),
    );
    this.bobber.visible = false;
    this.scene.add(this.bobber);
  }

  /** 手持鱼竿时接管瞄准与 P 键；返回 true = 这帧输入归钓鱼（和药水瓶同一套约定） */
  handleInput(
    controller: Controller, inventory: Inventory, slot: number, body: PlayerBody, hud: Hud, world: World,
  ): boolean {
    const held = inventory.hotbar[slot];
    const grade = held ? ROD_GRADE_OF[held.id] : undefined;
    if (!held || !grade) return false;
    this.grade = grade;
    if (controller.take('mine')) this.click(held, inventory, slot, body, hud, world);
    return true;
  }

  /** 每帧：推进浮标飞行 / 等咬钩 / 收杆窗口倒计时 */
  update(dt: number): void {
    if (this.phase === 'idle') return;
    if (this.phase === 'flying') {
      this.flyT = Math.min(1, this.flyT + dt * 2.5);
      const k = this.flyT;
      this.bobber.position.set(
        this.from.x + (this.to.x - this.from.x) * k,
        this.from.y + (this.to.y - this.from.y) * k + Math.sin(k * Math.PI) * 0.8, // 小抛物线
        this.from.z + (this.to.z - this.from.z) * k,
      );
      if (this.flyT >= 1) this.phase = 'waiting';
      return;
    }
    this.bobT += dt;
    if (this.phase === 'waiting') {
      this.bobber.position.set(this.to.x, this.to.y + Math.sin(this.bobT * 2.5) * 0.05, this.to.z);
      this.biteT -= dt;
      if (this.biteT <= 0) {
        this.phase = 'biting';
        this.reelT = FISHING.REEL_WINDOW[this.grade];
        this.msg('咬钩了！快按 P 收杆！');
      }
    } else if (this.phase === 'biting') {
      // 咬钩：浮标猛地往下沉，还扑腾两下
      this.bobber.position.set(this.to.x, this.to.y - 0.18 + Math.sin(this.bobT * 14) * 0.04, this.to.z);
      this.reelT -= dt;
      if (this.reelT <= 0) {
        this.msg('鱼跑了……');
        this.stop();
      }
    }
  }

  /** 换场景/读档：收竿（浮标藏起来） */
  clear(): void {
    this.stop();
  }

  /** 按 P：没抛就抛，漂着就提前收，咬钩了就收杆结账 */
  private click(
    held: Stack, inventory: Inventory, slot: number, body: PlayerBody, hud: Hud, world: World,
  ): void {
    if (this.phase === 'idle') { this.cast(held, inventory, slot, body, hud, world); return; }
    if (this.phase === 'waiting') {
      this.msg('鱼还没咬钩呢，等浮标沉下去再收');
      this.stop();
      return;
    }
    this.reelIn(held, inventory, slot, hud);
  }

  /** 抛竿：沿视线找 2~6 格内的水面，找到就直接抛（不要求附近有鱼） */
  private cast(
    held: Stack, inventory: Inventory, slot: number, body: PlayerBody, hud: Hud, world: World,
  ): void {
    const target = this.castTarget(body, world);
    if (!target) {
      hud.showMessage('面前没有水面，换个有水的地方抛');
      return;
    }
    this.from = { x: body.x, y: body.y + 1.4, z: body.z };
    this.to = target;
    this.flyT = 0;
    this.phase = 'flying';
    this.bobber.visible = true;
    this.bobber.position.set(this.from.x, this.from.y, this.from.z);
    this.biteT = FISHING.BITE_MIN + Math.random() * (FISHING.BITE_MAX - FISHING.BITE_MIN);
    hud.setProgress(0);
  }

  /** 收杆：窗口内按 P 才算数；附近有真鱼就把那只算作钓到的，没有就给条随机鱼；耐久磨 1 点 */
  private reelIn(held: Stack, inventory: Inventory, slot: number, hud: Hud): void {
    const fish = this.fishNear(this.to.x, this.to.y, this.to.z);
    const itemId = FISH_ITEM[fish ? fish.kind : randomFishKind()];
    if (fish) this.mobs.removeFish(fish);
    inventory.add(itemId, 1);
    hud.showMessage(`钓到一条${BLOCKS[itemId].cn}！`, 2);
    // 耐久：第一次用时按竿种补上满耐久，之后每钓一条磨 1 点，磨完竿断
    if (!inventory.infinite) {
      held.durability = (held.durability ?? FISHING.DURABILITY[this.grade]) - 1;
      if (held.durability <= 0) {
        inventory.hotbar[slot] = null;
        hud.showMessage(`${BLOCKS[held.id].cn}用坏了！`, 2.5);
      }
    }
    this.stop();
  }

  /** 沿视线从 2 格到 6 格找水面（那格是水、上面是空气），返回浮标落点 */
  private castTarget(body: PlayerBody, world: World): { x: number; y: number; z: number } | null {
    const cp = Math.cos(body.pitch);
    const dx = -Math.sin(body.yaw) * cp, dz = -Math.cos(body.yaw) * cp;
    const top = Math.floor(body.y) + 1;
    for (let d = FISHING.CAST_MIN; d <= FISHING.CAST_MAX; d += 0.5) {
      const x = body.x + dx * d, z = body.z + dz * d;
      for (let y = top; y >= top - 4; y--) {
        if (world.getBlock(Math.floor(x), y, Math.floor(z)) === WATER
          && world.getBlock(Math.floor(x), y + 1, Math.floor(z)) === AIR) {
          return { x: Math.floor(x) + 0.5, y: y + 0.85, z: Math.floor(z) + 0.5 };
        }
      }
    }
    return null;
  }

  /** 落点附近的真鱼（收杆时算作咬钩那只；没有也能钓到随机的） */
  private fishNear(x: number, y: number, z: number): Fish | null {
    return this.mobs.fish.find((f) => !f.dead
      && Math.hypot(f.x - x, f.z - z) < FISHING.FISH_NEAR && Math.abs(f.y - y) < 2) ?? null;
  }

  private stop(): void {
    this.phase = 'idle';
    this.bobber.visible = false;
  }
}
