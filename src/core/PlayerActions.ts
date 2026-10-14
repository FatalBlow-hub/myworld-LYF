/** 玩家对方块做的事 — 挖掘进度 / 放置 / 使用（门箱炉/工作台/染色台/床）/ 拆容器撒货 / 隐藏配方。
 *  留在 core 层是因为这些动作会直接开 UI 面板（工作台、染色台），按依赖铁律下层不能反向依赖 ui。 */

import * as THREE from 'three';
import { GOLDEN, RUBBER_DROP, STACK_MAX } from '../config';
import { FireSystem } from '../entities/Fire';
import { ItemDrop } from '../entities/ItemDrop';
import { DropSink, spawnDrop } from '../entities/drops';
import { BlockHit, mine, place, placeSeaweed, plantCarrot, plantSeed, pourWater, useDoor } from '../interact/BlockPicker';
import { scoopBucket } from '../interact/LiquidBuckets';
import { Controller } from '../player/Controller';
import { Inventory } from '../player/Inventory';
import { PlayerBody } from '../player/Physics';
import { ContainerPanel } from '../ui/Container';
import { DyePanel } from '../ui/DyePanel';
import { Hud } from '../ui/Hud';
import { Panel } from '../ui/Panel';
import { RecipeBook } from '../ui/RecipeBook';
import {
  AIR, BLOCKS, BUCKET, CARROT, CHALLENGE_DOOR, CHALLENGE_HOUSE, CHEM_DECOMP, CRAFTING_TABLE,
  DYE_TABLE, DYEABLE_CARPETS, FIRESTARTER_IDS, GLASS_BUCKET, HYDROGEN, ICE, IRON_NUGGET, RAW_MEAT,
  RICE_GRAIN, RUBBER, SEAWEED, SOUL_CHEST, SOUL_FIRESTARTER, STAR_DYE_TABLE, STAR_TABLE, SWAMP_FILL,
  TANK, WATER_BUCKET, WOOD,
  dropCountOf, isBed, isChest, isDoor, isFurnace,
} from '../world/Block';
import { GOLD_CHEM_DECOMP, GOLD_DYE_TABLE, GOLD_PICKAXE, ICE_MOLECULE } from '../world/GoldenItems';
import { metaFromYaw } from '../world/Shapes';
import { World } from '../world/World';
import { DayCycle } from './DayCycle';

export interface PlayerActionDeps {
  world: World;
  controller: Controller;
  scene: THREE.Scene;
  hud: Hud;
  panel: Panel;
  container: ContainerPanel;
  dyePanel: DyePanel;
  inventory: Inventory;
  /** 快捷栏选到哪格（只读） */
  slot: () => number;
  book: RecipeBook;
  day: DayCycle;
  /** 当前掉落物列表（会被整体替换，所以用 getter） */
  drops: () => ItemDrop[];
  /** 点火/烧火系统（放打火石用） */
  fires: FireSystem;
  /** 把坦克放到地上当载具（指着的格子放得下才行） */
  parkTank: (hit: BlockHit) => boolean;
  /** L 盖挑战房：指着 5×5 平地才盖得起来 */
  buildChallenge: (hit: BlockHit | null) => boolean;
  /** M 按挑战门：交门票进屋开打 / 免费出来 / 打架中不开门 */
  useChallengeDoor: (x: number, y: number, z: number) => void;
  /** 睡过的床设成重生点 */
  setBedSpawn: (x: number, y: number, z: number) => void;
  /** DIY 手册是不是集齐了（集齐解锁隐藏配方） */
  bookFull: () => boolean;
}

export class PlayerActions {
  /** 正在挖的格子 key 和进度（按住 P 攒进度） */
  mineKey = '';
  mineProgress = 0;
  private pickaxeCooldown = 0;

  constructor(private d: PlayerActionDeps) {}

  /** 掉落物归宿（每次现取，列表可能被换掉） */
  private get sink(): DropSink {
    return { scene: this.d.scene, drops: this.d.drops() };
  }

  /** 中断挖掘进度（攻击活物、开坦克时调用） */
  cancelMining(): void {
    this.mineKey = '';
    this.mineProgress = 0;
  }

  /** 按住 P 挖方块：指着一个方块攒进度，攒满才掉；拿着铁桶指到水 = 盛水 */
  updateMining(dt: number, hitX: number | null, hitY: number | null, hitZ: number | null, waterHit: BlockHit | null): void {
    const { controller, hud, world, inventory } = this.d;
    this.pickaxeCooldown = Math.max(0, this.pickaxeCooldown - dt);
    if (!controller.isDown('mine')) {
      this.cancelMining();
      hud.setProgress(0);
      return;
    }
    // 拿着桶，指线上碰到液体 = 盛起来：水只用铁桶；泽液铁桶/玻璃桶都行，同种最多 3 格不混装
    const held = inventory.hotbar[this.d.slot()];
    const wantsLiquid = held && (held.id === BUCKET || held.id === WATER_BUCKET || held.id === GLASS_BUCKET || held.id in SWAMP_FILL);
    if (wantsLiquid && waterHit) {
      if (controller.take('mine')) scoopBucket(world, inventory, this.d.slot(), waterHit, (text) => hud.showMessage(text));
      this.cancelMining();
      hud.setProgress(0);
      return;
    }
    if (hitX === null) {
      this.cancelMining();
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
      this.cancelMining();
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
      const lit = this.d.fires.ignite(world, hit, blue ? 'blue' : 'red');
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
        this.d.setBedSpawn(hitX, hitY, hitZ);
        hud.showMessage('重生点已设置，晚安');
      }
    }
  }

  /** 拆掉的容器把存货撒地上（掉落物形式） */
  spillContainer(x: number, y: number, z: number): void {
    const { world } = this.d;
    const sink = this.sink;
    const pk = `${x},${y},${z}`;
    const spill = (slots: ({ id: number; count: number } | null)[] | undefined) => {
      slots?.forEach((s) => {
        if (s) spawnDrop(sink, s.id, s.count, x + 0.5, y + 0.5, z + 0.5);
      });
    };
    spill(world.chests.get(pk));
    const f = world.furnaces.get(pk);
    if (f) spill(f.slots);
  }

  /** 把一摞 64 生肉变 3 铁粒（手册集齐才解锁的隐藏配方）。成功返回 true */
  meatMagic(s: { id: number; count: number } | null): boolean {
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
}
