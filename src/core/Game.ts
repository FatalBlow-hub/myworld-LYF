/** 游戏主循环 — 把所有模块装配起来，每帧按固定顺序驱动它们 */

import * as THREE from 'three';
import { CHUNK, DAY, PLAYER, SAVE, VIEW_DISTANCE, VOID_Y } from '../config';
import { World } from '../world/World';
import { heightAt, randomGrassSpawn } from '../world/TerrainGen';
import { createAtlas, Atlas } from '../render/Textures';
import { meshChunk } from '../render/ChunkMesher';
import { Renderer } from '../render/Renderer';
import { Controller } from '../player/Controller';
import { PlayerBody, createBody, stepPhysics } from '../player/Physics';
import { SkateSystem, wearingSkates } from '../player/Skates';
import { cameraFallRoll, cameraYawSway } from '../player/CameraEffects';
import { WorldCycles } from '../world/WorldCycles';
import { GameMode, Health } from '../player/Health';
import { Inventory } from '../player/Inventory';
import { pick, pickWater } from '../interact/BlockPicker';
import { Menu, AccountMenu } from '../ui/Menu';
import { Auth, probeAuth, logout } from '../ui/Auth';
import { TouchControls, isTouchDevice } from '../ui/TouchControls';
import { Hud } from '../ui/Hud';
import { Panel } from '../ui/Panel';
import { Mobs } from '../entities/Mobs';
import { ItemDrop } from '../entities/ItemDrop';
import { ContainerPanel } from '../ui/Container';
import { DyePanel } from '../ui/DyePanel';
import { RecipeBook } from '../ui/RecipeBook';
import { SaveData, applySave, buildSave, deleteSave, listSaves, restoreBackups, writeSave, syncServerSave, setServerMode, MAX_SLOTS } from './Save';
import { DayCycle } from './DayCycle';
import { Actions } from './Actions';
import { Vehicles } from './Vehicles';
import { Challenge } from './Challenge';
import { Potions } from '../entities/Potions';
import { BAG_GLASS, WAISTBAG_SLOT } from '../world/Block';
import { DIY_GOLD_PICKAXE } from '../world/GoldenItems';

interface ChunkMeshes {
  opaque: THREE.Mesh | null;
  water: THREE.Mesh | null;
  /** 会发光的方块（星空系列）：不受光照影响 */
  glow: THREE.Mesh | null;
}

export class Game {
  private renderer: Renderer;
  private controller = new Controller();
  private world = new World();
  private atlas: Atlas = createAtlas();
  private meshes = new Map<string, ChunkMeshes>();
  private opaqueMat: THREE.MeshLambertMaterial;
  /** 发光材质：不受光照影响，黑夜里也亮堂堂 */
  private glowMat: THREE.MeshBasicMaterial;
  private waterMat: THREE.MeshLambertMaterial;
  private highlight: THREE.LineSegments;

  private body: PlayerBody | null = null;
  private health: Health | null = null;
  private inventory: Inventory | null = null;
  private hud: Hud | null = null;
  private panel: Panel | null = null;
  private spawn = { x: 8.5, y: 40, z: 8.5 };
  private slot = 0;
  private paused = false;
  private started = false;
  private lastTime = 0;
  private saveSlot = 0; // 当前玩的是几号账号存档（1~3）

  /** 挖矿/用方块/驯羊/睡觉落点等玩家动作（begin() 时装好） */
  private actions: Actions | null = null;
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
  // 昼夜 + 睡觉：天黑了就提示可以上床睡觉
  private day = new DayCycle(
    () => this.hud?.showMessage('天黑了！小心血尸和星空尸出没，对着床按 M 可以睡觉', 3),
    () => {
      this.actions!.wakeUp(this.body!, this.spawn); // 黑屏放完 → 自动站回床边
      this.actions!.dropStarShard(this.spawn.x, this.spawn.y, this.spawn.z); // 睡觉福利：一半概率掉星星碎片
    },
  );

