/** CS 大赛 — 五局三胜、沙漠地图、本地 + AI 对手（1v1 / 3v3）
 *
 *  整套比赛只收一次 2 岛币报名费：进图前整包快照（含腰包）后清空，发手枪 + 32 发子弹。
 *  每小局：先 5 秒准备（能开 CS 商店买东西），打完按胜负发 CS 币（胜 1500 / 负 500）。
 *  队员阵亡等下一小局复活；先赢 3 局的队伍整套获胜，玩家这队赢就发 10 岛币。
 *  赛结束：CS 商店买的七样道具一律清除、比赛物品清空，原背包原样还回去。
 *  比赛不进存档：中途关网页＝这次报名作废。 */

import * as THREE from 'three';
import { CS } from '../config';
import {
  AK47, AMMO, CS_GUN_IDS, CS_ITEM_IDS, CS_THROWN_IDS, FLASHBANG, GLASS_CONE, GRENADE,
  PISTOL, RIFLE, TOXIC_BOTTLE, Slots, Stack,
} from '../world/Block';
import { Inventory } from '../player/Inventory';
import { PlayerBody } from '../player/Physics';
import { Hud } from '../ui/Hud';
import { Soldier, CsTeam } from '../entities/Soldier';
import { CsThrown, CsThrownKind } from '../entities/CsThrown';
import { raycastBlock } from '../interact/BlockPicker';
import { CS_ALLY_SPOTS, CS_ENEMY_SPOTS, CS_GROUND_Y, CS_SPAWN_ALLY } from '../world/CsMaps';
import type { World } from '../world/World';

export type CsMode = '1v1' | '3v3';
type Phase = 'idle' | 'prep' | 'fight' | 'between';

/** 一个士兵这一帧的目标：可能是玩家，也可能是对方的士兵 */
interface CsTarget {
  x: number; y: number; z: number;
  hitPlayer: boolean;
  soldier: Soldier | null;
}

interface Snapshot {
  hotbar: Slots; storage: Slots; armor: Slots; waistbag: Slots;
  craftIn: Slots; craftBig: Slots; held: Stack | null;
}

export interface CsHooks {
  /** 玩家挨了 AI 一枪（Game 负责扣血与死亡） */
  hurtPlayer: (dmg: number) => void;
  /** 开枪时点亮一下视野 */
  muzzle: () => void;
  /** 整套结束：won = 玩家这队赢了（Game 负责发奖 + 送回大厅） */
  onEnd: (won: boolean) => void;
  /** 打开/关闭 CS 商店面板（准备阶段按 M） */
  openStore: (open: boolean) => void;
  /** 下一小局：把玩家复活回满血（阵亡的人要重新站起来） */
  revivePlayer: () => void;
}

const cloneSlots = (s: Slots): Slots => s.map((x) => (x ? { ...x } : null));
/** 这三样扔出去各是什么弹道 */
const THROWN_KIND: Record<number, CsThrownKind> = {
  [GRENADE]: 'grenade', [FLASHBANG]: 'flash', [TOXIC_BOTTLE]: 'toxic',
};

export class CsMatch {
  phase: Phase = 'idle';
  mode: CsMode = '1v1';
  cs = 0;                 // 本场攒的 CS 币（赛后作废）
  allyWins = 0;
  enemyWins = 0;
  round = 0;
  /** 玩家这一小局是不是已经阵亡（等下一小局复活） */
  playerDown = false;
  /** 当前弹药（发） */
  ammo = 0;

  private soldiers: Soldier[] = [];
  /** 每个士兵这一帧在打谁（开枪回调里要用，所以先记下来） */
  private targets = new Map<Soldier, CsTarget>();
  private thrown: CsThrown;
  private snapshot: Snapshot | null = null;
  private fireT = 0;
  private phaseT = 0;
  private decided = false;

  constructor(
    private scene: THREE.Scene,
    private world: World,
    private inventory: () => Inventory,
    private hud: () => Hud | null,
    private hooks: CsHooks,
  ) {
    this.thrown = new CsThrown(scene);
  }

