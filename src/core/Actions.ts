/** 玩家动作 — 挖矿进度/用方块/驯羊/床边落点/拆容器撒货/面板按键（从 Game 拆出来的瘦身模块） */

import * as THREE from 'three';
import { BOOST, CHUNK, DAY, GOLDEN, PLAYER, POTION, SWAMP_HURT, RUBBER_DROP, STACK_MAX } from '../config';
import {
  AIR, BLOCKS, BUCKET, DYEABLE_CARPETS, CHEM_DECOMP, CRAFTING_TABLE, DANDELION, DYE_TABLE, STAR_DYE_TABLE, HYDROGEN, ICE, IRON_NUGGET,
  CARROT, CHALLENGE_DOOR, CHALLENGE_HOUSE, DIY_MANUAL, FIRESTARTER_IDS, MANG_SHARD, PICKLE_BARREL, RAW_MEAT, RUBBER, SOUL_CHEST, SOUL_FIRESTARTER, STAR_SHARD, STAR_TABLE,
  RICE_GRAIN, SEAWEED, TANK, WATER_BUCKET, WOOD, dropCountOf, isBed, isChest, isDoor, isFurnace,
  GLASS_BOTTLE, GLASS_BUCKET, POTION_BREATH, POTION_DEADLY, POTION_IDS, POTION_PHANTOM, POTION_POISON,
  SWAMP_FILL,
} from '../world/Block';
import { DIY_GOLD_MANUAL, GOLD_CHEM_DECOMP, GOLD_DYE_TABLE, GOLD_PICKAXE, ICE_MOLECULE, POTION_ICE } from '../world/GoldenItems';
import { metaFromYaw } from '../world/Shapes';
import { World } from '../world/World';
import { BlockHit, mine, place, plantSeed, plantCarrot, placeSeaweed, pourWater, useDoor } from '../interact/BlockPicker';
import { PlayerBody, collidesAABB } from '../player/Physics';
import { Controller } from '../player/Controller';
import { Inventory } from '../player/Inventory';
import { Health } from '../player/Health';
import { Hud } from '../ui/Hud';
import { Panel } from '../ui/Panel';
import { ContainerPanel } from '../ui/Container';
import { DyePanel } from '../ui/DyePanel';
import { DayCycle } from './DayCycle';
import { RecipeBook } from '../ui/RecipeBook';
import { Animal } from '../entities/Animal';
import { ItemDrop } from '../entities/ItemDrop';
import { MobHit, Mobs } from '../entities/Mobs';
import { MobCombat } from './MobCombat';
import { scoopBucket } from '../interact/LiquidBuckets';
import { dropShardNear } from '../interact/DropHelpers';
import { FireSystem } from '../entities/Fire';

/** Actions 要用到的游戏零件：begin() 时由 Game 装好 */
export interface ActionDeps {
  world: World;
  controller: Controller;
  scene: THREE.Scene;
  hud: Hud;
  panel: Panel;
  container: ContainerPanel;
  dyePanel: DyePanel;
  inventory: Inventory;
  /** 吃东西要动血条 */
  health: Health;
  day: DayCycle;
  /** 掉落物列表（Game 里会整个换掉，所以用 getter） */
  drops: () => ItemDrop[];
  /** 制作方法收集册：捡到 DIY 手册往里学 */
  book: RecipeBook;
  /** 快捷栏选到哪格（只读） */
  slot: () => number;
  /** 写回重生点 */
  setSpawn: (p: { x: number; y: number; z: number }) => void;
  /** 把坦克放到地上当载具（指着的格子放得下才行） */
  parkTank: (hit: BlockHit) => boolean;
  /** L 盖挑战房：指着 5×5 平地才盖得起来 */
  buildChallenge: (hit: BlockHit | null) => boolean;
  /** M 按挑战门：交门票进屋开打 / 免费出来 / 打架中不开门 */
  useChallengeDoor: (x: number, y: number, z: number) => void;
  /** DIY 手册是不是集齐了（集齐解锁隐藏配方） */
  bookFull: () => boolean;
  /** 动物 + 僵尸的管家（攻击打死了要它来收场掉肉） */
  mobs: Mobs;
}

export class Actions {
  /** 正在挖的格子 key 和进度（按住 P 攒进度） */
  mineKey = '';
  mineProgress = 0;
  private pickaxeCooldown = 0;
  private combat: MobCombat;
  private fires: FireSystem;

