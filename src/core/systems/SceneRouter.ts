/** 场景路由 — 岛/大厅/虚空/CS/大赛/访岛的场景切换流转与场景内特殊 tick（2026-10-29 二期从 Game.ts 抽出） */

import { ARENA, CHUNK, CS, HALL, ISLAND_RULES, ISLAND_TYPES, PORTAL, VIEW_DISTANCE, VOID_REALM, WORLD_SEED } from '../../config';
import type { GameDate } from '../loops/Calendar';
import { SOUL_PORTAL } from '../../world/blocks/Block';
import type { IslandType, VisitPerm } from '../../config';
import { World } from '../../world/World';
import { ChunkMeshCache } from '../../render/mesh/ChunkMeshCache';
import { buildHall } from '../../world/maps/HallMap';
import { buildVoidRealm, VOID_SPAWN, voidPlatformSpot } from '../../world/maps/VoidRealm';
import { SNOW_SPAWN, VOID_ARENA_SPAWN, arenaOpen, buildSnowArena, buildVoidArena } from '../../world/maps/ArenaMaps';
import { buildCsArena, CS_SPAWN_ALLY } from '../../world/maps/CsMaps';
import { findGrassSpawn, heightAt, setIslandProfile, setTerrainConfig } from '../../world/terrain/TerrainGen';
import { Zombie } from '../../entities/mobs/Zombie';
import { CsOnline } from '../scenes/CsOnline';
import { CsLocalSystem } from './CsLocal';
import { SeasonWeatherSystem } from './SeasonWeather';
import { Survival } from '../actions/Survival';
import { Arena, ArenaKind, ArenaResult } from '../scenes/Arena';
import { CsMode } from '../scenes/CsMatch';
import { VisitSync } from '../scenes/VisitSync';
import { VisitAvatar } from '../../entities/creatures/Character';
import { CHARACTER_NAMES, pickCharacter } from '../../entities/creatures/Character';
import { HallMenu } from '../../ui/panels/HallMenu';
import { CsRoomPanel } from '../../ui/panels/CsRoomPanel';
import { PlayerBody } from '../../player/motion/Physics';
import { Health } from '../../player/stats/Health';
import { Hunger } from '../../player/stats/Hunger';
import { Inventory } from '../../player/Inventory';
import { Hud } from '../../ui/hud/Hud';
import { PanelStack } from '../../ui/panels/PanelStack';
import { NetClient } from '../../net/Client';
import { SaveData, isSupportedSave, migrateSave, readSave } from '../Save';
import { seasonOf } from '../loops/Calendar';

type SceneMode = 'island' | 'hall' | 'visit' | 'void' | 'arena' | 'cs';
type Pos = { x: number; y: number; z: number };

/** 访岛时岛主的小人站在重生点前面多少格（太近会怼脸，太远看不清是谁） */
const VISIT_AVATAR_DIST = 3.2;

interface RouterCtx {
  world: World;
  chunkMeshes: ChunkMeshCache;
  scene3d: import('three').Scene;
  mobs: import('../../entities/mobs/Mobs').Mobs;
  panels: PanelStack;
  visitSync: VisitSync;
  visitAvatar: VisitAvatar;
  weather: SeasonWeatherSystem;
  body: () => PlayerBody | null;
  hud: () => Hud | null;
  health: () => Health | null;
  hunger: () => Hunger | null;
  inventory: () => Inventory | null;
  survival: () => Survival;
  arena: () => Arena | null;
  csLocal: () => CsLocalSystem;
  csOnline: () => CsOnline | null;
  csRoomPanel: () => CsRoomPanel | null;
  hallMenu: () => HallMenu | null;
  net: () => NetClient | null;
  csIsOnline: () => boolean;
  setCsIsOnline: (v: boolean) => void;
  islandType: () => IslandType;
  date: () => GameDate;
  coins: () => number;
  setCoins: (v: number) => void;
  addCoins: (n: number) => void;
  saveNow: () => void;
  clearScene: () => void;
  restoreSaveState: (save: SaveData) => void;
  restoreBody: (save: SaveData) => void;
  islandSave: () => SaveData | null;
  saveSlot: () => number;
  everCreative: () => boolean;
  setEverCreative: (v: boolean) => void;
  spawn: () => Pos;
  setSpawn: (p: Pos) => void;
}

