/** 合成配方 — 把材料放进 2×2 格子，种类和数量对上就出成品（不看摆放位置）
 *  还支持拆解：只放一个成品进格子 → 吐出原材料 */

import { CROP } from '../../config';
import {
  APPLE, BAG_WOOL, BED_IDS, BED_STAR, BLOOD_MEAT, BLUE_BLOCK, BLUE_DIAMOND, BLUE_SHARD, BRICK, BUCKET, CARPET_BLOOD, CARPET_IDS, CARPET_STAR, CARPET_WHITE, CHEST, COBBLE,
  COCONUT, COOKED_MEAT, CRAFTING_TABLE, DOOR_CLOSED, CARROT,
  DYE_BLACK, DYE_BLOOD, DYE_BLUE, DYE_GRAY, DYE_GREEN, DYE_ORANGE, DYE_PINK, DYE_RED, DYE_TABLE, DYE_YELLOW,
  DYE_WHITE, DYE_PURPLE, DYE_SWAN, DYE_LIGHTGREEN, DYE_STAR, DYE_DEEPGREEN,
  GLASS_BOTTLE, GLASS_BUCKET, GLASS_CONE, GLASS_SHARD,
  ICE, JUICE_APPLE, JUICE_CARROT, JUICE_COCONUT, JUICE_MELON, JUICE_ORANGE, JUICE_PEACH, JUICE_PEAR, WINE,
  TEA_RED, TEA_DANDELION, GRASS_CAKE, BANANA_FLIP, FRUIT_PLATTER, MUSHROOM_PLATTER,
  MELON, MELON_SEED, MELON_SLICE, ORANGE, PEACH, PEAR, PERSIMMON, PERSIMMON_CAKE, RICE_GRAIN,
  BANANA, DANDELION, POPPY,
  APPLE_LEAVES, APPLE_SAP1, BANANA_LEAVES, BANANA_SAP1, COCONUT_SAP1, ORANGE_LEAVES, ORANGE_SAP1, PALM_LEAVES,
  PEACH_LEAVES, PEACH_SAP1, PEAR_LEAVES, PEAR_SAP1, PERSIMMON_LEAVES, PERSIMMON_SAP1,
  MUSHROOM_ENOKI, MUSHROOM_OYSTER, MUSHROOM_RED, MUSHROOM_SHIITAKE,
  GLOW_SHROOM, GLOW_SPORE, SPORE_ENOKI, SPORE_OYSTER, SPORE_RED, SPORE_SHIITAKE,
  SNOWFLAKE, SWORD_BLOOD, SWORD_DIAMOND, SWORD_GOLD, SWORD_IRON, SWORD_SNOW, SWORD_WOOD,
  PLANKS_DARK, PLANKS_LIGHT, SOUL_PLANKS,
  BAG_BAMBOO, BAG_FEATHER, BAG_GLASS, BAG_GRASS, BAG_LEAF, BAG_MANG, BAG_RUBBER, BAG_STAR,
  BAMBOO, LEAVES, WOOL_BAG_DYES,
  POTION_BREATH, POTION_DEADLY, POTION_PHANTOM, POTION_POISON,
  PUMPKIN, PUMPKIN_SEED, PUMPKIN_SLICE,
  SWAMP_DEEP, SWAMP_DROWN, SWAMP_LIGHT, SWAMP_MID, SWAMP_PHANTOM, WATER, LIQUID_FILL, liquidCapOf,
  FEATHER_BLACK, FEATHER_GRAY, FEATHER_WHITE,
  MANHOLE, STAR_DYE_TABLE,
  FENCE, FOUNTAIN, FURNACE, GLASS, GOLD_BLOCK, GOLD_INGOT, GOLD_NUGGET, GRASS,
  IRON_BLOCK, IRON_INGOT, IRON_NUGGET, LADDER, VINE_LADDER,
  CHALLENGE_HOUSE, CHEM_DECOMP, COAL, COAL_BAR, COAL_CHUNK, COAL_DUST, COAL_FIRESTARTER, COBBLE_SHARD, HYDROGEN, HYDROGEN_ENGINE, HYDROGEN_FIRESTARTER, HYDROGEN_LAMP, MANG_FIRESTARTER, MANG_LAMP, MANG_SHARD, PICKLE_BARREL, ROLLER_SKATES, RUBBER, SOUL_FIRESTARTER, STAR_FIRESTARTER, STAR_LAMP, TANK, TANK_BULLET, WHEEL,
  PLANKS, RAW_MEAT, SAND, SANDSTONE, SIGN, SNOW,
  SOUL_CHEST, SOUL_DYE, SOUL_FURNACE, SOUL_GRASS, SOUL_STONE_SLAB,
  SOUL_WOOD_SLAB, STAR_SHARD, STAR_TABLE, STAR_WOOL, STICK, STONE, STONE_SLAB, TALL_GRASS, WOOD, WOOD_SLAB, WOOD_STAIRS,
  WOOL_BLACK, WOOL_BLUE, WOOL_GRAY, WOOL_GREEN, WOOL_IDS, WOOL_ORANGE, WOOL_PINK, WOOL_RED, WOOL_WHITE, WOOL_YELLOW,
  // —— 四季 DIY（2026-10-27）：樱花剑/两个腰包/枫叶飞刀/柳条陷阱 ——
  SWORD_SAKURA, BAG_SAKURA, BAG_MAPLE, KNIFE_MAPLE, WILLOW_TRAP,
  WILLOW_FLUFF, WILLOW_BRANCH, WILLOW_SAP1, WILLOW_BAG, PETAL_SAKURA, MAPLE_LEAF,
  // —— 四季节日（2026-10-27）——
  CHUNK_ROLL, CALAMUS, POUCH_CALAMUS, SHIELD_CALAMUS, HARVEST_PLATTER,
  BEAD_IDS, BEAD_RED, BEAD_YELLOW, BEAD_BLUE, XMAS_COOKIE, BEAD_FIREWORK,
  // —— 美食烹饪（2026-10-28）——
  FOOD_TABLE,
  BAGUETTE, BAMBOO_RICE, CARROT_CAKE, CARROT_MUSHROOM, COD_CUTLET, DOUGH, DUMPLING_CARROT,
  FISH_CLOWN_FRIED, FLOUR, HAM, PUMPKIN_PIE, ROUJIAOMO, SALMON_STEW, SANDWICH,
  SOUP_MUSHROOM, SOUP_PUFFER,
  ROPE,
  // —— 四种生鱼（河豚/小丑鱼/鲑鱼/鳕鱼）——
  FISH_CLOWN, FISH_COD, FISH_PUFFER, FISH_SALMON,
  Slots,
} from '../blocks/Block';
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
  /** 只能在美食工作台做（2026-10-28 设定：美食与道具配方互不通用）；
   *  不带的配方就是普通道具类，2×2 背包与普通/星空/黄金工作台都能做 */
  bench?: 'food';
  pattern?: (number | null)[];
}