  constructor(private d: ActionDeps) {
    this.combat = new MobCombat(d.controller, d.inventory, d.slot, d.hud, d.mobs);
    this.fires = new FireSystem(d.scene);
  }

  clearFires(): void {
    this.fires.clear();
  }

  /** 按住 P 挖方块：指着一个方块攒进度，攒满才掉；拿着铁桶指到水 = 盛水 */
  updateMining(dt: number, hitX: number | null, hitY: number | null, hitZ: number | null, waterHit: BlockHit | null): void {
    const { controller, hud, world, inventory } = this.d;
    this.pickaxeCooldown = Math.max(0, this.pickaxeCooldown - dt);
    if (!controller.isDown('mine')) {
      this.mineKey = '';
      this.mineProgress = 0;
      hud.setProgress(0);
      return;
    }
    // 拿着桶，指线上碰到液体 = 盛起来：水只用铁桶；泽液铁桶/玻璃桶都行，同种最多 3 格不混装
    const held = inventory.hotbar[this.d.slot()];
    const wantsLiquid = held && (held.id === BUCKET || held.id === WATER_BUCKET || held.id === GLASS_BUCKET || held.id in SWAMP_FILL);
    if (wantsLiquid && waterHit) {
      if (controller.take('mine')) scoopBucket(world, inventory, this.d.slot(), waterHit, (text) => hud.showMessage(text));
      this.mineKey = '';
      this.mineProgress = 0;
      hud.setProgress(0);
      return;
    }
    if (hitX === null) {
      this.mineKey = '';
      this.mineProgress = 0;
      hud.setProgress(0);
      return;
    }
    const key = `${hitX},${hitY},${hitZ}`;
    if (key !== this.mineKey) {
      this.mineKey = key;
      this.mineProgress = 0;
    }
    const id = world.getBlock(hitX!, hitY!, hitZ!);
    const hardness = BLOCKS[id].hardness;
    if (!Number.isFinite(hardness)) return; // 基岩挖不动
    const creative = inventory.infinite;
    const goldPickaxe = held?.id === GOLD_PICKAXE;
    if (goldPickaxe && this.pickaxeCooldown > 0) return;
    const speed = goldPickaxe ? GOLDEN.PICKAXE_SPEED : 1;
    this.mineProgress += creative ? hardness : dt * speed;
    hud.setProgress(this.mineProgress / hardness);
    if (this.mineProgress >= hardness) {
      if (isChest(id) || isFurnace(id)) this.spillContainer(hitX!, hitY!, hitZ!);
      const drop = mine(world, { x: hitX!, y: hitY!, z: hitZ!, nx: 0, ny: 0, nz: 0 });
      if (drop !== AIR && !creative) inventory.add(drop, dropCountOf(id)); // 创造模式挖了不进包
      // 砍树额外掉橡胶：每挖掉一块木头掷一次骰子，中了掉 1~2 个
      if (id === WOOD && !creative && Math.random() < RUBBER_DROP.CHANCE) {
        const n = RUBBER_DROP.MIN + Math.floor(Math.random() * (RUBBER_DROP.MAX - RUBBER_DROP.MIN + 1));
        inventory.add(RUBBER, n);
        hud.showMessage(`树干里蹦出 ${n} 块橡胶！`);
      }
      if (goldPickaxe) this.pickaxeCooldown = GOLDEN.PICKAXE_COOLDOWN;
      this.mineKey = '';
      this.mineProgress = 0;
      hud.setProgress(0);
    }
  }