export class SceneRouter {
  private sceneValue: SceneMode = 'island'; // 场景四态：island(自己岛) / hall(大厅) / visit(副本岛) / void(灵魂虚空)
  private visitIslandTypeValue: IslandType | null = null;
  private visitOwnerValue: string | null = null;
  private visitPermValue: VisitPerm | null = null;
  private portalCd = 0;   // 传送冷却：刚穿过门出来那几秒不会再被吸回去
  private voidGhostT = 0; // 灵魂虚空补幽灵鬼的倒计时
  private pendingHall = false; private pendingHallT = 0; // 主菜单点「大厅」后等联机连上再进
  private visitSendTimer = 0; // 访岛申请"送达回执"的超时定时器（0=没在等）
  /** 进竞技场前饥饿开关是什么状态，出来要还原 */
  private hungerWasOn = false;

  constructor(private ctx: RouterCtx) {}

  /** 场景模式（Game 以 getter 委托，全项目照常读） */
  get scene(): SceneMode { return this.sceneValue; }
  get visitIslandType(): IslandType | null { return this.visitIslandTypeValue; }
  get visitOwner(): string | null { return this.visitOwnerValue; }
  get visitPerm(): VisitPerm | null { return this.visitPermValue; }

  /** 主菜单「大厅」按钮：联机已连就直接进，没连上等它连上（最多 8 秒，超时留在岛上） */
  enterHallWhenReady(): void {
    if (this.ctx.net()?.getStatus() === 'connected') { this.enterHall(); return; }
    this.pendingHall = true; this.pendingHallT = 8;
    this.ctx.hud()?.showMessage('正在连接服务器，连上就去大厅…', 3);
  }

  /** 联机刚连上时问一句：是不是在等进大厅（是就立刻进） */
  consumePendingHall(): boolean {
    if (!this.pendingHall) return false;
    this.pendingHall = false;
    return true;
  }

  /** 每帧：等进大厅的 8 秒超时提示 */
  tickPendingHall(dt: number): void {
    if (this.pendingHall && (this.pendingHallT -= dt) <= 0) {
      this.pendingHall = false;
      this.ctx.hud()?.showMessage('连不上服务器，先在自己岛上玩吧，随时可按 H 再试', 3);
    }
  }

  /** 每帧：灵魂传送门穿越判定 + 虚空幽灵鬼补货 */
  voidTick(dt: number, body: PlayerBody): void {
    // 灵魂传送门：脚（或腰）所在的格子是传送门方块就穿过去；传送冷却防止刚落地又被吸回去
    this.portalCd = Math.max(0, this.portalCd - dt);
    if (this.portalCd <= 0) {
      const bx = Math.floor(body.x), by = Math.floor(body.y), bz = Math.floor(body.z);
      const world = this.ctx.world;
      if (world.getBlock(bx, by, bz) === SOUL_PORTAL || world.getBlock(bx, by + 1, bz) === SOUL_PORTAL) {
        if (this.sceneValue === 'island') this.enterVoid();
        else if (this.sceneValue === 'void') this.leaveVoid();
      }
    }
    // 灵魂虚空：定时补幽灵鬼到平台上；掉出平台的幽灵悄悄消失（不掉东西，反正也捡不到）
    if (this.sceneValue !== 'void') return;
    for (const z of this.ctx.mobs.zombies) {
      if (z.y < VOID_REALM.GHOST_FALL_Y) { z.dead = true; z.silent = true; }
    }
    this.voidGhostT -= dt;
    // 幽灵鬼是虚空特产，不受僵尸生成开关管：就算关了「生成僵尸」，这里也照样刷
    if (this.voidGhostT <= 0 && this.ctx.mobs.zombies.filter((z) => z.kind === 'ghost').length < VOID_REALM.GHOST_MAX) {
      this.voidGhostT = VOID_REALM.GHOST_EVERY;
      const s = voidPlatformSpot();
      const g = new Zombie(s.x, s.y, s.z, 'ghost');
      this.ctx.scene3d.add(g.group);
      this.ctx.mobs.zombies.push(g);
    }
  }

