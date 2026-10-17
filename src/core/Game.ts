/** 游戏主循环 — 把所有模块装配起来，每帧按固定顺序驱动它们 */

import * as THREE from 'three';
import { CHUNK, DAY, HALL, ISLAND_TYPES, IslandType, MOUSE, PLAYER, SAVE, VIEW_DISTANCE, VOID_Y, VisitPerm, WORLD_SEED } from '../config';
import { World } from '../world/World';
import { buildHall } from '../world/HallMap';
import { findGrassSpawn, heightAt, randomGrassSpawn, setTerrainConfig } from '../world/TerrainGen';
import { createAtlas, Atlas } from '../render/Textures';
import { ChunkMeshCache } from '../render/ChunkMeshCache';
import { Renderer } from '../render/Renderer';
import { Controller } from '../player/Controller';
import { PlayerBody, createBody, stepPhysics } from '../player/Physics';
import { MouseLook } from '../player/MouseLook';
import { SkateSystem, wearingSkates } from '../player/Skates';
import { cameraFallRoll, cameraYawSway } from '../player/CameraEffects';
import { WorldCycles } from '../world/WorldCycles';
import { GameMode, Health } from '../player/Health';
import { Hunger } from '../player/Hunger';
import { Inventory } from '../player/Inventory';
import { pick, pickWater } from '../interact/BlockPicker';
import { runMenuFlow } from './Menus';
import { TouchControls } from '../ui/TouchControls';
import { isMobile } from '../ui/Platform';
import { Hud } from '../ui/Hud';
import { logout } from '../ui/Auth';
import { Panel } from '../ui/Panel';
import { Mobs } from '../entities/Mobs';
import { ItemDrop } from '../entities/ItemDrop';
import { CHARACTER_NAMES, CharacterKind, VisitAvatar, pickCharacter } from '../entities/Character';
import { TIER_OF_EGG, WARRIOR_TIER_NAMES } from '../entities/Warrior';
import { ContainerPanel } from '../ui/Container';
import { DyePanel } from '../ui/DyePanel';
import { RecipeBook } from '../ui/RecipeBook';
import { PanelStack } from '../ui/PanelStack';
import { HallMenu } from '../ui/HallMenu';
import { VisitMenu } from '../ui/VisitMenu';
import { ShopPanel } from '../ui/ShopPanel';
import { DRINK_GOODS, SPECIAL_GOODS, ShopGood, fmtCoins, rollGood } from '../world/Shop';
import { SaveData, applySave, buildSave, isSupportedSave, migrateSave, randomIslandType, readSave, writeSave } from './Save';
import { DayCycle } from './DayCycle';
import { PlayerActions } from './PlayerActions';
import { Pickup } from './Pickup';
import { Survival } from './Survival';
import { MobCombat } from './MobCombat';
import { Vehicles } from './Vehicles';
import { Challenge } from './Challenge';
import { Potions } from '../entities/Potions';
import { BAG_GLASS, BLOCKS, Slots, WAISTBAG_SLOT } from '../world/Block';
import { DIY_GOLD_PICKAXE } from '../world/GoldenItems';
import { spawnDrop } from '../entities/drops';
import { ZOMBIE_NAMES } from '../entities/Zombie';
import { FireSystem } from '../entities/Fire';
import { hurtPlayer } from '../player/damage';
import { NetClient } from '../net/Client';
import { probeAuth } from '../ui/Auth';

