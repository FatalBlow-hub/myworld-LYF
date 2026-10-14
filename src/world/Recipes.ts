/** 合成配方 — 把材料放进 2×2 格子，种类和数量对上就出成品（不看摆放位置）
 *  还支持拆解：只放一个成品进格子 → 吐出原材料 */

import { BUCKET_WATER_MAX } from '../config';
import {
  BAG_WOOL, BED_IDS, BED_STAR, BLOCKS, BLOOD_MEAT, BLUE_BLOCK, BLUE_DIAMOND, BLUE_SHARD, BRICK, BUCKET, CARPET_BLOOD, CARPET_IDS, CARPET_STAR, CARPET_WHITE, CHEST, COBBLE,
  COOKED_MEAT, CRAFTING_TABLE, DOOR_CLOSED,
  DYE_BLACK, DYE_BLOOD, DYE_BLUE, DYE_GRAY, DYE_GREEN, DYE_ORANGE, DYE_PINK, DYE_RED, DYE_TABLE, DYE_YELLOW,
  DYE_WHITE, DYE_PURPLE, DYE_SWAN, DYE_LIGHTGREEN, DYE_STAR, DYE_DEEPGREEN,
  GLASS_BOTTLE, GLASS_BUCKET, GLASS_CONE, GLASS_SHARD,
  POTION_BREATH, POTION_DEADLY, POTION_PHANTOM, POTION_POISON,
  SWAMP_DEEP, SWAMP_DROWN, SWAMP_FILL, SWAMP_LIGHT, SWAMP_MID, SWAMP_PHANTOM, WATER,
  FEATHER_BLACK, FEATHER_GRAY, FEATHER_WHITE,
  MANHOLE, STAR_DYE_TABLE,
  FENCE, FOUNTAIN, FURNACE, GLASS, GOLD_BLOCK, GOLD_INGOT, GOLD_NUGGET, GRASS,
  IRON_BLOCK, IRON_INGOT, IRON_NUGGET, LADDER,
  CHALLENGE_HOUSE, CHEM_DECOMP, COAL, COAL_BAR, COAL_CHUNK, COAL_DUST, COAL_FIRESTARTER, COBBLE_SHARD, HYDROGEN, HYDROGEN_ENGINE, HYDROGEN_FIRESTARTER, HYDROGEN_LAMP, MANG_FIRESTARTER, MANG_LAMP, MANG_SHARD, PICKLE_BARREL, ROLLER_SKATES, RUBBER, SOUL_FIRESTARTER, STAR_FIRESTARTER, STAR_LAMP, TANK, TANK_BULLET, WHEEL,
  PLANKS, RAW_MEAT, SAND, SANDSTONE, SIGN, SNOW,
  SOUL_CHEST, SOUL_DYE, SOUL_FURNACE, SOUL_GRASS, SOUL_STONE_SLAB,
  SOUL_WOOD_SLAB, STAR_SHARD, STAR_TABLE, STAR_WOOL, STICK, STONE, STONE_SLAB, TALL_GRASS, WOOD, WOOD_SLAB, WOOD_STAIRS,
  WOOL_BLACK, WOOL_BLUE, WOOL_GRAY, WOOL_GREEN, WOOL_IDS, WOOL_ORANGE, WOOL_PINK, WOOL_RED, WOOL_WHITE, WOOL_YELLOW,
  Slots,
} from './Block';
import {
  BAG_GOLD, DYE_GOLD, GOLD_CHEM_DECOMP, GOLD_CRAFT_TABLE, GOLD_DYE_TABLE, GOLD_PICKAXE,
  ICE_MOLECULE, POTION_ICE,
} from './GoldenItems';

export interface Recipe {
  /** 做出来的是什么 */
  out: number;
  outCount: number;
  /** 需要的材料：[方块/物品ID, 数量] */
  needs: [number, number][];
  /** 可批量：材料放整数倍就出几份成品（比如 10 羊毛 = 10 地毯） */
  scale?: boolean;
  /** 安静配方：手册里不单独列（比如"任意羊毛"展开成的 7 条），由手写说明代替 */
  quiet?: boolean;
  pattern?: (number | null)[];
}

