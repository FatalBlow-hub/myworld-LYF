/** 极限季节挑战 — 红焰大赛箱里的单人赛事（冰天雪地 / 星空的世界）
 *
 *  报名：2 岛币（Game 扣）；进图前把整包（含腰包和腰包里的东西）快照下来再清空；
 *  规则：血量只有 1 点、饥饿不消耗、120 秒内刷怪追杀；撑满时间发 10 岛币，中途死亡不退费；
 *  结算：不管输赢都把原背包原样还回去，然后由 Game 送回大厅。
 *  比赛不进存档：中途关网页＝这次报名作废，不给补发奖励。 */

import * as THREE from 'three';
import { ARENA } from '../config';
import { POTION_ICE, POTION_PHANTOM, RAW_MEAT, RICE_GRAIN, SWORD_IRON, SWORD_SNOW, Slots, Stack } from '../world/Block';
import { Inventory } from '../player/Inventory';
import { PlayerBody } from '../player/Physics';
import { Mobs } from '../entities/Mobs';
import { Zombie, ZombieKind } from '../entities/Zombie';
import { Hud } from '../ui/Hud';

/** 两种极限图：冰天雪地（春/冬）与星空的世界（夏/秋） */
export type ArenaKind = 'snow' | 'void';
/** 结算结果：胜（撑满时间）/ 负（死了）/ 放弃（自己按 H 走的） */
export type ArenaResult = 'win' | 'lose' | 'abort';

/** 开局赠送的东西（设定原文，麦粒=现有稻粒） */
const KIT: Record<ArenaKind, [number, number][]> = {
  snow: [[RAW_MEAT, 5], [RICE_GRAIN, 4], [SWORD_SNOW, 1], [POTION_ICE, 3]],
  void: [[POTION_PHANTOM, 1], [SWORD_IRON, 1], [RICE_GRAIN, 3]],
};

/** 整包快照：所有槽位 + 手上捏着的那一摞 */
interface Snapshot {
  hotbar: Slots; storage: Slots; armor: Slots; waistbag: Slots;
  craftIn: Slots; craftBig: Slots; held: Stack | null;
}

const cloneSlots = (s: Slots): Slots => s.map((x) => (x ? { ...x } : null));

export interface ArenaHooks {
  /** 发奖（只有撑满时间才调） */
  addCoins: (n: number) => void;
  /** 结算完成：Game 负责把人送回大厅、恢复血量饥饿 */
  onEnd: (result: ArenaResult) => void;
}

export class Arena {
  /** 当前在打哪种图；null = 没在比赛 */
  kind: ArenaKind | null = null;
  /** 还剩几秒 */
  left = 0;
  private snapshot: Snapshot | null = null;
  private spawned: Zombie[] = [];
  private elapsed = 0;
  private spawnT = 0;
  private lastAnnounce = -1;

  constructor(
    private scene: THREE.Scene,
    private mobs: Mobs,
    private inventory: () => Inventory,
    private hud: () => Hud | null,
    private hooks: ArenaHooks,
  ) {}

  get active(): boolean { return this.kind !== null; }

  /** 进图：快照整包 → 清空 → 发赠品 → 开表 */
  begin(kind: ArenaKind): void {
    const inv = this.inventory();
    this.snapshot = {
      hotbar: cloneSlots(inv.hotbar), storage: cloneSlots(inv.storage), armor: cloneSlots(inv.armor),
      waistbag: cloneSlots(inv.waistbag), craftIn: cloneSlots(inv.craftIn), craftBig: cloneSlots(inv.craftBig),
      held: inv.held ? { ...inv.held } : null,
    };
    for (const k of ['hotbar', 'storage', 'armor', 'waistbag', 'craftIn', 'craftBig'] as const) {
      for (let i = 0; i < inv[k].length; i++) inv[k][i] = null;
    }
    inv.held = null;
    for (const [id, n] of KIT[kind]) inv.add(id, n);
    this.kind = kind;
    this.left = ARENA.SECONDS;
    this.elapsed = 0;
    this.spawnT = ARENA.SPAWN_EVERY;
    this.lastAnnounce = -1;
    this.spawned = [];
  }