  get active(): boolean { return this.phase !== 'idle'; }
  /** 准备阶段才能开商店 */
  get canShop(): boolean { return this.phase === 'prep'; }

  /** 报名进图：快照背包 → 清空 → 发手枪和子弹 → 摆人 → 进入第一小局的准备阶段 */
  begin(mode: CsMode): void {
    const inv = this.inventory();
    this.mode = mode;
    this.cs = 0; this.allyWins = 0; this.enemyWins = 0; this.round = 0;
    this.playerDown = false;
    this.decided = false;
    this.snapshot = {
      hotbar: cloneSlots(inv.hotbar), storage: cloneSlots(inv.storage), armor: cloneSlots(inv.armor),
      waistbag: cloneSlots(inv.waistbag), craftIn: cloneSlots(inv.craftIn), craftBig: cloneSlots(inv.craftBig),
      held: inv.held ? { ...inv.held } : null,
    };
    for (const k of ['hotbar', 'storage', 'armor', 'waistbag', 'craftIn', 'craftBig'] as const) {
      for (let i = 0; i < inv[k].length; i++) inv[k][i] = null;
    }
    inv.held = null;
    inv.add(PISTOL, 1);
    inv.add(AMMO, 2);   // 32 发（两包 16 发，图标上也是弹药）
    this.ammo = CS.KIT_AMMO;
    this.spawnTeams();
    this.phase = 'prep';
    this.phaseT = CS.PREP_SECONDS;
    this.fireT = 0;
  }

  /** 每帧：阶段计时 + 士兵行动 + 投掷物 + 胜负判定 */
  update(dt: number, body: PlayerBody): void {
    if (this.phase === 'idle') return;
    this.fireT = Math.max(0, this.fireT - dt);
    this.thrown.update(dt, this.world, (kind, x, y, z) => this.onThrownLand(kind, x, y, z));
    if (this.phase === 'prep') {
      this.phaseT -= dt;
      this.showState();
      if (this.phaseT <= 0) {
        this.phase = 'fight';
        this.round++;
        this.hud()?.showMessage(`第 ${this.round} 局开始！`, 2);
      }
    } else if (this.phase === 'fight') {
      for (const s of this.soldiers) {
        const t = this.targetOf(s, body);
        if (t) this.targets.set(s, t);
        s.update(dt, this.world, t, (who) => this.soldierFire(who));
      }
      this.checkWipe();
      this.showState();
    } else if (this.phase === 'between') {
      this.phaseT -= dt;
      this.showState();
      if (this.phaseT <= 0) {
        if (this.decided) { this.finish(); return; }
        this.startNextRound(body);
      }
    }
  }

  /** 玩家按 P：手里是枪就开枪（要弹药、有冷却），是投掷物就甩出去。slot = 快捷栏选中的那一格 */
  fire(body: PlayerBody, slot: number): boolean {
    const stack = this.inventory().hotbar[slot] ?? null;
    if (!stack) return false;
    if (CS_THROWN_IDS.includes(stack.id)) {
      const kind = THROWN_KIND[stack.id];
      if (kind) {
        this.thrown.throwItem(kind, body);
        this.consumeOne(slot);
        this.hud()?.showMessage('扔出去了！', 0.6);
      }
      return true;
    }
    if (!CS_GUN_IDS.includes(stack.id)) return false;
    if (this.phase !== 'fight') { this.hud()?.showMessage('准备阶段不能开枪', 1); return true; }
    if (this.playerDown) return true;
    if (this.fireT > 0) return true;
    if (this.ammo <= 0) { this.hud()?.showMessage('没子弹了！准备阶段按 M 去 CS 商店买弹药', 1.5); return true; }
    const gun = CS.GUNS[stack.id];
    if (!gun) return false;
    this.fireT = gun.every;
    this.ammo--;
    this.hooks.muzzle();
    const hit = this.raycastSoldier(body, 'enemy');
    if (hit) {
      hit.hurt(gun.damage);
      this.hud()?.showMessage(`打中了！扣了 ${gun.damage} 血`, 0.8);
      if (hit.dead) this.killSoldier(hit);
    }
    return true;
  }