export const RECIPES: Recipe[] = [
  // —— 基础 ——
  { out: PLANKS, outCount: 4, needs: [[WOOD, 1]] },
  { out: STICK, outCount: 4, needs: [[PLANKS, 3]] }, // 3 木板，不然跟门的配方撞车
  { out: CRAFTING_TABLE, outCount: 1, needs: [[PLANKS, 4]] },
  { out: CHEST, outCount: 1, needs: [[PLANKS, 8]] },
  { out: DOOR_CLOSED, outCount: 1, needs: [[PLANKS, 2]] }, // 2×2 每格 1 个，最多 4 材料，6 木板放不下
  { out: WOOD_SLAB, outCount: 6, needs: [[PLANKS, 3]] },
  { out: WOOD_STAIRS, outCount: 4, needs: [[PLANKS, 5]] },
  { out: FENCE, outCount: 2, needs: [[STICK, 4]] },
  { out: SIGN, outCount: 3, needs: [[PLANKS, 6], [STICK, 2]] },
  // —— 石头系 ——
  { out: FURNACE, outCount: 1, needs: [[COBBLE, 3], [COAL_DUST, 5]] }, // 熔炉：3 原石 + 5 煤粉
  // —— 煤系列：挖地下煤矿得到煤块，再加工 ——
  { out: COAL_BAR, outCount: 1, needs: [[COAL_CHUNK, 3]] },   // 3 煤块 → 1 煤条
  { out: COAL, outCount: 1, needs: [[COAL_CHUNK, 2]] },       // 2 煤块 → 1 煤炭
  { out: COAL_DUST, outCount: 3, needs: [[COAL_CHUNK, 1]] },  // 1 煤块 → 3 煤粉
  // —— 能灯：玻璃罩子 + 发光料 ——
  { out: MANG_LAMP, outCount: 1, needs: [[GLASS, 1], [MANG_SHARD, 2]] },     // 玻璃 + 2 芒星碎片 → 芒能灯（淡黄）
  { out: STAR_LAMP, outCount: 1, needs: [[GLASS, 1], [STAR_SHARD, 3]] },     // 玻璃 + 3 星星碎片 → 星能灯（青白）
  { out: HYDROGEN_LAMP, outCount: 1, needs: [[GLASS, 1], [HYDROGEN, 2]] },   // 玻璃 + 2 氢气瓶 → 氢能灯（绿）
  { out: ROLLER_SKATES, outCount: 1, needs: [[WHEEL, 8], [RUBBER, 4]] },     // 8 轮子 + 4 橡胶 → 轮滑鞋（耐久 3 次）
  { out: STONE_SLAB, outCount: 6, needs: [[COBBLE, 3]] },
  { out: SANDSTONE, outCount: 1, needs: [[SAND, 4]] },
  { out: BRICK, outCount: 1, needs: [[COBBLE, 4]] },
  // —— 灵魂蓝染色 ——
  { out: SOUL_CHEST, outCount: 1, needs: [[CHEST, 1], [SOUL_DYE, 1]] },
  { out: SOUL_WOOD_SLAB, outCount: 1, needs: [[WOOD_SLAB, 1], [SOUL_DYE, 1]] },
  { out: SOUL_STONE_SLAB, outCount: 1, needs: [[STONE_SLAB, 1], [SOUL_DYE, 1]] },
  { out: SOUL_FURNACE, outCount: 1, needs: [[FURNACE, 1], [SOUL_DYE, 1]] },
  // —— 地毯和染色台 ——
  { out: CARPET_WHITE, outCount: 1, needs: [[WOOL_WHITE, 1]], scale: true }, // 几个羊毛 = 几个地毯
  // 6 种颜料 + 工作台：7 样东西只有 3×3 大合成台放得下
  {
    out: DYE_TABLE, outCount: 1,
    needs: [[CRAFTING_TABLE, 1], [DYE_RED, 1], [DYE_YELLOW, 1], [DYE_BLUE, 1], [DYE_GREEN, 1], [DYE_PINK, 1], [DYE_ORANGE, 1]],
  },
  // —— 床：3 木头 + 1 地毯，什么颜色地毯出什么颜色床 ——
  ...CARPET_IDS.map((carpet, i) => ({
    out: BED_IDS[i], outCount: 1,
    needs: [[WOOD, 3], [carpet, 1]] as [number, number][],
  })),
  // —— 矿物：3 粒拼 1 锭，3 碎拼 1 钻；4 锭砌 1 块；9 碎摆满大合成台出钻石块 ——
  { out: IRON_INGOT, outCount: 1, needs: [[IRON_NUGGET, 3]] },
  { out: BUCKET, outCount: 1, needs: [[IRON_NUGGET, 7]] }, // 7 铁粒拼 1 铁桶
  { out: GOLD_INGOT, outCount: 1, needs: [[GOLD_NUGGET, 3]] },
  { out: BLUE_DIAMOND, outCount: 1, needs: [[BLUE_SHARD, 3]] },
  { out: IRON_BLOCK, outCount: 1, needs: [[IRON_INGOT, 4]] },
  { out: GOLD_BLOCK, outCount: 1, needs: [[GOLD_INGOT, 4]] },
  { out: BLUE_BLOCK, outCount: 1, needs: [[BLUE_SHARD, 9]] },
  // —— 梯子和喷泉 ——
  { out: LADDER, outCount: 3, needs: [[WOOD, 7]] },
  { out: FOUNTAIN, outCount: 1, needs: [[STONE, 9], [SNOW, 1]] },
  // —— 星空系列：星星碎片是睡觉才掉的宝贝，羊身上可得不到 ——
  // 碎片 + 白羊毛：这条会进手册；其余 6 种颜色羊毛也能合（quiet 不重复进手册）
  { out: STAR_WOOL, outCount: 1, needs: [[STAR_SHARD, 1], [WOOL_WHITE, 1]] },
  ...WOOL_IDS.slice(1).map((w) => ({
    out: STAR_WOOL, outCount: 1, quiet: true,
    needs: [[STAR_SHARD, 1], [w, 1]] as [number, number][],
  })),
  { out: STAR_TABLE, outCount: 1, needs: [[STAR_SHARD, 1], [CRAFTING_TABLE, 1]] },
  // —— 血尸红：白地毯 + 血尸红颜料 = 血尸红地毯 ——
  { out: CARPET_BLOOD, outCount: 1, needs: [[CARPET_WHITE, 1], [DYE_BLOOD, 1]] },
  // —— 化学系列：草腌菜桶、铁粒拆水出氢气、氢气引擎 ——
  { out: PICKLE_BARREL, outCount: 1, needs: [[TALL_GRASS, 64]] },  // 一整摞杂草腌一桶（草方块挖了只掉泥土，得不到）
  { out: CHEM_DECOMP, outCount: 1, needs: [[IRON_NUGGET, 4]] },    // 4 铁粒拼 1 拆解器
  { out: HYDROGEN_ENGINE, outCount: 1, needs: [[HYDROGEN, 10], [IRON_BLOCK, 1]] }, // 引擎要 10 瓶气
  // —— 坦克线：轮子要橡胶；坦克集齐颜料铁块和引擎，5 样材料只有大合成台放得下 ——
  { out: WHEEL, outCount: 1, needs: [[IRON_NUGGET, 1], [RUBBER, 1], [DYE_BLACK, 1]] },
  { out: TANK, outCount: 1, needs: [[DYE_GREEN, 2], [DYE_RED, 1], [DYE_BLACK, 1], [IRON_BLOCK, 3], [HYDROGEN_ENGINE, 1], [WHEEL, 8]] }, // 6 样材料：颜料铁块引擎之外还得有 8 个轮子
  { out: TANK_BULLET, outCount: 1, needs: [[IRON_NUGGET, 2]] }, // 两铁粒拼一发炮弹
  // —— 井盖和星空染色台 ——
  { out: MANHOLE, outCount: 1, needs: [[IRON_INGOT, 1]] }, // 一块铁锭压出一块井盖
  { out: STAR_DYE_TABLE, outCount: 1, needs: [[DYE_TABLE, 1], [STAR_SHARD, 3]] }, // 染色台 + 3 星星碎片
  { out: BED_STAR, outCount: 1, needs: [[WOOD, 3], [CARPET_STAR, 1]] }, // 星空床：3 木头 + 星空地毯
  // —— 挑战房：一整摞石头 + 一扇门，放下自己长成打怪房 ——
  { out: CHALLENGE_HOUSE, outCount: 1, needs: [[COBBLE, 64], [DOOR_CLOSED, 1]] }, // 64 原石 + 1 门
  // —— 玻璃小件：碎片拼回玻璃、磨锥子、吹瓶子、箍玻璃桶 ——
  { out: GLASS, outCount: 1, needs: [[GLASS_SHARD, 4]] },        // 4 碎片拼回一块玻璃
  { out: GLASS_CONE, outCount: 1, needs: [[GLASS_SHARD, 3]] },   // 3 碎片磨一支玻璃锥（小刀）
  { out: GLASS_BOTTLE, outCount: 1, needs: [[GLASS_SHARD, 2]] }, // 2 碎片吹一个玻璃瓶
  { out: GLASS_BUCKET, outCount: 1, needs: [[GLASS_SHARD, 5]] }, // 5 碎片箍一个玻璃桶
  // —— 药水瓶：一格泽液灌进一个玻璃瓶 ——
  { out: POTION_POISON, outCount: 1, needs: [[SWAMP_MID, 1], [GLASS_BOTTLE, 1]] },
  { out: POTION_PHANTOM, outCount: 1, needs: [[SWAMP_PHANTOM, 1], [GLASS_BOTTLE, 1]] },
  { out: POTION_DEADLY, outCount: 1, needs: [[SWAMP_DEEP, 1], [GLASS_BOTTLE, 1]] },
  { out: POTION_BREATH, outCount: 1, needs: [[SWAMP_DROWN, 1], [GLASS_BOTTLE, 1]] },
  // —— 深绿颜料：黑 + 绿融出来的 ——
  { out: DYE_DEEPGREEN, outCount: 1, needs: [[DYE_BLACK, 1], [DYE_GREEN, 1]] },
  // 打火石配方排在末尾并隐藏自动条目，手册会把说明追加到旧条目之后
  { out: COBBLE_SHARD, outCount: 2, needs: [[COBBLE, 1]], quiet: true },
  { out: COAL_FIRESTARTER, outCount: 1, needs: [[COBBLE_SHARD, 2], [COAL_DUST, 1]], quiet: true },
  { out: MANG_FIRESTARTER, outCount: 1, needs: [[COBBLE_SHARD, 2], [MANG_SHARD, 1]], quiet: true },
  { out: STAR_FIRESTARTER, outCount: 1, needs: [[COBBLE_SHARD, 2], [STAR_SHARD, 1]], quiet: true },
  { out: SOUL_FIRESTARTER, outCount: 1, needs: [[COAL_FIRESTARTER, 1], [SOUL_DYE, 1]], quiet: true },
  { out: HYDROGEN_FIRESTARTER, outCount: 1, needs: [[COBBLE, 2], [HYDROGEN, 1]], quiet: true },
  { out: DYE_GOLD, outCount: 1, needs: [[DYE_YELLOW, 1], [GOLD_NUGGET, 1]], quiet: true },
  { out: BAG_GOLD, outCount: 1, needs: [[DYE_GOLD, 1], [BAG_WOOL, 1]], quiet: true },
  { out: GOLD_CRAFT_TABLE, outCount: 1, needs: [[CRAFTING_TABLE, 1], [GOLD_BLOCK, 1]], quiet: true },
  { out: GOLD_DYE_TABLE, outCount: 1, needs: [[STAR_DYE_TABLE, 1], [GOLD_BLOCK, 1]], quiet: true },
  { out: GOLD_CHEM_DECOMP, outCount: 1, needs: [[CHEM_DECOMP, 1], [GOLD_NUGGET, 2]], quiet: true },
  { out: POTION_ICE, outCount: 1, needs: [[ICE_MOLECULE, 2], [GLASS_BOTTLE, 1]], quiet: true },
  {
    out: GOLD_PICKAXE, outCount: 1, needs: [[GOLD_NUGGET, 3], [STICK, 2]], quiet: true,
    pattern: [GOLD_NUGGET, GOLD_NUGGET, GOLD_NUGGET, null, STICK, null, null, STICK, null],
  },
];

