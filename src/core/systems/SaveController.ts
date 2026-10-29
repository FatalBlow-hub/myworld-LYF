/** 存档控制器 — 整档/随身轻量存档、读档恢复、自动存档计时与 everCreative 台账（2026-10-29 二期从 Game.ts 抽出） */

import { SAVE } from '../../config';
import { World } from '../../world/World';
import { Mobs } from '../../entities/mobs/Mobs';
import { ItemDrop } from '../../entities/objects/ItemDrop';
import { RecipeBook } from '../../ui/panels/RecipeBook';
import { Vehicles } from '../scenes/Vehicles';
import { Challenge } from '../scenes/Challenge';
import { NetClient } from '../../net/Client';
import { Health } from '../../player/stats/Health';
import { Hunger } from '../../player/stats/Hunger';
import { Inventory } from '../../player/Inventory';
import { PlayerBody } from '../../player/motion/Physics';
import { Appearance } from '../Appearance';
import { SaveData, applySave, buildSave, readSave, writeSave } from '../Save';
import type { IslandType } from '../../config';
import type { DayCycle } from '../loops/DayCycle';
import type { SceneMode } from '../Game';
import type { ShopQuota } from '../../world/economy/shopLimits';
import type { BlackMarketState } from '../../world/economy/blackMarket';

type Pos = { x: number; y: number; z: number };

interface SaveCtx {
  started: () => boolean;
  scene: () => SceneMode;
  body: () => PlayerBody | null;
  inventory: () => Inventory | null;
  health: () => Health | null;
  hunger: () => Hunger | null;
  appearance: () => Appearance;
  book: () => RecipeBook;
  mobs: () => Mobs;
  vehicles: () => Vehicles;
  challenge: () => Challenge;
  world: () => World;
  scene3d: () => import('three').Scene;
  drops: () => ItemDrop[];
  day: () => DayCycle;
  paused: () => boolean;
  slot: () => number;
  islandType: () => IslandType;
  spawn: () => Pos;
  setSpawn: (p: Pos) => void;
  setIslandType: (t: IslandType) => void;
  /** 岛币与商店记账（真实账本在经济系统，Game 以 getter/setter 委托） */
  coins: () => number;
  setCoins: (v: number) => void;
  quota: () => ShopQuota | undefined;
  setQuota: (v: ShopQuota | undefined) => void;
  market: () => BlackMarketState | undefined;
  setMarket: (v: BlackMarketState | undefined) => void;
  net: () => NetClient | null;
}

export class SaveController {
  private slotValue = 0;
  private islandSaveValue: SaveData | null = null;
  private saveTimer = SAVE.EVERY;
  private everCreativeValue = false;

  constructor(private ctx: SaveCtx) {}

  /** 存档槽位与 everCreative 台账：Game 用 getter/setter 委托过来，调用点不用改 */
  get slot(): number { return this.slotValue; }
  set slot(v: number) { this.slotValue = v; }
  get islandSave(): SaveData | null { return this.islandSaveValue; }
  set islandSave(v: SaveData | null) { this.islandSaveValue = v; }
  get everCreative(): boolean { return this.everCreativeValue; }
  set everCreative(v: boolean) { this.everCreativeValue = v; }

  /** 每帧自动存档计时（SAVE.EVERY 秒一次；1 键手动存走 Game.saveNow 同一条路） */
  autosave(dt: number): void {
    this.saveTimer -= dt;
    if (this.saveTimer <= 0) { this.saveTimer = SAVE.EVERY; this.saveNow(); }
  }

  /** 把当前本岛状态打包存进浏览器（在大厅/副本岛时不覆盖本岛地形，只把随身收获并回存档） */
  saveNow(): void {
    if (!this.ctx.started() || !this.ctx.body() || !this.ctx.inventory() || !this.ctx.health() || !this.ctx.hunger()) return;
    const scene = this.ctx.scene();
    if (scene === 'arena' || scene === 'cs') return; // 比赛里背包是空的，存档会把真档冲掉：这场不算，直接跳过
    if (scene !== 'island') { this.saveCarryOnly(); return; }
    const inv = this.ctx.inventory()!;
    if (inv.mode === 'creative') this.everCreativeValue = true;
    this.ctx.net()?.setEverCreative(this.everCreativeValue);
    const data = buildSave({
      mode: inv.mode, everCreative: this.everCreativeValue, islandType: this.ctx.islandType(),
      character: this.ctx.appearance().character, skins: this.ctx.appearance().owned, spawn: this.ctx.spawn(), body: this.ctx.body()!,
      coins: this.ctx.coins(),
      health: this.ctx.health()!, hunger: this.ctx.hunger()!, slot: this.ctx.slot(), inv,
      world: this.ctx.world(), animals: this.ctx.mobs().animals, zombies: this.ctx.mobs().zombies, drops: this.ctx.drops(),
      tanks: this.ctx.vehicles().tanks, challenge: this.ctx.challenge(), learned: this.ctx.book().learnedIds(),
      warriors: this.ctx.mobs().warriors, archers: this.ctx.mobs().archers,
      golden: { learned: this.ctx.book().goldenLearnedIds(), tasks: this.ctx.book().goldenTaskIds(), waterUses: this.ctx.book().goldenWaterUseCount() },
      paused: this.ctx.paused(), dayTime: this.ctx.day().time, date: this.ctx.day().date,
      shopQuota: this.ctx.quota(),
      blackMarket: this.ctx.market(),
      zombieAttack: this.ctx.mobs().zombieAttack, zombieSpawn: this.ctx.mobs().zombieSpawn,
    });
    this.islandSaveValue = JSON.parse(JSON.stringify(data)) as SaveData;
    writeSave(this.slotValue, data);
  }

