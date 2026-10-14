/** 游戏主循环 — 把所有模块装配起来，每帧按固定顺序驱动它们 */

import * as THREE from 'three';
import { CHUNK, DAY, PLAYER, SAVE, VIEW_DISTANCE, VOID_Y } from '../config';
import { World } from '../world/World';
import { heightAt, randomGrassSpawn } from '../world/TerrainGen';
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
import { SaveData, applySave, buildSave, writeSave } from './Save';
import { DayCycle } from './DayCycle';
import { PlayerActions } from './PlayerActions';
import { Pickup } from './Pickup';
import { Survival } from './Survival';
import { MobCombat } from './MobCombat';
import { Vehicles } from './Vehicles';
import { Challenge } from './Challenge';
import { Potions } from '../entities/Potions';
import { BAG_GLASS, WAISTBAG_SLOT } from '../world/Block';
import { DIY_GOLD_PICKAXE } from '../world/GoldenItems';
import { spawnDrop } from '../entities/drops';
import { ZOMBIE_NAMES } from '../entities/Zombie';
import { FireSystem } from '../entities/Fire';
import { hurtPlayer } from '../player/damage';

export class Game {
  private renderer: Renderer;
  private controller = new Controller();
  private world = new World();
  private atlas: Atlas = createAtlas();
  /** 区块网格缓存：脏区块重建 + 旧网格释放 */
  private chunkMeshes: ChunkMeshCache;
  private highlight: THREE.LineSegments;

  private body: PlayerBody | null = null;
  private health: Health | null = null;
  private hunger: Hunger | null = null;
  private inventory: Inventory | null = null;
  private hud: Hud | null = null;
  private panel: Panel | null = null;
  private spawn = { x: 8.5, y: 40, z: 8.5 };
  private slot = 0;
  private paused = false;
  private started = false;
  private lastTime = 0;
  private saveSlot = 0; // 当前玩的是几号账号存档（1~3）

  /** 玩家对方块做的动作：挖/放/用（begin() 时装好） */
  private playerActions: PlayerActions | null = null;
  /** 掉落物拾取（begin() 时装好） */
  private pickup: Pickup | null = null;
  /** 生存动作：吃喝 / 快捷栏 / 重生点 / 卡墙自救（begin() 时装好） */
  private survival: Survival | null = null;
  /** 打活物（begin() 时装好） */
  private combat: MobCombat | null = null;
  /** 点火/烧火系统（constructor 时装好） */
  private fires!: FireSystem;
  private mobs: Mobs;
  /** 载具总管：坦克停车/上车/开炮（constructor 时装好） */
  private vehicles!: Vehicles;
  /** 挑战房：盖房/门票/四关怪/发奖（constructor 时装好） */
  private challenge!: Challenge;
  /** 扔出去的药水瓶：抛物线飞行 + 溅到僵尸身上（constructor 时装好） */
  private potions!: Potions;
  private drops: ItemDrop[] = [];
  private saveTimer = SAVE.EVERY; // 自动存档倒计时
  private worldCycles = new WorldCycles();
  private skates = new SkateSystem();
  private container: ContainerPanel | null = null;
  private dyePanel: DyePanel | null = null;
  private book = new RecipeBook(); // 制作方法收集册：捡到 DIY 手册学会的方法都记在这
  /** 面板管理器：谁占着画面、按键交给谁（背包/箱子/染色/收集册/睡觉黑屏） */
  private panels = new PanelStack();
  // 昼夜 + 睡觉：天黑了就提示可以上床睡觉
  private day = new DayCycle(
    () => this.hud?.showMessage('天黑了！小心血尸和星空尸出没，对着床按 M 可以睡觉', 3),
    () => {
      this.survival!.wakeUp(this.body!, this.spawn); // 黑屏放完 → 自动站回床边
      this.pickup!.dropStarShard(this.spawn.x, this.spawn.y, this.spawn.z); // 睡觉福利：一半概率掉星星碎片
    },
  );