/** 星空染色台的颜料融合表：放进材料颜料 → 出新颜料（只有星空染色台能干这活） */
export const FUSIONS: Recipe[] = [
  { out: DYE_DEEPGREEN, outCount: 1, needs: [[DYE_BLACK, 1], [DYE_GREEN, 1]] },
  { out: DYE_ORANGE, outCount: 2, needs: [[DYE_RED, 1], [DYE_YELLOW, 1]] },      // 红+黄 → 橙×2
  { out: DYE_GREEN, outCount: 2, needs: [[DYE_BLUE, 1], [DYE_YELLOW, 1]] },      // 蓝+黄 → 绿×2
  { out: DYE_PINK, outCount: 2, needs: [[DYE_RED, 1], [DYE_WHITE, 1]] },         // 红+白 → 粉×2
  { out: DYE_BLACK, outCount: 1, needs: [[DYE_RED, 1], [DYE_YELLOW, 1], [DYE_BLUE, 1]] }, // 三原色 → 黑
  { out: DYE_PURPLE, outCount: 1, needs: [[DYE_YELLOW, 1], [DYE_BLUE, 1]] },     // 黄+蓝 → 紫（和绿是两种做法，自己选）
  { out: DYE_SWAN, outCount: 2, needs: [[DYE_WHITE, 1], [DYE_YELLOW, 1]] },      // 白+黄 → 天鹅黄×2
  { out: DYE_GRAY, outCount: 1, needs: [[DYE_BLACK, 1], [DYE_WHITE, 1]] },       // 黑+白 → 灰
  { out: DYE_STAR, outCount: 1, needs: [[DYE_BLUE, 1], [DYE_WHITE, 1], [DYE_PINK, 1]] },  // 蓝+白+粉 → 星空色
  { out: DYE_LIGHTGREEN, outCount: 1, needs: [[DYE_WHITE, 1], [DYE_GREEN, 1]] }, // 白+绿 → 淡草绿
  { out: DYE_BLOOD, outCount: 1, needs: [[DYE_GRAY, 1], [DYE_RED, 1]] },         // 灰+红 → 血尸红（只能合不能拆）
];