  /** L = 放：普通方块放旁边；稻粒种水面、水草种水底、水桶倒水这些特殊物品走自己的路 */
  placeItem(hit: BlockHit | null, body: PlayerBody): void {
    const { controller, world, inventory, hud } = this.d;
    if (!controller.take('place') || !hit) return;
    const stack = inventory.hotbar[this.d.slot()];
    const spend = () => {
      if (!inventory.infinite) {
        stack!.count--;
        if (stack!.count <= 0) inventory.hotbar[this.d.slot()] = null;
      }
    };
    if (!stack) {
      hud.showMessage('手里是空的，先挖点方块吧');
    } else if (FIRESTARTER_IDS.includes(stack.id)) {
      const blue = stack.id === SOUL_FIRESTARTER;
      const lit = this.fires.ignite(world, hit, blue ? 'blue' : 'red');
      hud.showMessage(lit ? (blue ? '灵火点燃了，蓝火会烧15秒' : '点燃红火，会烧10秒') : '要对着实地方块旁边的空格点火');
    } else if (stack.id === RICE_GRAIN) {
      // 稻粒不是方块：往水里播种，根要泡在水里才种得下
      if (plantSeed(world, hit)) spend();
      else hud.showMessage('稻谷要种在水面上');
    } else if (stack.id === CARROT) {
      // 胡萝卜不是方块：种在草地或泥土上
      if (plantCarrot(world, hit)) spend();
      else hud.showMessage('胡萝卜要种在草地上或泥土上');
    } else if (stack.id === WATER_BUCKET) {
      // 水桶 = 倒出一格水；一桶最多装 3 格，倒空了变回空桶；创造模式的桶一直有水
      if (pourWater(world, hit)) {
        if (!inventory.infinite) {
          stack.count--;
          if (stack.count <= 0) { stack.id = BUCKET; stack.count = 1; }
          else hud.showMessage(`倒出一格水，桶里还剩 ${stack.count} 格`);
        }
      } else {
        hud.showMessage('这里倒不了水');
      }
    } else if (stack.id in SWAMP_FILL) {
      // 泽液桶 = 倒出一格泽液；倒空了变回它本来的空桶（铁桶/玻璃桶）
      const fill = SWAMP_FILL[stack.id];
      if (pourWater(world, hit, fill.liquid)) {
        if (!inventory.infinite) {
          stack.count--;
          if (stack.count <= 0) { stack.id = fill.bucket; stack.count = 1; }
          else hud.showMessage(`倒出一格${BLOCKS[fill.liquid].cn}，桶里还剩 ${stack.count} 格`);
        }
      } else {
        hud.showMessage('这里倒不了');
      }
    } else if (stack.id === SEAWEED) {
      // 水草要指着水底的实地，种在它头顶那格水里
      if (placeSeaweed(world, hit)) spend();
      else hud.showMessage('水草要种在水底，脚下得是实地');
    } else if (stack.id === TANK) {
      // 坦克不是方块：放地上当车开，对着它按 M 上车
      if (this.d.parkTank(hit)) spend();
      else hud.showMessage('坦克要放在空地上');
    } else if (stack.id === CHALLENGE_HOUSE) {
      // 挑战房：要 5×5 平地 + 上面 7 层全空 + 场内没活物（盖不起来会提示原因）
      if (this.d.buildChallenge(hit)) spend();
    } else if (place(world, hit, stack.id, body, metaFromYaw(body.yaw))) {
      spend();
    } else if (isBed(stack.id)) {
      hud.showMessage('床要横着占两格：指的地方和你脸朝的前面那格都得是空的');
    }
  }

  /** 4/6 换快捷栏格子：返回新格子号（没变就还是原来的） */
  hotbarKeys(cur: number): number {
    const { controller, inventory, hud } = this.d;
    const n = inventory.hotbar.length;
    let next = cur;
    if (controller.take('prevSlot')) next = (cur + n - 1) % n;
    else if (controller.take('nextSlot')) next = (cur + 1) % n;
    if (next !== cur) hud.selectSlot(next);
    return next;
  }

  /** 掉落物滚一帧+吸进背包：DIY手册不进包，捡到直接学方法；返回还活着的掉落物 */
  collectDrops(dt: number, body: PlayerBody): ItemDrop[] {
    const { drops, world, inventory, hud, scene, book } = this.d;
    const papers: string[] = [];
    let goldenPaper = false;
    this.fires.update(dt);
    for (const d of drops()) {
      if (d.update(dt, world, body)) {
        if (d.itemId === DIY_MANUAL) {
          for (let i = 0; i < d.count; i++) papers.push(book.learn().text);
          hud.showMessage(d.count > 1
            ? `捡到 ${d.count} 本DIY手册，学会 ${d.count} 个方法！`
            : '捡到 DIY手册，学会新方法！');
        } else if (d.itemId === DIY_GOLD_MANUAL) {
          const learned = book.learnGolden();
          papers.push(learned.text);
          goldenPaper = true;
          hud.showMessage(learned.isNew ? '捡到金色 DIY 手册，学会黄金配方！' : '捡到金色 DIY 手册，复习了一条黄金配方！');
        } else {
          inventory.add(d.itemId, d.count);
          hud.showMessage(`+${d.count} ${BLOCKS[d.itemId].cn}`);
        }
      }
      if (d.dead) scene.remove(d.mesh);
    }
    const unlocks = book.checkCollectionUnlocks(inventory);
    if (unlocks.length) {
      papers.push(...unlocks);
      goldenPaper = true;
      hud.showMessage('收集条件达成！获得新的金色 DIY 手册');
    }
    if (papers.length) book.showPaper(papers.join('\n'), goldenPaper);
    return drops().filter((d) => !d.dead);
  }