  /** 玩家阵亡：本小局出局，等下一小局复活 */
  onPlayerDeath(): void {
    if (this.phase !== 'fight' || this.playerDown) return;
    this.playerDown = true;
    this.hud()?.showMessage('你阵亡了！等下一小局复活（CS 币照拿）', 3);
    this.checkWipe();
  }

  /** 准备阶段按 M 开 CS 商店 */
  toggleStore(): void {
    if (!this.canShop) { this.hud()?.showMessage('准备阶段才能开 CS 商店', 1.5); return; }
    this.hooks.openStore(true);
  }

  /** 买东西：扣 CS 币、发东西（CS 币不够由面板自己拦） */
  buy(kind: 'cone' | 'ammo' | 'flash' | 'grenade' | 'rifle' | 'toxic' | 'ak'): void {
    const p = CS.PRICES;
    const price = kind === 'cone' ? p.CONE : kind === 'ammo' ? p.AMMO : kind === 'flash' ? p.FLASH
      : kind === 'grenade' ? p.GRENADE : kind === 'rifle' ? p.RIFLE : kind === 'toxic' ? p.TOXIC : p.AK;
    if (this.cs < price) return;
    this.cs -= price;
    const inv = this.inventory();
    if (kind === 'cone') inv.add(GLASS_CONE, 1);
    else if (kind === 'ammo') { this.ammo += CS.AMMO_PER_PACK; inv.add(AMMO, 1); }
    else if (kind === 'flash') inv.add(FLASHBANG, 1);
    else if (kind === 'grenade') inv.add(GRENADE, 1);
    else if (kind === 'rifle') inv.add(RIFLE, 1);
    else if (kind === 'toxic') inv.add(TOXIC_BOTTLE, 1);
    else inv.add(AK47, 1);
    this.hud()?.showMessage('买好了！', 0.8);
  }

  /** 收摊：清掉比赛物品、还原背包、把人收走 */
  private finish(): void {
    const won = this.allyWins >= CS.WIN_ROUNDS;
    this.hooks.openStore(false);
    this.removeSoldiers();
    this.thrown.clear();
    const inv = this.inventory();
    for (const id of CS_ITEM_IDS) inv.removeAll(id);
    this.restore();
    this.phase = 'idle';
    this.hud()?.setCsState(null);
    this.hooks.onEnd(won);
  }

  /** 中途放弃（不结算 CS 币、不发奖） */
  abort(): void {
    if (this.phase === 'idle') return;
    this.hooks.openStore(false);
    this.removeSoldiers();
    this.thrown.clear();
    const inv = this.inventory();
    for (const id of CS_ITEM_IDS) inv.removeAll(id);
    this.restore();
    this.phase = 'idle';
    this.hud()?.setCsState(null);
  }

  // —— 小局流程 ——

  private startNextRound(body: PlayerBody): void {
    this.playerDown = false;
    this.hooks.revivePlayer(); // 阵亡的玩家这一小局满血复活
    // 每小局自带物资补给：子弹补 32 发
    this.ammo += CS.SUPPLY_AMMO;
    // 复活/归位：玩家回我方出生点，两队士兵重新站好，血补满
    body.x = CS_SPAWN_ALLY.x; body.y = CS_SPAWN_ALLY.y; body.z = CS_SPAWN_ALLY.z;
    body.vx = body.vy = body.vz = 0; body.fellFrom = body.y;
    this.reviveTeams();
    this.phase = 'prep';
    this.phaseT = CS.PREP_SECONDS;
    this.hud()?.showMessage(`第 ${this.round + 1} 局准备：按 M 开 CS 商店（还有 ${CS.PREP_SECONDS} 秒）`, 3);
  }