  /** 每帧：倒计时、播报、刷怪、到点判胜 */
  update(dt: number, body: PlayerBody): void {
    if (!this.kind) return;
    this.left -= dt;
    this.elapsed += dt;
    const sec = Math.max(0, Math.ceil(this.left));
    this.hud()?.setArenaTimer(sec);
    this.announce(sec);
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = ARENA.SPAWN_EVERY;
      this.spawnMob(body);
    }
    if (this.left <= 0) this.finish('win');
  }

  /** 玩家死了：结算为失败（不退报名费，背包照还） */
  onPlayerDeath(): void {
    this.finish('lose');
  }

  /** 自己放弃（按 H 或面板里退出）：同样不退费 */
  abort(): void {
    this.finish('abort');
  }

  /** 清场 + 还包 + 报结果（只结算一次） */
  private finish(result: ArenaResult): void {
    if (!this.kind) return;
    for (const z of this.spawned) {
      if (!z.dead) this.scene.remove(z.group);
      this.mobs.zombies = this.mobs.zombies.filter((x) => x !== z);
    }
    this.spawned = [];
    this.restore();
    this.kind = null;
    this.left = 0;
    this.hud()?.setArenaTimer(null);
    if (result === 'win') this.hooks.addCoins(ARENA.REWARD);
    this.hooks.onEnd(result);
  }

  /** 把进图前的背包原样放回去（腰包与腰包里的东西一起） */
  private restore(): void {
    const snap = this.snapshot;
    const inv = this.inventory();
    if (!snap) return;
    for (const k of ['hotbar', 'storage', 'armor', 'waistbag', 'craftIn', 'craftBig'] as const) {
      for (let i = 0; i < inv[k].length; i++) inv[k][i] = snap[k][i] ?? null;
    }
    inv.held = snap.held;
    this.snapshot = null;
  }

  /** 剩 60/30 秒各喊一次，最后 10 秒每秒喊一次 */
  private announce(sec: number): void {
    const hud = this.hud();
    if (!hud || sec === this.lastAnnounce) return;
    if (sec === 60 || sec === 30 || (sec <= 10 && sec > 0)) {
      this.lastAnnounce = sec;
      hud.showMessage(`还剩 ${sec} 秒，撑住！`, 1.2);
    }
  }

  /** 在玩家附近刷一只怪：前 40 秒普通、40~80 秒血尸、之后星空尸 */
  private spawnMob(body: PlayerBody): void {
    const kind: ZombieKind = this.elapsed < 40 ? 'normal' : this.elapsed < 80 ? 'blood' : 'star';
    const near = this.kind === 'void' ? ARENA.SPAWN_NEAR_VOID : ARENA.SPAWN_NEAR;
    const ang = Math.random() * Math.PI * 2;
    let x = body.x + Math.cos(ang) * near;
    let z = body.z + Math.sin(ang) * near;
    if (this.kind === 'snow') {
      // 雪原：别刷到围墙外面去
      const lo = 2.5, hi = ARENA.SNOW_SIZE - 2.5;
      x = Math.min(hi, Math.max(lo, x));
      z = Math.min(hi, Math.max(lo, z));
    } else {
      // 虚空：石台小，刷在台面范围内
      const lo = 1.5, hi = ARENA.VOID_SIZE - 1.5;
      x = Math.min(hi, Math.max(lo, x));
      z = Math.min(hi, Math.max(lo, z));
    }
    const zed = new Zombie(x, ARENA.FLOOR_Y + 1, z, kind);
    zed.noLoot = true;       // 竞技场的怪打死不掉东西
    zed.inChallenge = true;  // 只认玩家，不追小战士
    this.spawned.push(zed);
    this.mobs.zombies.push(zed);
    this.scene.add(zed.group);
  }
}