  /** E 吃东西：按食物表扣血/回血；腌菜桶吃完脚底生风 1 分钟；药水瓶喝了各有各的效 */
  eatKey(body: PlayerBody): void {
    const { controller, inventory, hud, health } = this.d;
    if (!controller.take('eat')) return;
    const s = inventory.hotbar[this.d.slot()];
    // 喝药水瓶：喝完瓶子还回来
    if (s && POTION_IDS.includes(s.id)) {
      if (!inventory.infinite) {
        s.count--;
        if (s.count <= 0) inventory.hotbar[this.d.slot()] = null;
        inventory.add(GLASS_BOTTLE, 1); // 喝完瓶子还回来
      }
      if (s.id === POTION_POISON) {
        health.poison(POTION.POISON.dmg, POTION.POISON.every, POTION.POISON.dur);
        hud.showMessage(`咕咚！喝下毒药，${POTION.POISON.dur} 秒里会一直掉血！`);
      } else if (s.id === POTION_DEADLY) {
        health.poison(POTION.DEADLY.dmg, POTION.DEADLY.every, POTION.DEADLY.dur);
        hud.showMessage(`咕咚！是剧毒！${POTION.DEADLY.dur} 秒里掉血飞快！`);
      } else if (s.id === POTION_PHANTOM) {
        body.swayT = POTION.HALLUCINATE;
        body.swayPhase = 0;
        health.poison(SWAMP_HURT.PHANTOM.dmg, SWAMP_HURT.PHANTOM.every, POTION.HALLUCINATE);
        hud.showMessage('咕咚！天旋地转，镜头自己晃起来了……');
      } else if (s.id === POTION_BREATH) {
        body.breathT = POTION.BREATH;
        hud.showMessage(`咕咚！${POTION.BREATH} 秒水下呼吸，去潜水吧！`);
      } else if (s.id === POTION_ICE) {
        health.damage(GOLDEN.FREEZE_DAMAGE);
        body.frozenT = GOLDEN.FREEZE_SECONDS;
        hud.showMessage('好冷！扣 2 点血，冻住 2 秒');
      }
      return;
    }
    const d = s ? health.eat(s.id) : null;
    if (s && d !== null) {
      if (!inventory.infinite) {
        s.count--;
        if (s.count <= 0) inventory.hotbar[this.d.slot()] = null;
      }
      if (s.id === PICKLE_BARREL) {
        body.speedBoostT = BOOST.SECONDS; // 腌菜桶吃完跑得快
        hud.showMessage(`真香！+${d} 血，脚底生风 ${BOOST.SECONDS} 秒！`);
      } else {
        hud.showMessage(d < 0 ? `好难吃！${d} 血` : `真香！+${d} 血`);
      }
    } else {
      hud.showMessage('这个不能吃');
    }
  }

  /** 背包面板开着：9/ESC 关门，4/6 移动选中框，K 把选中的一摞分 1 个出来 */
  panelKeys(): void {
    const { controller, panel } = this.d;
    if (controller.take('inventory') || controller.take('pause')) {
      panel.close();
      return;
    }
    if (controller.take('prevSlot')) panel.moveSel(-1);
    if (controller.take('nextSlot')) panel.moveSel(1);
    if (controller.take('split')) panel.splitSel();
    // 背包里也能用隐藏配方：白框停在 64 生肉上按 M 照样变铁粒
    if (controller.take('door') && this.meatMagic(panel.selStack())) panel.refresh();
  }

  /** 箱子/熔炉面板开着：同样鼠标操作，键盘只管关门 */
  containerKeys(): void {
    if (this.d.controller.take('inventory') || this.d.controller.take('pause') || this.d.controller.take('door')) {
      this.d.container.close();
    }
  }