  /** 访岛申请回执的超时定时器：收到回执/批准/拒绝时都要掐掉 */
  clearVisitAck(): void {
    window.clearTimeout(this.visitSendTimer);
  }

  /** 按岛型给地形生成器喂参数（规则见 config 的 ISLAND_RULES / 玩家 2026-10-20 定稿的生成规则）：
   *  每个品种岛只长自己那一种树（苹果岛永远只有苹果树），竹林/雪地/蘑菇都在生成时定死，
   *  **不随玩家日期变化**。串门时传对方的岛型——只影响地形，不碰存档里的 islandType。 */
  applyIslandTerrain(type: IslandType): void {
    const rules = ISLAND_RULES[type as keyof typeof ISLAND_RULES];
    const leaf = ISLAND_TYPES[type]?.leafId ?? 0;
    setIslandProfile({
      trees: leaf ? [leaf] : [],
      bamboo: rules?.bamboo ?? false,
      snowOnly: rules?.snowOnly,
    });
    this.ctx.weather.setWinterIsland(type === 'winter'); // 冬季岛常年下雪，不受日历季节限制
  }

  /** 按 H 进大厅（从自己岛或副本岛）：①本岛先存档 → ②清空场景 → ③造大厅并传过去 → ④联机时自动入队 */
  enterHall(): void {
    this.pendingHall = false;
    if (this.sceneValue === 'island') this.ctx.saveNow();
    this.ctx.panels.closeAll(); this.ctx.clearScene();
    setTerrainConfig(WORLD_SEED, false, ISLAND_TYPES[this.ctx.islandType()].leafId);
    buildHall(this.ctx.world); this.ctx.chunkMeshes.rebuildDirty(this.ctx.world);
    this.sceneValue = 'hall'; this.visitIslandTypeValue = null; this.visitOwnerValue = null; this.visitPermValue = null;
    this.ctx.setSpawn({ ...HALL.SPAWN });
    this.ctx.hud()!.setVisitOwner(null);
    const body = this.ctx.body()!;
    body.x = HALL.SPAWN.x; body.y = HALL.SPAWN.y; body.z = HALL.SPAWN.z;
    body.vx = body.vy = body.vz = 0; body.fellFrom = body.y;
    if (this.ctx.net()?.getStatus() === 'connected') {
      this.ctx.hud()!.showHallSwitch(true, this.ctx.islandType()); this.ctx.net()!.joinHallQueue();
    } else {
      this.ctx.hallMenu()?.setQueueState(false, [], 0); this.ctx.hud()!.showMessage('未连接服务器，排队不可用', 3);
    }
  }

  /** 保存当前背包快照并还原进去（离开副本岛回本岛时，随身背包收获不丢失） */
  private withKeptInventory(fn: () => void): void {
    const inv = this.ctx.inventory();
    if (!inv) { fn(); return; }
    const clone = (s: typeof inv.hotbar) => s.map((x) => (x ? { ...x } : null));
    const keys = ['hotbar', 'storage', 'armor', 'waistbag', 'craftIn', 'craftBig'] as const;
    const snap = keys.map((k) => clone(inv[k]));
    const held = inv.held ? { ...inv.held } : null;
    fn();
    keys.forEach((k, idx) => snap[idx].forEach((s, i) => { inv[k][i] = s; }));
    inv.held = held;
  }

