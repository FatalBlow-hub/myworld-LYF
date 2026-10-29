/** 游戏主循环 — 把所有模块装配起来，每帧按固定顺序驱动它们 */

import * as THREE from 'three';
import { ARENA, CS, DAY, ISLAND_TYPES, IslandType, MOUSE, PLAYER, PVP, VOID_Y, VisitPerm, WORLD_SEED } from '../config';
import { World } from '../world/World';
import { VOID_ARENA_SPAWN } from '../world/maps/ArenaMaps';
import { Arena } from './scenes/Arena';
import { ArenaPanel } from '../ui/panels/ArenaPanel';
import { Knife } from '../entities/projectiles/Knife';
import { Fireworks } from '../render/fx/Fireworks';
import { CsOnline } from './scenes/CsOnline';
import { CsRoomAction, CsRoomPanel } from '../ui/panels/CsRoomPanel';
import { heightAt, randomGrassSpawn, setTerrainConfig } from '../world/terrain/TerrainGen';
import { PLANT_TO_MUSHROOM } from '../world/terrain/mushrooms';
import { createAtlas, Atlas } from '../render/textures/Textures';
import { ChunkMeshCache } from '../render/mesh/ChunkMeshCache';
import { Renderer } from '../render/Renderer';
import { Controller } from '../player/motion/Controller';
import { PlayerBody, createBody, stepPhysics } from '../player/motion/Physics';
import { MouseLook } from '../player/motion/MouseLook';
import { SkateSystem, wearingSkates } from '../player/motion/Skates';
import { cameraFallRoll, cameraYawSway } from '../player/motion/CameraEffects';
import { WorldCycles } from '../world/terrain/WorldCycles';
import { GameMode, Health } from '../player/stats/Health';
import { Hunger } from '../player/stats/Hunger';
import { Inventory } from '../player/Inventory';
import { pick, pickWater } from '../interact/BlockPicker';
import { runMenuFlow } from './actions/Menus';
import { SceneRouter } from './systems/SceneRouter';
import { SaveController } from './systems/SaveController';
import { CsLocalSystem } from './systems/CsLocal';
import { GiftsSystem } from './systems/Gifts';
import { TrapSystem } from './systems/Traps';
import { SeasonWeatherSystem } from './systems/SeasonWeather';
import { EconomySystem } from './systems/Economy';
import { SummonsSystem } from './systems/Summons';
import { TravelerSystem } from './systems/TravelerSys';
import { TouchControls } from '../ui/touch/TouchControls';
import { isMobile } from '../ui/touch/Platform';
import { Hud } from '../ui/hud/Hud';
import { logout } from '../ui/account/Auth';
import { Panel } from '../ui/panels/Panel';
import { Mobs } from '../entities/mobs/Mobs';
import { ItemDrop } from '../entities/objects/ItemDrop';
import { CHARACTER_NAMES, VisitAvatar, pickCharacter } from '../entities/creatures/Character';
import { WARRIOR_TIER_NAMES } from '../entities/summons/Warrior';
import { ContainerPanel } from '../ui/panels/Container';
import { DyePanel } from '../ui/panels/DyePanel';
import { RecipeBook } from '../ui/panels/RecipeBook';
import { PanelStack } from '../ui/panels/PanelStack';
import { HallMenu } from '../ui/panels/HallMenu';
import { VisitMenu } from '../ui/panels/VisitMenu';
import { GivePanel } from '../ui/panels/GivePanel';
import { ChatPanel } from '../ui/panels/ChatPanel';
import { BoardPanel } from '../ui/panels/BoardPanel';
import { SettingsPanel } from '../ui/panels/SettingsPanel';
import { ShopQuota } from '../world/economy/shopLimits';
import { BlackMarketState } from '../world/economy/blackMarket';
import { WHITE_RADISH } from '../world/economy/radish';
import { isMonday } from './loops/Calendar';
import { Appearance } from './Appearance';
import { SaveData, randomIslandType, readSave, writeSave } from './Save';
import { dateLabel, seasonOf } from './loops/Calendar';
import { DayCycle } from './loops/DayCycle';
import { VisitSync } from './scenes/VisitSync';
import { PlayerActions } from './actions/PlayerActions';
import { Pickup } from './actions/Pickup';
import { Survival } from './actions/Survival';
import { MobCombat } from './actions/MobCombat';
import { Vehicles } from './scenes/Vehicles';
import { Challenge } from './scenes/Challenge';
import { Potions } from '../entities/projectiles/Potions';
import { BAG_GLASS, WAISTBAG_SLOT } from '../world/blocks/Block';
import { DIY_GOLD_PICKAXE } from '../world/recipes/GoldenItems';
import { spawnDrop } from '../entities/objects/drops';
import { ZOMBIE_NAMES } from '../entities/mobs/Zombie';
import { FireSystem } from '../entities/objects/Fire';
import { hurtPlayer } from '../player/stats/damage';
import { NetClient } from '../net/Client';
import { probeAuth } from '../ui/account/Auth';