/** 五种蘑菇（生菌汤/三明治的「蘑菇」按它们枚举，可同类） */
const MUSHROOM_IDS = [MUSHROOM_SHIITAKE, MUSHROOM_ENOKI, MUSHROOM_OYSTER, MUSHROOM_RED, GLOW_SHROOM];
/** 从五种蘑菇里任取 n 个（可重复）的所有组合，每种组合压成 [ID, 数量] 列表 */
const mushroomCombos = (n: number): [number, number][][] => {
  const out: [number, number][][] = [];
  const walk = (start: number, left: number, pick: number[]): void => {
    if (left === 0) {
      const counts = new Map<number, number>();
      pick.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
      out.push([...counts].map(([id, c]) => [id, c] as [number, number]));
      return;
    }
    for (let i = start; i < MUSHROOM_IDS.length; i++) walk(i, left - 1, [...pick, MUSHROOM_IDS[i]]);
  };
  walk(0, n, []);
  return out;
};

/** 六种水果（春卷的「任意水果」与丰收拼盘的「两种不同水果」都按它们枚举） */
const FRUITS = [APPLE, PEACH, ORANGE, PEAR, PERSIMMON, BANANA];
/** 两两组合（15 条），丰收拼盘用 */
const FRUIT_PAIRS: [number, number][] = [];
for (let i = 0; i < FRUITS.length; i++) {
  for (let j = i + 1; j < FRUITS.length; j++) FRUIT_PAIRS.push([FRUITS[i], FRUITS[j]]);
}