  /** 在大厅按 H 回自己的岛：离开队列、读回本岛存档，但保留随身背包收获 */
  leaveHall(): void {
    const save = readSave(this.ctx.saveSlot()) ?? (this.ctx.islandSave() ? JSON.parse(JSON.stringify(this.ctx.islandSave())) as SaveData : null);
    if (!save) return;
    this.ctx.panels.closeAll(); this.ctx.net()?.leaveHallQueue(); this.ctx.hallMenu()?.setQueueState(false, [], 0);
    this.ctx.clearScene(); setTerrainConfig(WORLD_SEED, false, ISLAND_TYPES[this.ctx.islandType()].leafId);
    this.applyIslandTerrain(this.ctx.islandType()); // 回自己岛：果树/竹林/雪地规则跟着自家岛走
    this.sceneValue = 'island'; this.visitIslandTypeValue = null; this.visitOwnerValue = null; this.visitPermValue = null;
    this.ctx.hud()!.setVisitOwner(null);
    // 岛币跟着人走：存档里的是进大厅那一刻的余额，大厅里挣的/花的不能被读档冲掉
    const keepCoins = this.ctx.coins();
    this.withKeptInventory(() => this.ctx.restoreSaveState(save));
    this.ctx.setCoins(keepCoins); this.ctx.hud()!.setCoins(keepCoins);
    this.ctx.restoreBody(save); this.streamChunks(Infinity); this.ctx.chunkMeshes.rebuildDirty(this.ctx.world);
    this.ctx.hud()!.selectSlot(this.ctx.saveSlot()); this.ctx.hud()!.refreshHotbar(this.ctx.inventory()!, this.ctx.saveSlot());
    this.ctx.hud()!.showHallSwitch(false, this.ctx.islandType()); this.ctx.saveNow();
  }

  /** 走进灵魂蓝传送门：本岛先存档（传送门方块跟着档走）→ 清空场景 → 造 9×9 虚空平台 → 落到平台上 */
  enterVoid(): void {
    if (this.sceneValue === 'island') this.ctx.saveNow();
    this.ctx.panels.closeAll(); this.ctx.clearScene();
    setTerrainConfig(WORLD_SEED, false, ISLAND_TYPES[this.ctx.islandType()].leafId);
    buildVoidRealm(this.ctx.world); this.ctx.chunkMeshes.rebuildDirty(this.ctx.world);
    this.sceneValue = 'void';
    this.ctx.setSpawn({ x: VOID_SPAWN.x, y: VOID_SPAWN.y, z: VOID_SPAWN.z });
    const body = this.ctx.body()!;
    const s = this.ctx.spawn();
    body.x = s.x; body.y = s.y; body.z = s.z;
    body.vx = body.vy = body.vz = 0; body.fellFrom = body.y;
    this.portalCd = PORTAL.COOLDOWN; this.voidGhostT = 0;
    this.ctx.hud()!.showMessage('来到了灵魂虚空！脚下是 9×9 的小平台，小心幽灵鬼，别掉下去', 4);
  }

  /** 从灵魂虚空回本岛：直接走大厅那套「读档+保背包」的回程，回来人还站在本岛传送门里（有传送冷却不怕被吸回去） */
  leaveVoid(): void {
    this.leaveHall();
    this.portalCd = PORTAL.COOLDOWN;
  }

  /** 报名 CS 大赛：整套只交一次 2 岛币 → 建沙漠图 → 快照并清空背包 → 开打 */
  enterCs(mode: CsMode): void {
    const inv = this.ctx.inventory(), hud = this.ctx.hud();
    if (!inv || !hud || !this.ctx.body() || !this.ctx.health()) return;
    if (this.ctx.coins() < CS.FEE && !inv.infinite) { hud.showMessage(`岛币不够，报名要 ${CS.FEE} 个`, 2.5); return; }
    if (this.sceneValue === 'island') this.ctx.saveNow(); // 先存本岛：比赛里不存档
    if (!inv.infinite) this.ctx.addCoins(-CS.FEE);
    this.ctx.panels.closeAll(); this.ctx.clearScene();
    setTerrainConfig(WORLD_SEED, false, ISLAND_TYPES[this.ctx.islandType()].leafId);
    buildCsArena(this.ctx.world);
    this.ctx.chunkMeshes.rebuildDirty(this.ctx.world);
    this.sceneValue = 'cs';
    this.ctx.csLocal().beginMatch(mode);
    const body = this.ctx.body()!;
    body.x = CS_SPAWN_ALLY.x; body.y = CS_SPAWN_ALLY.y; body.z = CS_SPAWN_ALLY.z;
    body.vx = body.vy = body.vz = 0; body.fellFrom = body.y;
    this.ctx.health()!.respawn();   // 开局全员满血
    this.ctx.hunger()?.respawn();
    hud.refreshHotbar(inv, this.ctx.saveSlot());
    hud.showMessage(`CS 大赛开始！${mode === '3v3' ? '3V3' : '1V1'} 五局三胜，准备阶段按 M 开商店`, 4);
  }