  constructor(container: HTMLElement) {
    this.renderer = new Renderer(container);
    // alphaTest 让花草贴图的透明部分被裁掉（不然透明处会变成黑色方块）
    this.opaqueMat = new THREE.MeshLambertMaterial({ map: this.atlas.texture, alphaTest: 0.5 });
    this.waterMat = new THREE.MeshLambertMaterial({
      map: this.atlas.texture,
      transparent: true,
      depthWrite: false, // 水/玻璃不挡后面的东西
    });
    this.glowMat = new THREE.MeshBasicMaterial({ map: this.atlas.texture, alphaTest: 0.5 });
    // 指着方块时的黑色描边框，纯键盘操作瞄准全靠它
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002));
    this.highlight = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x111111 }));
    this.highlight.visible = false;
    this.renderer.scene.add(this.highlight);
    this.mobs = new Mobs(
      this.world, this.renderer.scene,
      (id, n, x, y, z) => this.dropAt(id, n, x, y, z),
      (dmg, kind) => {
        const name = kind === 'blood' ? '血尸' : kind === 'star' ? '星空尸' : kind === 'rat' ? '腐败老鼠' : '僵尸';
        if (this.health!.damage(dmg)) this.hud!.showMessage(`${name}抓到你啦！`, 0.8);
        if (this.health!.hp <= 0) this.respawn();
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
  }

  async start(): Promise<void> {
    // 先问后端"我是谁"：后端没跑 → 本地模式（老的 3 槽位菜单）；
    // 后端在但没登录 → 登录/注册界面；已登录 → 账号菜单（一个账号一档）
    const who = await probeAuth();
    if (who === 'off') {
      await this.showLocalMenu();
    } else if (!who.name) {
      new Auth({
        onDone: () => location.reload(), // 登录成功刷新重进，带着 Cookie 走账号流程
        onLocal: () => void this.showLocalMenu(), // 不想登录也能玩本地档
      });
    } else {
      await this.showAccountMenu(who.name);
    }
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

  /** 本地模式：浏览器存档 + 老的 3 槽位菜单（后端没开时的退路） */
  private async showLocalMenu(): Promise<void> {
    // 浏览器里的档被清了的话，先从项目 saves/ 文件夹把备份搬回来
    await restoreBackups();
    const saves = listSaves();
    const used = new Set(saves.map((s) => s.slot));
    const nextSlot = [1, 2, 3].slice(0, MAX_SLOTS).find((s) => !used.has(s)) ?? null;
    new Menu(
      {
        onContinue: (slot, z) => {
          const s = saves.find((x) => x.slot === slot)!;
          this.begin(s.data.mode, s.data, z, slot);
        },
        onNew: (mode, z) => this.begin(mode, undefined, z, nextSlot!),
        onRestore: () => void restoreBackups(true).then(() => location.reload()),
        onDelete: (slot) => {
          deleteSave(slot);
          location.reload(); // 刷新一下菜单就重新算空位了
        },
      },
      {
        saves: saves.map((s) => ({ slot: s.slot, mode: s.data.mode, zombieAttack: s.data.zombieAttack ?? true })),
        nextSlot,
        zombieChecked: saves[0]?.data.zombieAttack ?? true, // 开关默认按 1 号账号上次存的显示
      },
    );
  }

  /** 服务器模式：已登录账号的菜单 — 服务器档先搬到本地 1 号槽再开玩，写档自动传回服务器 */
  private async showAccountMenu(name: string): Promise<void> {
    setServerMode(true); // 从这开始，写档/删档都会同步到服务器
    const save = await syncServerSave(name);
    new AccountMenu(
      {
        onContinue: (z) => this.begin(save!.mode, save!, z, 1),
        onNew: (mode, z) => this.begin(mode, undefined, z, 1),
        onLogout: () => void logout().then(() => location.reload()),
        onDelete: () => {
          deleteSave(1);
          location.reload();
        },
      },
      {
        name,
        save: save ? { mode: save.mode, zombieAttack: save.zombieAttack ?? true } : null,
      },
    );
  }

  /** 选好账号和模式，真正开局；带 save 就是从存档继续玩；zombieAttack = 僵尸攻击开关 */
  private begin(mode: GameMode, save: SaveData | undefined, zombieAttack: boolean, slot: number): void {
    this.actions?.clearFires();
    this.saveSlot = slot;
    this.mobs.zombieAttack = zombieAttack;
    this.mobs.zombieSpawn = true;
    this.health = new Health(mode);
    this.inventory = new Inventory(mode);
    this.hud = new Hud(this.health.showStats, this.atlas, this.inventory.infinite);
    this.panel = new Panel(this.inventory, this.atlas);
    this.container = new ContainerPanel(this.inventory, this.atlas);
    this.dyePanel = new DyePanel(this.inventory, (t) => this.hud!.showMessage(t));
    this.actions = new Actions({
      world: this.world, controller: this.controller, scene: this.renderer.scene,
      hud: this.hud, panel: this.panel, container: this.container, dyePanel: this.dyePanel,
      inventory: this.inventory, health: this.health, day: this.day, drops: () => this.drops,
      book: this.book,
      mobs: this.mobs,
      slot: () => this.slot,
      setSpawn: (p) => { this.spawn = p; },
      bookFull: () => this.book.hasAllNormal(), // 手册集齐解锁隐藏配方
      parkTank: (hit) => this.vehicles.parkTank(this.world, hit, this.body!.yaw),
      buildChallenge: (hit) => this.challenge.build(this.world, hit, this.body!, this.hud!),
      useChallengeDoor: (x, y, z) => this.challenge.useDoor(x, y, z, this.body!, this.inventory!, this.hud!),
    });
    if (save) {
      // 读档：出生点/背包/血量/世界改动/动物/掉落物全部还原
      const r = applySave(save, {
        inv: this.inventory, health: this.health, world: this.world,
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
    this.rebuildDirty();
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
    if (!this.started || !this.body || !this.inventory || !this.health) return;
    writeSave(this.saveSlot, buildSave({
      mode: this.inventory.mode, spawn: this.spawn, body: this.body,
      health: this.health, slot: this.slot, inv: this.inventory,
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

  /** 把标脏的区块重新生成网格，换掉旧网格 */
  private rebuildDirty(): void {
    for (const key of this.world.dirtyChunks) {
      const [cx, cz] = key.split(',').map(Number);
      const old = this.meshes.get(key);
      if (old) {
        old.opaque?.geometry.dispose();
        old.water?.geometry.dispose();
        old.glow?.geometry.dispose();
        if (old.opaque) this.renderer.scene.remove(old.opaque);
        if (old.water) this.renderer.scene.remove(old.water);
        if (old.glow) this.renderer.scene.remove(old.glow);
      }
      const geo = meshChunk(this.world, cx, cz, this.atlas);
      const entry: ChunkMeshes = { opaque: null, water: null, glow: null };
      if (geo.opaque) {
        entry.opaque = new THREE.Mesh(geo.opaque, this.opaqueMat);
        this.renderer.scene.add(entry.opaque);
      }
      if (geo.water) {
        entry.water = new THREE.Mesh(geo.water, this.waterMat);
        this.renderer.scene.add(entry.water);
      }
      if (geo.glow) {
        entry.glow = new THREE.Mesh(geo.glow, this.glowMat);
        this.renderer.scene.add(entry.glow);
      }
      this.meshes.set(key, entry);
      this.world.dirtyChunks.delete(key);
    }
  }

  /** 掉一个掉落物在 (x,y,z) */
  private dropAt(id: number, n: number, x: number, y: number, z: number): void {
    const d = new ItemDrop(id, n, x, y + 0.5, z);
    this.renderer.scene.add(d.mesh);
    this.drops.push(d);
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
    this.actions!.wakeUp(body, this.spawn);
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
    const p = this.actions!.freeSpot(this.spawn.x, this.spawn.y, this.spawn.z);
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

    // 面板开着 → 走面板按键，游戏暂停（再按 9/ESC 关）
    if (panel.visible) {
      this.actions!.panelKeys();
      this.renderFrame(body);
      return;
    }
    // 箱子/熔炉面板也一样
    if (this.container!.visible) {
      this.actions!.containerKeys();
      this.world.updateFurnaces(dt); // 熔炉继续烧
      this.container!.refresh();     // 火焰进度条要走
      this.renderFrame(body);
      return;
    }
    // 染色台面板也一样：键盘只管关门，染色用鼠标点
    if (this.dyePanel!.visible) {
      if (this.controller.take('inventory') || this.controller.take('pause')) this.dyePanel!.close();
      this.renderFrame(body);
      return;
    }
    // 制作方法收集册开着：暂停游戏，B/9/ESC 关门
    if (this.book.visible) {
      if (this.controller.take('book') || this.controller.take('inventory') || this.controller.take('pause')) {
        this.book.close();
      }
      this.renderFrame(body);
      return;
    }

    // 睡觉中：黑屏动画独占画面，世界暂停（时间在 DayCycle 里拨到早上）
    if (this.day.sleeping) {
      this.day.update(dt, this.renderer);
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
      // 2. 生命：氧气 + 摔落/溺水结算
      const hev = health.update(dt, body, pev.fallDistance);
      if (hev.hurt) hud.showMessage('哎呀！', 0.6);
      if (hev.died) this.respawn();
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
        this.highlight.visible = false;
        this.actions!.attackMob(mob, body, dt);
      } else if (!potionHandled) {
        if (hit) {
          this.highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
          this.highlight.visible = true;
        } else {
          this.highlight.visible = false;
        }
        if (riding) {
          // 开车时 P 是开炮不是挖矿：矿镐进度清零
          this.actions!.mineKey = '';
          this.actions!.mineProgress = 0;
          hud.setProgress(0);
        } else {
          this.actions!.updateMining(dt, hit?.x ?? null, hit?.y ?? null, hit?.z ?? null, waterHit);
        }
      }

      // L = 放东西：方块放旁边，稻粒/水草/水桶这些特殊物品走自己的规则（在 Actions 里）
      this.actions!.placeItem(hit, body);
      // M = 使用：先试试隐藏配方（64 生肉变铁粒），不是才走正常的方块交互；开车时 M 被坦克拿去上下车了
      if (!riding && this.controller.take('door')) {
        if (!this.actions!.tryMeatMagic() && hit) this.actions!.useBlock(hit.x, hit.y, hit.z);
      }
      // E 吃东西：按食物表扣血/回血（在 Actions 里）
      this.actions!.eatKey(body);
      // 4/6 换快捷栏格子
      this.slot = this.actions!.hotbarKeys(this.slot);

      // 4. 活物和掉落物更新（僵尸追人挠人也在里面；血尸只有天黑才刷）
      this.mobs.update(dt, body.x, body.y, body.z, this.day.time >= DAY.NIGHT_FROM, this.day.time);
      this.potions.update(dt, this.world);
      this.drops = this.actions!.collectDrops(dt, body);
      this.challenge.update(dt, body, this.inventory!, hud);

      // 5. 世界维护：补新区块 + 重建脏网格 + 熔炉继续烧
      this.streamChunks(2);
      this.rebuildDirty();
      this.world.updateFurnaces(dt);

      // 5. HUD 刷新
      hud.refreshHotbar(this.inventory!, this.slot);
      hud.update(dt, health.hp, health.oxygen);
    }

    this.renderFrame(body);
  }
}