  private checkWipe(): void {
    if (this.phase !== 'fight') return;
    const enemies = this.soldiers.filter((s) => s.team === 'enemy' && !s.dead);
    const allies = this.soldiers.filter((s) => s.team === 'ally' && !s.dead);
    if (enemies.length === 0) { this.endRound(true); return; }
    if (this.playerDown && allies.length === 0) this.endRound(false);
  }

  private endRound(allyWin: boolean): void {
    if (allyWin) this.allyWins++; else this.enemyWins++;
    this.cs += allyWin ? CS.ROUND_WIN : CS.ROUND_LOSS;
    this.phase = 'between';
    this.phaseT = CS.SWITCH_SECONDS;
    this.hud()?.showMessage(allyWin
      ? `这局赢了！+${CS.ROUND_WIN} CS 币（比分 ${this.allyWins}:${this.enemyWins}）`
      : `这局输了，+${CS.ROUND_LOSS} CS 币（比分 ${this.allyWins}:${this.enemyWins}）`, 3);
    if (this.allyWins >= CS.WIN_ROUNDS || this.enemyWins >= CS.WIN_ROUNDS) this.decided = true;
  }

  // —— 士兵与射击 ——

  private spawnTeams(): void {
    this.removeSoldiers();
    // 1v1 只有 1 个对手；3v3 是玩家 + 2 名 AI 队友 对 3 名 AI 对手
    const enemies = this.mode === '3v3' ? CS_ENEMY_SPOTS : CS_ENEMY_SPOTS.slice(0, 1);
    for (const spot of enemies) this.addSoldier('enemy', spot.x, spot.z);
    if (this.mode === '3v3') for (const spot of CS_ALLY_SPOTS) this.addSoldier('ally', spot.x, spot.z);
  }

  private addSoldier(team: CsTeam, x: number, z: number): void {
    const s = new Soldier(team, x + 0.5, CS_GROUND_Y, z + 0.5);
    this.soldiers.push(s);
    this.scene.add(s.group);
  }

  private reviveTeams(): void {
    for (const s of this.soldiers) {
      if (s.dead) {
        this.scene.remove(s.group);
        s.dispose();
      }
    }
    this.soldiers = [];
    this.spawnTeams();
  }

  private removeSoldiers(): void {
    for (const s of this.soldiers) {
      this.scene.remove(s.group);
      s.dispose();
    }
    this.soldiers = [];
  }

  /** 这个士兵现在该打谁：我方打最近的敌人；敌方打最近的（玩家或队友），这样队友能帮玩家扛枪 */
  private targetOf(s: Soldier, body: PlayerBody): CsTarget | null {
    if (s.team === 'ally') {
      const e = this.nearest(s, 'enemy');
      return e ? { x: e.x, y: e.y, z: e.z, hitPlayer: false, soldier: e } : null;
    }
    let best: CsTarget | null = null;
    let bestD = Infinity;
    if (!this.playerDown) {
      best = { x: body.x, y: body.y, z: body.z, hitPlayer: true, soldier: null };
      bestD = Math.hypot(body.x - s.x, body.z - s.z);
    }
    for (const a of this.soldiers) {
      if (a.team !== 'ally' || a.dead) continue;
      const d = Math.hypot(a.x - s.x, a.z - s.z);
      if (d < bestD) { bestD = d; best = { x: a.x, y: a.y, z: a.z, hitPlayer: false, soldier: a }; }
    }
    return best;
  }

  private nearest(s: Soldier, team: CsTeam): Soldier | null {
    let best: Soldier | null = null;
    let bestD = Infinity;
    for (const o of this.soldiers) {
      if (o.team !== team || o.dead) continue;
      const d = Math.hypot(o.x - s.x, o.z - s.z);
      if (d < bestD) { bestD = d; best = o; }
    }
    return best;
  }