  /** CS 赛事结束：清掉比赛物品、还原背包，赢了整套发 10 岛币，然后回大厅 */
  leaveCs(won: boolean): void {
    this.ctx.health()?.respawn();
    this.ctx.hunger()?.respawn();
    if (won) this.ctx.addCoins(CS.REWARD);
    this.enterHall();
    this.ctx.hud()?.showMessage(won ? `整套打赢了！奖励 ${CS.REWARD} 岛币，比赛物品已清空` : '整套打输了，比赛物品已清空', 4);
    this.ctx.hud()?.refreshHotbar(this.ctx.inventory()!, this.ctx.saveSlot());
  }

  /** 联机对战进图（服务端说"准备"了才进）：扣报名费 → 建沙漠图 → 清包发枪 */
  enterOnlineCs(): void {
    const inv = this.ctx.inventory(), hud = this.ctx.hud();
    if (!inv || !hud || !this.ctx.body() || !this.ctx.health()) return;
    if (this.ctx.coins() < CS.FEE && !inv.infinite) {
      this.ctx.csOnline()?.leave();
      hud.showMessage(`岛币不够，开赛要 ${CS.FEE} 个，已退出房间`, 3);
      return;
    }
    if (this.sceneValue === 'island') this.ctx.saveNow();
    if (!inv.infinite) this.ctx.addCoins(-CS.FEE);
    this.ctx.panels.closeAll(); this.ctx.clearScene();
    setTerrainConfig(WORLD_SEED, false, ISLAND_TYPES[this.ctx.islandType()].leafId);
    buildCsArena(this.ctx.world);
    this.ctx.chunkMeshes.rebuildDirty(this.ctx.world);
    this.sceneValue = 'cs';
    this.ctx.setCsIsOnline(true);
    this.ctx.csOnline()!.begin();
    this.ctx.csOnline()!.respawnAt(this.ctx.body()!);
    this.ctx.health()!.respawn();
    this.ctx.hunger()?.respawn();
    hud.refreshHotbar(inv, this.ctx.saveSlot());
    hud.showMessage('联机 CS 开赛！沙漠图，五局三胜', 4);
  }

  /** 联机阶段变化：准备阶段进图或复活 */
  onCsOnlinePhase(phase: string): void {
    if (phase !== 'prep') return;
    if (this.sceneValue !== 'cs') { this.enterOnlineCs(); return; }
    // 已经在图里：下一小局复活并回到自己队的出生点
    this.ctx.health()?.respawn();
    this.ctx.hunger()?.respawn();
    if (this.ctx.body()) this.ctx.csOnline()!.respawnAt(this.ctx.body()!);
  }

  /** 联机整套结束：赢了发 10 岛币，回大厅 */
  leaveCsOnline(won: boolean): void {
    this.ctx.setCsIsOnline(false);
    this.ctx.health()?.respawn();
    this.ctx.hunger()?.respawn();
    if (won) this.ctx.addCoins(CS.REWARD);
    this.enterHall();
    this.ctx.hud()?.showMessage(won ? `整套打赢了！奖励 ${CS.REWARD} 岛币` : '整套打输了，比赛物品已清空', 4);
    this.ctx.hud()?.refreshHotbar(this.ctx.inventory()!, this.ctx.saveSlot());
  }