/** 专门的拆解表：不是配方产物但也能拆的东西 */
const UNCRAFT: Record<number, [number, number][]> = {
  [SOUL_GRASS]: [[GRASS, 1], [SOUL_DYE, 1]],
  // 彩色羊毛 → 白羊毛 + 同色颜料
  [WOOL_RED]: [[WOOL_WHITE, 1], [DYE_RED, 1]],
  [WOOL_YELLOW]: [[WOOL_WHITE, 1], [DYE_YELLOW, 1]],
  [WOOL_BLUE]: [[WOOL_WHITE, 1], [DYE_BLUE, 1]],
  [WOOL_GREEN]: [[WOOL_WHITE, 1], [DYE_GREEN, 1]],
  [WOOL_PINK]: [[WOOL_WHITE, 1], [DYE_PINK, 1]],
  [WOOL_ORANGE]: [[WOOL_WHITE, 1], [DYE_ORANGE, 1]],
  [WOOL_BLACK]: [[WOOL_WHITE, 1], [DYE_BLACK, 1]],
  [WOOL_GRAY]: [[WOOL_WHITE, 1], [DYE_GRAY, 1]],
  // 血尸肉 → 生肉×2 + 血尸红颜料×1
  [BLOOD_MEAT]: [[RAW_MEAT, 2], [DYE_BLOOD, 1]],
  // 灰羽毛 → 白羽毛 + 灰颜料；乌鸦的黑羽毛 → 白羽毛 + 黑颜料
  [FEATHER_GRAY]: [[FEATHER_WHITE, 1], [DYE_GRAY, 1]],
  [FEATHER_BLACK]: [[FEATHER_WHITE, 1], [DYE_BLACK, 1]],
  // —— 颜料互相拆：融合出来的颜料能拆回原材料；血尸红是唯一的例外（只能合不能拆） ——
  [DYE_ORANGE]: [[DYE_RED, 1], [DYE_YELLOW, 1]],
  [DYE_GREEN]: [[DYE_BLUE, 1], [DYE_YELLOW, 1]],
  [DYE_PINK]: [[DYE_RED, 1], [DYE_WHITE, 1]],
  [DYE_BLACK]: [[DYE_RED, 1], [DYE_YELLOW, 1], [DYE_BLUE, 1]],
  [DYE_PURPLE]: [[DYE_YELLOW, 1], [DYE_BLUE, 1]],
  [DYE_SWAN]: [[DYE_WHITE, 1], [DYE_YELLOW, 1]],
  [DYE_GRAY]: [[DYE_BLACK, 1], [DYE_WHITE, 1]],
  [DYE_STAR]: [[DYE_BLUE, 1], [DYE_WHITE, 1], [DYE_PINK, 1]],
  [DYE_LIGHTGREEN]: [[DYE_WHITE, 1], [DYE_GREEN, 1]],
  // —— 玻璃和泽液拆解 ——
  [GLASS]: [[GLASS_SHARD, 4]],                    // 1 玻璃敲成 4 碎片
  [SWAMP_LIGHT]: [[WATER, 1], [SWAMP_MID, 1]],    // 淡沼泽液 = 水 + 沼泽液
  [SWAMP_PHANTOM]: [[SWAMP_MID, 2]],              // 幻泽液拆成 2 沼泽液
  [SWAMP_DEEP]: [[DYE_DEEPGREEN, 1]],             // 深泽液熬出深绿颜料
  // 沼泽液就是沼泽液，没得拆；溺泽液留着做防溺瓶
};

