/** 生存动作 — 吃喝（含药水）、快捷栏换格、床重生点、卡墙自救、驯羊 */

import { BOOST, CHUNK, GOLDEN, PLAYER, POTION, SWAMP_HURT } from '../../config';
import { Animal } from '../../entities/creatures/Animal';
import { Controller } from '../../player/motion/Controller';
import { Health } from '../../player/stats/Health';
import { Hunger, applySpeedBoost } from '../../player/stats/Hunger';
import { Inventory } from '../../player/Inventory';
import { PlayerBody, collidesAABB } from '../../player/motion/Physics';
import { hurtPlayer } from '../../player/stats/damage';
import { Hud } from '../../ui/hud/Hud';
import {
  DANDELION, GLASS_BOTTLE, GLOW_SHROOM, MUSHROOM_RED, PICKLE_BARREL,
  POTION_BREATH, POTION_DEADLY, POTION_IDS, POTION_PHANTOM, POTION_POISON,
} from '../../world/blocks/Block';
import { POTION_ICE } from '../../world/recipes/GoldenItems';
import { World } from '../../world/World';

export interface SurvivalDeps {
  controller: Controller;
  inventory: Inventory;
  health: Health;
  hunger: Hunger;
  hud: Hud;
  world: World;
  /** 快捷栏选到哪格（只读） */
  slot: () => number;
  /** 写回重生点 */
  setSpawn: (p: { x: number; y: number; z: number }) => void;
  /** 血空时的重生动作 */
  respawn: () => void;
  /** 教程埋点：'eat' 真吃到嘴里才发（按了 E 但手里不是吃的不算） */
  onEvent?: (name: string) => void;
}

export class Survival {
  constructor(private d: SurvivalDeps) {}

  /** O 切换饥饿模式开关（每档独立，关闭时暂停消耗、保留当前值） */
  toggleHungerKey(): void {
    const { controller, hunger, hud } = this.d;
    if (!controller.take('toggleHunger')) return;
    const on = hunger.toggle();
    hud.showMessage(on ? '饥饿模式已开启' : '饥饿模式已关闭');
  }

