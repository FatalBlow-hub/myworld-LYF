/** 生物战斗 — 玩家挥拳/用玻璃锥攻击，并处理羊的 M 键互动 */

import { ANIMAL, CONE, WARRIOR } from '../config';
import { GLASS_CONE } from '../world/Block';
import { PlayerBody } from '../player/Physics';
import { Controller } from '../player/Controller';
import { Inventory } from '../player/Inventory';
import { Hud } from '../ui/Hud';
import { Animal } from '../entities/Animal';
import { MobHit, Mobs } from '../entities/Mobs';
import { Zombie } from '../entities/Zombie';

export class MobCombat {
  private hitCooldown = 0;

  constructor(
    private controller: Controller,
    private inventory: Inventory,
    private slot: () => number,
    private hud: Hud,
    private mobs: Mobs,
  ) {}

  update(mob: MobHit, body: PlayerBody, dt: number, useSheep: (sheep: Animal) => void): void {
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    if (this.controller.isDown('mine') && this.hitCooldown <= 0) {
      this.hitCooldown = ANIMAL.HIT_COOLDOWN;
      const held = this.inventory.hotbar[this.slot()];
      if (held?.id === GLASS_CONE) {
        mob.mob.hurt(ANIMAL.PUNCH_DAMAGE * CONE.DMG_MULT, body.yaw);
        if (!this.inventory.infinite) {
          if (Math.random() < CONE.SURVIVE) this.hud.showMessage('玻璃锥没碎，还能再用！');
          else {
            held.count--;
            if (held.count <= 0) this.inventory.hotbar[this.slot()] = null;
            this.hud.showMessage('玻璃锥扎碎了！');
          }
        }
      } else {
        mob.mob.hurt(ANIMAL.PUNCH_DAMAGE, body.yaw);
      }
      // 记一笔：主人正在打这只怪，小战士会优先来帮忙（打羊也顺手记一下，不影响）
      if (mob.mob instanceof Zombie) mob.mob.hurtByPlayerT = WARRIOR.MEMORY;
      if (mob.mob.dead) this.mobs.kill(mob.mob);
    }
    if (mob.mob instanceof Animal && mob.mob.kind === 'sheep' && this.controller.take('door')) {
      useSheep(mob.mob);
    }
  }
}