export const RECIPES: Recipe[] = [
  // —— 基础 ——
  { out: PLANKS, outCount: 4, needs: [[WOOD, 1]] },
  { out: STICK, outCount: 4, needs: [[PLANKS, 3]] }, // 3 木板，不然跟门的配方撞车
  { out: CRAFTING_TABLE, outCount: 1, needs: [[PLANKS, 4]] },
  { out: CHEST, outCount: 1, needs: [[PLANKS, 8]] },
  { out: DOOR_CLOSED, outCount: 1, needs: [[PLANKS, 2]] }, // 2×2 每格 1 个，最多 4 材料，6 木板放不下
  // 木台阶原来也是「3 木板」，被前面的木棍（同样 3 木板）抢了匹配 → 手册里有、实际永远做不出来。
  // 改成 1 木板出 2 台阶（和 MC 的 3 木板出 6 台阶一个比例），彻底避开撞车
  { out: WOOD_SLAB, outCount: 2, needs: [[PLANKS, 1]] },
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
  { out: VINE_LADDER, outCount: 1, needs: [[TALL_GRASS, 5], [LADDER, 1]] }, // 藤蔓梯子：梯子缠上杂草，纯装饰照样爬
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
  // —— 7 种饮料：水果/材料 + 一个玻璃瓶榨出来（喝完不还瓶子，跟别的食物一样）——
  { out: JUICE_APPLE, outCount: 1, needs: [[APPLE, 1], [GLASS_BOTTLE, 1]] },
  { out: JUICE_ORANGE, outCount: 1, needs: [[ORANGE, 1], [GLASS_BOTTLE, 1]] },
  { out: JUICE_PEACH, outCount: 1, needs: [[PEACH, 1], [GLASS_BOTTLE, 1]] },
  { out: JUICE_PEAR, outCount: 1, needs: [[PEAR, 1], [GLASS_BOTTLE, 1]] },
  // —— 柿子饼：10 份粮食摊一个饼，柿子的回血再往上加 3 点 ——
  { out: PERSIMMON_CAKE, outCount: 1, needs: [[RICE_GRAIN, 10], [PERSIMMON, 1]], bench: 'food' }, // 柿子饼是料理，只在美食工作台做
  { out: WINE, outCount: 1, needs: [[RAW_MEAT, 2], [ICE, 1], [SWAMP_DEEP, 1]] },  // 生肉×2 + 冰×1 + 深泽液×1
  { out: JUICE_COCONUT, outCount: 1, needs: [[COCONUT, 1], [GLASS_BOTTLE, 1]] },
  { out: JUICE_MELON, outCount: 1, needs: [[MELON_SLICE, 2], [GLASS_BOTTLE, 1]] },
  { out: JUICE_CARROT, outCount: 1, needs: [[CARROT, 2], [GLASS_BOTTLE, 1]] },
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
  // —— 果树苗：4 片同种树叶拼 1 棵专属树苗；椰子树用椰子叶（树苗只能种沙滩） ——
  { out: APPLE_SAP1, outCount: 1, needs: [[APPLE_LEAVES, 4]] },
  { out: PEACH_SAP1, outCount: 1, needs: [[PEACH_LEAVES, 4]] },
  { out: ORANGE_SAP1, outCount: 1, needs: [[ORANGE_LEAVES, 4]] },
  { out: PEAR_SAP1, outCount: 1, needs: [[PEAR_LEAVES, 4]] },
  { out: PERSIMMON_SAP1, outCount: 1, needs: [[PERSIMMON_LEAVES, 4]] },
  { out: BANANA_SAP1, outCount: 1, needs: [[BANANA_LEAVES, 4]] },
  { out: COCONUT_SAP1, outCount: 1, needs: [[PALM_LEAVES, 4]] },
  // —— 南瓜与西瓜 1:3 转化（支持批量按比例合成与拆解） ——
  { out: PUMPKIN_SLICE, outCount: CROP.SPLIT_COUNT, needs: [[PUMPKIN, 1]], scale: true, quiet: true },
  { out: PUMPKIN_SEED, outCount: CROP.SPLIT_COUNT, needs: [[PUMPKIN_SLICE, 1]], scale: true, quiet: true },
  { out: MELON_SLICE, outCount: CROP.SPLIT_COUNT, needs: [[MELON, 1]], scale: true, quiet: true },
  { out: MELON_SEED, outCount: CROP.SPLIT_COUNT, needs: [[MELON_SLICE, 1]], scale: true, quiet: true },
  // —— 2026-10-23 新吃食（只能自己做）：两种茶 / 草饼 / 颠倒香蕉液 / 两种拼盘 ——
  // 手册下标会进存档，新配方一律追加在末尾，别插到中间去
  // 2026-10-28：料理类一律 bench:'food'（只能在美食工作台做），榨汁/喝酒不算料理照旧
  { out: TEA_RED, outCount: 1, needs: [[POPPY, 1], [GLASS_BOTTLE, 1]], bench: 'food' },            // 小红花 + 玻璃瓶
  { out: TEA_DANDELION, outCount: 1, needs: [[DANDELION, 3], [GLASS_BOTTLE, 1]], bench: 'food' },  // 蒲公英 ×3 + 玻璃瓶
  { out: GRASS_CAKE, outCount: 1, needs: [[TALL_GRASS, 1], [RICE_GRAIN, 1]], bench: 'food' },      // 杂草 + 稻粒（设定里的「麦子」就用稻粒）
  { out: BANANA_FLIP, outCount: 1, needs: [[BANANA, 2], [GLASS_BOTTLE, 1]], bench: 'food' },       // 香蕉 ×2 + 玻璃瓶
  // 水果拼盘：五种水果各一个（红伞伞不进蘑菇拼盘，所以这里也只列四种好蘑菇）
  { out: FRUIT_PLATTER, outCount: 1, needs: [[PEACH, 1], [APPLE, 1], [PEAR, 1], [ORANGE, 1], [PERSIMMON, 1]], bench: 'food' },
  { out: MUSHROOM_PLATTER, outCount: 1, needs: [[MUSHROOM_SHIITAKE, 1], [MUSHROOM_ENOKI, 1], [MUSHROOM_OYSTER, 1], [GLOW_SHROOM, 1]], bench: 'food' },
  // —— 2026-10-24 六把剑：材料×2 + 木棍×1（属性见 config.SWORDS）——
  { out: SWORD_WOOD,    outCount: 1, needs: [[PLANKS, 2], [STICK, 1]] },
  { out: SWORD_IRON,    outCount: 1, needs: [[IRON_NUGGET, 2], [STICK, 1]] },
  { out: SWORD_GOLD,    outCount: 1, needs: [[GOLD_NUGGET, 2], [STICK, 1]] },
  { out: SWORD_DIAMOND, outCount: 1, needs: [[BLUE_DIAMOND, 2], [STICK, 1]] },
  { out: SWORD_SNOW,    outCount: 1, needs: [[SNOWFLAKE, 2], [STICK, 1]] },
  { out: SWORD_BLOOD,   outCount: 1, needs: [[BLOOD_MEAT, 2], [STICK, 1]] },
  // —— 三种染色木板：木板×1 + 颜料×1 ——
  { out: PLANKS_DARK,  outCount: 1, needs: [[PLANKS, 1], [DYE_BLACK, 1]] },
  { out: PLANKS_LIGHT, outCount: 1, needs: [[PLANKS, 1], [DYE_WHITE, 1]] },
  { out: SOUL_PLANKS,  outCount: 1, needs: [[PLANKS, 1], [SOUL_DYE, 1]] },
  // —— 腰包：老设定里一直没有获取途径（生存根本做不出来），现在补上 ——
  // 羊毛腰包是底子：白羊毛×4 + 木棍×1 当包带（光放羊毛会变成地毯，得加个木棍）
  // 其他腰包 = 羊毛腰包×1 + 对应材料包边；彩色腰包 = 羊毛腰包×1 + 对应颜料（跟金腰包一个套路）
  { out: BAG_WOOL,    outCount: 1, needs: [[WOOL_WHITE, 4], [STICK, 1]] },
  { out: BAG_GLASS,   outCount: 1, needs: [[BAG_WOOL, 1], [GLASS, 4]],        quiet: true },
  { out: BAG_GRASS,   outCount: 1, needs: [[BAG_WOOL, 1], [TALL_GRASS, 4]],   quiet: true },
  { out: BAG_LEAF,    outCount: 1, needs: [[BAG_WOOL, 1], [LEAVES, 4]],       quiet: true },
  { out: BAG_BAMBOO,  outCount: 1, needs: [[BAG_WOOL, 1], [BAMBOO, 4]],       quiet: true },
  { out: BAG_FEATHER, outCount: 1, needs: [[BAG_WOOL, 1], [FEATHER_WHITE, 4]], quiet: true },
  { out: BAG_RUBBER,  outCount: 1, needs: [[BAG_WOOL, 1], [RUBBER, 4]],       quiet: true },
  { out: BAG_MANG,    outCount: 1, needs: [[BAG_WOOL, 1], [MANG_SHARD, 2]],   quiet: true },
  { out: BAG_STAR,    outCount: 1, needs: [[BAG_WOOL, 1], [STAR_SHARD, 2]],   quiet: true },
  // 14 种彩色腰包（quiet：手册用一条说明统一讲，不刷 14 条）
  ...WOOL_BAG_DYES.map(({ dye, id }) => ({ out: id, outCount: 1, needs: [[BAG_WOOL, 1], [dye, 1]] as [number, number][], quiet: true })),
  // —— 2026-10-27 四季 DIY：柳絮/樱花花瓣/枫叶做的七件套（只在自由岛做，不能带进大赛）——
  { out: WILLOW_SAP1,  outCount: 1, needs: [[WILLOW_FLUFF, 4]] },                        // 柳絮孢子 ×4 → 柳树苗
  { out: WILLOW_BAG,   outCount: 1, needs: [[WILLOW_FLUFF, 5]] },                        // 柳絮孢子 ×5 → 柳絮腰包
  { out: BAG_SAKURA,   outCount: 1, needs: [[PETAL_SAKURA, 5]] },                        // 樱花花瓣 ×5 → 樱花药包
  { out: SWORD_SAKURA, outCount: 1, needs: [[PETAL_SAKURA, 2], [STICK, 1]] },            // 樱花花瓣 ×2 + 木棒 → 樱花剑
  { out: BAG_MAPLE,    outCount: 1, needs: [[MAPLE_LEAF, 5]] },                          // 枫叶 ×5 → 枫叶腰包
  { out: KNIFE_MAPLE,  outCount: 1, needs: [[MAPLE_LEAF, 3], [IRON_NUGGET, 1]] },        // 枫叶 ×3 + 铁粒 → 枫叶飞刀
  { out: WILLOW_TRAP,  outCount: 1, needs: [[WILLOW_BRANCH, 3], [TALL_GRASS, 1]] },      // 柳条 ×3 + 草 → 柳条陷阱
  // —— 2026-10-27 四季节日（旅者 NPC 交谈解锁手册；材料多、都要 3×3 工作台）——
  // 春卷：草 + 胡萝卜 + 麦粒×3 + 任意水果 + 熟肉。六种水果各一条，只有第一条进手册，其余 quiet
  ...FRUITS.map((fruit, i) => ({
    out: CHUNK_ROLL, outCount: 1, quiet: i > 0, bench: 'food' as const,
    needs: [[TALL_GRASS, 1], [CARROT, 1], [RICE_GRAIN, 3], [fruit, 1], [COOKED_MEAT, 1]] as [number, number][],
  })),
  // 端午：菖蒲香囊（叶×3）/ 菖蒲护盾（叶×5）
  { out: POUCH_CALAMUS,  outCount: 1, needs: [[CALAMUS, 3]] },
  { out: SHIELD_CALAMUS, outCount: 1, needs: [[CALAMUS, 5]] },
  // 丰收拼盘：两种不一样的水果 + 麦粒×5（15 种组合，只有第一条进手册）
  ...FRUIT_PAIRS.map(([a, b], i) => ({
    out: HARVEST_PLATTER, outCount: 1, quiet: i > 0, bench: 'food' as const,
    needs: [[a, 1], [b, 1], [RICE_GRAIN, 5]] as [number, number][],
  })),
  // 冬季节日：圣诞甜饼（任意珠子×1 + 麦粒×3，三种珠子各一条）/ 彩珠礼花（三色齐全）
  ...BEAD_IDS.map((beadId, i) => ({
    out: XMAS_COOKIE, outCount: 1, quiet: i > 0, bench: 'food' as const,
    needs: [[beadId, 1], [RICE_GRAIN, 3]] as [number, number][],
  })),
  { out: BEAD_FIREWORK, outCount: 1, needs: [[BEAD_RED, 1], [BEAD_YELLOW, 1], [BEAD_BLUE, 1]] },
  // —— 2026-10-28 美食工作台（独立功能方块，本身是道具类配方：普通工作台就能做）——
  { out: FOOD_TABLE, outCount: 1, needs: [[PLANKS, 4], [IRON_NUGGET, 2]] },
  // —— 2026-10-28 美食 DIY：食材加工 + 15 道料理（全部 bench:'food'，只能美食工作台做）——
  // 手册下标会进存档：本段一律追加在最末尾，别插到中间去
  { out: FLOUR, outCount: 1, needs: [[RICE_GRAIN, 4]], bench: 'food' },   // 引子：4 麦粒磨 1 袋面粉（原设定 10 麦粒 + 1 面粉是死循环）
  { out: FLOUR, outCount: 8, needs: [[RICE_GRAIN, 10], [FLOUR, 1]], bench: 'food' },
  { out: DOUGH, outCount: 1, needs: [[FLOUR, 2]], bench: 'food' },
  { out: HAM, outCount: 1, needs: [[COOKED_MEAT, 2]], bench: 'food' },
  { out: BAGUETTE, outCount: 1, needs: [[DOUGH, 1], [RICE_GRAIN, 1]], bench: 'food' },
  // 法式三明治：面包棍 + 草 + 树叶 + 任意 4 个蘑菇（70 种组合，只有第一条进手册）
  ...mushroomCombos(4).map((mush, i) => ({
    out: SANDWICH, outCount: 1, quiet: i > 0, bench: 'food' as const,
    needs: [[BAGUETTE, 1], [TALL_GRASS, 1], [LEAVES, 1], ...mush] as [number, number][],
  })),
  { out: PUMPKIN_PIE, outCount: 1, needs: [[PUMPKIN_SLICE, 3], [DOUGH, 1]], bench: 'food' },
  { out: SOUP_PUFFER, outCount: 1, needs: [[FISH_PUFFER, 1], [MUSHROOM_ENOKI, 1]], bench: 'food' },
  { out: FISH_CLOWN_FRIED, outCount: 1, needs: [[FISH_CLOWN, 1], [MUSHROOM_OYSTER, 1]], bench: 'food' },
  { out: SALMON_STEW, outCount: 1, needs: [[FISH_SALMON, 1], [MUSHROOM_ENOKI, 1]], bench: 'food' },
  { out: COD_CUTLET, outCount: 1, needs: [[FISH_COD, 1], [MUSHROOM_OYSTER, 1]], bench: 'food' },
  { out: ROUJIAOMO, outCount: 1, needs: [[DOUGH, 1], [COOKED_MEAT, 1]], bench: 'food' },
  { out: BAMBOO_RICE, outCount: 1, needs: [[LEAVES, 1], [RICE_GRAIN, 32]], bench: 'food' },
  { out: DUMPLING_CARROT, outCount: 3, needs: [[DOUGH, 1], [LEAVES, 1], [COOKED_MEAT, 1], [CARROT, 1]], bench: 'food' },
  { out: CARROT_CAKE, outCount: 1, needs: [[FLOUR, 3], [TALL_GRASS, 1], [CARROT, 1]], bench: 'food' },
  { out: CARROT_MUSHROOM, outCount: 1, needs: [[MUSHROOM_OYSTER, 1], [CARROT, 3]], bench: 'food' },
  // 生菌汤：任意两种蘑菇（15 种组合，只有第一条进手册）
  ...mushroomCombos(2).map((mush, i) => ({
    out: SOUP_MUSHROOM, outCount: 1, quiet: i > 0, bench: 'food' as const,
    needs: mush as [number, number][],
  })),
  // 绳索：2 木棍合成 1 根（道具类，普通工作台就能做）
  { out: ROPE, outCount: 1, needs: [[STICK, 2]] },
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
export const UNCRAFT: Record<number, [number, number][]> = {
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
  // —— 南瓜与西瓜 1:3 拆解表（果→片→籽） ——
  // —— 蘑菇拆成对应孢子（香菇/金针菇/平菇各 3 个，红伞伞/夜光蓝菇 2 个） ——
  [MUSHROOM_SHIITAKE]: [[SPORE_SHIITAKE, 3]],
  [MUSHROOM_ENOKI]: [[SPORE_ENOKI, 3]],
  [MUSHROOM_OYSTER]: [[SPORE_OYSTER, 3]],
  [MUSHROOM_RED]: [[SPORE_RED, 2]],
  [GLOW_SHROOM]: [[GLOW_SPORE, 2]],
  [PUMPKIN]: [[PUMPKIN_SLICE, CROP.SPLIT_COUNT]],
  [PUMPKIN_SLICE]: [[PUMPKIN_SEED, CROP.SPLIT_COUNT]],
  [MELON]: [[MELON_SLICE, CROP.SPLIT_COUNT]],
  [MELON_SLICE]: [[MELON_SEED, CROP.SPLIT_COUNT]],
};

export interface CraftMatch {
  /** 消耗什么（从 2×2 格子里扣） */
  consume: [number, number][];
  /** 产出什么（给玩家） */
  gives: [number, number][];
  /** 是拆解还是合成（UI 显示用） */
  uncraft: boolean;
}

/**
 * 兜底匹配：材料的「种类」和配方完全一致、数量也够（多放了几个），就按配方该扣多少扣多少，
 * 多出来的留在合成格里不浪费。
 * 只在材料组合唯一时兜底：像木板 1/2/3/4/5 块分别能出木台阶/门/木棍/工作台/楼梯，
 * 这种有歧义的不猜，仍然要求玩家放准数量。
 */
function matchByEnough(counts: Map<number, number>, bench: 'none' | 'food' = 'none'): CraftMatch | null {
  let only: Recipe | null = null;
  for (const r of RECIPES) {
    // 批量配方按倍数算（已有精确匹配）、pattern 配方要靠摆格子，都不走兜底
    if (r.scale || r.pattern) continue;
    // 配方分区：美食配方只能在美食工作台匹配，道具配方在美食工作台上不匹配
    if (bench === 'food' ? r.bench !== 'food' : r.bench === 'food') continue;
    const need = new Map(r.needs);
    if (need.size !== counts.size) continue;
    let ok = true;
    need.forEach((c, id) => {
      if ((counts.get(id) ?? 0) < c) ok = false;
    });
    if (!ok) continue;
    if (only) return null; // 同一组合能出好几样东西：有歧义就不猜
    only = r;
  }
  return only ? { consume: only.needs, gives: [[only.out, only.outCount]], uncraft: false } : null;
}

/** 2×2 格子里现在能合成/拆解什么？对不上返回 null
 *  bench = 在哪张台上合：'none' = 背包 2×2 或普通工作台，'food' = 美食工作台 */
export function matchCraft(counts: Map<number, number>, grid?: Slots, bench: 'none' | 'food' = 'none'): CraftMatch | null {
  // 先对合成表：材料按种类和数量匹配（合成优先，避免"4木板"被当成拆解）
  for (const r of RECIPES) {
    // 配方分区：美食配方只在美食工作台参与匹配；美食工作台上不匹配道具配方
    if (bench === 'food' ? r.bench !== 'food' : r.bench === 'food') continue;
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
  // 精确数量对不上，但材料种类对、数量还更多 → 按配方扣，多的留格子里
  const loose = matchByEnough(counts, bench);
  if (loose) return loose;
  // 再判断拆解：格子里只有一种东西，且它正好是某个配方的产出
  if (counts.size === 1) {
    const [id, n] = [...counts.entries()][0];
    // 装了液体的容器：拆回空容器 + 里面那几格液体（count 就是装了几格；瓶 1 格、桶最多 3 格）
    if (id in LIQUID_FILL && Number.isInteger(n) && n >= 1 && n <= liquidCapOf(LIQUID_FILL[id].bucket)) {
      const f = LIQUID_FILL[id];
      return { consume: [[id, n]], gives: [[f.bucket, 1], [f.liquid, n]], uncraft: true };
    }
    // 特殊拆解（灵魂草 → 草方块 + 颜料；南瓜/西瓜/片支持按比例批量拆解）
    if (UNCRAFT[id] && n >= 1) {
      return { consume: [[id, n]], gives: UNCRAFT[id].map(([g, c]) => [g, c * n]), uncraft: true };
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