export interface CraftMatch {
  /** 消耗什么（从 2×2 格子里扣） */
  consume: [number, number][];
  /** 产出什么（给玩家） */
  gives: [number, number][];
  /** 是拆解还是合成（UI 显示用） */
  uncraft: boolean;
}

/** 2×2 格子里现在能合成/拆解什么？对不上返回 null */
export function matchCraft(counts: Map<number, number>, grid?: Slots): CraftMatch | null {
  // 先对合成表：材料按种类和数量匹配（合成优先，避免"4木板"被当成拆解）
  for (const r of RECIPES) {
    const need = new Map(r.needs);
    if (need.size !== counts.size) continue;
    if (r.scale) {
      // 批量配方：每种材料都是配方的同一个整数倍 → 按倍数出货
      let k = -1, ok = true;
      need.forEach((c, id) => {
        const have = counts.get(id);
        if (!have || have % c !== 0 || (k >= 0 && have / c !== k)) ok = false;
        else k = have / c;
      });
      if (ok && k > 0) return {
        consume: r.needs.map(([id, c]) => [id, c * k]),
        gives: [[r.out, r.outCount * k]],
        uncraft: false,
      };
      continue;
    }
    let ok = true;
    need.forEach((c, id) => {
      if (counts.get(id) !== c) ok = false;
    });
    if (ok && r.pattern) {
      ok = !!grid && grid.length === r.pattern.length && r.pattern.every((id, i) =>
        id === null ? grid[i] === null : grid[i]?.id === id && grid[i]?.count === 1,
      );
    }
    if (ok) return { consume: r.needs, gives: [[r.out, r.outCount]], uncraft: false };
  }
  // 再判断拆解：格子里只有一种东西，且它正好是某个配方的产出
  if (counts.size === 1) {
    const [id, n] = [...counts.entries()][0];
    // 装了泽液的桶：拆回空桶 + 桶里那几格泽液（count 就是装了几格）
    if (id in SWAMP_FILL && Number.isInteger(n) && n >= 1 && n <= BUCKET_WATER_MAX) {
      const f = SWAMP_FILL[id];
      return { consume: [[id, n]], gives: [[f.bucket, 1], [f.liquid, n]], uncraft: true };
    }
    // 特殊拆解（灵魂草 → 草方块 + 颜料）
    if (UNCRAFT[id] && n >= 1) {
      return { consume: [[id, 1]], gives: UNCRAFT[id], uncraft: true };
    }
    for (const r of RECIPES) {
      if (r.out !== id) continue;
      if (r.scale && n % r.outCount === 0) {
        // 批量配方也能批量拆：10 地毯拆回 10 羊毛
        const k = n / r.outCount;
        return { consume: [[id, n]], gives: r.needs.map(([x, c]) => [x, c * k]), uncraft: true };
      }
      if (!r.scale && n === r.outCount) {
        return { consume: [[id, r.outCount]], gives: r.needs, uncraft: true };
      }
    }
  }
  return null;
}