  /** 士兵开枪：打谁由这一帧的目标决定；命中率 60%，打空就只是放了个空枪 */
  private soldierFire(s: Soldier): void {
    const t = this.targets.get(s);
    if (!t) return;
    if (Math.random() > CS.SOLDIER_ACCURACY) return;
    if (t.hitPlayer) {
      if (this.playerDown) return;
      this.hooks.hurtPlayer(CS.SOLDIER_DAMAGE);
      return;
    }
    if (!t.soldier || t.soldier.dead) return;
    t.soldier.hurt(CS.SOLDIER_DAMAGE);
    if (t.soldier.dead) this.killSoldier(t.soldier);
  }

  private killSoldier(s: Soldier): void {
    this.scene.remove(s.group);
    s.dispose();
    this.soldiers = this.soldiers.filter((x) => x !== s);
  }

  /** 玩家开枪命中判定：视野方向最近的、有视线的敌方士兵 */
  private raycastSoldier(body: PlayerBody, team: CsTeam): Soldier | null {
    const cp = Math.cos(body.pitch);
    const dx = -Math.sin(body.yaw) * cp;
    const dy = Math.sin(body.pitch);
    const dz = -Math.cos(body.yaw) * cp;
    const ox = body.x, oy = body.y + 0.9, oz = body.z;
    let best: Soldier | null = null;
    let bestD = Infinity;
    for (const s of this.soldiers) {
      if (s.team !== team || s.dead) continue;
      const vx = s.x - ox, vy = s.y + 0.9 - oy, vz = s.z - oz;
      const along = vx * dx + vy * dy + vz * dz;
      if (along <= 0 || along > CS.SOLDIER_RANGE + 6) continue;
      const dist = Math.hypot(vx, vy, vz);
      if (dist - along > CS.AIM_RADIUS) continue;                     // 偏离准心太远
      if (raycastBlock(this.world, ox, oy, oz, dx, dy, dz, along)) continue; // 隔着墙
      if (dist < bestD) { bestD = dist; best = s; }
    }
    return best;
  }

  // —— 投掷物落点 ——

  private onThrownLand(kind: CsThrownKind, x: number, y: number, z: number): void {
    if (kind === 'grenade') {
      for (const s of [...this.soldiers]) {
        if (s.dead) continue;
        if (Math.hypot(s.x - x, s.z - z, s.y - y) > CS.GRENADE_RADIUS) continue;
        s.hurt(CS.GRENADE_DAMAGE);
        if (s.dead) this.killSoldier(s);
      }
      this.hud()?.showMessage('手雷炸了！', 0.8);
    } else if (kind === 'flash') {
      let n = 0;
      for (const s of this.soldiers) {
        if (s.dead) continue;
        if (Math.hypot(s.x - x, s.z - z) > CS.GRENADE_RADIUS) continue;
        s.blind(CS.FLASH_SECONDS);
        n++;
      }
      this.hud()?.showMessage(n > 0 ? `闪光弹晃到了 ${n} 个人` : '闪光弹闪了个空', 0.8);
    } else {
      let hit = false;
      for (const s of [...this.soldiers]) {
        if (s.dead) continue;
        if (Math.hypot(s.x - x, s.z - z) > 1.2) continue;
        s.hurt(CS.TOXIC_DAMAGE);
        hit = true;
        if (s.dead) this.killSoldier(s);
      }
      this.hud()?.showMessage(hit ? '毒药瓶砸中了！' : '毒药瓶摔碎了', 0.8);
    }
  }

  // —— 杂项 ——

  /** HUD 顶部状态：第几局、比分、CS 币、当前阶段倒计时 */
  private showState(): void {
    const label = this.phase === 'prep' ? `准备 ${Math.max(0, Math.ceil(this.phaseT))}s（M 开商店）`
      : this.phase === 'fight' ? '交战中' : `换局 ${Math.max(0, Math.ceil(this.phaseT))}s`;
    this.hud()?.setCsState(`第 ${Math.max(1, this.round)} 局 · ${this.allyWins}:${this.enemyWins} · ${this.cs} CS · ${label}`);
  }

  private consumeOne(slot: number): void {
    const inv = this.inventory();
    const s = inv.hotbar[slot];
    if (!s) return;
    s.count--;
    if (s.count <= 0) inv.hotbar[slot] = null;
  }

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
}
