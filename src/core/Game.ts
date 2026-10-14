/** 游戏主循环 — 把所有模块装配起来，每帧按固定顺序驱动它们 */

import * as THREE from 'three';
import { CHUNK, DAY, HALL, ISLAND_TYPES, IslandType, PLAYER, SAVE, VIEW_DISTANCE, VOID_Y, VisitPerm, WORLD_SEED } from '../config';
import { World } from '../world/World';
import { buildHall } from '../world/HallMap';
import { findGrassSpawn, heightAt, randomGrassSpawn, setTerrainConfig } from '../world/TerrainGen';
import { createAtlas, Atlas } from '../render/Textures';
import { ChunkMeshCache } from '../render/ChunkMeshCache';
import { Renderer } from '../render/Renderer';
import { Controller } from '../player/Controller';
import { PlayerBody, createBody, stepPhysics } from '../player/Physics';
import { SkateSystem, wearingSkates } from '../player/Skates';
import { cameraFallRoll, cameraYawSway } from '../player/CameraEffects';
import { WorldCycles } from '../world/WorldCycles';
import { GameMode, Health } from '../player/Health';
import { Hunger } from '../player/Hunger';
import { Inventory } from '../player/Inventory';
import { pick, pickWater } from '../interact/BlockPicker';
import { runMenuFlow } from './Menus';
import { TouchControls, isTouchDevice } from '../ui/TouchControls';
import { Hud } from '../ui/Hud';
import { Panel } from '../ui/Panel';
import { Mobs } from '../entities/Mobs';
import { ItemDrop } from '../entities/ItemDrop';
import { ContainerPanel } from '../ui/Container';
import { DyePanel } from '../ui/DyePanel';
import { RecipeBook } from '../ui/RecipeBook';
import { PanelStack } from '../ui/PanelStack';
import { HallMenu } from '../ui/HallMenu';
import { VisitMenu } from '../ui/VisitMenu';
import { SaveData, applySave, buildSave, isSupportedSave, migrateSave, randomIslandType, readSave, writeSave } from './Save';
import { DayCycle } from './DayCycle';
import { PlayerActions } from './PlayerActions';
import { Pickup } from './Pickup';
import { Survival } from './Survival';
import { MobCombat } from './MobCombat';
import { Vehicles } from './Vehicles';
import { Challenge } from './Challenge';
import { Potions } from '../entities/Potions';
import { BAG_GLASS, IRON_INGOT, WAISTBAG_SLOT } from '../world/Block';
import { DIY_GOLD_PICKAXE } from '../world/GoldenItems';
import { spawnDrop } from '../entities/drops';
import { ZOMBIE_NAMES } from '../entities/Zombie';
import { FireSystem } from '../entities/Fire';
import { hurtPlayer } from '../player/damage';
import { NetClient } from '../net/Client';
import { probeAuth } from '../ui/Auth';

export type SceneMode = 'island' | 'hall' | 'visit';

export class Game {
  private renderer: Renderer;
  private controller = new Controller();
  private world = new World();
  private atlas: Atlas = createAtlas();
  private chunkMeshes: ChunkMeshCache;
  private highlight: THREE.LineSegments;
  private body: PlayerBody | null = null;
  private health: Health | null = null;
  private hunger: Hunger | null = null;
  private inventory: Inventory | null = null;
  private hud: Hud | null = null;
  private panel: Panel | null = null;
  private spawn = { x: 8.5, y: 40, z: 8.5 };
  private slot = 0; private paused = false; private started = false; private lastTime = 0; private saveSlot = 0;
  private everCreative = false; private islandType: IslandType = 'apple';
  private visitIslandType: IslandType | null = null; private visitOwner: string | null = null; private visitPerm: VisitPerm | null = null;
  private scene: SceneMode = 'island'; // 场景三态：island(自己岛) / hall(大厅) / visit(陌生副本岛或好友岛)
  private islandSave: SaveData | null = null;
  private playerActions: PlayerActions | null = null; private pickup: Pickup | null = null;
  private survival: Survival | null = null; private combat: MobCombat | null = null;
  private fires!: FireSystem; private mobs: Mobs; private vehicles!: Vehicles;
  private challenge!: Challenge; private potions!: Potions;
  private drops: ItemDrop[] = []; private saveTimer = SAVE.EVERY;
  private worldCycles = new WorldCycles(); private skates = new SkateSystem();
  private container: ContainerPanel | null = null; private dyePanel: DyePanel | null = null;
  private hallMenu: HallMenu | null = null; private visitMenu: VisitMenu | null = null;
  private book = new RecipeBook(); private net: NetClient | null = null; private panels = new PanelStack();
  private day = new DayCycle(
    () => this.hud?.showMessage('天黑了！小心血尸和星空尸出没，对着床按 M 可以睡觉', 3),
    () => { this.survival!.wakeUp(this.body!, this.spawn); this.pickup!.dropStarShard(this.spawn.x, this.spawn.y, this.spawn.z); },
  );