/** 熔炉烧制表：放进去 → 出来什么 */
export const SMELT: Record<number, number> = {
  [SAND]: GLASS,
  [COBBLE]: STONE,
  [RAW_MEAT]: COOKED_MEAT,
};

/** DIY 手册里能学到的所有"制作方法"：合成 + 拆解 + 熔炉烧制，写成一行中文说明 */
export interface Tutorial {
  /** 一句话配方，比如 "木板×4 → 工作台×1" */
  text: string;
}

export const TUTORIALS: Tutorial[] = (() => {
  const name = (id: number) => BLOCKS[id].cn;
  const list: Tutorial[] = [];
  const swampEntries: Tutorial[] = [];
  const swampRecipes = new Set([GLASS, GLASS_CONE, GLASS_BOTTLE, GLASS_BUCKET, POTION_POISON, POTION_PHANTOM, POTION_DEADLY, POTION_BREATH, DYE_DEEPGREEN]);
  const swampUncraft = new Set([GLASS, SWAMP_LIGHT, SWAMP_PHANTOM, SWAMP_DEEP]);
  for (const r of RECIPES) {
    // 7 种床的配方只差地毯颜色，合成一条讲清楚，不然手册里看着像重复
    if (BED_IDS.includes(r.out) || r.quiet) continue;
    const needs = r.needs.map(([id, n]) => `${name(id)}×${n}`).join(' + ');
    // 材料种类超过 4 种的，2×2 小格子摆不下，得用工作台开 3×3 大合成台
    const big = r.needs.length > 4 ? '（要 3×3 大合成台）' : '';
    const batch = r.scale ? '（放几个出几个）' : '';
    (swampRecipes.has(r.out) ? swampEntries : list).push({ text: `合成：${needs} → ${name(r.out)}×${r.outCount}${big}${batch}` });
  }
  list.push({ text: `合成：${name(WOOD)}×3 + 地毯×1 → 床×1（地毯什么颜色，床就什么颜色）` });
  for (const [id, gives] of Object.entries(UNCRAFT)) {
    // 8 种彩色羊毛的拆法也一样，只差颜色，合并成一条
    if (WOOL_IDS.includes(Number(id))) continue;
    const outs = gives.map(([g, n]) => `${name(g)}×${n}`).join(' + ');
    (swampUncraft.has(Number(id)) ? swampEntries : list).push({ text: `拆解：${name(Number(id))} → ${outs}` });
  }
  list.push({ text: `拆解：彩色羊毛 → ${name(WOOL_WHITE)}×1 + 同色颜料×1` });
  // 隐藏配方预告：告诉玩家集齐手册有奖励，才有动力全收集
  list.push({ text: '秘方：手册集齐后，拿一整摞（64 个）生肉按 M → 铁粒×3' });
  for (const [id, out] of Object.entries(SMELT)) {
    list.push({ text: `熔炉：${name(Number(id))} → ${name(out)}` });
  }
  // 拆解器不是合成用的：拿水桶对它按 M，电解出一瓶氢气（加在最后，别打乱存档里的方法顺序号）
  list.push({ text: `使用：拿水桶对 ${name(CHEM_DECOMP)} 按 M → ${name(HYDROGEN)}×1` });
  list.push({ text: `掉落：砍树有 60% 概率掉 1~2 个${name(RUBBER)}，做轮子用` });
  list.push({ text: `使用：拿着${name(TANK_BULLET)}对坦克按 L 装弹（开着车也行），按 P 开炮` });
  list.push({ text: `星空染色台：能染${name(CARPET_STAR)}，还能把颜料融合成新颜色（红+黄=橙、蓝+白+粉=星空色……）` });
  list.push({ text: `合成：${name(STAR_SHARD)}×1 + 任意羊毛×1 → ${name(STAR_WOOL)}×1` }); // 加在最后，别打乱存档里的方法顺序号
  list.push({ text: `使用：挑战房要 5×5 平地 + 上面全空才能放；对门按 M 交 10 生肉打 4 关，中途不许出来` });
  // 种地两条：加在最后，别打乱存档里的方法顺序号
  list.push({ text: `使用：拿着稻粒对水按 L 种水稻，半天长一截；黄了挖掉收 5~10 粒，吃一粒回半颗心` });
  list.push({ text: `使用：拿着胡萝卜对草地或泥土按 L 种地里；叶子底下露橙尖尖就是熟了，挖掉收 1~3 根，吃一根回 1 颗心` });
  list.push({ text: `掉落：打鸟掉生肉和羽毛——普通鸟掉 1~2 肉、虎皮鹦鹉掉 2 肉，一半概率掉同色羽毛；乌鸦必掉 1 肉 + 1 黑羽毛` });
  list.push({ text: `使用：拿铁桶对水按 P 盛一格水，一桶最多装 3 格（数字就是水量）；对地面按 L 倒出一格` });
  list.push({ text: `矿石：地下石头层约 5% 会生成煤矿，挖煤矿掉 1 个煤块；煤块能做煤条（3个合1）、煤炭（2个合1）和煤粉（1个拆3），做熔炉要用煤粉` });
  list.push({ text: `掉落：睡醒只掉1颗碎片，${name(STAR_SHARD)}和${name(MANG_SHARD)}各有1/2概率，分别能做星能灯/芒能灯` });
  // —— 沼泽系列：加在最后，别打乱存档里的方法顺序号 ——
  swampEntries.push({ text: '拆解：把一整桶泽液放进合成格，得到原来的空桶和桶内全部泽液；一次拆一桶，背包要留空位' });
  swampEntries.push({ text: `地形：草地上有圆形沼泽，越往中间越毒——淡沼泽液、沼泽液、幻泽液、深泽液、溺泽液` });
  swampEntries.push({ text: `使用：拿铁桶或玻璃桶对泽液按 P 盛一格，一桶最多 3 格同一种（不能混装）；对地面按 L 倒出` });
  swampEntries.push({ text: `掉落：打僵尸有 1/20 概率掉${name(DYE_DEEPGREEN)}，黑颜料+绿颜料也能融出来` });
  swampEntries.push({ text: `使用：药水瓶按 E 喝、按 P 扔——毒药瓶每3秒扣1血共15秒，剧毒瓶每2秒扣2血共14秒；幻药瓶让怪减速一半、每5秒扣1血共15秒，自己喝幻觉6秒；防溺瓶水下呼吸60秒` });
  swampEntries.push({ text: `使用：${name(GLASS_CONE)}是小刀，攻击是拳头的 1.5 倍，但用一次有 2/3 概率碎掉` });
  list.push({ text: `装备：${name(ROLLER_SKATES)}放背包左边最下面那个格子穿上，走路变 1.5 倍快；连滑 10 秒会摔一跤，耐久显示还能摔几次，摔 3 次鞋就烂了` });
  // 打火石做法追加在最后，避免打乱以前学会的方法编号
  list.push({ text: `合成：${name(COBBLE)}×1 → ${name(COBBLE_SHARD)}×2` });
  list.push({ text: `合成：${name(COBBLE_SHARD)}×2 + ${name(COAL_DUST)}×1 → ${name(COAL_FIRESTARTER)}×1` });
  list.push({ text: `合成：${name(COBBLE_SHARD)}×2 + ${name(MANG_SHARD)}×1 → ${name(MANG_FIRESTARTER)}×1` });
  list.push({ text: `合成：${name(COBBLE_SHARD)}×2 + ${name(STAR_SHARD)}×1 → ${name(STAR_FIRESTARTER)}×1` });
  list.push({ text: `合成：${name(COAL_FIRESTARTER)}×1 + ${name(SOUL_DYE)}×1 → ${name(SOUL_FIRESTARTER)}×1` });
  list.push({ text: `合成：${name(COBBLE)}×2 + ${name(HYDROGEN)}×1 → ${name(HYDROGEN_FIRESTARTER)}×1` });
  list.push({ text: `使用：拿任意打火石对着方块按 L 点火；普通红火烧10秒，灵火蓝火烧15秒，不会蔓延，打火石不消耗` });
  // 兜底：说明文字一模一样的只留一条
  return [...new Map([...list, ...swampEntries].map((t) => [t.text, t])).values()];
})();