  /** E 吃东西：按食物表恢复饥饿与扣血/回血；腌菜桶吃完脚底生风 1 分钟；药水瓶喝了各有各的效 */
  eatKey(body: PlayerBody): void {
    const { controller, inventory, hud, health, hunger } = this.d;
    if (!controller.take('eat')) return;
    const s = inventory.hotbar[this.d.slot()];
    // 喝药水瓶：喝完瓶子还回来
    if (s && POTION_IDS.includes(s.id)) {
      if (!inventory.infinite) {
        s.count--;
        if (s.count <= 0) inventory.hotbar[this.d.slot()] = null;
        inventory.add(GLASS_BOTTLE, 1); // 喝完瓶子还回来
      }
      let potionDur = 0; // 药水效果持续几秒（药水扣饥饿：效果期间每 10 秒多扣 1 点）
      if (s.id === POTION_POISON) {
        health.poison(POTION.POISON.dmg, POTION.POISON.every, POTION.POISON.dur);
        potionDur = POTION.POISON.dur;
        hud.showMessage(`咕咚！喝下毒药，${POTION.POISON.dur} 秒里会一直掉血！`);
      } else if (s.id === POTION_DEADLY) {
        health.poison(POTION.DEADLY.dmg, POTION.DEADLY.every, POTION.DEADLY.dur);
        potionDur = POTION.DEADLY.dur;
        hud.showMessage(`咕咚！是剧毒！${POTION.DEADLY.dur} 秒里掉血飞快！`);
      } else if (s.id === POTION_PHANTOM) {
        body.swayT = POTION.HALLUCINATE;
        body.swayPhase = 0;
        health.poison(SWAMP_HURT.PHANTOM.dmg, SWAMP_HURT.PHANTOM.every, POTION.HALLUCINATE);
        potionDur = POTION.HALLUCINATE;
        hud.showMessage('咕咚！天旋地转，镜头自己晃起来了……');
      } else if (s.id === POTION_BREATH) {
        body.breathT = POTION.BREATH;
        potionDur = POTION.BREATH;
        hud.showMessage(`咕咚！${POTION.BREATH} 秒水下呼吸，去潜水吧！`);
      } else if (s.id === POTION_ICE) {
        const r = hurtPlayer(health, GOLDEN.FREEZE_DAMAGE);
        if (r.died) this.d.respawn();
        body.frozenT = GOLDEN.FREEZE_SECONDS;
        potionDur = GOLDEN.FREEZE_SECONDS;
        hud.showMessage('好冷！扣 2 点血，冻住 2 秒');
      }
      hunger.setPotion(potionDur);
      return;
    }
    const fx = s ? health.eat(s.id) : null;
    if (s && fx !== null) {
      if (!inventory.infinite) {
        s.count--;
        if (s.count <= 0) inventory.hotbar[this.d.slot()] = null;
      }
      hunger.eat(fx.hunger);
      this.d.onEvent?.('eat'); // 教程：真吃进去了才算
      if (fx.boostSeconds) {
        applySpeedBoost(body, fx.boostSeconds, fx.boostMult);
      }
      // 2026-10-23 新吃食的附加效果：缓慢回血 / 挖掘加速 / 方向反转 / 柔光照明 / 解毒
      const notes: string[] = [];
      if (fx.slowHeal) {
        health.slowHeal(fx.slowHeal.seconds, fx.slowHeal.hp);
        notes.push(`${fx.slowHeal.seconds} 秒里慢慢回 ${fx.slowHeal.hp} 血`);
      }
      if (fx.hasteSeconds) {
        body.hasteT = Math.max(body.hasteT, fx.hasteSeconds);
        notes.push(`${fx.hasteSeconds} 秒挖得更快`);
      }
      if (fx.flipSeconds) {
        body.flipT = Math.max(body.flipT, fx.flipSeconds);
        notes.push(`${fx.flipSeconds} 秒里方向是反的`);
      }
      if (fx.glowSeconds) {
        health.nightVision(fx.glowSeconds);
        notes.push(`${fx.glowSeconds} 秒柔光照明`);
      }
      if (fx.curePoison) {
        const cured = health.curePoison();
        notes.push(cured > 0 ? '毒解了' : '本来就没中毒');
      }
      // 四季节日食物：春卷免伤+不饿、春卷/甜饼负面豁免、丰收拼盘攻击倍率
      if (fx.godSeconds || fx.cleanseSeconds) {
        health.seasonShield(fx.godSeconds ?? 0, fx.godSeconds ?? 0, fx.cleanseSeconds ?? 0);
        if (fx.godSeconds) notes.push(`${fx.godSeconds} 秒不掉血也不饿`);
        if (fx.cleanseSeconds) notes.push(`${fx.cleanseSeconds} 秒负面效果免疫`);
      }
      if (fx.atkSeconds && fx.atkMult) {
        health.attackBoost(fx.atkSeconds, fx.atkMult);
        notes.push(`${fx.atkSeconds} 秒攻击 ×${fx.atkMult}`);
      }
      if (health.hp <= 0) this.d.respawn();
      // 红伞伞：设定是「每秒 4 血持续 10 秒」，但满血只有 20（10 颗心），照原样吃下去必死；
      // 这里按「10 秒里一共掉 4 血（2 颗心）」处理，仍然很吓人但不至于一口送命
      if (s.id === MUSHROOM_RED) {
        health.poison(1, 2.5, 10);
        hud.showMessage('红伞伞有毒！接下来 10 秒会一直掉血', 3);
        return;
      }
      // 夜光蓝菇：给 5 秒夜视，黑夜里也能看清路
      if (s.id === GLOW_SHROOM) {
        health.nightVision(5);
        hud.showMessage('眼前亮起来了！5 秒夜视', 3);
        return;
      }
      if (s.id === PICKLE_BARREL) {
        body.speedBoostT = BOOST.SECONDS; // 腌菜桶吃完跑得快
        hud.showMessage(`真香！+${fx.hp} 血，脚底生风 ${BOOST.SECONDS} 秒！`);
      } else {
        // 通用文案：饥饿/血量只报有变化的，附加效果接在后面
        const parts = [
          fx.hunger > 0 ? `+${fx.hunger} 饥饿` : '',
          fx.hp > 0 ? `+${fx.hp} 血` : fx.hp < 0 ? `${fx.hp} 血` : '',
          ...notes,
        ].filter(Boolean);
        hud.showMessage(`${fx.hp < 0 ? '好难吃！' : '真香！'}${parts.join('，')}`);
      }
    } else {
      hud.showMessage('这个不能吃');
    }
  }

