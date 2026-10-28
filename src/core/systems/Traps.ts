/** 陷阱与菖蒲配饰系统 — 柳条陷阱的放置/触发/自毁，菖蒲护盾挡伤与香囊光环/耐久（2026-10-29 从 Game.ts 抽出） */

import { AIR, isPlant, POUCH_CALAMUS, SHIELD_CALAMUS, TRAP_BLOCK_IDS } from '../../world/blocks/Block';
import { SEASON_FOOD, TRAP } from '../../config';
import { BlockHit } from '../../interact/BlockPicker';
import { PlayerBody } from '../../player/motion/Physics';
import { World } from '../../world/World';
import { Mobs } from '../../entities/mobs/Mobs';
import { Hud } from '../../ui/hud/Hud';
import { Inventory } from '../../player/Inventory';
import { TrapPanel, trapFormName } from '../../ui/panels/TrapPanel';
import type { Atlas } from '../../render/textures/Textures';

/** 系统运行期依赖：全部走 getter 晚绑定（Game 里的字段开局后才赋值） */
interface TrapCtx {
  world: () => World;
  mobs: () => Mobs;
  inventory: () => Inventory | null;
  hud: () => Hud | null;
  slot: () => number;
}

export class TrapSystem {
  /** 伪装选择面板（Game 的 PanelStack 登记） */
  readonly panel: TrapPanel;
  /** 待放置的那一格（手持陷阱按 L 时记下） */
  private trapHit: BlockHit | null = null;
  /** 已经触发、等着 3 秒后自毁的陷阱（key = x,y,z） */
  private traps = new Map<string, { x: number; y: number; z: number; t: number }>();
  /** 玩家被陷阱困住时锁住的落脚点 */
  private trapLock = { x: 0, z: 0, t: 0 };
  private pouchT = 0;
  private pouchWearT = 0; // 菖蒲香囊耐久磨损计时（戴着每秒磨 1 点）

  constructor(atlas: Atlas, private ctx: TrapCtx) {
    this.panel = new TrapPanel(atlas, (id) => this.placeTrap(id), () => { this.trapHit = null; });
  }

  /** 手持柳条陷阱按 L：先把指着的那一格记下来，等玩家挑好伪装 */
  openTrapPicker(hit: BlockHit): void {
    this.trapHit = hit;
    this.panel.open();
  }

  /** 伪装选好了：在指着的那面放下陷阱，并扣掉手里 1 个 */
  private placeTrap(blockId: number): void {
    const hit = this.trapHit; this.trapHit = null;
    const inv = this.ctx.inventory();
    if (!hit || !inv) return;
    const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
    const cur = this.ctx.world().getBlock(x, y, z);
    if (cur !== AIR && !isPlant(cur)) { this.ctx.hud()?.showMessage('这格放不下陷阱，换个位置', 2); return; }
    this.ctx.world().setBlock(x, y, z, blockId);
    if (!inv.infinite) {
      const held = inv.hotbar[this.ctx.slot()];
      if (held) { held.count--; if (held.count <= 0) inv.hotbar[this.ctx.slot()] = null; }
    }
    this.ctx.hud()?.showMessage(`柳条陷阱放好了，伪装成${trapFormName(blockId)}`, 2);
    this.ctx.hud()?.refreshHotbar(inv, this.ctx.slot());
  }

  /** 有人踩上陷阱：登记 3 秒后自毁；玩家额外把位置锁住（怪走 Zombie.trapT 那条路） */
  private springTrap(x: number, y: number, z: number, body?: PlayerBody): void {
    // 戴着菖蒲护盾的玩家踩上去不触发（陷阱留着坑别人/怪）；挡一次磨 1 点耐久
    if (body && this.ctx.inventory()?.armor[0]?.id === SHIELD_CALAMUS) {
      this.wearShield();
      this.ctx.hud()?.showMessage('菖蒲护盾挡住了陷阱', 1.2);
      return;
    }
    const key = `${x},${y},${z}`;
    if (this.traps.has(key)) return;
    this.traps.set(key, { x, y, z, t: TRAP.FREEZE });
    if (body) {
      this.trapLock = { x: body.x, z: body.z, t: TRAP.FREEZE };
      this.ctx.hud()?.showMessage(`踩到柳条陷阱！被困住 ${TRAP.FREEZE} 秒`, 2);
    }
  }