export type SceneMode = 'island' | 'hall' | 'visit';

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
  private character: CharacterKind = 'steve'; private characterFromSave = false;
  /** 访岛时站在岛主重生点旁的岛主小人 */
  private visitAvatar = new VisitAvatar();
  /** 岛币余额（大厅三台机器用；收购箱进账、售卖机扣钱） */
  private coins = 0;
  private shopPanel: ShopPanel | null = null;
  /** 收购箱的 9 个格子：东西放进去立刻折算成岛币，不跨场景保存 */
  private buyBoxSlots: Slots = Array(9).fill(null);
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
  /** PC 端鼠标视角；手机版不建（用虚拟按键转视角），保持 null */
  private mouseLook: MouseLook | null = null;
  /** 手机版触屏控制（摇杆 + 视角板）；PC 不建，保持 null */
  private touch: TouchControls | null = null;
  private pendingHall = false; private pendingHallT = 0; // 主菜单点「大厅」后等联机连上再进
  private visitSendTimer = 0; // 访岛申请"送达回执"的超时定时器（0=没在等）
  private day = new DayCycle(
    () => this.hud?.showMessage('天黑了！小心血尸和星空尸出没，对着床按 M 可以睡觉', 3),
    () => { this.survival!.wakeUp(this.body!, this.spawn); this.pickup!.dropStarShard(this.spawn.x, this.spawn.y, this.spawn.z); },
  );

  constructor(container: HTMLElement) {
    this.renderer = new Renderer(container);
    this.chunkMeshes = new ChunkMeshCache(this.renderer.scene, this.atlas, this.renderer.clock);
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
    await runMenuFlow((mode, save, zombieAttack, slot, toHall) => this.begin(mode, save, zombieAttack, slot, toHall));
    const who = await probeAuth();
    // 老档没记过形象就按账号名固定挑一个（同一个名字每次进来都是同一个样子），随即写进档
    if (who !== 'off' && who.name && !this.characterFromSave) {
      this.character = pickCharacter(who.name);
      this.characterFromSave = true;
      this.persistCharacter();
    }
    const denyMsgs: Record<string, string> = {
      offline: '对方刚好掉线了，等他上线再试', rejected: '对方拒绝了你的访问申请',
      creative: '验证失败：双方中有人开启过创造模式', timeout: '对方未响应，申请已超时作废',
      self: '不能申请访问自己', nosave: '对方还没有岛屿存档', noname: '没有人叫这个名字',
    };
    this.net = new NetClient(who !== 'off' && who.name ? who.name : undefined, {
      onStatusChange: (status, prev) => {
        this.hud?.setNetState(status, status === 'connected' ? this.net?.getOnlineList() : []); // 断线时别再显示旧的幽灵名单
        if (status === 'connected' && this.pendingHall) { this.pendingHall = false; this.enterHall(); }
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
      onVisitRequested: () => { window.clearTimeout(this.visitSendTimer); this.hud?.showMessage('对方收到了申请，等他同意…', 2.5); },
      onVisitApproved: (owner, perm, ticket) => { window.clearTimeout(this.visitSendTimer); if (this.scene === 'hall') void this.enterFriendVisit(owner, perm, ticket); },
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
    this.character = save?.character ?? 'steve';
    this.characterFromSave = Boolean(save?.character);
    this.mobs.zombieAttack = zombieAttack; this.mobs.zombieSpawn = zombieAttack;
    this.hunger = new Hunger(mode); this.health = new Health(mode, () => this.hunger!.respawn());
    this.inventory = new Inventory(mode);
    this.hud = new Hud(this.health.showStats, this.atlas, this.inventory.infinite);
    // 手机上直接点快捷栏那一格就选中它（比 ◀▶ 一格格挪快，所以触屏不再放换格子键）
    const hudRef = this.hud;
    hudRef.onSlotPick = (i) => { this.slot = i; hudRef.selectSlot(i); };
    if (this.net) this.hud.setNetState(this.net.getStatus(), this.net.getOnlineList());
    this.panel = new Panel(this.inventory, this.atlas, {
      kind: () => this.character,
      swap: () => this.swapCharacter(),
    });
    this.shopPanel = new ShopPanel(this.atlas, () => this.coins, (good) => this.buyGood(good));
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
        this.net?.replyVisit(visitor, accept, perm, this.everCreative || this.inventory?.mode === 'creative');
      },
    });
    this.panels.register({ name: 'visitRequest', isOpen: () => this.visitMenu!.requestVisible, close: () => this.visitMenu!.closeRequest() });
    this.panels.register({ name: 'visitPerm', isOpen: () => this.visitMenu!.permVisible, close: () => this.visitMenu!.closePerm() });
    this.panels.register({ name: 'hallMenu', isOpen: () => this.hallMenu!.visible, close: () => this.hallMenu!.close() });
    this.panels.register({ name: 'inventory', isOpen: () => this.panel!.visible, close: () => this.panel!.close(), keys: (c) => this.panel!.handleKeys(c, (s) => this.playerActions!.meatMagic(s)) });
    this.panels.register({ name: 'container', isOpen: () => this.container!.visible, close: () => this.container!.close(), closeKeys: ['door'], update: (dt) => { this.world.updateFurnaces(dt); this.container!.refresh(); } });
    this.panels.register({ name: 'dye', isOpen: () => this.dyePanel!.visible, close: () => this.dyePanel!.close() });
    this.panels.register({ name: 'shop', isOpen: () => this.shopPanel!.visible, close: () => this.shopPanel!.close() });
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
      openShop: (kind) => this.openShop(kind),
      openBuyBox: () => this.openBuyBox(),
      summonWarrior: (eggId, x, y, z) => this.summonWarrior(eggId, x, y, z),
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
    this.hud.setCoins(this.coins);
    this.hud.setPaused(this.paused);
    this.hud.showIslandGreeting(this.islandType);
    document.getElementById('quitbtn')!.onclick = () => this.quitToMenu();
    document.getElementById('logoutbtn')!.onclick = () => this.logoutToLogin();
    this.body = createBody(this.spawn.x, this.spawn.y, this.spawn.z);
    if (save) this.restoreBodyFromSave(save);
    this.body.flying = this.inventory.infinite;
    this.streamChunks(Infinity);
    this.chunkMeshes.rebuildDirty(this.world);
    if (!save) this.mobs.spawnInitial(this.spawn.x, this.spawn.z);
    this.controller.active = true;
    if (isMobile()) {
      this.touch = new TouchControls(this.controller);
      // 生存模式下「降」是废键（descend 只在飞行时生效），不占地方
      this.touch.setFlying(this.body!.flying);
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

  private restoreSaveState(save: SaveData) {
    const r = applySave(save, {
      inv: this.inventory!, health: this.health!, hunger: this.hunger!, world: this.world,
      scene: this.renderer.scene, animals: this.mobs.animals, zombies: this.mobs.zombies, drops: this.drops,
      tanks: this.vehicles.tanks, challenge: this.challenge, warriors: this.mobs.warriors,
    });
    this.spawn = r.spawn; this.slot = r.slot; this.islandType = r.islandType;
    this.coins = r.coins;
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

  /** 岛币增减（收购箱进账 / 售卖机扣钱）：顺手刷新 HUD 上的余额 */
  private addCoins(n: number): void {
    this.coins = Math.max(0, Math.round((this.coins + n) * 100) / 100);
    this.hud?.setCoins(this.coins);
  }

  /** 对着售卖机按 M：打开对应货架 */
  private openShop(kind: 'special' | 'drink'): void {
    this.shopPanel?.open(
      kind === 'special' ? '特殊物品售卖机' : '饮料售卖机',
      kind === 'special' ? SPECIAL_GOODS : DRINK_GOODS,
    );
  }

  /** 点「购买」：先看钱和背包够不够，够了扣钱发货（小战士蛋还要抽品质） */
  private buyGood(good: ShopGood): void {
    const inv = this.inventory!;
    if (this.coins < good.price) {
      this.hud!.showMessage(`岛币不够，还差 ${fmtCoins(good.price - this.coins)} 岛币`, 2.5);
      return;
    }
    const id = rollGood(good);
    if (!inv.hasRoom(id, 1)) {
      this.hud!.showMessage('背包满了，先腾个格子再来买', 2.5);
      return;
    }
    this.addCoins(-good.price);
    inv.add(id, 1);
    this.hud!.refreshHotbar(inv, this.slot);
    this.shopPanel?.refreshCoins();
    const name = BLOCKS[id]?.cn ?? '东西';
    this.hud!.showMessage(id === good.id ? `买到 ${name}！` : `叮——抽到了${name}！`, 2.5);
    this.saveNow();
  }

  /** 对着收购箱按 M：东西放进去立刻按价目表换成岛币 */
  private openBuyBox(): void {
    this.container!.openBuyBox(this.buyBoxSlots, (coins) => {
      this.addCoins(coins);
      this.hud!.showMessage(`卖了 ${fmtCoins(coins)} 岛币（余额 ${fmtCoins(this.coins)}）`, 2.5);
      this.saveNow();
    }, (text) => this.hud!.showMessage(text, 3));
  }

  /** 拿着小战士召唤蛋对地按 M：在指定方块上方召唤保镖，蛋消耗一个 */
  private summonWarrior(eggId: number, x: number, y: number, z: number): void {
    const tier = TIER_OF_EGG[eggId];
    if (!tier) return;
    const inv = this.inventory!;
    const spot = this.survival!.freeSpot(x + 0.5, y + 1, z + 0.5);
    this.mobs.summonWarrior(tier, spot.x, spot.y, spot.z);
    const held = inv.hotbar[this.slot];
    if (!inv.infinite && held?.id === eggId) {
      held.count--;
      if (held.count <= 0) inv.hotbar[this.slot] = null;
      this.hud!.refreshHotbar(inv, this.slot);
    }
    this.hud!.showMessage(`${WARRIOR_TIER_NAMES[tier]}小战士参战！他会跟着你，优先打正在打你的怪`, 3);
    this.saveNow();
  }

  /** 背包里点「人物」换一个形象：史蒂夫 ↔ 艾力克斯，换完马上写进档（在大厅/副本岛时也照写） */
  private swapCharacter(): void {
    this.character = this.character === 'steve' ? 'alex' : 'steve';
    this.characterFromSave = true;
    this.persistCharacter();
    this.hud?.showMessage(`换成了${CHARACTER_NAMES[this.character]}`, 1.5);
  }

  /** 只改人物形象也要落盘：在自己岛上就整档存，在大厅/副本岛就只把人物字段写回本岛存档 */
  private persistCharacter(): void {
    if (this.scene === 'island') { this.saveNow(); return; }
    const save = this.islandSave ?? readSave(this.saveSlot);
    if (!save) return;
    save.character = this.character;
    this.islandSave = save;
    writeSave(this.saveSlot, save);
  }

  /** 把当前本岛状态打包存进浏览器（在大厅/副本岛时不覆盖本岛存档） */
  private saveNow(): void {
    if (!this.started || this.scene !== 'island' || !this.body || !this.inventory || !this.health || !this.hunger) return;
    if (this.inventory.mode === 'creative') this.everCreative = true;
    this.net?.setEverCreative(this.everCreative);
    const data = buildSave({
      mode: this.inventory.mode, everCreative: this.everCreative, islandType: this.islandType, character: this.character, spawn: this.spawn, body: this.body,
      coins: this.coins,
      health: this.health, hunger: this.hunger, slot: this.slot, inv: this.inventory,
      world: this.world, animals: this.mobs.animals, zombies: this.mobs.zombies, drops: this.drops,
      tanks: this.vehicles!.tanks, challenge: this.challenge, learned: this.book.learnedIds(),
      warriors: this.mobs.warriors,
      golden: { learned: this.book.goldenLearnedIds(), tasks: this.book.goldenTaskIds(), waterUses: this.book.goldenWaterUseCount() },
      paused: this.paused, dayTime: this.day.time, zombieAttack: this.mobs.zombieAttack, zombieSpawn: this.mobs.zombieSpawn,
    });
    this.islandSave = JSON.parse(JSON.stringify(data)) as SaveData;
    writeSave(this.saveSlot, data);
  }

  /** 清空当前世界网格与场内所有活物、掉落物、飞行药水、载具、火焰 */
  private clearScene(): void {
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
    for (const f of this.mobs.fish) this.renderer.scene.remove(f.group);
    this.mobs.fish.length = 0;       // 鱼不存档：回岛/串门之后海里重新刷
    this.fires.clear(); this.challenge = this.createChallenge();
    this.world.clear(); this.chunkMeshes.clear();
  }

  /** 按 H 进大厅（从自己岛或副本岛）：①本岛先存档 → ②清空场景 → ③造大厅并传过去 → ④联机时自动入队 */
  private enterHall(): void {
    this.pendingHall = false;
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
    // 岛币跟着人走：存档里的是进大厅那一刻的余额，大厅里挣的/花的不能被读档冲掉
    const keepCoins = this.coins;
    this.withKeptInventory(() => this.restoreSaveState(save));
    this.coins = keepCoins; this.hud!.setCoins(this.coins);
    this.restoreBodyFromSave(save); this.streamChunks(Infinity); this.chunkMeshes.rebuildDirty(this.world);
    this.hud!.selectSlot(this.slot); this.hud!.refreshHotbar(this.inventory!, this.slot);
    this.hud!.showHallSwitch(false, this.islandType); this.saveNow();
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
    if (!this.paused) {
      if (this.controller.take('hall')) { if (this.scene === 'hall') this.leaveHall(); else this.enterHall(); }
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
      body.driving = this.vehicles!.riding !== null; body.skating = wearingSkates(this.inventory!.armor);
      body.glassBag = this.inventory!.armor[WAISTBAG_SLOT]?.id === BAG_GLASS;
      // 视角要在算物理前加进朝向，移动方向才跟视线一致：PC 走鼠标，手机走视角板
      this.mouseLook?.applyTo(body);
      this.touch?.applyLookTo(body);
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
      this.visitAvatar.update(dt, body.x, body.z);
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