  /** 报名进极限季节挑战：扣 2 岛币 → 建图 → 快照并清空背包 → 血量置 1 → 开表 */
  enterArena(kind: ArenaKind): void {
    const inv = this.ctx.inventory(), hud = this.ctx.hud(), health = this.ctx.health(), hunger = this.ctx.hunger();
    if (!inv || !hud || !health || !hunger || !this.ctx.body()) return;
    if (!arenaOpen(kind, seasonOf(this.ctx.date()))) { hud.showMessage('这个季节不开放这项挑战', 2.5); return; }
    if (!inv.infinite && this.ctx.coins() < ARENA.FEE) { hud.showMessage(`岛币不够，报名要 ${ARENA.FEE} 个`, 2.5); return; }
    if (this.sceneValue === 'island') this.ctx.saveNow(); // 先存本岛：比赛里不存档，出来照旧读这份
    if (!inv.infinite) this.ctx.addCoins(-ARENA.FEE);
    this.ctx.panels.closeAll(); this.ctx.clearScene();
    setTerrainConfig(WORLD_SEED, false, ISLAND_TYPES[this.ctx.islandType()].leafId);
    if (kind === 'snow') buildSnowArena(this.ctx.world); else buildVoidArena(this.ctx.world);
    this.ctx.chunkMeshes.rebuildDirty(this.ctx.world);
    this.sceneValue = 'arena';
    this.ctx.arena()!.begin(kind);
    const spot = kind === 'snow' ? SNOW_SPAWN : VOID_ARENA_SPAWN;
    const body = this.ctx.body()!;
    body.x = spot.x; body.y = spot.y; body.z = spot.z;
    body.vx = body.vy = body.vz = 0; body.fellFrom = body.y;
    health.hp = 1;                 // 开局只剩 1 点血，靠吃东西回血
    this.hungerWasOn = hunger.enabled;
    hunger.enabled = false;        // 比赛里不消耗饥饿，免得饿死
    hud.refreshHotbar(inv, this.ctx.saveSlot());
    hud.showMessage(kind === 'snow'
      ? '冰天雪地挑战开始！撑满 120 秒就赢，死了报名费不退'
      : '星空的世界挑战开始！掉下去会被拉回台面，撑满 120 秒就赢', 4);
  }

  /** 极限挑战结算（赢/死/放弃）：恢复血量饥饿 → 回大厅（背包已由 Arena 还原） */
  leaveArena(result: ArenaResult): void {
    this.ctx.hud()?.setArenaTimer(null);
    this.ctx.health()?.respawn();
    const hunger = this.ctx.hunger();
    if (hunger) { hunger.respawn(); hunger.enabled = this.hungerWasOn; }
    const text = result === 'win'
      ? `撑满 ${ARENA.SECONDS} 秒！奖励 ${ARENA.REWARD} 岛币已到账`
      : result === 'lose' ? '挑战失败：报名费不退，背包原样还给你' : '放弃挑战：报名费不退，背包原样还给你';
    this.enterHall();            // 比赛场地不留人，直接送回大厅
    this.ctx.hud()?.showMessage(text, 4);
    this.ctx.hud()?.refreshHotbar(this.ctx.inventory()!, this.ctx.saveSlot());
  }

  /** 队首点击「随机去陌生岛屿」：查岛币 ≥ 5，不够提示并重排队尾，够则扣岛币并发 hall.random */
  pickRandomIsland(): void {
    const inv = this.ctx.inventory()!, hud = this.ctx.hud()!;
    if (!inv.infinite && this.ctx.coins() < HALL.RANDOM_COIN_COST) {
      hud.showMessage(`岛币不够（要 ${HALL.RANDOM_COIN_COST} 个），回到队尾`, 2.5);
      this.ctx.net()?.leaveHallQueue(); this.ctx.net()?.joinHallQueue();
      return;
    }
    if (!inv.infinite) this.ctx.addCoins(-HALL.RANDOM_COIN_COST);
    this.ctx.net()?.requestRandomIsland();
  }

