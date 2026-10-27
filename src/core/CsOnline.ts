/** CS 联机对局 — 真人在同一个房间里打五局三胜
 *
 *  和本地 AI 版（CsMatch）是两套：这边的位置、血量、回合胜负都由服务端说了算，
 *  客户端只负责上报自己的位置、上报"我打中了谁"，以及把服务端的结算表现出来。
 *  地图、七样道具、枪械手感跟本地版完全一致，只是对手从 AI 换成了真人。 */

import * as THREE from 'three';
import { CS } from '../config';
import { CS_GUN_IDS, CS_ITEM_IDS, CS_THROWN_IDS, AMMO, PISTOL, Slots, Stack } from '../world/Block';
import type { CsRoomView } from '../net/Protocol';
import type { NetClient } from '../net/Client';
import { Inventory } from '../player/Inventory';
import { PlayerBody } from '../player/Physics';
import { Hud } from '../ui/Hud';
import { raycastBlock } from '../interact/BlockPicker';
import { CharacterModel, createCharacter } from '../entities/Character';
import { CS_SPAWN_ALLY, CS_SPAWN_ENEMY } from '../world/CsMaps';
import type { World } from '../world/World';

interface Remote {
  model: CharacterModel;
  group: THREE.Group;
  x: number; y: number; z: number; yaw: number;
  tx: number; ty: number; tz: number; tyaw: number;
  hp: number; alive: boolean; team: 'A' | 'B';
}

interface Snapshot {
  hotbar: Slots; storage: Slots; armor: Slots; waistbag: Slots;
  craftIn: Slots; craftBig: Slots; held: Stack | null;
}

export interface CsOnlineHooks {
  hurtPlayer: (dmg: number) => void;
  muzzle: () => void;
  /** 整套结束：won = 我这队赢了 */
  onEnd: (won: boolean) => void;
  /** 准备阶段提示（开商店在联机版里也走 CS 商店） */
  onPhase: (phase: string) => void;
}

const cloneSlots = (s: Slots): Slots => s.map((x) => (x ? { ...x } : null));

export class CsOnline {
  private room: CsRoomView | null = null;
  private remotes = new Map<string, Remote>();
  private snapshot: Snapshot | null = null;
  private sendT = 0;
  private fireT = 0;
  private ammo = 0;
  private playerDown = false;
  phase: 'lobby' | 'prep' | 'fight' | 'between' = 'lobby';
  round = 0;
  scoreA = 0;
  scoreB = 0;

  constructor(
    private scene: THREE.Scene,
    private world: World,
    private inventory: () => Inventory,
    private hud: () => Hud | null,
    private net: () => NetClient | null,
    private hooks: CsOnlineHooks,
  ) {}

  get inRoom(): boolean { return this.room !== null; }
  get playing(): boolean { return this.room !== null && this.phase !== 'lobby'; }
  /** 我在哪队（A = 先加入的那队） */
  get myTeam(): 'A' | 'B' | null {
    return this.room?.members.find((m) => m.name === this.net()?.getName())?.team ?? null;
  }

  // —— 房间操作 ——

  create(mode: '1v1' | '3v3'): void { this.net()?.sendCsCreate(mode); }
  join(code: string): void { this.net()?.sendCsJoin(code); }
  leave(): void {
    this.net()?.sendCsLeave();
    this.room = null;
    this.clearRemotes();
  }
  start(): void { this.net()?.sendCsStart(); }

  // —— 服务端推送 ——