  constructor(container: HTMLElement) {
    this.renderer = new Renderer(container);
    this.chunkMeshes = new ChunkMeshCache(this.renderer.scene, this.atlas);
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002));
    this.highlight = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x111111 }));
    this.highlight.visible = false;
    this.renderer.scene.add(this.highlight);
    this.mobs = new Mobs(
      this.world, this.renderer.scene, (id, n, x, y, z) => this.dropAt(id, n, x, y, z),
      (dmg, kind) => {
        const r = hurtPlayer(this.health!, dmg);
        if (r.hurt) this.hud!.showMessage(`${ZOMBIE_NAMES[kind]}抓到你啦！`, 0.8);
        if (r.died) this.respawn();
      },
      () => this.book.hasMore(),
    );
    this.vehicles = new Vehicles(this.renderer.scene, this.mobs);
    this.challenge = this.createChallenge();
    this.potions = new Potions(this.renderer.scene, this.mobs, (msg) => this.hud!.showMessage(msg, 1.5));
    this.fires = new FireSystem(this.renderer.scene);
  }

  private createChallenge(): Challenge {
    return new Challenge(this.renderer.scene, this.mobs, () => {
      const text = this.book.unlockTask(DIY_GOLD_PICKAXE);
      if (text) { this.book.showPaper(text, true); this.hud?.showMessage('挑战通关！获得金稿子 DIY 手册'); }
    });
  }

  async start(): Promise<void> {
    await runMenuFlow((mode, save, zombieAttack, slot) => this.begin(mode, save, zombieAttack, slot));
    const who = await probeAuth();
    const denyMsgs: Record<string, string> = {
      offline: '对方不在线', rejected: '对方拒绝了你的访问申请',
      creative: '验证失败：双方中有人开启过创造模式', timeout: '对方未响应，申请已超时作废',
      self: '不能申请访问自己', nosave: '对方还没有岛屿存档',
    };
    this.net = new NetClient(who !== 'off' && who.name ? who.name : undefined, {
      onStatusChange: (status, prev) => {
        this.hud?.setNetState(status, this.net?.getOnlineList());
        if (status === 'connected' && prev === 'reconnecting') {
          this.hud?.showMessage('已重新连接服务器', 1.5);
          if (this.scene === 'hall') this.net?.joinHallQueue();
        } else if (status === 'reconnecting' && prev === 'connected') this.hud?.showMessage('与服务器断开，重连中…', 1.5);
      },
      onOnlineChange: (online, ev) => {
        this.hud?.setNetState(this.net!.getStatus(), online);
        if (ev?.type === 'online') this.hud?.showMessage(`${ev.name} 上线了`, 1.5);
        else if (ev?.type === 'offline') this.hud?.showMessage(`${ev.name} 下线了`, 1.5);
      },
      onHallQueue: (queue, pos) => this.hallMenu?.setQueueState(this.scene === 'hall', queue, pos),
      onHallHead: () => { if (this.scene === 'hall') { this.hud?.showMessage('轮到你啦！请选择目的地', 2.5); this.hallMenu?.open(); } },
      onHallMatched: (id, type) => { if (this.scene === 'hall') this.enterVisit(id, type); },
      onHallError: (msg) => this.hud?.showMessage(msg, 2.5),
      onVisitIncoming: (from) => { this.hud?.showMessage(`${from} 申请访问你的岛屿`, 2.5); this.visitMenu?.openRequest(from); },
      onVisitApproved: (owner, perm, ticket) => { if (this.scene === 'hall') void this.enterFriendVisit(owner, perm, ticket); },
      onVisitDenied: (reason) => this.hud?.showMessage(denyMsgs[reason] ?? '对方拒绝/未响应', 3),
    }, this.everCreative);
    this.net.connect();
    addEventListener('beforeunload', () => this.saveNow());
    this.lastTime = performance.now();
    const loop = (t: number) => {
      const dt = Math.min((t - this.lastTime) / 1000, 0.05);
      this.lastTime = t; this.tick(dt); requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private begin(mode: GameMode, save: SaveData | undefined, zombieAttack: boolean, slot: number): void {
    this.fires.clear(); this.saveSlot = slot;
    this.everCreative = Boolean(mode === 'creative' || save?.everCreative || save?.mode === 'creative');
    this.mobs.zombieAttack = zombieAttack; this.mobs.zombieSpawn = true;
    this.hunger = new Hunger(mode); this.health = new Health(mode, () => this.hunger!.respawn());
    this.inventory = new Inventory(mode);
    this.hud = new Hud(this.health.showStats, this.atlas, this.inventory.infinite);
    if (this.net) this.hud.setNetState(this.net.getStatus(), this.net.getOnlineList());
    this.panel = new Panel(this.inventory, this.atlas);
    this.container = new ContainerPanel(this.inventory, this.atlas);
    this.dyePanel = new DyePanel(this.inventory, (t) => this.hud!.showMessage(t));
    this.hallMenu = new HallMenu({
      onRandom: () => this.pickRandomIsland(),
      onFriend: (name) => this.pickFriendIsland(name),
      onCancel: () => { if (this.scene === 'hall') this.net?.leaveHallQueue(); },
    });
    this.visitMenu = new VisitMenu({
      onReply: (visitor, accept, perm) => {
        if (accept && this.scene === 'island') this.saveNow();
        this.net?.replyVisit(visitor, accept, perm, this.everCreative || this.inventory?.mode === 'creative');
      },
    });
    this.panels.register({ name: 'visitRequest', isOpen: () => this.visitMenu!.requestVisible, close: () => this.visitMenu!.closeRequest() });
    this.panels.register({ name: 'visitPerm', isOpen: () => this.visitMenu!.permVisible, close: () => this.visitMenu!.closePerm() });
    this.panels.register({ name: 'hallMenu', isOpen: () => this.hallMenu!.visible, close: () => this.hallMenu!.close() });
    this.panels.register({ name: 'inventory', isOpen: () => this.panel!.visible, close: () => this.panel!.close(), keys: (c) => this.panel!.handleKeys(c, (s) => this.playerActions!.meatMagic(s)) });
    this.panels.register({ name: 'container', isOpen: () => this.container!.visible, close: () => this.container!.close(), closeKeys: ['door'], update: (dt) => { this.world.updateFurnaces(dt); this.container!.refresh(); } });
    this.panels.register({ name: 'dye', isOpen: () => this.dyePanel!.visible, close: () => this.dyePanel!.close() });
    this.panels.register({ name: 'book', isOpen: () => this.book.visible, close: () => this.book.close(), closeKeys: ['book'] });
    this.panels.register({ name: 'sleep', isOpen: () => this.day.sleeping, close: () => {}, update: (dt) => this.day.update(dt, this.renderer) });
    this.survival = new Survival({
      controller: this.controller, inventory: this.inventory, health: this.health, hunger: this.hunger, hud: this.hud,
      world: this.world, slot: () => this.slot, setSpawn: (p) => { this.spawn = p; }, respawn: () => this.respawn(),
    });
    this.pickup = new Pickup({ world: this.world, scene: this.renderer.scene, inventory: this.inventory, hud: this.hud, book: this.book, drops: () => this.drops });
    this.playerActions = new PlayerActions({
      world: this.world, controller: this.controller, scene: this.renderer.scene,
      hud: this.hud, panel: this.panel, container: this.container, dyePanel: this.dyePanel,
      inventory: this.inventory, slot: () => this.slot, book: this.book, day: this.day, drops: () => this.drops, fires: this.fires,
      parkTank: (hit) => this.vehicles.parkTank(this.world, hit, this.body!.yaw),
      buildChallenge: (hit) => this.challenge.build(this.world, hit, this.body!, this.hud!),
      useChallengeDoor: (x, y, z) => this.challenge.useDoor(x, y, z, this.body!, this.inventory!, this.hud!),
      setBedSpawn: (x, y, z) => this.survival!.setBedSpawn(x, y, z),
      bookFull: () => this.book.hasAllNormal(),
      islandFruit: () => ISLAND_TYPES[this.scene === 'visit' && this.visitIslandType ? this.visitIslandType : this.islandType].fruitId,
      visitPerm: () => (this.scene === 'visit' && this.visitOwner ? this.visitPerm : null),
    });
    this.combat = new MobCombat(this.controller, this.inventory, () => this.slot, this.hud, this.mobs);
    if (save) {
      const r = this.restoreSaveState(save);
      this.paused = r.paused; this.day.time = r.dayTime;
    } else {
      this.islandType = randomIslandType();
      this.book.importLearned([]); this.book.importGoldenState([], [], 0);
      const gs = randomGrassSpawn();
      this.spawn = { x: gs.x, y: heightAt(Math.floor(gs.x), Math.floor(gs.z)) + 1, z: gs.z };
    }
    this.hud.refreshHotbar(this.inventory, this.slot);
    this.hud.setPaused(this.paused);
    this.hud.showIslandGreeting(this.islandType);
    document.getElementById('quitbtn')!.onclick = () => this.quitToMenu();
    this.body = createBody(this.spawn.x, this.spawn.y, this.spawn.z);
    if (save) this.restoreBodyFromSave(save);
    this.body.flying = this.inventory.infinite;
    this.streamChunks(Infinity);
    this.chunkMeshes.rebuildDirty(this.world);
    if (!save) this.mobs.spawnInitial(this.spawn.x, this.spawn.z);
    this.controller.active = true;
    if (isTouchDevice()) new TouchControls(this.controller);
    this.started = true;
    this.saveNow();
  }

  private restoreSaveState(save: SaveData) {
    const r = applySave(save, {
      inv: this.inventory!, health: this.health!, hunger: this.hunger!, world: this.world,
      scene: this.renderer.scene, animals: this.mobs.animals, zombies: this.mobs.zombies, drops: this.drops,
      tanks: this.vehicles.tanks, challenge: this.challenge,
    });
    this.spawn = r.spawn; this.slot = r.slot; this.islandType = r.islandType;
    this.everCreative = this.everCreative || r.everCreative || this.inventory!.mode === 'creative';
    this.mobs.zombieSpawn = r.zombieSpawn;
    this.book.importLearned(r.learned);
    this.book.importGoldenState(r.golden?.learned, r.golden?.tasks, r.golden?.waterUses);
    return r;
  }

  private restoreBodyFromSave(save: SaveData): void {
    const body = this.body!, b = save.body;
    body.x = b.x; body.y = b.y; body.z = b.z; body.yaw = b.yaw; body.pitch = b.pitch;
    body.vx = body.vy = body.vz = 0; body.fellFrom = b.y;
    body.speedBoostT = b.boostT ?? 0; body.speedBoostMult = b.boostMult ?? 1;
    body.flying = this.inventory!.infinite;
  }

  /** 把当前本岛状态打包存进浏览器（在大厅/副本岛时不覆盖本岛存档） */
  private saveNow(): void {
    if (!this.started || this.scene !== 'island' || !this.body || !this.inventory || !this.health || !this.hunger) return;
    if (this.inventory.mode === 'creative') this.everCreative = true;
    this.net?.setEverCreative(this.everCreative);
    const data = buildSave({
      mode: this.inventory.mode, everCreative: this.everCreative, islandType: this.islandType, spawn: this.spawn, body: this.body,
      health: this.health, hunger: this.hunger, slot: this.slot, inv: this.inventory,
      world: this.world, animals: this.mobs.animals, zombies: this.mobs.zombies, drops: this.drops,
      tanks: this.vehicles!.tanks, challenge: this.challenge, learned: this.book.learnedIds(),
      golden: { learned: this.book.goldenLearnedIds(), tasks: this.book.goldenTaskIds(), waterUses: this.book.goldenWaterUseCount() },
      paused: this.paused, dayTime: this.day.time, zombieAttack: this.mobs.zombieAttack, zombieSpawn: this.mobs.zombieSpawn,
    });
    this.islandSave = JSON.parse(JSON.stringify(data)) as SaveData;
    writeSave(this.saveSlot, data);
  }

  /** 清空当前世界网格与场内所有活物、掉落物、飞行药水、载具、火焰 */
  private clearScene(): void {
    this.playerActions?.cancelMining(); this.hud?.setProgress(0); this.highlight.visible = false;
    for (const a of this.mobs.animals) this.renderer.scene.remove(a.group);
    this.mobs.animals.length = 0;
    for (const z of this.mobs.zombies) this.renderer.scene.remove(z.group);
    this.mobs.zombies.length = 0;
    for (const d of this.drops) { this.renderer.scene.remove(d.mesh); d.mesh.geometry.dispose(); (d.mesh.material as THREE.Material).dispose(); }
    this.drops.length = 0; this.potions.update(100, this.world);
    for (const t of this.vehicles.tanks) this.renderer.scene.remove(t.group);
    this.vehicles.tanks.length = 0; this.vehicles.riding = null;
    this.fires.clear(); this.challenge = this.createChallenge();
    this.world.clear(); this.chunkMeshes.clear();
  }

  /** 按 H 进大厅（从自己岛或副本岛）：①本岛先存档 → ②清空场景 → ③造大厅并传过去 → ④联机时自动入队 */
  private enterHall(): void {
    if (this.scene === 'island') this.saveNow();
    this.panels.closeAll(); this.clearScene();
    setTerrainConfig(WORLD_SEED, false);
    buildHall(this.world); this.chunkMeshes.rebuildDirty(this.world);
    this.scene = 'hall'; this.visitIslandType = null; this.visitOwner = null; this.visitPerm = null; this.spawn = { ...HALL.SPAWN };
    const body = this.body!;
    body.x = HALL.SPAWN.x; body.y = HALL.SPAWN.y; body.z = HALL.SPAWN.z;
    body.vx = body.vy = body.vz = 0; body.fellFrom = body.y;
    if (this.net?.getStatus() === 'connected') {
      this.hud!.showHallSwitch(true, this.islandType); this.net.joinHallQueue();
    } else {
      this.hallMenu?.setQueueState(false, [], 0); this.hud!.showMessage('未连接服务器，排队不可用', 3);
    }
  }

  /** 保存当前背包快照并还原进去（离开副本岛回本岛时，随身背包收获不丢失） */
  private withKeptInventory(fn: () => void): void {
    const inv = this.inventory;
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
  private leaveHall(): void {
    const save = readSave(this.saveSlot) ?? (this.islandSave ? JSON.parse(JSON.stringify(this.islandSave)) as SaveData : null);
    if (!save) return;
    this.panels.closeAll(); this.net?.leaveHallQueue(); this.hallMenu?.setQueueState(false, [], 0);
    this.clearScene(); setTerrainConfig(WORLD_SEED, false);
    this.scene = 'island'; this.visitIslandType = null; this.visitOwner = null; this.visitPerm = null;
    this.withKeptInventory(() => this.restoreSaveState(save));
    this.restoreBodyFromSave(save); this.streamChunks(Infinity); this.chunkMeshes.rebuildDirty(this.world);
    this.hud!.selectSlot(this.slot); this.hud!.refreshHotbar(this.inventory!, this.slot);
    this.hud!.showHallSwitch(false, this.islandType); this.saveNow();
  }

  /** 队首点击「随机去陌生岛屿」：查背包铁锭 ≥ 2，不够提示并重排队尾，够则扣 2 铁锭并发 hall.random */
  private pickRandomIsland(): void {
    const inv = this.inventory!, hud = this.hud!;
    if (!inv.infinite && inv.countOf(IRON_INGOT) < HALL.RANDOM_IRON_COST) {
      hud.showMessage('铁锭不够，回到队尾', 2.5);
      this.net?.leaveHallQueue(); this.net?.joinHallQueue();
      return;
    }
    if (!inv.infinite) { inv.take(IRON_INGOT, HALL.RANDOM_IRON_COST); hud.refreshHotbar(inv, this.slot); }
    this.net?.requestRandomIsland();
  }

  /** 收到 hall.matched：按 islandId 固定种子生成无沙漠/无雪地、无怪无动物的副本岛 */
  private enterVisit(islandId: number, islandType: IslandType): void {
    this.panels.closeAll(); this.hallMenu?.setQueueState(false, [], 0);
    this.clearScene(); setTerrainConfig(islandId, true);
    this.scene = 'visit'; this.visitIslandType = islandType; this.visitOwner = null; this.visitPerm = null;
    const gs = findGrassSpawn(8.5, 8.5);
    this.spawn = { x: gs.x, y: heightAt(Math.floor(gs.x), Math.floor(gs.z)) + 1, z: gs.z };
    const body = this.body!;
    body.x = this.spawn.x; body.y = this.spawn.y; body.z = this.spawn.z;
    body.vx = body.vy = body.vz = 0; body.fellFrom = body.y;
    this.streamChunks(Infinity); this.chunkMeshes.rebuildDirty(this.world);
    this.hud!.showMessage(`来到了陌生的${ISLAND_TYPES[islandType].cn}（#${islandId}）！按 H 回大厅`, 3.5);
  }

  /** 队首点击「去好友的岛」并提交名字：向服务端发 visit.request 申请 */
  private pickFriendIsland(friendName: string): void {
    if (this.net?.getStatus() !== 'connected') {
      this.hud!.showMessage('未连接服务器，无法申请访岛', 2.5);
      return;
    }
    if (this.inventory?.mode === 'creative') this.everCreative = true;
    this.hud!.showMessage(`已向 ${friendName} 发送访岛申请，等待对方回应…`, 3);
    this.net.requestVisit(friendName, this.everCreative);
  }

  /** 收到 visit.approved：凭一次性票据拉取好友存档并作为临时副本加载（不写回岛主存档） */
  private async enterFriendVisit(owner: string, perm: VisitPerm, ticket?: string): Promise<void> {
    try {
      const qs = new URLSearchParams({ name: owner });
      if (ticket) qs.set('ticket', ticket);
      const r = await fetch(`/api/visit/world?${qs.toString()}`);
      if (!r.ok) { this.hud!.showMessage('拉取好友岛屿失败（可能未存过档或票据过期）', 3); return; }
      const raw = (await r.json()) as SaveData;
      if (!isSupportedSave(raw)) { this.hud!.showMessage('好友存档版本不支持', 3); return; }
      const friendSave = migrateSave(raw);
      this.panels.closeAll(); this.hallMenu?.setQueueState(false, [], 0);
      this.clearScene(); setTerrainConfig(WORLD_SEED, false);
      const ownerIslandType = friendSave.islandType && friendSave.islandType in ISLAND_TYPES ? friendSave.islandType : 'apple';
      this.scene = 'visit'; this.visitOwner = owner; this.visitPerm = perm; this.visitIslandType = ownerIslandType;
      this.world.applyDiffs(friendSave.chunks); this.world.applyMeta(friendSave.meta);
      for (const [k, v] of Object.entries(friendSave.chests ?? {})) this.world.chests.set(k, v);
      for (const [k, v] of Object.entries(friendSave.furnaces ?? {})) this.world.furnaces.set(k, v);
      this.spawn = { ...friendSave.spawn };
      const body = this.body!;
      body.x = this.spawn.x; body.y = this.spawn.y; body.z = this.spawn.z;
      body.vx = body.vy = body.vz = 0; body.fellFrom = body.y;
      this.streamChunks(Infinity); this.chunkMeshes.rebuildDirty(this.world);
      this.hud!.showMessage(`来到了 ${owner} 的${ISLAND_TYPES[ownerIslandType].cn}！按 H 回大厅`, 3.5);
    } catch {
      this.hud!.showMessage('加载好友岛屿出错', 2.5);
    }
  }

  private streamChunks(budget: number): void {
    const body = this.body!, pcx = Math.floor(body.x / CHUNK.SIZE), pcz = Math.floor(body.z / CHUNK.SIZE);
    for (let r = 0; r <= VIEW_DISTANCE && budget > 0; r++) {
      for (let dx = -r; dx <= r && budget > 0; dx++) {
        for (let dz = -r; dz <= r && budget > 0; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          if (!this.world.getChunk(pcx + dx, pcz + dz)) {
            this.world.ensureChunk(pcx + dx, pcz + dz); budget--;
            if (this.scene === 'island') this.mobs.onChunkGen(pcx + dx, pcz + dz);
          }
        }
      }
    }
  }
  private dropAt(id: number, n: number, x: number, y: number, z: number): void { spawnDrop({ scene: this.renderer.scene, drops: this.drops }, id, n, x, y + 0.5, z); }
  private quitToMenu(): void { this.saveNow(); location.reload(); }
  private goHome(): void {
    if (this.challenge.active) { this.hud!.showMessage('挑战中不能回城，先完成挑战'); return; }
    const body = this.body!;
    this.survival!.wakeUp(body, this.spawn); this.vehicles.riding?.setPose(body.x, body.y, body.z, body.yaw);
    body.fellFrom = body.y; this.hud!.showMessage('嗖——回到重生点！');
  }
  private respawn(): void {
    const body = this.body!; this.challenge.onPlayerDeath(this.hud!);
    const wasRiding = this.vehicles.riding !== null;
    const keptRiding = wasRiding && !this.vehicles.stowOnDeath(this.inventory!);
    const p = this.survival!.freeSpot(this.spawn.x, this.spawn.y, this.spawn.z);
    body.x = p.x; body.y = p.y; body.z = p.z; body.vx = body.vy = body.vz = 0;
    body.fellFrom = body.y; body.skateFallT = 0; this.skates.reset();
    body.swayT = body.swayPhase = body.breathT = body.swampId = 0;
    this.health!.respawn();
    this.hud!.showMessage(keptRiding ? '你死了！背包满了，坦克还驮着你' : wasRiding ? '你死了！坦克收回背包了' : '你死了！已重生');
  }
  private renderFrame(body: PlayerBody): void {
    this.renderer.updateCamera(body.x, body.y + PLAYER.EYE, body.z, body.yaw + cameraYawSway(body.swayT, body.swayPhase), body.pitch, cameraFallRoll(body.skateFallT));
    this.renderer.render(); this.controller.endFrame();
  }
  private tick(dt: number): void {
    if (!this.started) { this.renderer.render(); return; }
    this.saveTimer -= dt;
    if (this.saveTimer <= 0) { this.saveTimer = SAVE.EVERY; this.saveNow(); }
    if (this.controller.take('save')) { this.saveNow(); this.hud!.showMessage('进度已保存 ✓', 1); }
    const body = this.body!, health = this.health!, hud = this.hud!, panel = this.panel!;
    if (this.panels.handleFrame(dt, this.controller)) { this.renderFrame(body); return; }
    if (this.controller.take('pause')) { this.paused = !this.paused; hud.setPaused(this.paused); }
    if (this.paused && this.controller.take('quit')) this.quitToMenu();
    if (!this.paused && this.controller.take('inventory')) panel.open();
    if (!this.paused && this.controller.take('book')) this.book.open();
    if (!this.paused) {
      if (this.controller.take('hall')) { if (this.scene === 'hall') this.leaveHall(); else this.enterHall(); }
      this.survival!.toggleHungerKey();
      if (this.controller.take('toggleZombieSpawn')) {
        this.mobs.zombieSpawn = !this.mobs.zombieSpawn;
        hud.showMessage(this.mobs.zombieSpawn ? '僵尸生成已开启' : '僵尸生成已关闭，已有僵尸不会消失');
      }
      if (this.controller.take('respawn')) this.goHome();
      this.day.update(dt, this.renderer); this.worldCycles.update(dt, this.world);
      body.driving = this.vehicles!.riding !== null; body.skating = wearingSkates(this.inventory!.armor);
      body.glassBag = this.inventory!.armor[WAISTBAG_SLOT]?.id === BAG_GLASS;
      const pev = stepPhysics(body, this.world, this.controller, dt);
      const skateMessage = this.skates.update(body, this.inventory!.armor, dt, pev.horizontalDistance > 0);
      if (skateMessage) hud.showMessage(skateMessage, 1.5);
      const hev = health.update(dt, body, pev.fallDistance);
      if (hev.hurt) hud.showMessage('哎呀！', 0.6);
      if (hev.died) this.respawn();
      const starveDmg = this.hunger!.update(dt);
      if (starveDmg > 0) {
        const sr = hurtPlayer(health, starveDmg);
        if (sr.hurt) hud.showMessage('好饿！快吃东西！', 0.8);
        if (sr.died) this.respawn();
      }
      if (body.y < VOID_Y) { this.respawn(); hud.showMessage('掉出世界啦！', 1.2); }
      const cp = Math.cos(body.pitch), dx = -Math.sin(body.yaw) * cp, dy = Math.sin(body.pitch), dz = -Math.cos(body.yaw) * cp;
      const mob = this.mobs.rayHit(body.x, body.y + PLAYER.EYE, body.z, dx, dy, dz, PLAYER.REACH);
      const hit = pick(this.world, body), waterHit = pickWater(this.world, body);
      const blockDist = hit ? Math.hypot(hit.x + 0.5 - body.x, hit.y + 0.5 - (body.y + PLAYER.EYE), hit.z + 0.5 - body.z) : Infinity;
      const riding = this.vehicles.riding !== null;
      this.vehicles.update(dt, this.world, body, this.controller, this.inventory!, hud,
        Math.min(blockDist, mob?.dist ?? Infinity), this.slot, () => this.hud!.refreshHotbar(this.inventory!, this.slot));
      const potionHandled = !riding && this.potions.handleInput(this.controller, this.inventory!, this.slot, body, hud, hit, this.highlight);
      if (!potionHandled && !riding && mob && mob.dist <= blockDist) {
        this.highlight.visible = false; this.playerActions!.cancelMining(); hud.setProgress(0);
        this.combat!.update(mob, body, dt, (sheep) => this.survival!.useSheep(sheep));
      } else if (!potionHandled) {
        if (hit) { this.highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5); this.highlight.visible = true; }
        else this.highlight.visible = false;
        if (riding) { this.playerActions!.cancelMining(); hud.setProgress(0); }
        else this.playerActions!.updateMining(dt, hit?.x ?? null, hit?.y ?? null, hit?.z ?? null, waterHit);
      }
      this.playerActions!.placeItem(hit, body);
      if (!riding && this.controller.take('door')) {
        if (!this.playerActions!.tryMeatMagic() && hit) this.playerActions!.useBlock(hit.x, hit.y, hit.z);
      }
      this.survival!.eatKey(body); this.slot = this.survival!.hotbarKeys(this.slot);
      if (this.scene === 'island') this.mobs.update(dt, body.x, body.y, body.z, this.day.time >= DAY.NIGHT_FROM, this.day.time);
      this.potions.update(dt, this.world); this.fires.update(dt);
      this.drops = this.pickup!.update(dt, body);
      if (this.scene === 'island') this.challenge.update(dt, body, this.inventory!, hud);
      if (this.scene !== 'hall') this.streamChunks(2);
      this.chunkMeshes.rebuildDirty(this.world); this.world.updateFurnaces(dt);
      hud.refreshHotbar(this.inventory!, this.slot);
      hud.update(dt, health.hp, health.oxygen, this.hunger!.value);
    }
    this.renderFrame(body);
  }
}