  /** 收到 hall.matched：按 islandId 固定种子生成无沙漠/无雪地、无怪无动物的副本岛 */
  enterVisit(islandId: number, islandType: IslandType): void {
    this.ctx.panels.closeAll(); this.ctx.hallMenu()?.setQueueState(false, [], 0);
    this.ctx.clearScene(); setTerrainConfig(islandId, true, ISLAND_TYPES[islandType].leafId);
    this.applyIslandTerrain(islandType); // 随机串门到四季岛/香蕉岛：按那边的岛型生成
    this.sceneValue = 'visit'; this.visitIslandTypeValue = islandType; this.visitOwnerValue = null; this.visitPermValue = null;
    this.ctx.hud()!.setVisitOwner('随机岛'); // 随机串门也挂个牌子，免得以为还在自己家
    const gs = findGrassSpawn(8.5, 8.5);
    this.ctx.setSpawn({ x: gs.x, y: heightAt(Math.floor(gs.x), Math.floor(gs.z)) + 1, z: gs.z });
    const body = this.ctx.body()!;
    const s = this.ctx.spawn();
    body.x = s.x; body.y = s.y; body.z = s.z;
    body.vx = body.vy = body.vz = 0; body.fellFrom = body.y;
    this.streamChunks(Infinity); this.ctx.chunkMeshes.rebuildDirty(this.ctx.world);
    this.ctx.hud()!.showMessage(`来到了陌生的${ISLAND_TYPES[islandType].cn}（#${islandId}）！按 H 回大厅`, 3.5);
  }

  /** 队首点击「去好友的岛」并提交名字：向服务端发 visit.request 申请 */
  pickFriendIsland(friendName: string): void {
    // 不看 status 看真实 socket：连接可能刚断还没切到 reconnecting，那时申请会被静默吞掉
    if (!this.ctx.net()?.isOpen()) {
      this.ctx.hud()!.showMessage('连接断开了，正在重连，等连上再试', 3);
      this.ctx.net()?.readyHallQueue(); // 顺手探一下队首状态，重连后菜单会再弹
      return;
    }
    if (this.ctx.inventory()?.mode === 'creative') this.ctx.setEverCreative(true);
    if (this.ctx.net()!.requestVisit(friendName, this.ctx.everCreative())) {
      this.ctx.hud()!.showMessage(`已向 ${friendName} 发送访岛申请，等待对方回应…`, 3);
      // 8 秒内没等到服务器回执 = 申请多半丢进"死管"了（手机切后台后 readyState 还装 OPEN），自动重连治它
      window.clearTimeout(this.visitSendTimer);
      this.visitSendTimer = window.setTimeout(() => {
        this.ctx.hud()!.showMessage('申请好像没送到，连接断了，已帮你重连，请再点一次', 3.5);
        this.ctx.net()?.forceReconnect();
      }, HALL.VISIT_ACK_MS);
    } else {
      this.ctx.hud()!.showMessage('申请没发出去，请重试', 2.5);
    }
  }

  /** 同屏·岛主侧：我批准的客人正在路上——人得在自己岛上才能迎客，不在就先回去 */
  onGuestArriving(guest: string, perm?: VisitPerm): void {
    if (this.sceneValue !== 'island') this.leaveHall();
    if (perm) this.visitPermValue = perm; // 岛主也记一份权限：误伤/放置判定两边都用它
    this.ctx.visitSync.start('host', guest);
    this.ctx.hud()!.setVisitLabel(`🏠 ${guest} 在你家做客 · 按 H 回大厅`);
    this.ctx.hud()!.showMessage(`${guest} 来参观你的岛啦！`, 3);
  }