  constructor(container: HTMLElement) {
    this.renderer = new Renderer(container);
    this.chunkMeshes = new ChunkMeshCache(this.renderer.scene, this.atlas);
    // 指着方块时的黑色描边框，纯键盘操作瞄准全靠它
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002));
    this.highlight = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x111111 }));
    this.highlight.visible = false;
    this.renderer.scene.add(this.highlight);
    this.mobs = new Mobs(
      this.world, this.renderer.scene,
      (id, n, x, y, z) => this.dropAt(id, n, x, y, z),
      (dmg, kind) => {
        const r = hurtPlayer(this.health!, dmg);
        if (r.hurt) this.hud!.showMessage(`${ZOMBIE_NAMES[kind]}抓到你啦！`, 0.8);
        if (r.died) this.respawn();
      },
      () => this.book.hasMore(), // 制作方法学全了 → 动物不再掉手册
    );
    this.vehicles = new Vehicles(this.renderer.scene, this.mobs);
    this.challenge = new Challenge(this.renderer.scene, this.mobs, () => {
      const text = this.book.unlockTask(DIY_GOLD_PICKAXE);
      if (text) {
        this.book.showPaper(text, true);
        this.hud?.showMessage('挑战通关！获得金稿子 DIY 手册');
      }
    });
    this.potions = new Potions(this.renderer.scene, this.mobs, (msg) => this.hud!.showMessage(msg, 1.5));
    this.fires = new FireSystem(this.renderer.scene);
  }

  async start(): Promise<void> {
    // 先问后端"我是谁"，再按结果走本地菜单 / 登录界面 / 账号菜单（细节在 Menus.ts）
    await runMenuFlow((mode, save, zombieAttack, slot) => this.begin(mode, save, zombieAttack, slot));
    // 关掉/刷新页面前存一次档
    addEventListener('beforeunload', () => this.saveNow());
    this.lastTime = performance.now();
    const loop = (t: number) => {
      const dt = Math.min((t - this.lastTime) / 1000, 0.05); // 卡顿掉帧时最多按 50ms 算
      this.lastTime = t;
      this.tick(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /** 选好账号和模式，真正开局；带 save 就是从存档继续玩；zombieAttack = 僵尸攻击开关 */
  private begin(mode: GameMode, save: SaveData | undefined, zombieAttack: boolean, slot: number): void {
    this.fires.clear();
    this.saveSlot = slot;
    this.mobs.zombieAttack = zombieAttack;
    this.mobs.zombieSpawn = true;
    this.hunger = new Hunger(mode);
    this.health = new Health(mode, () => this.hunger!.respawn());
    this.inventory = new Inventory(mode);
    this.hud = new Hud(this.health.showStats, this.atlas, this.inventory.infinite);
    this.panel = new Panel(this.inventory, this.atlas);
    this.container = new ContainerPanel(this.inventory, this.atlas);
    this.dyePanel = new DyePanel(this.inventory, (t) => this.hud!.showMessage(t));
    // 面板登记进管理器：注册顺序 = 接管画面的优先级（睡觉黑屏排最后，它关不掉）
    this.panels.register({
      name: 'inventory',
      isOpen: () => this.panel!.visible,
      close: () => this.panel!.close(),
      keys: (c) => this.panel!.handleKeys(c, (s) => this.playerActions!.meatMagic(s)),
    });
    this.panels.register({
      name: 'container',
      isOpen: () => this.container!.visible,
      close: () => this.container!.close(),
      closeKeys: ['door'], // 对着箱子再按 M 也算关门
      update: (dt) => {
        this.world.updateFurnaces(dt); // 熔炉继续烧
        this.container!.refresh();     // 火焰进度条要走
      },
    });
    this.panels.register({
      name: 'dye',
      isOpen: () => this.dyePanel!.visible,
      close: () => this.dyePanel!.close(),
    });
    this.panels.register({
      name: 'book',
      isOpen: () => this.book.visible,
      close: () => this.book.close(),
      closeKeys: ['book'],
    });
    this.panels.register({
      name: 'sleep',
      isOpen: () => this.day.sleeping,
      close: () => {}, // 睡觉黑屏只能等动画放完
      update: (dt) => this.day.update(dt, this.renderer),
    });
    const setSpawn = (p: { x: number; y: number; z: number }) => { this.spawn = p; };
    this.survival = new Survival({
      controller: this.controller, inventory: this.inventory, health: this.health, hunger: this.hunger, hud: this.hud,
      world: this.world, slot: () => this.slot, setSpawn, respawn: () => this.respawn(),
    });
    this.pickup = new Pickup({
      world: this.world, scene: this.renderer.scene, inventory: this.inventory, hud: this.hud,
      book: this.book, drops: () => this.drops,
    });
    this.playerActions = new PlayerActions({
      world: this.world, controller: this.controller, scene: this.renderer.scene,
      hud: this.hud, panel: this.panel, container: this.container, dyePanel: this.dyePanel,
      inventory: this.inventory, slot: () => this.slot, book: this.book, day: this.day,
      drops: () => this.drops, fires: this.fires,
      parkTank: (hit) => this.vehicles.parkTank(this.world, hit, this.body!.yaw),
      buildChallenge: (hit) => this.challenge.build(this.world, hit, this.body!, this.hud!),
      useChallengeDoor: (x, y, z) => this.challenge.useDoor(x, y, z, this.body!, this.inventory!, this.hud!),
      setBedSpawn: (x, y, z) => this.survival!.setBedSpawn(x, y, z),
      bookFull: () => this.book.hasAllNormal(), // 手册集齐解锁隐藏配方
    });
    this.combat = new MobCombat(this.controller, this.inventory, () => this.slot, this.hud, this.mobs);
    if (save) {
      // 读档：出生点/背包/血量/世界改动/动物/掉落物全部还原
      const r = applySave(save, {
        inv: this.inventory, health: this.health, hunger: this.hunger, world: this.world,
        scene: this.renderer.scene, animals: this.mobs.animals, zombies: this.mobs.zombies, drops: this.drops,
        tanks: this.vehicles!.tanks, challenge: this.challenge,
      });
      this.spawn = r.spawn;
      this.slot = r.slot;
      this.mobs.zombieSpawn = r.zombieSpawn;
      this.book.importLearned(r.learned);
      this.book.importGoldenState(r.golden?.learned, r.golden?.tasks, r.golden?.waterUses);
      this.paused = r.paused; // 存的时候暂停着，读出来也暂停
      this.day.time = r.dayTime;
    } else {
      // 新档：随机找一块不靠海的草地出生（沙漠/雪地动物不生成，也不好开局）
      this.book.importLearned([]); // 新游戏 = 还没学会任何制作方法
      this.book.importGoldenState([], [], 0);
      const gs = randomGrassSpawn();
      this.spawn.x = gs.x; this.spawn.z = gs.z;
      this.spawn.y = heightAt(Math.floor(gs.x), Math.floor(gs.z)) + 1;
    }
    this.hud.refreshHotbar(this.inventory, this.slot);
    this.hud.setPaused(this.paused);
    // 暂停界面上的「退出账号」按钮：存档后刷新页面回到选账号菜单
    document.getElementById('quitbtn')!.onclick = () => this.quitToMenu();
    this.body = createBody(this.spawn.x, this.spawn.y, this.spawn.z);
    if (save) {
      const b = save.body;
      this.body.x = b.x; this.body.y = b.y; this.body.z = b.z;
      this.body.yaw = b.yaw; this.body.pitch = b.pitch;
      this.body.fellFrom = b.y; // 别把读档当成摔下来
      this.body.speedBoostT = b.boostT ?? 0; // 腌菜桶的加速接着算
    }
    this.body.flying = this.inventory.infinite; // 创造模式=会飞：空格升 Shift 降
    this.streamChunks(Infinity); // 出生点附近一次性全生成
    this.chunkMeshes.rebuildDirty(this.world);
    if (!save) {
      // 新档在出生点周围补撒牛/猪/羊（区块生成时可能已经自带了几只）；读档的动物在 applySave 里还原
      this.mobs.spawnInitial(this.spawn.x, this.spawn.z);
    }
    this.controller.active = true;
    if (isTouchDevice()) new TouchControls(this.controller); // 手机/平板：挂上虚拟按键
    this.started = true;
  }

  /** 把当前游戏打包存进浏览器（自动存 + 按 1 + 关页面时都会调它） */
  private saveNow(): void {
    if (!this.started || !this.body || !this.inventory || !this.health || !this.hunger) return;
    writeSave(this.saveSlot, buildSave({
      mode: this.inventory.mode, spawn: this.spawn, body: this.body,
      health: this.health, hunger: this.hunger, slot: this.slot, inv: this.inventory,
      world: this.world, animals: this.mobs.animals, zombies: this.mobs.zombies, drops: this.drops,
      tanks: this.vehicles!.tanks, challenge: this.challenge,
      learned: this.book.learnedIds(),
      golden: { learned: this.book.goldenLearnedIds(), tasks: this.book.goldenTaskIds(), waterUses: this.book.goldenWaterUseCount() },
      paused: this.paused, dayTime: this.day.time,
      zombieAttack: this.mobs.zombieAttack,
      zombieSpawn: this.mobs.zombieSpawn,
    }));
  }

  /** 玩家周围的区块，没生成的补生成（每帧限量，防止卡） */
  private streamChunks(budget: number): void {
    const body = this.body!;
    const pcx = Math.floor(body.x / CHUNK.SIZE);
    const pcz = Math.floor(body.z / CHUNK.SIZE);
    for (let r = 0; r <= VIEW_DISTANCE && budget > 0; r++) {
      for (let dx = -r; dx <= r && budget > 0; dx++) {
        for (let dz = -r; dz <= r && budget > 0; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue; // 一圈一圈往外扩
          if (!this.world.getChunk(pcx + dx, pcz + dz)) {
            this.world.ensureChunk(pcx + dx, pcz + dz);
            budget--;
            this.mobs.onChunkGen(pcx + dx, pcz + dz); // 新区块可能本来就住着动物
          }
        }
      }
    }
  }

  /** 掉一个掉落物在 (x,y,z) */
  private dropAt(id: number, n: number, x: number, y: number, z: number): void {
    spawnDrop({ scene: this.renderer.scene, drops: this.drops }, id, n, x, y + 0.5, z);
  }

  /** 退出账号：先把当前进度存进本账号的档，再刷新页面回到账号菜单（整个重来最干净） */
  private quitToMenu(): void {
    this.saveNow();
    location.reload();
  }

  /** 按 3 回城：瞬移回重生点。不是死，血量和身上的效果都保持原样 */
  private goHome(): void {
    if (this.challenge.active) { this.hud!.showMessage('挑战中不能回城，先完成挑战'); return; }
    const body = this.body!;
    this.survival!.wakeUp(body, this.spawn);
    this.vehicles.riding?.setPose(body.x, body.y, body.z, body.yaw);
    body.fellFrom = body.y; // 别算成摔落
    this.hud!.showMessage('嗖——回到重生点！');
  }

  private respawn(): void {
    const body = this.body!;
    this.challenge.onPlayerDeath(this.hud!); // 挑战房里死了：怪清场、门票没收
    // 死了还骑着坦克：背包有地儿就收进包，没地儿就继续骑着重生
    const wasRiding = this.vehicles.riding !== null;
    const keptRiding = wasRiding && !this.vehicles.stowOnDeath(this.inventory!);
    const p = this.survival!.freeSpot(this.spawn.x, this.spawn.y, this.spawn.z);
    body.x = p.x; body.y = p.y; body.z = p.z;
    body.vx = body.vy = body.vz = 0;
    body.fellFrom = body.y;
    body.skateFallT = 0; // 死的时候正摔着也直接站起来
    this.skates.reset();
    body.swayT = body.swayPhase = body.breathT = body.swampId = 0;
    this.health!.respawn();
    this.hud!.showMessage(
      keptRiding ? '你死了！背包满了，坦克还驮着你' : wasRiding ? '你死了！坦克收回背包了' : '你死了！已重生',
    );
  }

  private renderFrame(body: PlayerBody): void {
    this.renderer.updateCamera(body.x, body.y + PLAYER.EYE, body.z, body.yaw + cameraYawSway(body.swayT, body.swayPhase), body.pitch, cameraFallRoll(body.skateFallT));
    this.renderer.render();
    this.controller.endFrame();
  }

  private tick(dt: number): void {
    if (!this.started) {
      this.renderer.render();
      return;
    }

    // 存档：每隔几秒自动存一次；按 1 也能手动存
    this.saveTimer -= dt;
    if (this.saveTimer <= 0) {
      this.saveTimer = SAVE.EVERY;
      this.saveNow();
    }
    if (this.controller.take('save')) {
      this.saveNow();
      this.hud!.showMessage('进度已保存 ✓', 1);
    }

    const body = this.body!;
    const health = this.health!;
    const hud = this.hud!;
    const panel = this.panel!;

    // 面板/独占画面接管：按键交给它，世界暂停（9/ESC 关门，面板还能自带关门键）
    if (this.panels.handleFrame(dt, this.controller)) {
      this.renderFrame(body);
      return;
    }

    if (this.controller.take('pause')) {
      this.paused = !this.paused;
      hud.setPaused(this.paused);
    }
    // 暂停中按 0 = 退出账号：先存好当前档，刷新回选账号菜单
    if (this.paused && this.controller.take('quit')) this.quitToMenu();
    if (!this.paused && this.controller.take('inventory')) {
      panel.open();
    }
    if (!this.paused && this.controller.take('book')) {
      this.book.open();
    }

    if (!this.paused) {
      this.survival!.toggleHungerKey();
      if (this.controller.take('toggleZombieSpawn')) {
        this.mobs.zombieSpawn = !this.mobs.zombieSpawn;
        hud.showMessage(this.mobs.zombieSpawn
          ? '僵尸生成已开启'
          : '僵尸生成已关闭，已有僵尸不会消失');
      }
      // 按 3 = 回城：瞬移回重生点（不掉血不死，中毒/头晕还在）
      if (this.controller.take('respawn')) this.goHome();
      // 0. 时间流动：一天 120 秒，过了 80 秒就是黑夜
      this.day.update(dt, this.renderer);
      this.worldCycles.update(dt, this.world);

      // 1. 物理：移动 + 碰撞 + 水（开着坦克时走路速度×2，穿轮滑鞋×1.5）
      body.driving = this.vehicles!.riding !== null;
      body.skating = wearingSkates(this.inventory!.armor);
      body.glassBag = this.inventory!.armor[WAISTBAG_SLOT]?.id === BAG_GLASS;
      const pev = stepPhysics(body, this.world, this.controller, dt);
      // 轮滑计时：连着滑会摔一跤，鞋上的数 = 还能摔几次
      const skateMessage = this.skates.update(body, this.inventory!.armor, dt, pev.horizontalDistance > 0);
      if (skateMessage) hud.showMessage(skateMessage, 1.5);
      // 2. 生命与饥饿：氧气 + 摔落/溺水/饥饿结算
      const hev = health.update(dt, body, pev.fallDistance);
      if (hev.hurt) hud.showMessage('哎呀！', 0.6);
      if (hev.died) this.respawn();
      const starveDmg = this.hunger!.update(dt);
      if (starveDmg > 0) {
        const sr = hurtPlayer(health, starveDmg);
        if (sr.hurt) hud.showMessage('好饿！快吃东西！', 0.8);
        if (sr.died) this.respawn();
      }
      // 挖穿世界底掉进虚空：掉太深直接算摔死重生
      if (body.y < VOID_Y) { this.respawn(); hud.showMessage('掉出世界啦！', 1.2); }

      // 3. 交互：先看指没指到动物（谁近算谁），再挖/放/门/选方块
      const cp = Math.cos(body.pitch);
      const dx = -Math.sin(body.yaw) * cp;
      const dy = Math.sin(body.pitch);
      const dz = -Math.cos(body.yaw) * cp;
      // 指着谁打谁：动物和僵尸谁近算谁
      const mob = this.mobs.rayHit(body.x, body.y + PLAYER.EYE, body.z, dx, dy, dz, PLAYER.REACH);
      const hit = pick(this.world, body);
      const waterHit = pickWater(this.world, body); // 指线上碰到的第一格水（铁桶盛水用）
      const blockDist = hit
        ? Math.hypot(hit.x + 0.5 - body.x, hit.y + 0.5 - (body.y + PLAYER.EYE), hit.z + 0.5 - body.z)
        : Infinity;

      // 坦克：开着车时 M 下车 / P 开炮 / 瞄到活物挂红点；没开车时指着坦克 M 上车、P 收回
      const riding = this.vehicles.riding !== null;
      this.vehicles.update(dt, this.world, body, this.controller, this.inventory!, hud,
        Math.min(blockDist, mob?.dist ?? Infinity), this.slot,
        () => this.hud!.refreshHotbar(this.inventory!, this.slot));

      // 药水瓶接管 P 键；否则攻击活物或正常挖方块
      const potionHandled = !riding && this.potions.handleInput(
        this.controller, this.inventory!, this.slot, body, hud, hit, this.highlight,
      );
      if (!potionHandled && !riding && mob && mob.dist <= blockDist) {
        // 指着活物：挖矿进度作废，这一下算攻击
        this.highlight.visible = false;
        this.playerActions!.cancelMining();
        hud.setProgress(0);
        this.combat!.update(mob, body, dt, (sheep) => this.survival!.useSheep(sheep));
      } else if (!potionHandled) {
        if (hit) {
          this.highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
          this.highlight.visible = true;
        } else {
          this.highlight.visible = false;
        }
        if (riding) {
          // 开车时 P 是开炮不是挖矿：矿镐进度清零
          this.playerActions!.cancelMining();
          hud.setProgress(0);
        } else {
          this.playerActions!.updateMining(dt, hit?.x ?? null, hit?.y ?? null, hit?.z ?? null, waterHit);
        }
      }

      // L = 放东西：方块放旁边，稻粒/水草/水桶这些特殊物品走自己的规则（在 PlayerActions 里）
      this.playerActions!.placeItem(hit, body);
      // M = 使用：先试试隐藏配方（64 生肉变铁粒），不是才走正常的方块交互；开车时 M 被坦克拿去上下车了
      if (!riding && this.controller.take('door')) {
        if (!this.playerActions!.tryMeatMagic() && hit) this.playerActions!.useBlock(hit.x, hit.y, hit.z);
      }
      // E 吃东西：按食物表扣血/回血（在 Survival 里）
      this.survival!.eatKey(body);
      // 4/6 换快捷栏格子
      this.slot = this.survival!.hotbarKeys(this.slot);

      // 4. 活物和掉落物更新（僵尸追人挠人也在里面；血尸只有天黑才刷）
      this.mobs.update(dt, body.x, body.y, body.z, this.day.time >= DAY.NIGHT_FROM, this.day.time);
      this.potions.update(dt, this.world);
      this.fires.update(dt);
      this.drops = this.pickup!.update(dt, body);
      this.challenge.update(dt, body, this.inventory!, hud);

      // 5. 世界维护：补新区块 + 重建脏网格 + 熔炉继续烧
      this.streamChunks(2);
      this.chunkMeshes.rebuildDirty(this.world);
      this.world.updateFurnaces(dt);

      // 5. HUD 刷新
      hud.refreshHotbar(this.inventory!, this.slot);
      hud.update(dt, health.hp, health.oxygen, this.hunger!.value);
    }

    this.renderFrame(body);
  }
}