  /** M 键 = 使用：门→开关，箱子→开背包界面，熔炉→开烧制界面，工作台→3×3 大合成台，染色台→染地毯 */
  useBlock(hitX: number, hitY: number, hitZ: number): void {
    const { world, container, panel, inventory, dyePanel, hud, day, book } = this.d;
    const id = world.getBlock(hitX, hitY, hitZ);
    if (id === CHALLENGE_DOOR) {
      this.d.useChallengeDoor(hitX, hitY, hitZ); // 挑战门：交门票/出门/打架不开
    } else if (isDoor(id)) {
      useDoor(world, { x: hitX, y: hitY, z: hitZ, nx: 0, ny: 0, nz: 0 });
    } else if (isChest(id)) {
      container.openChest(world.chestAt(hitX, hitY, hitZ), id === SOUL_CHEST);
    } else if (isFurnace(id)) {
      container.openFurnace(world.furnaceAt(hitX, hitY, hitZ));
    } else if (id === CHEM_DECOMP || id === GOLD_CHEM_DECOMP) {
      const held = inventory.hotbar[this.d.slot()];
      if (held?.id === WATER_BUCKET) {
        if (!inventory.infinite) {
          held.count--;
          if (held.count <= 0) { held.id = BUCKET; held.count = 1; }
        }
        inventory.add(HYDROGEN, 1);
        const manual = book.recordWaterUse();
        if (manual) book.showPaper(manual, true);
        hud.showMessage(manual ?? '倒了一格水进去，分解出氢气！氢气瓶 +1');
      } else if (id === GOLD_CHEM_DECOMP && held?.id === ICE) {
        if (!inventory.infinite) {
          held.count--;
          if (held.count <= 0) inventory.hotbar[this.d.slot()] = null;
        }
        inventory.add(ICE_MOLECULE, 1);
        hud.showMessage('冰分解成了冰分子！');
      } else {
        hud.showMessage(id === GOLD_CHEM_DECOMP
          ? '拿着水桶分解水，或拿着冰对它按 M 分解冰分子'
          : '拿着水桶对它按 M，把水倒进去分解出氢气');
      }
    } else if (id === CRAFTING_TABLE || id === STAR_TABLE) {
      panel.openTable(); // 星空工作台和普通工作台一样开 3×3 大合成台
    } else if (id === DYE_TABLE || id === STAR_DYE_TABLE || id === GOLD_DYE_TABLE) {
      const star = id !== DYE_TABLE;
      const gold = id === GOLD_DYE_TABLE;
      const taken = inventory.takeAny(DYEABLE_CARPETS);
      if (taken === null && !star) hud.showMessage('背包里没有地毯，染不了色');
      else dyePanel.open(taken, star, gold);
    } else if (isBed(id)) {
      // 床：天黑了按 M = 睡觉，屏幕黑一下就天亮；白天不让睡
      if (!day.trySleep()) {
        hud.showMessage('天还没黑，睡不着');
      } else {
        // 睡过这张床 → 它就是重生点（换一张床睡就换成新的）
        this.setBedSpawn(hitX, hitY, hitZ);
        hud.showMessage('重生点已设置，晚安');
      }
    }
  }

  /** 指着活物：P 攻击，羊按 M 驯服/切换跟随 */
  attackMob(mob: MobHit, body: PlayerBody, dt: number): void {
    this.mineKey = ''; this.mineProgress = 0; this.d.hud.setProgress(0);
    this.combat.update(mob, body, dt, (sheep) => this.useSheep(sheep));
  }

  /** 对羊按 M：没驯服就拿蒲公英喂它（吃 1 朵）；驯过了就在"原地等待"和"跟着走"之间切换 */
  useSheep(sheep: Animal): void {
    const { inventory, hud } = this.d;
    if (!sheep.tamed) {
      const s = inventory.hotbar[this.d.slot()];
      if (s?.id === DANDELION) {
        if (!inventory.infinite) {
          s.count--;
          if (s.count <= 0) inventory.hotbar[this.d.slot()] = null;
        }
        sheep.tamed = true;
        hud.showMessage('驯服成功！它会跟着你，按 M 让它原地等待');
      } else {
        hud.showMessage('拿着蒲公英对着羊按 M 就能驯服它');
      }
      return;
    }
    sheep.waiting = !sheep.waiting;
    hud.showMessage(sheep.waiting ? '羊在原地等你' : '羊跟上来了');
  }

