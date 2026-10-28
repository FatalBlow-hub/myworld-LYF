/** 游戏主循环 — 把所有模块装配起来，每帧按固定顺序驱动它们 */

import * as THREE from 'three';
import { ARENA, CS, ISLAND_RULES, CHUNK, DAY, HALL, ISLAND_TYPES, IslandType, MOUSE, PLAYER, PORTAL, PVP, SAVE, VIEW_DISTANCE, VOID_REALM, VOID_Y, VisitPerm, WORLD_SEED } from '../config';
import { World } from '../world/World';
import { buildHall } from '../world/maps/HallMap';
import { buildVoidRealm, VOID_SPAWN, voidPlatformSpot } from '../world/maps/VoidRealm';
import { SNOW_SPAWN, VOID_ARENA_SPAWN, arenaOpen, buildSnowArena, buildVoidArena } from '../world/maps/ArenaMaps';
import { Arena, ArenaKind, ArenaResult } from './scenes/Arena';
import { ArenaPanel } from '../ui/panels/ArenaPanel';
import { Knife } from '../entities/projectiles/Knife';
import { Fireworks } from '../render/fx/Fireworks';
import { CsOnline } from './scenes/CsOnline';
import { CsRoomAction, CsRoomPanel } from '../ui/panels/CsRoomPanel';
import { CS_SPAWN_ALLY, buildCsArena } from '../world/maps/CsMaps';
import { findGrassSpawn, heightAt, randomGrassSpawn, setIslandProfile, setTerrainConfig } from '../world/terrain/TerrainGen';
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
import { CsMode } from './scenes/CsMatch';
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
import { SaveData, applySave, buildSave, isSupportedSave, migrateSave, randomIslandType, readSave, writeSave } from './Save';
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
import { BAG_GLASS, SOUL_PORTAL, WAISTBAG_SLOT } from '../world/blocks/Block';
import { DIY_GOLD_PICKAXE } from '../world/recipes/GoldenItems';
import { spawnDrop } from '../entities/objects/drops';
import { ZOMBIE_NAMES, Zombie } from '../entities/mobs/Zombie';
import { FireSystem } from '../entities/objects/Fire';
import { hurtPlayer } from '../player/stats/damage';
import { NetClient } from '../net/Client';
import { probeAuth } from '../ui/account/Auth';

export type SceneMode = 'island' | 'hall' | 'visit' | 'void' | 'arena' | 'cs'; // cs=红焰大赛的 CS 沙漠场地