  /** 收到 visit.approved：凭一次性票据拉取好友存档并作为临时副本加载（不写回岛主存档），同时接通同屏会话 */
  async enterFriendVisit(owner: string, perm: VisitPerm, ticket?: string, pos?: { x: number; y: number; z: number }): Promise<void> {
    try {
      const qs = new URLSearchParams({ name: owner });
      if (ticket) qs.set('ticket', ticket);
      const r = await fetch(`/api/visit/world?${qs.toString()}`);
      if (!r.ok) { this.ctx.hud()!.showMessage('拉取好友岛屿失败（可能未存过档或票据过期）', 3); return; }
      const raw = (await r.json()) as SaveData;
      if (!isSupportedSave(raw)) { this.ctx.hud()!.showMessage('好友存档版本不支持', 3); return; }
      const friendSave = migrateSave(raw);
      this.ctx.panels.closeAll(); this.ctx.hallMenu()?.setQueueState(false, [], 0);
      this.ctx.clearScene();
      const ownerIslandType = friendSave.islandType && friendSave.islandType in ISLAND_TYPES ? friendSave.islandType : 'summer';
      setTerrainConfig(WORLD_SEED, false, ISLAND_TYPES[ownerIslandType].leafId);
      this.applyIslandTerrain(ownerIslandType); // 好友家的岛型只影响地形，不写进自家存档
      this.sceneValue = 'visit'; this.visitOwnerValue = owner; this.visitPermValue = perm; this.visitIslandTypeValue = ownerIslandType;
      this.ctx.hud()!.setVisitOwner(owner);
      const world = this.ctx.world;
      world.applyDiffs(friendSave.chunks); world.applyMeta(friendSave.meta);
      for (const [k, v] of Object.entries(friendSave.chests ?? {})) world.chests.set(k, v);
      for (const [k, v] of Object.entries(friendSave.furnaces ?? {})) world.furnaces.set(k, v);
      this.ctx.setSpawn({ ...friendSave.spawn });
      const body = this.ctx.body()!;
      // 岛主报了站位就落在他旁边（开门就见朋友），没报还是落重生点
      const s = this.ctx.spawn();
      const land = pos ? this.ctx.survival().freeSpot(pos.x, pos.y, pos.z) : s;
      body.x = land.x; body.y = land.y; body.z = land.z;
      body.vx = body.vy = body.vz = 0; body.fellFrom = body.y;
      this.ctx.visitSync.start('guest', owner); // 同屏会话接通：之后位置/方块改动自动互播
      this.streamChunks(Infinity); this.ctx.chunkMeshes.rebuildDirty(world);
      // 岛主的 3D 小人站在重生点前面几格（按他上次的朝向反推，脚踩在那格地面上），
      // 访客落在重生点上、转身正对着他，一进岛就是「见面」这一幕
      const kind = friendSave.character ?? pickCharacter(owner);
      const ownerYaw = friendSave.body?.yaw ?? 0;
      const ax = s.x + Math.sin(ownerYaw) * VISIT_AVATAR_DIST;
      const az = s.z + Math.cos(ownerYaw) * VISIT_AVATAR_DIST;
      const stand = this.ctx.visitAvatar.place({
        scene: this.ctx.scene3d, kind, name: owner,
        at: { x: ax, y: heightAt(Math.floor(ax), Math.floor(az)) + 0.05, z: az },  // heightAt 就是地面高度，+0.05 防共面闪烁
        freeSpot: (x, y, z) => this.ctx.survival().freeSpot(x, y, z),
        lookAt: body,
      });
      body.yaw = Math.atan2(-(stand.x - body.x), -(stand.z - body.z));
      body.pitch = 0;
      this.ctx.hud()!.showMessage(`见到了 ${owner}（${CHARACTER_NAMES[kind]}）！按 H 回大厅`, 4);
    } catch {
      this.ctx.hud()!.showMessage('加载好友岛屿出错', 2.5);
    }
  }

  /** 按玩家位置流式生成区块（进入场景时 Infinity 全量、每帧 2 个限额） */
  streamChunks(budget: number): void {
    const body = this.ctx.body()!, world = this.ctx.world;
    if (!body) return;
    const pcx = Math.floor(body.x / CHUNK.SIZE), pcz = Math.floor(body.z / CHUNK.SIZE);
    for (let r = 0; r <= VIEW_DISTANCE && budget > 0; r++) {
      for (let dx = -r; dx <= r && budget > 0; dx++) {
        for (let dz = -r; dz <= r && budget > 0; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          if (!world.getChunk(pcx + dx, pcz + dz)) {
            world.ensureChunk(pcx + dx, pcz + dz); budget--;
            if (this.sceneValue === 'island') this.ctx.mobs.onChunkGen(pcx + dx, pcz + dz);
          }
        }
      }
    }
  }
}
