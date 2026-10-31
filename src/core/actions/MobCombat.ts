/** 生物战斗 — 玩家挥拳/用玻璃锥/拿剑攻击，并处理羊的 M 键互动 */

import { ANIMAL, CONE, WARRIOR } from '../../config';
import { BLOCKS, GLASS_CONE, LEAD_ROPE, ROPE, SWORD_OF } from '../../world/blocks/Block';
import { PlayerBody } from '../../player/motion/Physics';
import { Controller } from '../../player/motion/Controller';
import { Inventory } from '../../player/Inventory';
import { Hud } from '../../ui/hud/Hud';
import { Animal } from '../../entities/creatures/Animal';
import { MobHit, Mobs } from '../../entities/mobs/Mobs';
import { Zombie } from '../../entities/mobs/Zombie';

export class MobCombat {
  private hitCooldown = 0;

  constructor(
    private controller: Controller,
    private inventory: Inventory,
    private slot: () => number,
    private hud: Hud,
    private mobs: Mobs,
    /** 当前攻击倍率（丰收拼盘 10 秒 ×1.25；没有加成时返回 1） */
    private atkMult: () => number = () => 1,
  ) {}

  update(
    mob: MobHit, body: PlayerBody, dt: number, useSheep: (sheep: Animal) => void,
    useAnimalRope?: (animal: Animal) => void,
  ): void {
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    if (this.controller.isDown('mine') && this.hitCooldown <= 0) {
      const held = this.inventory.hotbar[this.slot()];
      const sword = held ? SWORD_OF[held.id] : undefined;
      // 樱花剑出手更快（0.33 秒一刀），其余武器跟空手同节奏（0.4 秒）
      this.hitCooldown = sword?.cooldown ?? ANIMAL.HIT_COOLDOWN;
      // 樱花剑只够得到 3 格：够不着算空挥——不掉耐久、也不伤怪
      const outOfReach = !!sword && sword.reach !== undefined && mob.dist > sword.reach;
      if (sword && !outOfReach) {
        let dmg = ANIMAL.PUNCH_DAMAGE * sword.mult * this.atkMult();
        // 血腥之剑：20% 概率这一刀变 4 倍
        if (sword.critChance && sword.critMult && Math.random() < sword.critChance) {
          dmg *= sword.critMult;
          this.hud.showMessage('血腥暴击！');
        }
        mob.mob.hurt(dmg, body.yaw);
        // 雪花剑：被打的怪 1 秒走路减半速（鱼没有 slowT，不减速）
        if (sword.slowSeconds && 'slowT' in mob.mob) mob.mob.slowT = Math.max(mob.mob.slowT, sword.slowSeconds);
        // 砍一刀磨 1 点耐久，耐久用完剑断（创造模式不磨）
        if (!this.inventory.infinite) {
          held!.durability = (held!.durability ?? sword.uses) - 1;
          if (held!.durability <= 0) {
            this.inventory.hotbar[this.slot()] = null;
            this.hud.showMessage(`${BLOCKS[held!.id].cn}断了！`);
          }
        }
      } else if (held?.id === GLASS_CONE) {
        mob.mob.hurt(ANIMAL.PUNCH_DAMAGE * CONE.DMG_MULT * this.atkMult(), body.yaw);
        if (!this.inventory.infinite) {
          if (Math.random() < CONE.SURVIVE) this.hud.showMessage('玻璃锥没碎，还能再用！');
          else {
            held.count--;
            if (held.count <= 0) this.inventory.hotbar[this.slot()] = null;
            this.hud.showMessage('玻璃锥扎碎了！');
          }
        }
      } else {
        mob.mob.hurt(ANIMAL.PUNCH_DAMAGE * this.atkMult(), body.yaw);
      }
      // 记一笔：主人正在打这只怪，小战士会优先来帮忙（打羊也顺手记一下，不影响）
      if (mob.mob instanceof Zombie) mob.mob.hurtByPlayerT = WARRIOR.MEMORY;
      if (mob.mob.dead) this.mobs.kill(mob.mob);
    }
    // 手里拿牵引绳索按 M（2026-11-01 设定）：拴动物跟普通绳索一样，怪物也能拴走（掉落物依旧不行——它不是活物）
    if (this.inventory.hotbar[this.slot()]?.id === LEAD_ROPE && this.controller.take('door')) {
      if (mob.mob instanceof Animal) useAnimalRope?.(mob.mob);
      else if (mob.mob instanceof Zombie && !mob.mob.inChallenge) {
        mob.mob.leashed = !mob.mob.leashed;
        this.hud.showMessage(mob.mob.leashed ? '拴住了！它会跟着你走' : '解开了牵引绳索');
      }
      return;
    }
    // 手里拿绳索对准动物按 M：拴住/放开（所有动物都能拴，不等同于驯服）
    if (useAnimalRope && mob.mob instanceof Animal && this.inventory.hotbar[this.slot()]?.id === ROPE
        && this.controller.take('door')) {
      useAnimalRope(mob.mob);
      return;
    }
    if (mob.mob instanceof Animal && mob.mob.kind === 'sheep' && this.controller.take('door')) {
      useSheep(mob.mob);
    }
  }
}