/** 访岛时岛主的小人站在重生点前面多少格（太近会怼脸，太远看不清是谁） */
const VISIT_AVATAR_DIST = 3.2;

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
  /** 自己的 3D 形象（史蒂夫/艾力克斯）：背包里的小人和好友见到的都是它 */
  private appearance = new Appearance();
  /** 访岛时站在岛主重生点旁的岛主小人 */
  private visitAvatar = new VisitAvatar();
  /** 真·双人同屏：位置/方块互播、对面小人的渲染与收尾（会话断了自动退回快照模式） */
  private visitSync: VisitSync;
  /** 登录账号名：白萝卜价的个人种子（每个人每天的萝卜价都不一样） */
  private playerName = '';
  private visitIslandType: IslandType | null = null; private visitOwner: string | null = null; private visitPerm: VisitPerm | null = null;
  private pvpHitCooldown = 0; // 误伤攻击间隔（秒）
  private scene: SceneMode = 'island'; // 场景四态：island(自己岛) / hall(大厅) / visit(副本岛) / void(灵魂虚空)
  private portalCd = 0;   // 传送冷却：刚穿过门出来那几秒不会再被吸回去
  private voidGhostT = 0; // 灵魂虚空补幽灵鬼的倒计时
  private islandSave: SaveData | null = null;
  private playerActions: PlayerActions | null = null; private pickup: Pickup | null = null;
  private survival: Survival | null = null; private combat: MobCombat | null = null;
  private fires!: FireSystem; private mobs: Mobs; private vehicles!: Vehicles;
  private challenge!: Challenge; private potions!: Potions;
  private drops: ItemDrop[] = []; private saveTimer = SAVE.EVERY;
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
  private pendingHall = false; private pendingHallT = 0; // 主菜单点「大厅」后等联机连上再进
  private visitSendTimer = 0; // 访岛申请"送达回执"的超时定时器（0=没在等）
  /** 天气与换季系统（降雪/柳絮/换季换叶） */
  private weather!: SeasonWeatherSystem;
  /** 红焰大赛：极限季节挑战（进图快照背包、倒计时、刷怪、结算） */
  private arena: Arena | null = null;
  private arenaPanel: ArenaPanel | null = null;
  /** 进竞技场前饥饿开关是什么状态，出来要还原 */
  private hungerWasOn = false;
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
        if (status === 'connected' && this.pendingHall) { this.pendingHall = false; this.enterHall(); }
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
      onHallMatched: (id, type) => { if (this.scene === 'hall') this.enterVisit(id, type); },
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
      onVisitRequested: () => { window.clearTimeout(this.visitSendTimer); this.hud?.showMessage('对方收到了申请，等他同意…', 2.5); },
      onVisitApproved: (owner, perm, ticket, pos) => {
        window.clearTimeout(this.visitSendTimer);
        // 批准来了但在哪都照去：在大厅正常进，回了本岛先存档再去（以前只认大厅，回本岛的批准被静默吞掉，客人永远等不到）
        if (this.scene === 'visit') return;
        if (this.scene === 'island') this.saveNow();
        void this.enterFriendVisit(owner, perm, ticket, pos);
      },
      onVisitGuest: (guest, perm) => this.onGuestArriving(guest, perm),
      onVisitPeer: (m) => this.visitSync.onPeerPos(m),
      onVisitBlocks: (cells) => this.visitSync.onRemoteBlocks(cells),
      onVisitEnd: (reason, name) => this.visitSync.onPeerEnd(reason, name),
      onVisitHit: (from) => this.gifts.onPeerHit(from),
      onVisitGive: (from, gift) => this.gifts.onPeerGive(from, gift),
      onVisitChat: (from, text) => {
        this.chatPanel?.push(from, text);
        this.hud?.showMessage(`${from} 发来消息了，按 0 回复`, 2.5);
      },
      onVisitDenied: (reason) => { window.clearTimeout(this.visitSendTimer); this.hud?.showMessage(denyMsgs[reason] ?? '对方拒绝/未响应', 3); },
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
      (kind) => this.enterArena(kind), (mode) => this.enterCs(mode), () => this.openCsRoom());
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
        onEnd: (won) => this.leaveCsOnline(won),
        onPhase: (phase) => this.onCsOnlinePhase(phase),
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
      onEnd: (won) => this.leaveCs(won),
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
      onEnd: (result) => this.leaveArena(result),
    });
    this.container = new ContainerPanel(this.inventory, this.atlas);
    this.dyePanel = new DyePanel(this.inventory, (t) => this.hud!.showMessage(t));
    this.hallMenu = new HallMenu({
      onRandom: () => this.pickRandomIsland(),
      onFriend: (name) => this.pickFriendIsland(name),
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
      const r = this.restoreSaveState(save);
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
    this.applyIslandTerrain();
    this.hud.refreshHotbar(this.inventory, this.slot);
    this.hud.setCoins(this.coins);
    this.hud.setPaused(this.paused);
    this.hud.showIslandGreeting(this.islandType);
    document.getElementById('quitbtn')!.onclick = () => this.quitToMenu();
    document.getElementById('logoutbtn')!.onclick = () => this.logoutToLogin();
    this.body = createBody(this.spawn.x, this.spawn.y, this.spawn.z);
    if (save) this.restoreBodyFromSave(save);
    this.body.flying = this.inventory.infinite;
    // 先定好本季的树叶贴图与蘑菇季节（蘑菇只按日期季节长：秋季长、入冬全消）
    this.weather.initSeason(this.day.date);
    this.streamChunks(Infinity);
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
    if (toHall) this.enterHallWhenReady();
  }

  /** 主菜单「大厅」按钮：联机已连就直接进，没连上等它连上（最多 8 秒，超时留在岛上） */
  private enterHallWhenReady(): void {
    if (this.net?.getStatus() === 'connected') { this.enterHall(); return; }
    this.pendingHall = true; this.pendingHallT = 8;
    this.hud?.showMessage('正在连接服务器，连上就去大厅…', 3);
  }

  /** 按岛型给地形生成器喂参数（规则见 config 的 ISLAND_RULES / 玩家 2026-10-20 定稿的生成规则）：
   *  每个品种岛只长自己那一种树（苹果岛永远只有苹果树），竹林/雪地/蘑菇都在生成时定死，
   *  **不随玩家日期变化**。默认按自家岛型来；串门时传对方的岛型——只影响地形，不碰存档里的 islandType。 */
  private applyIslandTerrain(type: IslandType = this.islandType): void {
    const rules = ISLAND_RULES[type as keyof typeof ISLAND_RULES];
    const leaf = ISLAND_TYPES[type]?.leafId ?? 0;
    setIslandProfile({
      trees: leaf ? [leaf] : [],
      bamboo: rules?.bamboo ?? false,
      snowOnly: rules?.snowOnly,
    });
    this.weather.setWinterIsland(type === 'winter'); // 冬季岛常年下雪，不受日历季节限制
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

  private restoreSaveState(save: SaveData) {
    const r = applySave(save, {
      inv: this.inventory!, health: this.health!, hunger: this.hunger!, world: this.world,
      scene: this.renderer.scene, animals: this.mobs.animals, zombies: this.mobs.zombies, drops: this.drops,
      tanks: this.vehicles.tanks, challenge: this.challenge, warriors: this.mobs.warriors, archers: this.mobs.archers,
    });
    this.spawn = r.spawn; this.slot = r.slot; this.islandType = r.islandType;
    this.coins = r.coins;
    this.shopQuota = r.shopQuota;
    this.blackMarket = r.blackMarket;
    this.everCreative = this.everCreative || r.everCreative || this.inventory!.mode === 'creative';
    this.mobs.zombieSpawn = r.zombieSpawn && this.mobs.zombieAttack; // 攻击关着的存档不许带着僵尸生成回来
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

  /** 把当前本岛状态打包存进浏览器（在大厅/副本岛时不覆盖本岛地形，只把随身收获并回存档） */
  private saveNow(): void {
    if (!this.started || !this.body || !this.inventory || !this.health || !this.hunger) return;
    if (this.scene === 'arena' || this.scene === 'cs') return; // 比赛里背包是空的，存档会把真档冲掉：这场不算，直接跳过
    if (this.scene !== 'island') { this.saveCarryOnly(); return; }
    if (this.inventory.mode === 'creative') this.everCreative = true;
    this.net?.setEverCreative(this.everCreative);
    const data = buildSave({
      mode: this.inventory.mode, everCreative: this.everCreative, islandType: this.islandType, character: this.appearance.character, skins: this.appearance.owned, spawn: this.spawn, body: this.body,
      coins: this.coins,
      health: this.health, hunger: this.hunger, slot: this.slot, inv: this.inventory,
      world: this.world, animals: this.mobs.animals, zombies: this.mobs.zombies, drops: this.drops,
      tanks: this.vehicles!.tanks, challenge: this.challenge, learned: this.book.learnedIds(),
      warriors: this.mobs.warriors, archers: this.mobs.archers,
      golden: { learned: this.book.goldenLearnedIds(), tasks: this.book.goldenTaskIds(), waterUses: this.book.goldenWaterUseCount() },
      paused: this.paused, dayTime: this.day.time, date: this.day.date,
      shopQuota: this.shopQuota,
      blackMarket: this.blackMarket,
      zombieAttack: this.mobs.zombieAttack, zombieSpawn: this.mobs.zombieSpawn,
    });
    this.islandSave = JSON.parse(JSON.stringify(data)) as SaveData;
    writeSave(this.saveSlot, data);
  }

  /** 在大厅/外岛时的轻量存档：不动本岛的地形和房子，只把随身背包、岛币、血条饿条并回本岛存档——
   *  不然在外岛摘的桃子、挣的岛币，一刷新页面或退出登录就全没了 */
  private saveCarryOnly(): void {
    const save = readSave(this.saveSlot) ?? this.islandSave;
    if (!save) return;
    const inv = this.inventory!;
    const clone = (s: typeof inv.hotbar) => s.map((x) => (x ? { ...x } : null));
    save.inv = {
      hotbar: clone(inv.hotbar), storage: clone(inv.storage), armor: clone(inv.armor),
      waistbag: clone(inv.waistbag), craftIn: clone(inv.craftIn), craftBig: clone(inv.craftBig),
      held: inv.held ? { ...inv.held } : null,
    };
    save.coins = this.coins;
    save.hp = this.health!.hp; save.oxygen = this.health!.oxygen;
    save.hunger = this.hunger!.value; save.hungerOn = this.hunger!.enabled;
    save.slot = this.slot; save.mode = inv.mode;
    save.everCreative = this.everCreative || inv.mode === 'creative';
    save.character = this.appearance.character; save.skins = [...this.appearance.owned];
    // 商店记账也跟着随身走：不然在大厅买的限量货/黑色售卖机买的货，一换场景记录就丢了（能重复买）
    save.shopQuota = this.shopQuota;
    save.blackMarket = this.blackMarket;
    this.islandSave = JSON.parse(JSON.stringify(save)) as SaveData;
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

  /** 按 H 进大厅（从自己岛或副本岛）：①本岛先存档 → ②清空场景 → ③造大厅并传过去 → ④联机时自动入队 */
  private enterHall(): void {
    this.pendingHall = false;
    if (this.scene === 'island') this.saveNow();
    this.panels.closeAll(); this.clearScene();
    setTerrainConfig(WORLD_SEED, false, ISLAND_TYPES[this.islandType].leafId);
    buildHall(this.world); this.chunkMeshes.rebuildDirty(this.world);
    this.scene = 'hall'; this.visitIslandType = null; this.visitOwner = null; this.visitPerm = null; this.spawn = { ...HALL.SPAWN };
    this.hud!.setVisitOwner(null);
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
    this.clearScene(); setTerrainConfig(WORLD_SEED, false, ISLAND_TYPES[this.islandType].leafId);
    this.applyIslandTerrain(); // 回自己岛：果树/竹林/雪地规则跟着自家岛走
    this.scene = 'island'; this.visitIslandType = null; this.visitOwner = null; this.visitPerm = null;
    this.hud!.setVisitOwner(null);
    // 岛币跟着人走：存档里的是进大厅那一刻的余额，大厅里挣的/花的不能被读档冲掉
    const keepCoins = this.coins;
    this.withKeptInventory(() => this.restoreSaveState(save));
    this.coins = keepCoins; this.hud!.setCoins(this.coins);
    this.restoreBodyFromSave(save); this.streamChunks(Infinity); this.chunkMeshes.rebuildDirty(this.world);
    this.hud!.selectSlot(this.slot); this.hud!.refreshHotbar(this.inventory!, this.slot);
    this.hud!.showHallSwitch(false, this.islandType); this.saveNow();
  }

  /** 走进灵魂蓝传送门：本岛先存档（传送门方块跟着档走）→ 清空场景 → 造 9×9 虚空平台 → 落到平台上 */
  private enterVoid(): void {
    if (this.scene === 'island') this.saveNow();
    this.panels.closeAll(); this.clearScene();
    setTerrainConfig(WORLD_SEED, false, ISLAND_TYPES[this.islandType].leafId);
    buildVoidRealm(this.world); this.chunkMeshes.rebuildDirty(this.world);
    this.scene = 'void'; this.spawn = { x: VOID_SPAWN.x, y: VOID_SPAWN.y, z: VOID_SPAWN.z };
    const body = this.body!;
    body.x = this.spawn.x; body.y = this.spawn.y; body.z = this.spawn.z;
    body.vx = body.vy = body.vz = 0; body.fellFrom = body.y;
    this.portalCd = PORTAL.COOLDOWN; this.voidGhostT = 0;
    this.hud!.showMessage('来到了灵魂虚空！脚下是 9×9 的小平台，小心幽灵鬼，别掉下去', 4);
  }

  /** 对着红焰大赛箱按 M：打开大赛面板（季节门禁与余额都在面板里显示） */
  private openArena(): void {
    if (this.arena?.active || this.csLocal.matchActive) { this.hud?.showMessage('比赛进行中，先把这场打完', 2); return; }
    this.arenaPanel?.open();
  }

  /** 报名 CS 大赛：整套只交一次 2 岛币 → 建沙漠图 → 快照并清空背包 → 开打 */
  private enterCs(mode: CsMode): void {
    const inv = this.inventory, hud = this.hud;
    if (!inv || !hud || !this.body || !this.health) return;
    if (this.coins < CS.FEE && !inv.infinite) { hud.showMessage(`岛币不够，报名要 ${CS.FEE} 个`, 2.5); return; }
    if (this.scene === 'island') this.saveNow(); // 先存本岛：比赛里不存档
    if (!inv.infinite) this.addCoins(-CS.FEE);
    this.panels.closeAll(); this.clearScene();
    setTerrainConfig(WORLD_SEED, false, ISLAND_TYPES[this.islandType].leafId);
    buildCsArena(this.world);
    this.chunkMeshes.rebuildDirty(this.world);
    this.scene = 'cs';
    this.csLocal.beginMatch(mode);
    const body = this.body;
    body.x = CS_SPAWN_ALLY.x; body.y = CS_SPAWN_ALLY.y; body.z = CS_SPAWN_ALLY.z;
    body.vx = body.vy = body.vz = 0; body.fellFrom = body.y;
    this.health.respawn();   // 开局全员满血
    this.hunger?.respawn();
    hud.refreshHotbar(inv, this.slot);
    hud.showMessage(`CS 大赛开始！${mode === '3v3' ? '3V3' : '1V1'} 五局三胜，准备阶段按 M 开商店`, 4);
  }

  /** CS 赛事结束：清掉比赛物品、还原背包，赢了整套发 10 岛币，然后回大厅 */
  private leaveCs(won: boolean): void {
    this.health?.respawn();
    this.hunger?.respawn();
    if (won) this.addCoins(CS.REWARD);
    this.enterHall();
    this.hud?.showMessage(won ? `整套打赢了！奖励 ${CS.REWARD} 岛币，比赛物品已清空` : '整套打输了，比赛物品已清空', 4);
    this.hud?.refreshHotbar(this.inventory!, this.slot);
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

  /** 联机对战进图（服务端说"准备"了才进）：扣报名费 → 建沙漠图 → 清包发枪 */
  private enterOnlineCs(): void {
    const inv = this.inventory, hud = this.hud;
    if (!inv || !hud || !this.body || !this.health) return;
    if (this.coins < CS.FEE && !inv.infinite) {
      this.csOnline?.leave();
      hud.showMessage(`岛币不够，开赛要 ${CS.FEE} 个，已退出房间`, 3);
      return;
    }
    if (this.scene === 'island') this.saveNow();
    if (!inv.infinite) this.addCoins(-CS.FEE);
    this.panels.closeAll(); this.clearScene();
    setTerrainConfig(WORLD_SEED, false, ISLAND_TYPES[this.islandType].leafId);
    buildCsArena(this.world);
    this.chunkMeshes.rebuildDirty(this.world);
    this.scene = 'cs';
    this.csIsOnline = true;
    this.csOnline!.begin();
    this.csOnline!.respawnAt(this.body);
    this.health.respawn();
    this.hunger?.respawn();
    hud.refreshHotbar(inv, this.slot);
    hud.showMessage('联机 CS 开赛！沙漠图，五局三胜', 4);
  }

  /** 联机阶段变化：准备阶段进图或复活 */
  private onCsOnlinePhase(phase: string): void {
    if (phase !== 'prep') return;
    if (this.scene !== 'cs') { this.enterOnlineCs(); return; }
    // 已经在图里：下一小局复活并回到自己队的出生点
    this.health?.respawn();
    this.hunger?.respawn();
    if (this.body) this.csOnline!.respawnAt(this.body);
  }

  /** 联机整套结束：赢了发 10 岛币，回大厅 */
  private leaveCsOnline(won: boolean): void {
    this.csIsOnline = false;
    this.health?.respawn();
    this.hunger?.respawn();
    if (won) this.addCoins(CS.REWARD);
    this.enterHall();
    this.hud?.showMessage(won ? `整套打赢了！奖励 ${CS.REWARD} 岛币` : '整套打输了，比赛物品已清空', 4);
    this.hud?.refreshHotbar(this.inventory!, this.slot);
  }


  /** 报名进极限季节挑战：扣 2 岛币 → 建图 → 快照并清空背包 → 血量置 1 → 开表 */
  private enterArena(kind: ArenaKind): void {
    const inv = this.inventory, hud = this.hud, health = this.health, hunger = this.hunger;
    if (!inv || !hud || !health || !hunger || !this.body) return;
    if (!arenaOpen(kind, seasonOf(this.day.date))) { hud.showMessage('这个季节不开放这项挑战', 2.5); return; }
    if (!inv.infinite && this.coins < ARENA.FEE) { hud.showMessage(`岛币不够，报名要 ${ARENA.FEE} 个`, 2.5); return; }
    if (this.scene === 'island') this.saveNow(); // 先存本岛：比赛里不存档，出来照旧读这份
    if (!inv.infinite) this.addCoins(-ARENA.FEE);
    this.panels.closeAll(); this.clearScene();
    setTerrainConfig(WORLD_SEED, false, ISLAND_TYPES[this.islandType].leafId);
    if (kind === 'snow') buildSnowArena(this.world); else buildVoidArena(this.world);
    this.chunkMeshes.rebuildDirty(this.world);
    this.scene = 'arena';
    this.arena!.begin(kind);
    const spot = kind === 'snow' ? SNOW_SPAWN : VOID_ARENA_SPAWN;
    const body = this.body;
    body.x = spot.x; body.y = spot.y; body.z = spot.z;
    body.vx = body.vy = body.vz = 0; body.fellFrom = body.y;
    health.hp = 1;                 // 开局只剩 1 点血，靠吃东西回血
    this.hungerWasOn = hunger.enabled;
    hunger.enabled = false;        // 比赛里不消耗饥饿，免得饿死
    hud.refreshHotbar(inv, this.slot);
    hud.showMessage(kind === 'snow'
      ? '冰天雪地挑战开始！撑满 120 秒就赢，死了报名费不退'
      : '星空的世界挑战开始！掉下去会被拉回台面，撑满 120 秒就赢', 4);
  }

  /** 极限挑战结算（赢/死/放弃）：恢复血量饥饿 → 回大厅（背包已由 Arena 还原） */
  private leaveArena(result: ArenaResult): void {
    this.hud?.setArenaTimer(null);
    this.health?.respawn();
    if (this.hunger) { this.hunger.respawn(); this.hunger.enabled = this.hungerWasOn; }
    const text = result === 'win'
      ? `撑满 ${ARENA.SECONDS} 秒！奖励 ${ARENA.REWARD} 岛币已到账`
      : result === 'lose' ? '挑战失败：报名费不退，背包原样还给你' : '放弃挑战：报名费不退，背包原样还给你';
    this.enterHall();            // 比赛场地不留人，直接送回大厅
    this.hud?.showMessage(text, 4);
    this.hud?.refreshHotbar(this.inventory!, this.slot);
  }

  /** 从灵魂虚空回本岛：直接走大厅那套「读档+保背包」的回程，回来人还站在本岛传送门里（有传送冷却不怕被吸回去） */
  private leaveVoid(): void {
    this.leaveHall();
    this.portalCd = PORTAL.COOLDOWN;
  }

  /** 队首点击「随机去陌生岛屿」：查岛币 ≥ 5，不够提示并重排队尾，够则扣岛币并发 hall.random */
  private pickRandomIsland(): void {
    const inv = this.inventory!, hud = this.hud!;
    if (!inv.infinite && this.coins < HALL.RANDOM_COIN_COST) {
      hud.showMessage(`岛币不够（要 ${HALL.RANDOM_COIN_COST} 个），回到队尾`, 2.5);
      this.net?.leaveHallQueue(); this.net?.joinHallQueue();
      return;
    }
    if (!inv.infinite) this.addCoins(-HALL.RANDOM_COIN_COST);
    this.net?.requestRandomIsland();
  }

  /** 收到 hall.matched：按 islandId 固定种子生成无沙漠/无雪地、无怪无动物的副本岛 */
  private enterVisit(islandId: number, islandType: IslandType): void {
    this.panels.closeAll(); this.hallMenu?.setQueueState(false, [], 0);
    this.clearScene(); setTerrainConfig(islandId, true, ISLAND_TYPES[islandType].leafId);
    this.applyIslandTerrain(islandType); // 随机串门到四季岛/香蕉岛：按那边的岛型生成
    this.scene = 'visit'; this.visitIslandType = islandType; this.visitOwner = null; this.visitPerm = null;
    this.hud!.setVisitOwner('随机岛'); // 随机串门也挂个牌子，免得以为还在自己家
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
    // 不看 status 看真实 socket：连接可能刚断还没切到 reconnecting，那时申请会被静默吞掉
    if (!this.net?.isOpen()) {
      this.hud!.showMessage('连接断开了，正在重连，等连上再试', 3);
      this.net?.readyHallQueue(); // 顺手探一下队首状态，重连后菜单会再弹
      return;
    }
    if (this.inventory?.mode === 'creative') this.everCreative = true;
    if (this.net.requestVisit(friendName, this.everCreative)) {
      this.hud!.showMessage(`已向 ${friendName} 发送访岛申请，等待对方回应…`, 3);
      // 8 秒内没等到服务器回执 = 申请多半丢进"死管"了（手机切后台后 readyState 还装 OPEN），自动重连治它
      window.clearTimeout(this.visitSendTimer);
      this.visitSendTimer = window.setTimeout(() => {
        this.hud!.showMessage('申请好像没送到，连接断了，已帮你重连，请再点一次', 3.5);
        this.net?.forceReconnect();
      }, HALL.VISIT_ACK_MS);
    } else {
      this.hud!.showMessage('申请没发出去，请重试', 2.5);
    }
  }

  /** 同屏·岛主侧：我批准的客人正在路上——人得在自己岛上才能迎客，不在就先回去 */
  private onGuestArriving(guest: string, perm?: VisitPerm): void {
    if (this.scene !== 'island') this.leaveHall();
    if (perm) this.visitPerm = perm; // 岛主也记一份权限：误伤/放置判定两边都用它
    this.visitSync.start('host', guest);
    this.hud!.setVisitLabel(`🏠 ${guest} 在你家做客 · 按 H 回大厅`);
    this.hud!.showMessage(`${guest} 来参观你的岛啦！`, 3);
  }

  /** 收到 visit.approved：凭一次性票据拉取好友存档并作为临时副本加载（不写回岛主存档），同时接通同屏会话 */
  private async enterFriendVisit(owner: string, perm: VisitPerm, ticket?: string, pos?: { x: number; y: number; z: number }): Promise<void> {
    try {
      const qs = new URLSearchParams({ name: owner });
      if (ticket) qs.set('ticket', ticket);
      const r = await fetch(`/api/visit/world?${qs.toString()}`);
      if (!r.ok) { this.hud!.showMessage('拉取好友岛屿失败（可能未存过档或票据过期）', 3); return; }
      const raw = (await r.json()) as SaveData;
      if (!isSupportedSave(raw)) { this.hud!.showMessage('好友存档版本不支持', 3); return; }
      const friendSave = migrateSave(raw);
      this.panels.closeAll(); this.hallMenu?.setQueueState(false, [], 0);
      this.clearScene();
      const ownerIslandType = friendSave.islandType && friendSave.islandType in ISLAND_TYPES ? friendSave.islandType : 'summer';
      setTerrainConfig(WORLD_SEED, false, ISLAND_TYPES[ownerIslandType].leafId);
      this.applyIslandTerrain(ownerIslandType); // 好友家的岛型只影响地形，不写进自家存档
      this.scene = 'visit'; this.visitOwner = owner; this.visitPerm = perm; this.visitIslandType = ownerIslandType;
      this.hud!.setVisitOwner(owner);
      this.world.applyDiffs(friendSave.chunks); this.world.applyMeta(friendSave.meta);
      for (const [k, v] of Object.entries(friendSave.chests ?? {})) this.world.chests.set(k, v);
      for (const [k, v] of Object.entries(friendSave.furnaces ?? {})) this.world.furnaces.set(k, v);
      this.spawn = { ...friendSave.spawn };
      const body = this.body!;
      // 岛主报了站位就落在他旁边（开门就见朋友），没报还是落重生点
      const land = pos ? this.survival!.freeSpot(pos.x, pos.y, pos.z) : this.spawn;
      body.x = land.x; body.y = land.y; body.z = land.z;
      body.vx = body.vy = body.vz = 0; body.fellFrom = body.y;
      this.visitSync.start('guest', owner); // 同屏会话接通：之后位置/方块改动自动互播
      this.streamChunks(Infinity); this.chunkMeshes.rebuildDirty(this.world);
      // 岛主的 3D 小人站在重生点前面几格（按他上次的朝向反推，脚踩在那格地面上），
      // 访客落在重生点上、转身正对着他，一进岛就是「见面」这一幕
      const kind = friendSave.character ?? pickCharacter(owner);
      const ownerYaw = friendSave.body?.yaw ?? 0;
      const ax = this.spawn.x + Math.sin(ownerYaw) * VISIT_AVATAR_DIST;
      const az = this.spawn.z + Math.cos(ownerYaw) * VISIT_AVATAR_DIST;
      const stand = this.visitAvatar.place({
        scene: this.renderer.scene, kind, name: owner,
        at: { x: ax, y: heightAt(Math.floor(ax), Math.floor(az)) + 0.05, z: az },  // heightAt 就是地面高度，+0.05 防共面闪烁
        freeSpot: (x, y, z) => this.survival!.freeSpot(x, y, z),
        lookAt: body,
      });
      body.yaw = Math.atan2(-(stand.x - body.x), -(stand.z - body.z));
      body.pitch = 0;
      this.hud!.showMessage(`见到了 ${owner}（${CHARACTER_NAMES[kind]}）！按 H 回大厅`, 4);
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
    if (this.scene === 'void') this.leaveVoid();
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
    this.saveTimer -= dt;
    if (this.saveTimer <= 0) { this.saveTimer = SAVE.EVERY; this.saveNow(); }
    if (this.pendingHall && (this.pendingHallT -= dt) <= 0) {
      this.pendingHall = false;
      this.hud?.showMessage('连不上服务器，先在自己岛上玩吧，随时可按 H 再试', 3);
    }
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
        if (this.scene === 'hall') this.leaveHall();
        else if (this.scene === 'void') this.leaveVoid(); // 虚空里按 H 也是回家
        else if (this.scene === 'arena') this.arena?.abort(); // 比赛里按 H = 放弃（不退报名费）
        else if (this.scene === 'cs') {
          this.csLocal.closeShop();
          if (this.csIsOnline) { this.csIsOnline = false; this.csOnline?.abort(); }
          else this.csLocal.abort();
          this.enterHall();
        }
        else this.enterHall();
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
      // 灵魂传送门：脚（或腰）所在的格子是传送门方块就穿过去；传送冷却防止刚落地又被吸回去
      this.portalCd = Math.max(0, this.portalCd - dt);
      if (this.portalCd <= 0) {
        const bx = Math.floor(body.x), by = Math.floor(body.y), bz = Math.floor(body.z);
        if (this.world.getBlock(bx, by, bz) === SOUL_PORTAL || this.world.getBlock(bx, by + 1, bz) === SOUL_PORTAL) {
          if (this.scene === 'island') this.enterVoid();
          else if (this.scene === 'void') this.leaveVoid();
        }
      }
      // 灵魂虚空：定时补幽灵鬼到平台上；掉出平台的幽灵悄悄消失（不掉东西，反正也捡不到）
      if (this.scene === 'void') {
        for (const z of this.mobs.zombies) {
          if (z.y < VOID_REALM.GHOST_FALL_Y) { z.dead = true; z.silent = true; }
        }
        this.voidGhostT -= dt;
        // 幽灵鬼是虚空特产，不受僵尸生成开关管：就算关了「生成僵尸」，这里也照样刷
        if (this.voidGhostT <= 0 && this.mobs.zombies.filter((z) => z.kind === 'ghost').length < VOID_REALM.GHOST_MAX) {
          this.voidGhostT = VOID_REALM.GHOST_EVERY;
          const s = voidPlatformSpot();
          const g = new Zombie(s.x, s.y, s.z, 'ghost');
          this.renderer.scene.add(g.group);
          this.mobs.zombies.push(g);
        }
      }
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
      if (this.scene !== 'hall') this.streamChunks(2);
      this.chunkMeshes.rebuildDirty(this.world); this.world.updateFurnaces(dt);
      hud.refreshHotbar(this.inventory!, this.slot);
      hud.update(dt, health.hp, health.oxygen, this.hunger!.value);
    }
    this.renderFrame(body);
  }
}