  /** 4/6 换快捷栏格子：返回新格子号（没变就还是原来的） */
  hotbarKeys(cur: number): number {
    const { controller, inventory, hud } = this.d;
    const n = inventory.hotbar.length;
    let next = cur;
    if (controller.take('prevSlot')) next = (cur + n - 1) % n;
    else if (controller.take('nextSlot')) next = (cur + 1) % n;
    if (next !== cur) hud.selectSlot(next);
    return next;
  }

  /** 睡过的床变成重生点：优先站床边地板，四周都堵着才站床面上 */
  setBedSpawn(bx: number, by: number, bz: number): void {
    // 床边地板的高度就是床底那一格（by），不是床面；两格高的小屋也能站下
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      const sx = bx + 0.5 + dx;
      const sz = bz + 0.5 + dz;
      if (!collidesAABB(this.d.world, sx, by, sz, PLAYER.WIDTH, PLAYER.HEIGHT)) {
        this.d.setSpawn({ x: sx, y: by, z: sz });
        return;
      }
    }
    // 床边全堵了才站床面；床面顶头（比如矮房顶）就保留原来的出生点
    if (!collidesAABB(this.d.world, bx + 0.5, by + 0.3, bz + 0.5, PLAYER.WIDTH, PLAYER.HEIGHT)) {
      this.d.setSpawn({ x: bx + 0.5, y: by + 0.3, z: bz + 0.5 });
    }
  }

  /** 出生点卡墙里时自救：先试旁边，不行就往上一格一格挪（会站到房顶上） */
  freeSpot(x: number, y: number, z: number): { x: number; y: number; z: number } {
    const { world } = this.d;
    for (let cx = Math.floor((x - 1) / CHUNK.SIZE); cx <= Math.floor((x + 1) / CHUNK.SIZE); cx++) {
      for (let cz = Math.floor((z - 1) / CHUNK.SIZE); cz <= Math.floor((z + 1) / CHUNK.SIZE); cz++) world.ensureChunk(cx, cz);
    }
    const W = PLAYER.WIDTH, H = PLAYER.HEIGHT;
    if (!collidesAABB(world, x, y, z, W, H)) return { x, y, z };
    const fy = Math.floor(y); // 卡住时先按地板高度试 8 个方向
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      if (!collidesAABB(world, x + dx, fy, z + dz, W, H)) {
        return { x: x + dx, y: fy, z: z + dz };
      }
    }
    for (let dy = 1; dy <= 5; dy++) {
      if (!collidesAABB(world, x, y + dy, z, W, H)) return { x, y: y + dy, z };
    }
    return { x, y, z };
  }

  /** 睡醒了：自动站回床边（床边就是重生点） */
  wakeUp(body: PlayerBody, spawn: { x: number; y: number; z: number }): void {
    const p = this.freeSpot(spawn.x, spawn.y, spawn.z);
    body.x = p.x; body.y = p.y; body.z = p.z;
    body.vx = body.vy = body.vz = 0;
    body.fellFrom = body.y;
  }

  /** 对羊按 M：没驯服就拿蒲公英喂它（吃 1 朵）；驯过了就在"原地等待"和"跟着走"之间切换 */
  useSheep(sheep: Animal): void {
    const { inventory, hud } = this.d;
    if (!sheep.tamed) {
      const s = inventory.hotbar[this.d.slot()];
      if (s?.id === DANDELION) {
        if (!inventory.infinite) {
          s.count--;
          if (s.count <= 0) inventory.hotbar[this.d.slot()] = null;
        }
        sheep.tamed = true;
        hud.showMessage('驯服成功！它会跟着你，按 M 让它原地等待');
      } else {
        hud.showMessage('拿着蒲公英对着羊按 M 就能驯服它');
      }
      return;
    }
    sheep.waiting = !sheep.waiting;
    hud.showMessage(sheep.waiting ? '羊在原地等你' : '羊跟上来了');
  }

  /** 拿绳索对动物按 M：没拴住就拴上（动物跟着玩家走），拴住了就放开 */
  useAnimalRope(animal: Animal): void {
    animal.leashed = !animal.leashed;
    this.d.hud.showMessage(animal.leashed ? '拴住了，它会跟着你走' : '绳子解开了，动物自由了');
  }
}