  /** 菖蒲护盾磨 1 点耐久；磨完就碎掉（护甲槽清空并提示） */
  private wearShield(): void {
    const armor = this.ctx.inventory()?.armor[0];
    if (!armor || armor.id !== SHIELD_CALAMUS) return;
    armor.durability = (armor.durability ?? SEASON_FOOD.SHIELD_DURABILITY) - 1;
    if (armor.durability <= 0) {
      this.ctx.inventory()!.armor[0] = null;
      this.ctx.hud()?.showMessage('菖蒲护盾碎掉了！', 2.5);
      this.ctx.hud()?.refreshHotbar(this.ctx.inventory()!, this.ctx.slot());
    }
  }

  /** 菖蒲护盾的伤害拦截（挂到 Health.damageBlocker 上）：50% 概率把这次伤害免掉 1 点，挡下就磨耐久 */
  shieldBlock(amount: number): number {
    if (this.ctx.inventory()?.armor[0]?.id !== SHIELD_CALAMUS) return amount;
    if (Math.random() >= SEASON_FOOD.SHIELD_CHANCE) return amount;
    this.wearShield();
    return Math.max(0, amount - SEASON_FOOD.SHIELD_BLOCK);
  }

  /** 每帧：玩家/怪踩到陷阱就禁锢，时间到了陷阱自己消失（不掉东西） */
  updateTraps(dt: number, body: PlayerBody): void {
    if (this.trapLock.t > 0) {
      this.trapLock.t -= dt;
      body.x = this.trapLock.x; body.z = this.trapLock.z;
      body.vx = 0; body.vz = 0;
    }
    const world = this.ctx.world();
    const px = Math.floor(body.x), py = Math.floor(body.y - 0.1), pz = Math.floor(body.z);
    if (TRAP_BLOCK_IDS.includes(world.getBlock(px, py, pz))) this.springTrap(px, py, pz, body);
    for (const z of this.ctx.mobs().zombies) {
      if (z.dead || z.trapT > 0) continue;
      const tx = Math.floor(z.x), ty = Math.floor(z.y - 0.1), tz = Math.floor(z.z);
      if (TRAP_BLOCK_IDS.includes(world.getBlock(tx, ty, tz))) {
        z.trapT = TRAP.FREEZE;
        this.springTrap(tx, ty, tz);
      }
    }
    for (const [key, t] of this.traps) {
      t.t -= dt;
      if (t.t <= 0) { world.setBlock(t.x, t.y, t.z, AIR); this.traps.delete(key); }
    }
  }

  /** 菖蒲香囊：戴着它时，自身方圆 4 格内的怪每 4 秒扣 1 血 */
  pouchTick(dt: number, body: PlayerBody): void {
    this.pouchWear(dt); // 香囊耐久：戴着就磨，跟光环扣不扣血无关
    this.pouchT -= dt;
    if (this.pouchT > 0) return;
    this.pouchT = SEASON_FOOD.POUCH_EVERY;
    if (this.ctx.inventory()?.armor[0]?.id !== POUCH_CALAMUS) return;
    for (const z of this.ctx.mobs().zombies) {
      if (z.dead) continue;
      if (Math.hypot(z.x - body.x, z.z - body.z) > SEASON_FOOD.POUCH_RADIUS) continue;
      z.hp = Math.max(0, z.hp - SEASON_FOOD.POUCH_DAMAGE);
      if (z.hp <= 0) { z.dead = true; this.ctx.mobs().kill(z); }
    }
  }

  /** 菖蒲香囊耐久（2026-10-29 设定：耐久 1000 秒）：戴着每秒磨 1 点，磨完就烂掉 */
  private pouchWear(dt: number): void {
    const armor = this.ctx.inventory()?.armor[0];
    if (!armor || armor.id !== POUCH_CALAMUS) { this.pouchWearT = 0; return; }
    this.pouchWearT += dt;
    if (this.pouchWearT < 1) return;
    this.pouchWearT -= 1;
    armor.durability = (armor.durability ?? SEASON_FOOD.POUCH_DURABILITY) - 1;
    if (armor.durability <= 0) {
      this.ctx.inventory()!.armor[0] = null;
      this.ctx.hud()?.showMessage('菖蒲香囊烂掉了！', 2.5);
      this.ctx.hud()?.refreshHotbar(this.ctx.inventory()!, this.ctx.slot());
    }
  }

  /** 换场景：陷阱跟着旧世界一起作废 */
  clear(): void {
    this.traps.clear(); this.trapLock.t = 0;
  }
}