  /** 睡过的床变成重生点：优先站床边地板，四周都堵着才站床面上 */
  setBedSpawn(bx: number, by: number, bz: number): void {
    // 床边地板的高度就是床底那一格（by），不是床面；两格高的小屋也能站下
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      const sx = bx + 0.5 + dx;
      const sz = bz + 0.5 + dz;
      if (!collidesAABB(this.d.world, sx, by, sz, PLAYER.WIDTH, PLAYER.HEIGHT)) {
        this.d.setSpawn({ x: sx, y: by, z: sz });
        return;
      }
    }
    // 床边全堵了才站床面；床面顶头（比如矮房顶）就保留原来的出生点
    if (!collidesAABB(this.d.world, bx + 0.5, by + 0.3, bz + 0.5, PLAYER.WIDTH, PLAYER.HEIGHT)) {
      this.d.setSpawn({ x: bx + 0.5, y: by + 0.3, z: bz + 0.5 });
    }
  }

  /** 出生点卡墙里时自救：先试旁边，不行就往上一格一格挪（会站到房顶上） */
  freeSpot(x: number, y: number, z: number): { x: number; y: number; z: number } {
    for (let cx = Math.floor((x - 1) / CHUNK.SIZE); cx <= Math.floor((x + 1) / CHUNK.SIZE); cx++) {
      for (let cz = Math.floor((z - 1) / CHUNK.SIZE); cz <= Math.floor((z + 1) / CHUNK.SIZE); cz++) this.d.world.ensureChunk(cx, cz);
    }
    const W = PLAYER.WIDTH, H = PLAYER.HEIGHT;
    if (!collidesAABB(this.d.world, x, y, z, W, H)) return { x, y, z };
    const fy = Math.floor(y); // 卡住时先按地板高度试 8 个方向
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      if (!collidesAABB(this.d.world, x + dx, fy, z + dz, W, H)) {
        return { x: x + dx, y: fy, z: z + dz };
      }
    }
    for (let dy = 1; dy <= 5; dy++) {
      if (!collidesAABB(this.d.world, x, y + dy, z, W, H)) return { x, y: y + dy, z };
    }
    return { x, y, z };
  }

  /** 睡醒了：自动站回床边（床边就是重生点） */
  wakeUp(body: PlayerBody, spawn: { x: number; y: number; z: number }): void {
    const p = this.freeSpot(spawn.x, spawn.y, spawn.z);
    body.x = p.x; body.y = p.y; body.z = p.z;
    body.vx = body.vy = body.vz = 0;
    body.fellFrom = body.y;
  }

  /** 拆掉的容器把存货撒地上（掉落物形式） */
  spillContainer(x: number, y: number, z: number): void {
    const { world, scene } = this.d;
    const drops = this.d.drops();
    const pk = `${x},${y},${z}`;
    const spill = (slots: ({ id: number; count: number } | null)[] | undefined) => {
      slots?.forEach((s) => {
        if (s) {
          const d = new ItemDrop(s.id, s.count, x + 0.5, y + 0.5, z + 0.5);
          scene.add(d.mesh);
          drops.push(d);
        }
      });
    };
    spill(world.chests.get(pk));
    const f = world.furnaces.get(pk);
    if (f) spill(f.slots);
  }

  /** 把一摞 64 生肉变 3 铁粒（手册集齐才解锁的隐藏配方）。成功返回 true */
  private meatMagic(s: { id: number; count: number } | null): boolean {
    if (s?.id === RAW_MEAT && s.count === STACK_MAX && this.d.bookFull()) {
      s.id = IRON_NUGGET;
      s.count = 3;
      this.d.hud.showMessage('秘方生效！64 个生肉变成了 3 个铁粒');
      return true;
    }
    return false;
  }

  /** 集齐 DIY 手册后的隐藏配方：手里拿一整摞（64）生肉按 M → 变成 3 个铁粒 */
  tryMeatMagic(): boolean {
    return this.meatMagic(this.d.inventory.hotbar[this.d.slot()]);
  }

  /** 睡醒时：星星碎片和芒星碎片各半概率，只掉一颗（自己熬夜到天亮没有这个福利） */
  dropStarShard(sx: number, sy: number, sz: number): void {
    const itemId = Math.random() < DAY.MANG_CHANCE ? MANG_SHARD : STAR_SHARD;
    if (dropShardNear(this.d.world, this.d.scene, this.d.drops(), itemId, sx, sy, sz)) {
      this.d.hud.showMessage(`睡着的时候，天上掉了一颗${BLOCKS[itemId].cn}下来！`, 3);
    }
  }

}