  onRoom(room: CsRoomView): void {
    this.room = room;
    // 新人进来/有人走了：把不在名单里的模型收掉，给新面孔建模型
    for (const [name, r] of this.remotes) {
      if (!room.members.some((m) => m.name === name)) {
        this.scene.remove(r.group);
        r.model.dispose();
        this.remotes.delete(name);
      }
    }
    for (const m of room.members) {
      if (m.name === this.net()?.getName()) continue;
      if (this.remotes.has(m.name)) {
        const r = this.remotes.get(m.name)!;
        r.hp = m.hp; r.alive = m.alive; r.team = m.team;
        continue;
      }
      const model = createCharacter(m.team === 'A' ? 'steve' : 'alex', m.name);
      const spot = m.team === 'A' ? CS_SPAWN_ALLY : CS_SPAWN_ENEMY;
      model.group.position.set(spot.x, spot.y, spot.z);
      this.scene.add(model.group);
      this.remotes.set(m.name, {
        model, group: model.group,
        x: spot.x, y: spot.y, z: spot.z, yaw: 0,
        tx: spot.x, ty: spot.y, tz: spot.z, tyaw: 0,
        hp: m.hp, alive: m.alive, team: m.team,
      });
    }
  }

  onPhase(phase: 'lobby' | 'prep' | 'fight' | 'between', seconds: number, round: number): void {
    this.phase = phase;
    this.round = round;
    this.hooks.onPhase(phase);
    if (phase === 'prep') {
      this.playerDown = false;
      this.ammo += CS.SUPPLY_AMMO;
      const hud = this.hud();
      hud?.showMessage(`第 ${round} 局准备：${seconds} 秒后开打`, 2.5);
    } else if (phase === 'fight') {
      this.hud()?.showMessage(`第 ${this.round} 局开始！`, 2);
    }
    this.showState();
  }

  onPos(name: string, x: number, y: number, z: number, yaw: number): void {
    const r = this.remotes.get(name);
    if (!r) return;
    r.tx = x; r.ty = y; r.tz = z; r.tyaw = yaw;
  }

  onHit(from: string, target: string, damage: number, hp: number, alive: boolean): void {
    const me = this.net()?.getName();
    const r = this.remotes.get(target);
    if (r) { r.hp = hp; r.alive = alive; }
    if (target === me) {
      if (!alive) this.playerDown = true;
      if (damage > 0) this.hooks.hurtPlayer(damage);
      return;
    }
    if (from === me && damage > 0) this.hud()?.showMessage(`打中了 ${target}！扣了 ${damage} 血`, 0.8);
    if (!alive) this.hud()?.showMessage(`${target} 阵亡了`, 1);
  }

  onRound(winner: 'A' | 'B', scoreA: number, scoreB: number): void {
    this.scoreA = scoreA; this.scoreB = scoreB;
    const mine = this.myTeam;
    this.hud()?.showMessage(winner === mine ? `这局赢了！${scoreA}:${scoreB}` : `这局输了，${scoreA}:${scoreB}`, 3);
    this.showState();
  }

  onEnd(winner: 'A' | 'B'): void {
    const won = winner === this.myTeam;
    this.finish(won);
  }

  // —— 对局 ——

  /** 进图：快照背包 → 清空 → 发手枪和子弹 */
  begin(): void {
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
    inv.add(PISTOL, 1);
    inv.add(AMMO, 2);
    this.ammo = CS.KIT_AMMO;
    this.playerDown = false;
  }

  /** 阵亡后本小局钉住观战；下一小局由 onPhase('prep') 复活 */
  get down(): boolean { return this.playerDown; }

  /** 复活并回到自己队伍的出生点 */
  respawnAt(body: PlayerBody): void {
    const spot = this.myTeam === 'B' ? CS_SPAWN_ENEMY : CS_SPAWN_ALLY;
    body.x = spot.x; body.y = spot.y; body.z = spot.z;
    body.vx = body.vy = body.vz = 0; body.fellFrom = body.y;
    this.playerDown = false;
  }