export type SceneMode = 'island' | 'hall' | 'visit' | 'void' | 'arena' | 'cs'; // cs=红焰大赛的 CS 沙漠场地


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
  private slot = 0; private paused = false; private started = false; private lastTime = 0;
  private islandType: IslandType = 'apple';
  /** 场景路由 + 存档控制器（二期抽出）：场景流转与存档账本的读写都委托过去 */
  private router!: SceneRouter;
  private saves!: SaveController;
  /** 自己的 3D 形象（史蒂夫/艾力克斯）：背包里的小人和好友见到的都是它 */
  private appearance = new Appearance();
  /** 访岛时站在岛主重生点旁的岛主小人 */
  private visitAvatar = new VisitAvatar();
  /** 真·双人同屏：位置/方块互播、对面小人的渲染与收尾（会话断了自动退回快照模式） */
  private visitSync: VisitSync;
  /** 登录账号名：白萝卜价的个人种子（每个人每天的萝卜价都不一样） */
  private playerName = '';
  private pvpHitCooldown = 0; // 误伤攻击间隔（秒）
  private playerActions: PlayerActions | null = null; private pickup: Pickup | null = null;
  private survival: Survival | null = null; private combat: MobCombat | null = null;
  private fires!: FireSystem; private mobs: Mobs; private vehicles!: Vehicles;
  private challenge!: Challenge; private potions!: Potions;
  private drops: ItemDrop[] = [];
  private worldCycles = new WorldCycles(); private skates = new SkateSystem();
  private container: ContainerPanel | null = null; private dyePanel: DyePanel | null = null;
  private hallMenu: HallMenu | null = null; private visitMenu: VisitMenu | null = null;
  private givePanel: GivePanel | null = null; // 「送礼物」面板：同屏有人时按 C /「给」打开
  private chatPanel: ChatPanel | null = null; // 访岛聊天：同屏有人时按 0 /「聊」开输入框
  private book = new RecipeBook(this.atlas); private net: NetClient | null = null; private panels = new PanelStack();
  /** PC 端鼠标视角；手机版不建（用虚拟按键转视角），保持 null */
  private mouseLook: MouseLook | null = null;
  /** 手机版触屏控制（摇杆 + 视角板）；PC 不建，保持 null */
  private touch: TouchControls | null = null;
  /** 天气与换季系统（降雪/柳絮/换季换叶） */
  private weather!: SeasonWeatherSystem;
  /** 红焰大赛：极限季节挑战（进图快照背包、倒计时、刷怪、结算） */
  private arena: Arena | null = null;
  private arenaPanel: ArenaPanel | null = null;
  /** 枫叶飞刀（一次性投掷物） */
  private knife: Knife | null = null;
  /** 四季节日：礼花特效 */
  private fireworks: Fireworks | null = null;
  /** 玩法子系统（构造器里建好，ctx 全走 getter 晚绑定） */
  private trapSys!: TrapSystem;
  private summons!: SummonsSystem;
  private travelerSys!: TravelerSystem;
  /** CS 本地大赛系统（CsMatch + CS 商店 + 开枪点亮视野） */
  private csLocal!: CsLocalSystem;
  /** 联机送礼系统 */
  private gifts!: GiftsSystem;
  /** CS 联机：房间面板 + 对局（真人对战） */
  private csOnline: CsOnline | null = null;
  private csRoomPanel: CsRoomPanel | null = null;
  private csIsOnline = false;
  /** 大厅留言板 / 信箱（B / V 打开，登录后才有内容） */
  private boardPanel: BoardPanel | null = null;
  private settingsPanel: SettingsPanel | null = null;
  /** 商店经济系统（岛币/售卖机/收购箱/限量与黑市记账） */
  /** 岛币增减的转发：调用点众多，保留 Game 上的同名方法 */
  private addCoins(n: number): void { this.economy.addCoins(n); }
  private economy!: EconomySystem;
  // 岛币与记账的存取都委托给经济系统，Save/restore 路径不用改
  private get coins(): number { return this.economy.coins; }
  private set coins(v: number) { this.economy.coins = v; }
  private get shopQuota(): ShopQuota | undefined { return this.economy.quota; }
  private set shopQuota(v: ShopQuota | undefined) { this.economy.quota = v; }
  private get blackMarket(): BlackMarketState | undefined { return this.economy.blackMarket; }
  private set blackMarket(v: BlackMarketState | undefined) { this.economy.blackMarket = v; }
  // 场景与存档的读写委托给路由/存档控制器，本类与全项目的读法保持不变
  private get scene(): SceneMode { return this.router.scene; }
  private get visitIslandType(): IslandType | null { return this.router.visitIslandType; }
  private get visitOwner(): string | null { return this.router.visitOwner; }
  private get visitPerm(): VisitPerm | null { return this.router.visitPerm; }
  private get everCreative(): boolean { return this.saves.everCreative; }
  private set everCreative(v: boolean) { this.saves.everCreative = v; }
  private get islandSave(): SaveData | null { return this.saves.islandSave; }
  private set islandSave(v: SaveData | null) { this.saves.islandSave = v; }
  private get saveSlot(): number { return this.saves.slot; }
  private set saveSlot(v: number) { this.saves.slot = v; }
  private day = new DayCycle(
    () => this.hud?.showMessage('天黑了！小心血尸和星空尸出没，对着床按 M 可以睡觉', 3),
    () => { this.survival!.wakeUp(this.body!, this.spawn); this.pickup!.dropStarShard(this.spawn.x, this.spawn.y, this.spawn.z); },
    () => this.onNewDay(), // 跨天/睡醒：刷新日期，季节变了还要换叶
  );

  constructor(container: HTMLElement) {
    this.renderer = new Renderer(container);
    this.chunkMeshes = new ChunkMeshCache(this.renderer.scene, this.atlas, this.renderer.clock);
    this.weather = new SeasonWeatherSystem(this.renderer.scene, {
      world: () => this.world, sceneMode: () => this.scene, season: () => seasonOf(this.day.date),
      inventory: () => this.inventory, hud: () => this.hud,
      dropAt: (id, n, x, y, z) => this.dropAt(id, n, x, y, z),
    });
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
      // 小战士砍死了怪：暴击/秒杀的时候喊一嗓子
      (warrior, tag) => this.hud?.showMessage(
        tag ? `小战士${tag}！` : `${WARRIOR_TIER_NAMES[warrior.tier]}小战士干掉了一只怪`, 1.5,
      ),
      // 河豚扎人：掉血 + 提示
      (dmg) => {
        const r = hurtPlayer(this.health!, dmg);
        if (r.hurt) this.hud!.showMessage('河豚扎到你啦！', 0.8);
        if (r.died) this.respawn();
      },
      // 小战士打死的怪：战利品直接进主人背包（手册直接学会），装不下的掉在脚边
      (loot) => {
        const b = this.body;
        if (!b) return;
        const msg = this.pickup?.gainAll(loot, (id, rest) => this.dropAt(id, rest, b.x, b.y, b.z));
        if (msg) this.hud?.showMessage(msg, 3);
      },
    );
    this.vehicles = new Vehicles(this.renderer.scene, this.mobs);
    this.challenge = this.createChallenge();
    this.potions = new Potions(this.renderer.scene, this.mobs, (msg) => this.hud!.showMessage(msg, 1.5));
    this.fires = new FireSystem(this.renderer.scene);
    this.visitSync = new VisitSync({
      scene: this.renderer.scene,
      world: this.world,
      day: this.day,
      net: () => this.net,
      onPeerAlive: (name, role) => {
        if (role === 'guest') {
          this.visitAvatar.clear(this.renderer.scene); // 真人就位，迎客雕像下岗
          this.hud?.showMessage(`和 ${name} 见面啦！`, 2.5);
        } else {
          this.hud?.showMessage(`${name} 上岛了！`, 2.5);
        }
      },
      onPeerEnd: (reason, name, role) => {
        const label = name ?? '对方';
        if (role === 'host') {
          this.hud?.setVisitLabel('');
          this.hud?.showMessage(reason === 'left' ? `${label} 回去了` : `${label} 掉线了`, 2.5);
        } else {
          // 人走了岛还在：退回"看快照"模式，标签换成快照版免得误以为还是同屏
          this.hud?.setVisitLabel(`🏝 ${this.visitOwner ?? ''} 的岛（本人已离开）· 按 H 回大厅`);
          this.hud?.showMessage(`${label}${reason === 'left' ? '离开' : '掉线'}了，你现在看到的是他岛的快照`, 3.5);
        }
      },
    });
    // —— 玩法子系统：陷阱/护盾/香囊、召唤物、旅者（ctx 全走 getter，晚绑定到 begin() 里才赋值的字段） ——
    this.trapSys = new TrapSystem(this.atlas, {
      world: () => this.world, mobs: () => this.mobs, inventory: () => this.inventory,
      hud: () => this.hud, slot: () => this.slot,
    });
    this.summons = new SummonsSystem({
      mobs: () => this.mobs, inventory: () => this.inventory, hud: () => this.hud, slot: () => this.slot,
      freeSpot: (x, y, z) => this.survival!.freeSpot(x, y, z),
      scene: () => this.scene, spawn: () => this.spawn, saveSlot: () => this.saveSlot,
      islandSave: () => this.islandSave, setIslandSave: (s) => { this.islandSave = s; },
      saveNow: () => this.saveNow(),
    });
    this.travelerSys = new TravelerSystem(this.atlas, {
      scene: this.renderer.scene, world: () => this.world, book: this.book, coins: () => this.coins,
      addCoins: (n) => this.addCoins(n), inventory: () => this.inventory, hud: () => this.hud,
      spawn: () => this.spawn, body: () => this.body, sceneMode: () => this.scene,
      season: () => seasonOf(this.day.date), controller: this.controller,
    });
    // —— 二期：场景路由 + 存档控制器（ctx 全走 getter，晚绑定） ——
    this.saves = new SaveController({
      started: () => this.started, scene: () => this.scene, body: () => this.body,
      inventory: () => this.inventory, health: () => this.health, hunger: () => this.hunger,
      appearance: () => this.appearance, book: () => this.book, mobs: () => this.mobs,
      vehicles: () => this.vehicles, challenge: () => this.challenge, world: () => this.world,
      scene3d: () => this.renderer.scene, drops: () => this.drops, day: () => this.day,
      paused: () => this.paused, slot: () => this.slot, islandType: () => this.islandType,
      spawn: () => this.spawn, setSpawn: (p) => { this.spawn = p; }, setIslandType: (t) => { this.islandType = t; },
      coins: () => this.coins, setCoins: (v) => { this.coins = v; },
      quota: () => this.shopQuota, setQuota: (v) => { this.shopQuota = v; },
      market: () => this.blackMarket, setMarket: (v) => { this.blackMarket = v; },
      net: () => this.net,
    });
    this.router = new SceneRouter({
      world: this.world, chunkMeshes: this.chunkMeshes, scene3d: this.renderer.scene, mobs: this.mobs,
      panels: this.panels, visitSync: this.visitSync, visitAvatar: this.visitAvatar, weather: this.weather,
      body: () => this.body, hud: () => this.hud, health: () => this.health, hunger: () => this.hunger,
      inventory: () => this.inventory, survival: () => this.survival!, arena: () => this.arena,
      csLocal: () => this.csLocal, csOnline: () => this.csOnline, csRoomPanel: () => this.csRoomPanel,
      hallMenu: () => this.hallMenu, net: () => this.net,
      csIsOnline: () => this.csIsOnline, setCsIsOnline: (v) => { this.csIsOnline = v; },
      islandType: () => this.islandType, date: () => this.day.date,
      coins: () => this.coins, setCoins: (v) => { this.coins = v; }, addCoins: (n) => this.addCoins(n),
      saveNow: () => this.saveNow(), clearScene: () => this.clearScene(),
      restoreSaveState: (save) => { this.saves.restoreSaveState(save); },
      restoreBody: (save) => this.saves.restoreBodyFromSave(save),
      islandSave: () => this.islandSave, saveSlot: () => this.saveSlot,
      everCreative: () => this.everCreative, setEverCreative: (v) => { this.everCreative = v; },
      spawn: () => this.spawn, setSpawn: (p) => { this.spawn = p; },
    });
  }

  private createChallenge(): Challenge {
    return new Challenge(this.renderer.scene, this.mobs, () => {
      const text = this.book.unlockTask(DIY_GOLD_PICKAXE);
      if (text) { this.book.showPaper(text, true); this.hud?.showMessage('挑战通关！获得金稿子 DIY 手册'); }
    });
  }

  async start(): Promise<void> {
    await runMenuFlow((mode, save, zombieAttack, slot, toHall) => this.begin(mode, save, zombieAttack, slot, toHall));
    const who = await probeAuth();
    this.playerName = (who !== 'off' && who.name) ? who.name : '';
    // 老档没记过形象就按账号名固定挑一个（同一个名字每次进来都是同一个样子），随即写进档
    if (who !== 'off' && who.name && !this.appearance.characterFromSave) {
      this.appearance.set(pickCharacter(who.name));
      this.persistCharacter();
    }
    const denyMsgs: Record<string, string> = {
      offline: '对方现在不在线，等他上线再试', rejected: '对方拒绝了你的访问申请',
      creative: '验证失败：双方中有人开启过创造模式', timeout: '对方未响应，申请已超时作废',
      self: '不能申请访问自己', nosave: '对方还没有岛屿存档', noname: '没有人叫这个名字',
      gone: '对方已掉线，申请作废了',
    };
    this.net = new NetClient(who !== 'off' && who.name ? who.name : undefined, {
      onStatusChange: (status, prev) => {
        this.hud?.setNetState(status, status === 'connected' ? this.net?.getOnlineList() : []); // 断线时别再显示旧的幽灵名单
        if (status === 'connected' && this.router.consumePendingHall()) this.router.enterHall();
        if (status === 'connected' && prev === 'reconnecting') {
          this.hud?.showMessage('已重新连接服务器', 1.5);
          if (this.scene === 'hall') this.net?.joinHallQueue();
          if (this.visitSync.active) this.visitSync.onPeerEnd('offline'); // 断线时服务器已拆会话，本地跟着收摊退回快照
        } else if (status === 'reconnecting' && prev === 'connected') this.hud?.showMessage('与服务器断开，重连中…', 1.5);
      },
      onOnlineChange: (online, ev) => {
        this.hud?.setNetState(this.net!.getStatus(), online);
        if (ev?.type === 'online') this.hud?.showMessage(`${ev.name} 上线了`, 1.5);
        else if (ev?.type === 'offline') this.hud?.showMessage(`${ev.name} 下线了`, 1.5);
      },
      onHallQueue: (queue, pos) => this.hallMenu?.setQueueState(this.scene === 'hall', queue, pos),
      onHallHead: () => { if (this.scene === 'hall') { this.hud?.showMessage('轮到你啦！请选择目的地', 2.5); this.hallMenu?.open(); } },
      onHallMatched: (id, type) => { if (this.scene === 'hall') this.router.enterVisit(id, type); },
      // —— CS 联机房间 ——
      onCsRoom: (room) => { this.csOnline!.onRoom(room); this.csRoomPanel?.setRoom(room); },
      onCsError: (msg) => this.hud?.showMessage(msg, 2.5),
      onCsPhase: (phase, seconds, round) => this.csOnline!.onPhase(phase, seconds, round),
      onCsPos: (name, x, y, z, yaw) => this.csOnline!.onPos(name, x, y, z, yaw),
      onCsHit: (from, target, dmg, hp, alive) => this.csOnline!.onHit(from, target, dmg, hp, alive),
      onCsRound: (winner, scoreA, scoreB) => this.csOnline!.onRound(winner, scoreA, scoreB),
      onCsEnd: (winner) => this.csOnline!.onEnd(winner),
      onHallError: (msg) => this.hud?.showMessage(msg, 2.5),
      onVisitIncoming: (from) => { this.hud?.showMessage(`${from} 申请访问你的岛屿`, 2.5); this.visitMenu?.openRequest(from); },
      onVisitRequested: () => { this.router.clearVisitAck(); this.hud?.showMessage('对方收到了申请，等他同意…', 2.5); },
      onVisitApproved: (owner, perm, ticket, pos) => {
        this.router.clearVisitAck();
        // 批准来了但在哪都照去：在大厅正常进，回了本岛先存档再去（以前只认大厅，回本岛的批准被静默吞掉，客人永远等不到）
        if (this.scene === 'visit') return;
        if (this.scene === 'island') this.saveNow();
        void this.router.enterFriendVisit(owner, perm, ticket, pos);
      },
      onVisitGuest: (guest, perm) => this.router.onGuestArriving(guest, perm),
      onVisitPeer: (m) => this.visitSync.onPeerPos(m),
      onVisitBlocks: (cells) => this.visitSync.onRemoteBlocks(cells),
      onVisitEnd: (reason, name) => this.visitSync.onPeerEnd(reason, name),
      onVisitHit: (from) => this.gifts.onPeerHit(from),
      onVisitGive: (from, gift) => this.gifts.onPeerGive(from, gift),
      onVisitChat: (from, text) => {
        this.chatPanel?.push(from, text);
        this.hud?.showMessage(`${from} 发来消息了，按 0 回复`, 2.5);
      },
      onVisitDenied: (reason) => { this.router.clearVisitAck(); this.hud?.showMessage(denyMsgs[reason] ?? '对方拒绝/未响应', 3); },
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

  private begin(mode: GameMode, save: SaveData | undefined, zombieAttack: boolean, slot: number, toHall = false): void {
    this.fires.clear(); this.saveSlot = slot;
    this.everCreative = Boolean(mode === 'creative' || save?.everCreative || save?.mode === 'creative');
    this.appearance.load(save);
    this.mobs.zombieAttack = zombieAttack; this.mobs.zombieSpawn = zombieAttack;
    this.hunger = new Hunger(mode); this.health = new Health(mode, () => this.hunger!.respawn());
    this.health.damageBlocker = (amount) => this.trapSys.shieldBlock(amount); // 菖蒲护盾：50% 免 1 点伤害
    this.inventory = new Inventory(mode);
    this.economy = new EconomySystem(this.atlas, {
      inventory: () => this.inventory, hud: () => this.hud, slot: () => this.slot,
      container: () => this.container, appearance: () => this.appearance,
      date: () => this.day.date, playerName: () => this.playerName, saveNow: () => this.saveNow(),
    });
    this.book.bindInventory(this.inventory);
    this.book.onText = (m) => this.hud?.showMessage(m, 3, true); // 手册"只显示一行字"模式；玩家自己选的，force 过提示语开关
    this.hud = new Hud(this.health.showStats, this.atlas, this.inventory.infinite);
    this.hud.setDate(dateLabel(this.day.date)); // 新档开局先显示 7 月 8 日；读档会在下面再刷一次
    // 手机上直接点快捷栏那一格就选中它（比 ◀▶ 一格格挪快，所以触屏不再放换格子键）
    const hudRef = this.hud;
    hudRef.onSlotPick = (i) => { this.slot = i; hudRef.selectSlot(i); };
    if (this.net) this.hud.setNetState(this.net.getStatus(), this.net.getOnlineList());
    this.panel = new Panel(this.inventory, this.atlas, {
      kind: () => this.appearance.character,
      swap: () => this.swapCharacter(),
    });
    this.arenaPanel = new ArenaPanel(this.atlas, () => this.coins, () => seasonOf(this.day.date),
      (kind) => this.router.enterArena(kind), (mode) => this.router.enterCs(mode), () => this.openCsRoom());
    this.csRoomPanel = new CsRoomPanel((action, code) => this.csRoomAction(action, code));
    this.csOnline = new CsOnline(this.renderer.scene, this.world, () => this.inventory!, () => this.hud,
      () => this.net, {
        hurtPlayer: (dmg) => {
          const r = hurtPlayer(this.health!, dmg);
          if (r.hurt) this.hud?.showMessage('中弹了！', 0.6);
          if (r.died) {
            if (this.body) this.csLocal.markDown(this.body.x, this.body.z);
            this.respawn();
          }
        },
        muzzle: () => { this.csLocal.markMuzzle(); },
        onEnd: (won) => this.router.leaveCsOnline(won),
        onPhase: (phase) => this.router.onCsOnlinePhase(phase),
      });
    this.csLocal = new CsLocalSystem(this.atlas, {
      scene: this.renderer.scene, world: () => this.world, inventory: () => this.inventory,
      hud: () => this.hud, controller: this.controller, slot: () => this.slot,
      hurtPlayer: (dmg) => {
        const r = hurtPlayer(this.health!, dmg);
        if (r.hurt) this.hud?.showMessage('中弹了！', 0.6);
        if (r.died) {
          // 阵亡定点：本小局就钉在这，等下一小局复位
          if (this.body) this.csLocal.markDown(this.body.x, this.body.z);
          this.respawn();
        }
      },
      onEnd: (won) => this.router.leaveCs(won),
      revivePlayer: () => { this.health?.respawn(); this.hunger?.respawn(); },
      online: () => this.csOnline, isOnline: () => this.csIsOnline,
    });
    this.gifts = new GiftsSystem({
      hud: () => this.hud, inventory: () => this.inventory, slot: () => this.slot,
      coins: () => this.coins, addCoins: (n) => this.addCoins(n), net: () => this.net,
      visitSync: () => this.visitSync, health: () => this.health,
      onDeath: () => this.respawn(), saveNow: () => this.saveNow(),
    });
    this.fireworks = new Fireworks(this.renderer.scene);
    this.knife = new Knife(this.renderer.scene, this.mobs, (msg) => this.hud?.showMessage(msg, 1.2));
    this.arena = new Arena(this.renderer.scene, this.mobs, () => this.inventory!, () => this.hud, {
      addCoins: (n) => this.addCoins(n),
      onEnd: (result) => this.router.leaveArena(result),
    });
    this.container = new ContainerPanel(this.inventory, this.atlas);
    this.dyePanel = new DyePanel(this.inventory, (t) => this.hud!.showMessage(t));
    this.hallMenu = new HallMenu({
      onRandom: () => this.router.pickRandomIsland(),
      onFriend: (name) => this.router.pickFriendIsland(name),
      onCancel: () => { if (this.scene === 'hall') this.net?.leaveHallQueue(); },
      onlineNames: () => (this.net?.getStatus() === 'connected' ? this.net.getOnlineList() : []), // 断线时名单是幽灵，别让人点
      selfName: () => this.net?.getName() ?? '',
    });
    this.visitMenu = new VisitMenu({
      onReply: (visitor, accept, perm) => {
        if (accept && this.scene === 'island') this.saveNow();
        // 报个落地参考点：在自己岛上就报实时站位，在大厅/别人家就报存档里的位置（都是岛的坐标系）
        const pos = !accept ? undefined
          : this.scene === 'island' && this.body ? { x: this.body.x, y: this.body.y, z: this.body.z }
          : (this.islandSave ?? readSave(this.saveSlot))?.body;
        this.net?.replyVisit(visitor, accept, perm, this.everCreative || this.inventory?.mode === 'creative', pos);
      },
    });
    this.givePanel = new GivePanel({
      coins: () => this.coins,
      inventory: () => this.inventory!,
      peerName: () => this.visitSync.peer || null,
      onGive: (gift) => this.gifts.doGive(gift),
    });
    this.chatPanel = new ChatPanel({
      peerName: () => this.visitSync.peer || null,
      onSend: (text) => {
        if (!this.visitSync.active) { this.hud?.showMessage('身边没有人，说了也听不见', 2); return false; }
        return this.net?.sendVisitChat(text) ?? false;
      },
    });
    this.panels.register({ name: 'give', isOpen: () => this.givePanel!.visible, close: () => this.givePanel!.close() });
    this.panels.register({ name: 'chat', isOpen: () => this.chatPanel!.visible, close: () => this.chatPanel!.close() });
    this.panels.register({ name: 'visitRequest', isOpen: () => this.visitMenu!.requestVisible, close: () => this.visitMenu!.closeRequest() });
    this.panels.register({ name: 'visitPerm', isOpen: () => this.visitMenu!.permVisible, close: () => this.visitMenu!.closePerm() });
    this.panels.register({ name: 'hallMenu', isOpen: () => this.hallMenu!.visible, close: () => this.hallMenu!.close() });
    this.panels.register({ name: 'inventory', isOpen: () => this.panel!.visible, close: () => this.panel!.close(), keys: (c) => this.panel!.handleKeys(c, (s) => this.playerActions!.meatMagic(s)) });
    this.panels.register({ name: 'container', isOpen: () => this.container!.visible, close: () => this.container!.close(), closeKeys: ['door'], update: (dt) => { this.world.updateFurnaces(dt); this.container!.refresh(); } });
    this.panels.register({ name: 'dye', isOpen: () => this.dyePanel!.visible, close: () => this.dyePanel!.close() });
    this.panels.register({ name: 'shop', isOpen: () => this.economy.shopPanel.visible, close: () => this.economy.shopPanel.close() });
    this.panels.register({ name: 'arena', isOpen: () => this.arenaPanel!.visible, close: () => this.arenaPanel!.close(), closeKeys: ['door'] });
    this.panels.register({ name: 'trap', isOpen: () => this.trapSys.panel.visible, close: () => { this.trapSys.panel.close(); } });
    this.panels.register({ name: 'traveler', isOpen: () => this.travelerSys.panel.visible, close: () => this.travelerSys.panel.close() });
    this.panels.register({ name: 'csShop', isOpen: () => this.csLocal.shopPanel.visible, close: () => this.csLocal.shopPanel.close() });
    this.panels.register({ name: 'csRoom', isOpen: () => this.csRoomPanel!.visible, close: () => this.csRoomPanel!.close() });
    this.panels.register({ name: 'book', isOpen: () => this.book.visible, close: () => this.book.close(), closeKeys: ['book'] });
    this.boardPanel = new BoardPanel();
    this.panels.register({ name: 'board', isOpen: () => this.boardPanel!.visible, close: () => this.boardPanel!.close(), closeKeys: ['board', 'mail'] });
    this.settingsPanel = new SettingsPanel();
    this.panels.register({ name: 'settings', isOpen: () => this.settingsPanel!.visible, close: () => this.settingsPanel!.close(), closeKeys: ['settings'] });
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
      inHall: () => this.scene === 'hall',
      sceneMode: () => this.scene,
      openShop: (kind) => this.economy.openShop(kind),
      openBuyBox: () => this.economy.openBuyBox(),
      openArena: () => this.openArena(),
      openTrapPicker: (hit) => this.trapSys.openTrapPicker(hit),
      launchFirework: (x, y, z) => this.fireworks?.burst(x, y, z),
      summonWarrior: (eggId, x, y, z) => this.summons.summonWarrior(eggId, x, y, z),
      summonArcher: (bowId, x, y, z) => this.summons.summonArcher(bowId, x, y, z),
      body: () => this.body!,
    });
    this.combat = new MobCombat(this.controller, this.inventory, () => this.slot, this.hud, this.mobs,
      () => this.health!.attackMultiplier); // 丰收拼盘的 10 秒攻击 ×1.25
    // 读档会立刻按存档坐标生成区块，得先把本岛果树品种喂给地形生成器，不然家门口不长果树
    if (save?.islandType && save.islandType in ISLAND_TYPES) {
      setTerrainConfig(WORLD_SEED, false, ISLAND_TYPES[save.islandType].leafId);
    }
    if (save) {
      const r = this.saves.restoreSaveState(save);
      this.paused = r.paused; this.day.time = r.dayTime;
      this.day.setDate(r.date); // 存档里是哪天就从哪天接着过
      this.hud.setDate(dateLabel(this.day.date));
    } else {
      this.islandType = randomIslandType();
      this.book.importLearned([]); this.book.importGoldenState([], [], 0);
      const gs = randomGrassSpawn();
      this.spawn = { x: gs.x, y: heightAt(Math.floor(gs.x), Math.floor(gs.z)) + 1, z: gs.z };
    }
    // 开局定好地形参数：本岛种子 + 本岛果树/竹林/雪地规则（四季岛按规则表来）
    setTerrainConfig(WORLD_SEED, false, ISLAND_TYPES[this.islandType].leafId);
    this.router.applyIslandTerrain(this.islandType);
    this.hud.refreshHotbar(this.inventory, this.slot);
    this.hud.setCoins(this.coins);
    this.hud.setPaused(this.paused);
    this.hud.showIslandGreeting(this.islandType);
    document.getElementById('quitbtn')!.onclick = () => this.quitToMenu();
    document.getElementById('logoutbtn')!.onclick = () => this.logoutToLogin();
    this.body = createBody(this.spawn.x, this.spawn.y, this.spawn.z);
    if (save) this.saves.restoreBodyFromSave(save);
    this.body.flying = this.inventory.infinite;
    // 先定好本季的树叶贴图与蘑菇季节（蘑菇只按日期季节长：秋季长、入冬全消）
    this.weather.initSeason(this.day.date);
    this.router.streamChunks(Infinity);
    this.chunkMeshes.rebuildDirty(this.world);
    if (!save) this.mobs.spawnInitial(this.spawn.x, this.spawn.z);
    this.controller.active = true;
    if (isMobile()) {
      this.touch = new TouchControls(this.controller);
      // 生存模式下「降」是废键（descend 只在飞行时生效），不占地方
      this.touch.setFlying(this.body!.flying);
      // 僵尸攻击关了，「尸」生成开关也不能调：藏掉
      this.touch.setZombieSpawnVisible(this.mobs.zombieAttack);
    } else {
      // PC：鼠标视角。第一次必须点一下画面才锁得住（浏览器只在用户手势里允许 requestPointerLock）
      this.mouseLook = new MouseLook(this.renderer.canvas);
      this.mouseLook.onLockFail = () => this.hud?.showMessage('这次没锁上鼠标，再点一下画面试试', 3);
      this.hud?.showMessage(MOUSE.HINT, 4);
    }
    this.started = true;
    this.saveNow();
    if (toHall) this.router.enterHallWhenReady();
  }

  /** 翻到新的一天：刷新 HUD 日期；黑色售卖机换货（昨天的清空）；周一没卖的白萝卜全烂；召唤物刷新替换；季节变了才换叶；入冬把地图上的蘑菇全清掉（设定：冬季蘑菇全部消失） */
  private onNewDay(): void {
    this.hud?.setDate(dateLabel(this.day.date));
    this.economy.refreshMarketForNewDay();
    // 召唤物刷新替换（2026-10-29 设定：小战士/弓箭手一直存在，第二天原样重刷——血量回满、回到重生点）
    this.summons.refreshDaily();
    // 翻到周一：上周没卖的白萝卜全烂掉（早上烂完，今天才能买新萝卜）
    if (isMonday(this.day.date) && this.inventory) {
      const rotten = this.inventory.removeAll(WHITE_RADISH);
      if (rotten > 0) {
        this.hud?.showMessage(`新的一周到了，${rotten} 个白萝卜全烂了！`, 3.5);
        this.hud?.refreshHotbar(this.inventory, this.slot);
      }
    }
    this.weather.onNewDay(this.day.date, this.world, (w) => this.chunkMeshes.rebuildDirty(w));
  }

  /** 背包里点「人物」换一个形象：史蒂夫 ↔ 艾力克斯，换完马上写进档（在大厅/副本岛时也照写） */
  private swapCharacter(): void {
    this.appearance.swap();
    this.persistCharacter();
    this.hud?.showMessage(`换成了${CHARACTER_NAMES[this.appearance.character]}`, 1.5);
  }

  /** 只改人物形象也要落盘：在自己岛上就整档存，在大厅/副本岛就只把人物字段写回本岛存档——
   *  当前穿着的皮肤 + 包里拥有哪些皮肤一起写，两个字段永远不分开 */
  private persistCharacter(): void {
    if (this.scene === 'island') { this.saveNow(); return; }
    const save = this.islandSave ?? readSave(this.saveSlot);
    if (!save) return;
    save.character = this.appearance.character;
    save.skins = [...this.appearance.owned];
    this.islandSave = save;
    writeSave(this.saveSlot, save);
  }

  /** 清空当前世界网格与场内所有活物、掉落物、飞行药水、载具、火焰 */
  private clearScene(): void {
    this.visitSync.leave(); // 换场景=离开同屏：跟对端打完招呼再收摊
    this.givePanel?.close(); // 没人可送了，礼物面板顺手关掉
    this.playerActions?.cancelMining(); this.hud?.setProgress(0); this.highlight.visible = false;
    this.visitAvatar.clear(this.renderer.scene);
    for (const a of this.mobs.animals) this.renderer.scene.remove(a.group);
    this.mobs.animals.length = 0;
    for (const z of this.mobs.zombies) this.renderer.scene.remove(z.group);
    this.mobs.zombies.length = 0;
    for (const d of this.drops) { this.renderer.scene.remove(d.mesh); d.mesh.geometry.dispose(); (d.mesh.material as THREE.Material).dispose(); }
    this.drops.length = 0; this.potions.update(100, this.world);
    for (const t of this.vehicles.tanks) this.renderer.scene.remove(t.group);
    this.vehicles.tanks.length = 0; this.vehicles.riding = null;
    for (const w of this.mobs.warriors) this.renderer.scene.remove(w.group);
    this.mobs.warriors.length = 0;   // 小战士跟着存档走，回本岛时由 applySave 重新放出来
    for (const a of this.mobs.archers) { a.dispose(); this.renderer.scene.remove(a.group); }
    this.mobs.archers.length = 0;    // 弓箭手哨兵同样只认本岛档：换场景就收，回岛重新放出来
    for (const f of this.mobs.fish) this.renderer.scene.remove(f.group);
    this.mobs.fish.length = 0;       // 鱼不存档：回岛/串门之后海里重新刷
    this.fires.clear(); this.challenge = this.createChallenge();
    this.weather.clearParticles(); // 柳絮是场景内的粒子，换场景必须清干净
    this.trapSys.clear(); // 陷阱跟着旧世界一起作废
    this.fireworks?.clear();
    this.travelerSys.hide();
    this.csLocal.abort(); // 换场景就把比赛收掉（没在比赛里时是个空操作）
    if (this.csIsOnline) { this.csIsOnline = false; this.csOnline?.abort(); }
    this.world.clear(); this.chunkMeshes.clear();
  }

  /** 对着红焰大赛箱按 M：打开大赛面板（季节门禁与余额都在面板里显示） */
  private openArena(): void {
    if (this.arena?.active || this.csLocal.matchActive) { this.hud?.showMessage('比赛进行中，先把这场打完', 2); return; }
    this.arenaPanel?.open();
  }

  /** 打开联机房间面板（建房 / 加入） */
  private openCsRoom(): void {
    if (this.net?.getStatus() !== 'connected') { this.hud?.showMessage('没连上服务器，联机对战用不了', 2.5); return; }
    this.csRoomPanel?.open(this.net?.getName() ?? '');
    this.csRoomPanel?.setRoom(null);
  }

  /** 房间面板上的操作：建房 / 加入 / 开赛 / 退出 */
  private csRoomAction(action: CsRoomAction, code: string): void {
    const cs = this.csOnline!;
    if (action === 'create1') cs.create('1v1');
    else if (action === 'create3') cs.create('3v3');
    else if (action === 'join') {
      if (!/^\d{4}$/.test(code)) { this.hud?.showMessage('房间号是 4 位数字', 2); return; }
      cs.join(code);
    } else if (action === 'start') {
      if (this.coins < CS.FEE && !this.inventory?.infinite) { this.hud?.showMessage(`岛币不够，开赛每人 ${CS.FEE} 个`, 2.5); return; }
      cs.start();
    } else {
      cs.leave();
      this.csRoomPanel?.setRoom(null);
    }
  }

  private dropAt(id: number, n: number, x: number, y: number, z: number): void { spawnDrop({ scene: this.renderer.scene, drops: this.drops }, id, n, x, y + 0.5, z); }
  /** 存档统一走存档控制器（自动存/手动存/场景切换前存全在这条路上） */
  private saveNow(): void { this.saves.saveNow(); }
  private quitToMenu(): void { this.saveNow(); location.reload(); }
  /** 退出登录：先存档，再让服务器作废通行证，刷新回到登录界面（暂停菜单里那个低调的「退出登录」） */
  private logoutToLogin(): void { this.saveNow(); void logout().then(() => location.reload()); }
  private goHome(): void {
    if (this.challenge.active) { this.hud!.showMessage('挑战中不能回城，先完成挑战'); return; }
    const body = this.body!;
    this.survival!.wakeUp(body, this.spawn); this.vehicles.riding?.setPose(body.x, body.y, body.z, body.yaw);
    body.fellFrom = body.y; this.hud!.showMessage('嗖——回到重生点！');
    this.summons.archersGoHome(); // 弓箭手哨兵不跟传送，但会把岗位挪到重生点，自己走过去
  }
  private respawn(): void {
    // 极限挑战里死掉：算这场失败，结算后送回大厅（不走本岛的死亡重生）
    if (this.scene === 'arena') { this.arena?.onPlayerDeath(); return; }
    // CS 大赛里中弹倒下：本小局出局，等下一小局复活（不重生、不回大厅）
    if (this.scene === 'cs') {
      if (this.csIsOnline) {
        // 联机版血量由服务端管，本地只把血顶回 1 点避免每帧重复判死
        if (this.health && this.health.hp <= 0) this.health.hp = 1;
        return;
      }
      this.csLocal.match.onPlayerDeath();
      return;
    }
    // 灵魂虚空里死掉/掉下去：先被拉回自己岛（读档+保背包），再在床边/复活点重生
    if (this.scene === 'void') this.router.leaveVoid();
    const body = this.body!; this.challenge.onPlayerDeath(this.hud!);
    const wasRiding = this.vehicles.riding !== null;
    const keptRiding = wasRiding && !this.vehicles.stowOnDeath(this.inventory!);
    const p = this.survival!.freeSpot(this.spawn.x, this.spawn.y, this.spawn.z);
    body.x = p.x; body.y = p.y; body.z = p.z; body.vx = body.vy = body.vz = 0;
    body.fellFrom = body.y; body.skateFallT = 0; this.skates.reset();
    body.swayT = body.swayPhase = body.breathT = body.swampId = 0;
    this.health!.respawn();
    this.hud!.showMessage(keptRiding ? '你死了！背包满了，坦克还驮着你' : wasRiding ? '你死了！坦克收回背包了' : '你死了！已重生');
    this.summons.archersGoHome();
  }
  private renderFrame(body: PlayerBody): void {
    this.renderer.updateCamera(body.x, body.y + PLAYER.EYE, body.z, body.yaw + cameraYawSway(body.swayT, body.swayPhase), body.pitch, cameraFallRoll(body.skateFallT));
    this.renderer.render(); this.controller.endFrame();
  }
  private tick(dt: number): void {
    if (!this.started) { this.renderer.render(); return; }
    this.saves.autosave(dt);
    this.router.tickPendingHall(dt);
    if (this.controller.take('save')) { this.saveNow(); this.hud!.showMessage('进度已保存 ✓', 1); }
    const body = this.body!, health = this.health!, hud = this.hud!, panel = this.panel!;
    // 面板/暂停时必须解锁鼠标，不然指针被锁着，界面上的按钮根本点不到
    if (this.panels.busy || this.paused) { this.mouseLook?.exit(); this.touch?.cancelLook(); }
    if (this.panels.handleFrame(dt, this.controller)) { this.renderFrame(body); return; }
    if (this.controller.take('pause')) { this.paused = !this.paused; hud.setPaused(this.paused); }
    if (this.paused && this.controller.take('quit')) this.quitToMenu();
    if (!this.paused && this.controller.take('inventory')) panel.open();
    if (!this.paused && this.controller.take('book')) this.book.open();
    if (!this.paused && this.controller.take('board')) this.boardPanel?.toggle('board'); // T 大厅留言板
    if (!this.paused && this.controller.take('mail')) this.boardPanel?.toggle('mail');   // V 我的信箱
    if (!this.paused && this.controller.take('settings')) this.settingsPanel?.toggle();  // B 设置
    if (!this.paused) {
      if (this.controller.take('hall')) {
        if (this.scene === 'hall') this.router.leaveHall();
        else if (this.scene === 'void') this.router.leaveVoid(); // 虚空里按 H 也是回家
        else if (this.scene === 'arena') this.arena?.abort(); // 比赛里按 H = 放弃（不退报名费）
        else if (this.scene === 'cs') {
          this.csLocal.closeShop();
          if (this.csIsOnline) { this.csIsOnline = false; this.csOnline?.abort(); }
          else this.csLocal.abort();
          this.router.enterHall();
        }
        else this.router.enterHall();
      }
      if (this.controller.take('give')) {
        if (this.visitSync.active) this.givePanel?.open();
        else hud.showMessage('身边没有人可以收礼物', 2);
      }
      if (this.controller.take('chat')) {
        if (this.visitSync.active) this.chatPanel?.open();
        else hud.showMessage('身边没有人，说了也听不见', 2);
      }
      // 站在旅者旁边按 M 对话（系统内部先把 door 键吃掉，免得同时触发方块的"使用"）
      this.travelerSys.tryTalk();
      this.survival!.toggleHungerKey();
      if (this.controller.take('toggleZombieSpawn')) {
        if (!this.mobs.zombieAttack) {
          this.mobs.zombieSpawn = false;
          hud.showMessage('僵尸攻击关着，僵尸不会生成，开也没用');
        } else {
          this.mobs.zombieSpawn = !this.mobs.zombieSpawn;
          hud.showMessage(this.mobs.zombieSpawn ? '僵尸生成已开启' : '僵尸生成已关闭，已有僵尸不会消失');
        }
      }
      if (this.controller.take('respawn')) this.goHome();
      this.day.update(dt, this.renderer); this.worldCycles.update(dt, this.world);
      // 夜视（吃夜光蓝菇）：把世界临时提到大白天亮度，效果过后自动回到昼夜
      // 夜视（吃夜光蓝菇）与 CS 开枪都把世界临时提到大白天亮度，效果过后自动回到昼夜
      this.renderer.setDaylight(this.health!.isNightVision || this.csLocal.lightT > 0 ? 1 : this.day.daylight());
      this.world.tickSpores(dt, (x, y, z, plantId) => {
        const mushroom = PLANT_TO_MUSHROOM[plantId];
        if (mushroom) this.world.setBlock(x, y, z, mushroom);
      });
      body.driving = this.vehicles!.riding !== null; body.skating = wearingSkates(this.inventory!.armor);
      body.glassBag = this.inventory!.armor[WAISTBAG_SLOT]?.id === BAG_GLASS;
      // 视角要在算物理前加进朝向，移动方向才跟视线一致：PC 走鼠标，手机走视角板
      this.mouseLook?.applyTo(body);
      this.touch?.applyLookTo(body);
      const pev = stepPhysics(body, this.world, this.controller, dt);
      this.trapSys.updateTraps(dt, body); // 柳条陷阱：踩上就困住 3 秒，到点自毁
      // CS 大赛：阵亡后本小局只能看着（钉在原地等下一小局）
      if (this.scene === 'cs' && (this.csIsOnline ? this.csOnline!.down : this.csLocal.localDown)) {
        body.x = this.csLocal.downX; body.z = this.csLocal.downZ;
        body.vx = 0; body.vz = 0;
      }
      const skateMessage = this.skates.update(body, this.inventory!.armor, dt, pev.horizontalDistance > 0);
      if (skateMessage) hud.showMessage(skateMessage, 1.5);
      const hev = health.update(dt, body, pev.fallDistance);
      if (hev.hurt) hud.showMessage('哎呀！', 0.6);
      if (hev.died) this.respawn();
      // 春卷的 15 秒里不消耗饥饿（连同饥饿扣血一起跳过）
      const starveDmg = health.noHungerT > 0 ? 0 : this.hunger!.update(dt);
      if (starveDmg > 0) {
        const sr = hurtPlayer(health, starveDmg);
        if (sr.hurt) hud.showMessage('好饿！快吃东西！', 0.8);
        if (sr.died) this.respawn();
      }
      // 竞技场「星空的世界」：掉下台面不判死，直接把人捞回台子中央
      if (this.scene === 'arena' && this.arena?.kind === 'void' && body.y < ARENA.FLOOR_Y - ARENA.FALL_RESET) {
        body.x = VOID_ARENA_SPAWN.x; body.y = VOID_ARENA_SPAWN.y; body.z = VOID_ARENA_SPAWN.z;
        body.vx = body.vy = body.vz = 0; body.fellFrom = body.y;
        hud.showMessage('掉下去啦，被拉回台面', 1.5);
      } else if (body.y < VOID_Y) { this.respawn(); hud.showMessage('掉出世界啦！', 1.2); }
      const cp = Math.cos(body.pitch), dx = -Math.sin(body.yaw) * cp, dy = Math.sin(body.pitch), dz = -Math.cos(body.yaw) * cp;
      const mob = this.mobs.rayHit(body.x, body.y + PLAYER.EYE, body.z, dx, dy, dz, PLAYER.REACH);
      const hit = pick(this.world, body), waterHit = pickWater(this.world, body);
      const blockDist = hit ? Math.hypot(hit.x + 0.5 - body.x, hit.y + 0.5 - (body.y + PLAYER.EYE), hit.z + 0.5 - body.z) : Infinity;
      const riding = this.vehicles.riding !== null;
      this.vehicles.update(dt, this.world, body, this.controller, this.inventory!, hud,
        Math.min(blockDist, mob?.dist ?? Infinity), this.slot, () => this.hud!.refreshHotbar(this.inventory!, this.slot));
      // 手持枫叶飞刀时 P 是甩飞刀（一次性），其余情况才是扔药水
      const knifeHandled = !riding && this.knife!.handleInput(this.controller, this.inventory!, this.slot, body, hud);
      const potionHandled = knifeHandled
        || (!riding && this.potions.handleInput(this.controller, this.inventory!, this.slot, body, hud, hit, this.highlight));
      if (!potionHandled && !riding && mob && mob.dist <= blockDist) {
        this.highlight.visible = false; this.playerActions!.cancelMining(); hud.setProgress(0);
        this.combat!.update(mob, body, dt, (sheep) => this.survival!.useSheep(sheep), (animal) => this.survival!.useAnimalRope(animal));
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
      // 误伤：岛主开了开关且同屏有人时，出拳打到对面小人就发「visit.hit」（伤害由对面自己结算）
      this.pvpHitCooldown = Math.max(0, this.pvpHitCooldown - dt);
      if (this.visitPerm?.friendly && this.visitSync.active && this.pvpHitCooldown <= 0 && this.controller.isDown('mine')
        && this.visitSync.hitPeer(body.x, body.y + PLAYER.EYE, body.z, dx, dy, dz, PVP.HIT_DISTANCE)) {
        this.pvpHitCooldown = PVP.HIT_COOLDOWN;
        this.net?.sendVisitHit();
        hud.showMessage('打到对方啦！', 0.8);
      }
      this.survival!.eatKey(body); this.slot = this.survival!.hotbarKeys(this.slot);
      // 灵魂传送门穿越 + 虚空幽灵鬼补货（含传送冷却），都在路由的 voidTick 里
      this.router.voidTick(dt, body);
      if (this.scene === 'island' || this.scene === 'void' || this.scene === 'arena') {
        // 虚空里 mobs 只更新已有的怪（spawn 的地面探测在虚空全落空，不会乱刷）
        this.mobs.update(dt, body.x, body.y, body.z, this.scene === 'island' && this.day.time >= DAY.NIGHT_FROM, this.day.time);
      }
      this.potions.update(dt, this.world); this.knife!.update(dt, this.world); this.fires.update(dt);
      this.fireworks!.update(dt);
      if (this.scene === 'cs') this.csLocal.tick(dt, body);
      this.travelerSys.tick(dt);
      this.mobs.calmStars = health.isCleanse; // 春卷/甜饼的负面豁免期间星空尸不主动
      this.trapSys.pouchTick(dt, body);
      this.weather.snowTick(dt, body);
      this.weather.fluffTick(dt, body);
      this.visitAvatar.update(dt, body.x, body.z);
      this.visitSync.update(dt, body, this.appearance.character, this.day.time);
      // CS 大赛里禁止捡方块：地上的东西一律不吸（场上本来也不该有掉落物）
      if (this.scene !== 'cs') this.drops = this.pickup!.update(dt, body);
      if (this.scene === 'island') this.challenge.update(dt, body, this.inventory!, hud);
      if (this.scene === 'arena') this.arena!.update(dt, body);
      if (this.scene !== 'hall') this.router.streamChunks(2);
      this.chunkMeshes.rebuildDirty(this.world); this.world.updateFurnaces(dt);
      hud.refreshHotbar(this.inventory!, this.slot);
      hud.update(dt, health.hp, health.oxygen, this.hunger!.value);
    }
    this.renderFrame(body);
  }
}

