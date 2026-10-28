/** 召唤物系统 — 小战士蛋/召唤弓的召唤、跨场景挂账、弓箭手回岗与每日刷新（2026-10-29 从 Game.ts 抽出） */

import { TIER_OF_EGG, WARRIOR_TIER_NAMES, WarriorTier } from '../../entities/summons/Warrior';
import { BOW_FORM_NAMES, BOW_FORM_OF } from '../../entities/summons/Archer';
import { Mobs } from '../../entities/mobs/Mobs';
import { Hud } from '../../ui/hud/Hud';
import { Inventory } from '../../player/Inventory';
import { SaveData, readSave, writeSave } from '../Save';

type SceneMode = 'island' | 'hall' | 'visit' | 'void' | 'arena' | 'cs';

interface SummonsCtx {
  mobs: () => Mobs;
  inventory: () => Inventory | null;
  hud: () => Hud | null;
  slot: () => number;
  /** 空位探测（召唤落点上方找不卡墙的一格） */
  freeSpot: (x: number, y: number, z: number) => { x: number; y: number; z: number };
  scene: () => SceneMode;
  spawn: () => { x: number; y: number; z: number };
  saveSlot: () => number;
  islandSave: () => SaveData | null;
  setIslandSave: (s: SaveData) => void;
  saveNow: () => void;
}

export class SummonsSystem {
  constructor(private ctx: SummonsCtx) {}

  /** 拿着小战士召唤蛋对地按 M：在指定方块上方召唤保镖，蛋消耗一个 */
  summonWarrior(eggId: number, x: number, y: number, z: number): void {
    const tier = TIER_OF_EGG[eggId];
    if (!tier) return;
    const inv = this.ctx.inventory()!;
    const spot = this.ctx.freeSpot(x + 0.5, y + 1, z + 0.5);
    this.ctx.mobs().summonWarrior(tier, spot.x, spot.y, spot.z);
    const held = inv.hotbar[this.ctx.slot()];
    if (!inv.infinite && held?.id === eggId) {
      held.count--;
      if (held.count <= 0) inv.hotbar[this.ctx.slot()] = null;
      this.ctx.hud()!.refreshHotbar(inv, this.ctx.slot());
    }
    this.ctx.hud()!.showMessage(`${WARRIOR_TIER_NAMES[tier]}小战士参战！他会跟着你，优先打正在打你的怪`, 3);
    // 本岛整档存；在大厅/副本岛召唤时整档会被拦掉，得单独把小战士记进本岛档，不然回岛就没了
    if (this.ctx.scene() === 'island') this.ctx.saveNow(); else this.persistWarrior(tier);
  }

  /** 拿着小战士弓对地按 M：召唤一名弓箭手哨兵守在这块地上，弓消耗一个（只在自己岛上有效） */
  summonArcher(bowId: number, x: number, y: number, z: number): void {
    const form = BOW_FORM_OF[bowId];
    if (!form) return;
    if (this.ctx.scene() !== 'island') {
      this.ctx.hud()!.showMessage('弓召唤的小战士只认自己岛，回自己岛上再召唤', 3);
      return;
    }
    const inv = this.ctx.inventory()!;
    const spot = this.ctx.freeSpot(x + 0.5, y + 1, z + 0.5);
    this.ctx.mobs().summonArcher(form, spot.x, spot.y, spot.z);
    const held = inv.hotbar[this.ctx.slot()];
    if (!inv.infinite && held?.id === bowId) {
      held.count--;
      if (held.count <= 0) inv.hotbar[this.ctx.slot()] = null;
      this.ctx.hud()!.refreshHotbar(inv, this.ctx.slot());
    }
    const extra = form === 'fire' ? '，攻击 ×1.5' : form === 'ice' ? '，命中冰冻减速' : '';
    this.ctx.hud()!.showMessage(`${BOW_FORM_NAMES[form]}召唤了弓箭手小战士${extra}！他守在这儿打怪，不跟你走`, 3.5);
    this.ctx.saveNow();
  }

  /** 在大厅/副本岛召唤的小战士：位置不属于本岛，打个 pending 标记存进本岛档，回岛时放到出生点旁 */
  private persistWarrior(tier: WarriorTier): void {
    const save = this.ctx.islandSave() ?? readSave(this.ctx.saveSlot());
    if (!save) return;
    save.warriors = [...(save.warriors ?? []), { tier, x: 0, y: 0, z: 0, pending: true }];
    this.ctx.setIslandSave(save);
    writeSave(this.ctx.saveSlot(), save);
  }

  /** 玩家回到重生点（3 键回家 / 死亡重生）：弓箭手哨兵把岗位挪过去，慢慢走过去集合 */
  archersGoHome(): void {
    const s = this.ctx.spawn();
    for (const a of this.ctx.mobs().archers) a.goTo(s.x, s.y, s.z);
  }

  /** 第二天刷新替换（2026-10-29 设定）：小战士/弓箭手血量回满、回到重生点，有人刷新才喊话 */
  refreshDaily(): void {
    const mobs = this.ctx.mobs();
    if (mobs.warriors.length === 0 && mobs.archers.length === 0) return;
    const s = this.ctx.spawn();
    for (const w of mobs.warriors) w.refresh(s.x, s.y, s.z);
    for (const a of mobs.archers) a.refresh(s.x, s.y, s.z);
    this.ctx.hud()?.showMessage('新的一天：小战士们刷新了，已回到重生点', 2.5);
  }
}