  /** 在大厅/外岛时的轻量存档：不动本岛的地形和房子，只把随身背包、岛币、血条饿条并回本岛存档——
   *  不然在外岛摘的桃子、挣的岛币，一刷新页面或退出登录就全没了 */
  private saveCarryOnly(): void {
    const save = readSave(this.slotValue) ?? this.islandSaveValue;
    if (!save) return;
    const inv = this.ctx.inventory()!;
    const clone = (s: typeof inv.hotbar) => s.map((x) => (x ? { ...x } : null));
    save.inv = {
      hotbar: clone(inv.hotbar), storage: clone(inv.storage), armor: clone(inv.armor),
      waistbag: clone(inv.waistbag), craftIn: clone(inv.craftIn), craftBig: clone(inv.craftBig),
      held: inv.held ? { ...inv.held } : null,
    };
    save.coins = this.ctx.coins();
    save.hp = this.ctx.health()!.hp; save.oxygen = this.ctx.health()!.oxygen;
    save.hunger = this.ctx.hunger()!.value; save.hungerOn = this.ctx.hunger()!.enabled;
    save.slot = this.ctx.slot(); save.mode = inv.mode;
    save.everCreative = this.everCreativeValue || inv.mode === 'creative';
    save.character = this.ctx.appearance().character; save.skins = [...this.ctx.appearance().owned];
    // 商店记账也跟着随身走：不然在大厅买的限量货/黑色售卖机买的货，一换场景记录就丢了（能重复买）
    save.shopQuota = this.ctx.quota();
    save.blackMarket = this.ctx.market();
    this.islandSaveValue = JSON.parse(JSON.stringify(save)) as SaveData;
    writeSave(this.slotValue, save);
  }

  /** 读档：把整份 SaveData 灌回各模块，返回供 begin 续接的 paused/dayTime/date 等 */
  restoreSaveState(save: SaveData) {
    const r = applySave(save, {
      inv: this.ctx.inventory()!, health: this.ctx.health()!, hunger: this.ctx.hunger()!, world: this.ctx.world(),
      scene: this.ctx.scene3d(), animals: this.ctx.mobs().animals, zombies: this.ctx.mobs().zombies, drops: this.ctx.drops(),
      tanks: this.ctx.vehicles().tanks, challenge: this.ctx.challenge(), warriors: this.ctx.mobs().warriors, archers: this.ctx.mobs().archers,
    });
    this.ctx.setSpawn(r.spawn); this.slotValue = r.slot; this.ctx.setIslandType(r.islandType);
    this.ctx.setCoins(r.coins);
    this.ctx.setQuota(r.shopQuota);
    this.ctx.setMarket(r.blackMarket);
    this.everCreativeValue = this.everCreativeValue || r.everCreative || this.ctx.inventory()!.mode === 'creative';
    this.ctx.mobs().zombieSpawn = r.zombieSpawn && this.ctx.mobs().zombieAttack; // 攻击关着的存档不许带着僵尸生成回来
    this.ctx.book().importLearned(r.learned);
    this.ctx.book().importGoldenState(r.golden?.learned, r.golden?.tasks, r.golden?.waterUses);
    return r;
  }

  /** 读档后把人放回存档坐标（速度清零、落地参考点复位） */
  restoreBodyFromSave(save: SaveData): void {
    const body = this.ctx.body()!, b = save.body;
    body.x = b.x; body.y = b.y; body.z = b.z; body.yaw = b.yaw; body.pitch = b.pitch;
    body.vx = body.vy = body.vz = 0; body.fellFrom = b.y;
    body.speedBoostT = b.boostT ?? 0; body.speedBoostMult = b.boostMult ?? 1;
    body.flying = this.ctx.inventory()!.infinite;
  }
}