  update(dt: number, body: PlayerBody): void {
    this.fireT = Math.max(0, this.fireT - dt);
    // 每 0.1 秒上报一次自己的位置
    this.sendT -= dt;
    if (this.sendT <= 0) {
      this.sendT = 0.1;
      this.net()?.sendCsPos(body.x, body.y, body.z, body.yaw);
    }
    // 远端玩家：位置插值 + 站着呼吸
    for (const r of this.remotes.values()) {
      const k = Math.min(1, dt * 12);
      r.x += (r.tx - r.x) * k;
      r.y += (r.ty - r.y) * k;
      r.z += (r.tz - r.z) * k;
      r.yaw = r.tyaw;
      r.group.position.set(r.x, r.y, r.z);
      r.group.rotation.y = r.yaw + Math.PI;
      r.group.visible = r.alive;
      r.model.update(dt);
    }
    this.showState();
  }

  /** 开枪：命中判定在本地做（要看得见人），血量由服务端结算 */
  fire(body: PlayerBody, slot: number): boolean {
    const stack = this.inventory().hotbar[slot] ?? null;
    if (!stack) return false;
    if (CS_THROWN_IDS.includes(stack.id)) return false; // 联机版暂不支持投掷物
    if (!CS_GUN_IDS.includes(stack.id)) return false;
    if (this.phase !== 'fight') { this.hud()?.showMessage('准备阶段不能开枪', 1); return true; }
    if (this.playerDown) return true;
    if (this.fireT > 0) return true;
    if (this.ammo <= 0) { this.hud()?.showMessage('没子弹了！', 1.5); return true; }
    const gun = CS.GUNS[stack.id];
    if (!gun) return false;
    this.fireT = gun.every;
    this.ammo--;
    this.hooks.muzzle();
    const hit = this.raycastEnemy(body);
    if (hit) this.net()?.sendCsHit(hit, gun.damage);
    return true;
  }

  /** 命中判定：视野方向上最近的、有视线的敌方玩家 */
  private raycastEnemy(body: PlayerBody): string | null {
    const mine = this.myTeam;
    const cp = Math.cos(body.pitch);
    const dx = -Math.sin(body.yaw) * cp;
    const dy = Math.sin(body.pitch);
    const dz = -Math.cos(body.yaw) * cp;
    const ox = body.x, oy = body.y + 0.9, oz = body.z;
    let best: string | null = null;
    let bestD = Infinity;
    for (const [name, r] of this.remotes) {
      if (!r.alive || r.team === mine) continue;
      const vx = r.x - ox, vy = r.y + 0.9 - oy, vz = r.z - oz;
      const along = vx * dx + vy * dy + vz * dz;
      if (along <= 0 || along > CS.SOLDIER_RANGE + 6) continue;
      const dist = Math.hypot(vx, vy, vz);
      if (dist - along > CS.AIM_RADIUS) continue;
      if (raycastBlock(this.world, ox, oy, oz, dx, dy, dz, along)) continue;
      if (dist < bestD) { bestD = dist; best = name; }
    }
    return best;
  }

  /** 收摊：清掉比赛物品、还原背包、把房间退了 */
  private finish(won: boolean): void {
    this.clearRemotes();
    const inv = this.inventory();
    for (const id of CS_ITEM_IDS) inv.removeAll(id);
    this.restore();
    this.phase = 'lobby';
    this.hud()?.setCsState(null);
    this.leave();
    this.hooks.onEnd(won);
  }

  /** 中途退出（不结算） */
  abort(): void {
    if (!this.playing) { this.leave(); return; }
    this.clearRemotes();
    const inv = this.inventory();
    for (const id of CS_ITEM_IDS) inv.removeAll(id);
    this.restore();
    this.phase = 'lobby';
    this.hud()?.setCsState(null);
    this.leave();
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

  private clearRemotes(): void {
    for (const r of this.remotes.values()) {
      this.scene.remove(r.group);
      r.model.dispose();
    }
    this.remotes.clear();
  }

  private showState(): void {
    const label = this.phase === 'prep' ? '准备中' : this.phase === 'fight' ? '交战中' : this.phase === 'between' ? '换局' : '房间里';
    this.hud()?.setCsState(`联机 ${this.room?.mode ?? ''} · 第 ${Math.max(1, this.round)} 局 · ${this.scoreA}:${this.scoreB} · ${label}`);
  }
}
