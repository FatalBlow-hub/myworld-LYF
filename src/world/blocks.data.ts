/** 方块数据表 — ID 常量 + 属性表 BLOCKS + 派生表（掉落/颜料/腰包/药水/泽液/作物）。

 *  纯数据、无逻辑：物品类型（Stack/Slots）与方块谓词见 Block.ts，加新方块就改这里 + 加一张贴图。 */

import { APPLE_LEAVES, APPLE_SAP1, BANANA, BANANA_LEAVES, BANANA_SAP1, COCONUT_SAP1, FRUIT_LEAF_IDS, ORANGE_LEAVES, ORANGE_SAP1, PEACH_LEAVES, PEACH_SAP1, PEAR, PEAR_LEAVES, PEAR_SAP1, PERSIMMON, PERSIMMON_LEAVES, PERSIMMON_SAP1, TREE_BLOCKS } from './blocks.trees';
import { MUSHROOM_BLOCKS, GLOW_SHROOM, GLOW_SPORE, MUSHROOM_ENOKI, MUSHROOM_OYSTER, MUSHROOM_RED, MUSHROOM_SHIITAKE, MUSHROOM_SPORE, SPORE_ENOKI, SPORE_OYSTER, SPORE_RED, SPORE_SHIITAKE } from './blocks.mushrooms';
import { SNOWFLAKE, SNOW_BLOCKS } from './blocks.season';
import { FOOD_BLOCKS, FOOD_IDS } from './blocks.food';
import { BLACK_BLOCKS, BLACK_PICKAXE, WARRIOR_BOW, WARRIOR_BOW_FIRE, WARRIOR_BOW_ICE } from './blocks.black';
import { ALL_SWORD_IDS, SWORD_BLOCKS } from './blocks.swords';
import { BAG_MAPLE, BAG_SAKURA, KNIFE_MAPLE, NEWGEAR_BLOCKS, TRAP_BLOCK_IDS, WILLOW_TRAP } from './blocks.newgear';
import {
  BEAD_FIREWORK, BEAD_IDS, CALAMUS, CHUNK_ROLL,
  HARVEST_PLATTER, POUCH_CALAMUS, SEASON_FOOD_BLOCKS, SHIELD_CALAMUS, XMAS_COOKIE,
} from './blocks.seasonfood';
import { PLANK_BLOCKS, DYED_PLANK_IDS } from './blocks.planks';
import { BOTTLE_BLOCKS, BOTTLE_SW_DEEP, BOTTLE_SW_DROWN, BOTTLE_SW_LIGHT, BOTTLE_SW_MID, BOTTLE_SW_PHANTOM, BOTTLE_WATER } from './blocks.bottles';
import { DECO_BLOCKS, VINE_LADDER } from './blocks.deco';
import { RADISH_BLOCKS, WHITE_RADISH } from './radish';
import { WILLOW_BAG, WILLOW_BLOCKS, WILLOW_BRANCH, WILLOW_FLUFF, WILLOW_LEAVES, WILLOW_SAP1, WILLOW_WOOD } from './blocks.willow';
import { LEAF_DROP_BLOCKS, MAPLE_LEAF, PETAL_SAKURA } from './blocks.leafdrops';
import { ARENA_BLOCKS, ARENA_BOX } from './blocks.arena';
import { BUCKET_WATER_MAX } from '../config';

export * from './blocks.trees'; // 果树一族（梨/柿子/果树叶/树苗）的 ID 与物种表也走这里转发，外部照旧只认 './Block'
export * from './blocks.mushrooms'; // 蘑菇一族（四种蘑菇 + 孢子）同样转发
export * from './blocks.season'; // 季节小物（雪花）同样转发
export * from './blocks.food'; // 新食物与饮品（红花蜜茶/凉茶/草饼/香蕉液/两种拼盘）同样转发
export * from './blocks.black'; // 黑色售卖机一族（机器 + 黑色木镐 + 小战士弓三形态）同样转发
export * from './blocks.swords'; // 六把剑（blocks.swords.ts）同样转发
export * from './blocks.planks'; // 染色木板一族（blocks.planks.ts）同样转发
export * from './blocks.bottles'; // 玻璃瓶装液体一族（blocks.bottles.ts）同样转发
export * from './blocks.deco'; // 装饰方块一族（blocks.deco.ts）同样转发
export * from './blocks.willow'; // 柳树一族（blocks.willow.ts：柳树干/柳叶/柳树苗/柳絮孢子/柳条/柳絮腰包）同样转发
export * from './blocks.leafdrops'; // 树冠季节产物（blocks.leafdrops.ts：樱花花瓣/枫叶）同样转发
export * from './blocks.arena'; // 红焰大赛箱（blocks.arena.ts）同样转发
export * from './blocks.newgear'; // 四季 DIY 道具（blocks.newgear.ts：樱花药包/枫叶腰包/飞刀/柳条陷阱）同样转发
export * from './blocks.seasonfood'; // 四季节日道具（blocks.seasonfood.ts：春卷/菖蒲叶/香囊/护盾/拼盘/珠子/甜饼/礼花）同样转发
export * from './radish'; // 白萝卜（radish.ts：物品 + 价格逻辑）同样转发

export const AIR = 0;
export const GRASS = 1;
export const DIRT = 2;
export const STONE = 3;
export const SAND = 4;
export const WATER = 5;
export const WOOD = 6;
export const LEAVES = 7;
export const PLANKS = 8;
export const DOOR_CLOSED = 9;
export const DOOR_OPEN = 10;
export const GLASS = 11;
export const COBBLE = 12;
export const BRICK = 13;
export const CRAFTING_TABLE = 14;
export const WOOD_SLAB = 15;
export const STONE_SLAB = 16;
export const WOOD_STAIRS = 17;
export const FENCE = 18;
export const SIGN = 19;
export const CHEST = 20;
export const FURNACE = 21;
export const SANDSTONE = 22;
export const SOUL_GRASS = 23;
export const SOUL_CHEST = 24;
export const SOUL_WOOD_SLAB = 25;
export const SOUL_STONE_SLAB = 26;
export const SOUL_FURNACE = 27;
export const TALL_GRASS = 28;
export const DANDELION = 29;
export const POPPY = 30;
export const SNOW = 31;
export const ICE = 32;
export const CACTUS = 33;
// —— 羊毛：打羊掉的，是实心方块，能铺能拆 ——
export const WOOL_WHITE = 34;
export const WOOL_RED = 35;
export const WOOL_YELLOW = 36;
export const WOOL_BLUE = 37;
export const WOOL_GREEN = 38;
export const WOOL_PINK = 39;
export const WOOL_ORANGE = 40;
// —— 地毯：1/16 高的薄片，铺在方块上面 ——
export const CARPET_WHITE = 41;
export const CARPET_RED = 42;
export const CARPET_YELLOW = 43;
export const CARPET_BLUE = 44;
export const CARPET_GREEN = 45;
export const CARPET_PURPLE = 46;
export const CARPET_BLACK = 47;
export const DYE_TABLE = 48; // 地毯染色台
// —— 床：3 木头 + 1 地毯合成，颜色跟地毯一样，天黑按 M 睡觉 ——
export const BED_WHITE = 49;
export const BED_RED = 50;
export const BED_YELLOW = 51;
export const BED_BLUE = 52;
export const BED_GREEN = 53;
export const BED_PURPLE = 54;
export const BED_BLACK = 55;
// —— 矿石和金属块：埋在地下石头里，挖出来是粒/碎，攒着合成锭/块 ——
export const IRON_ORE = 56;
export const GOLD_ORE = 57;
export const BLUE_ORE = 58; // 蓝钻石矿
export const IRON_BLOCK = 59;
export const GOLD_BLOCK = 60;
export const BLUE_BLOCK = 61; // 蓝钻石块
export const LADDER = 62;    // 木梯子：贴在墙上的薄片，顶住墙按↑就能爬
export const FOUNTAIN = 63;  // 喷泉：2×2 大水池 + 中间圆锥 + 顶层小池，纯装饰
export const WOOL_BLACK = 64;
export const WOOL_GRAY = 65;
// —— 水稻：稻粒撒在水面上，每半天长一级：种子→小苗→绿大苗→黄大苗（熟了收割） ——
export const RICE_SEED = 66;   // 刚种下的种子，刚冒芽
export const RICE_SPROUT = 67; // 小苗：半截高的绿杆子
export const RICE_GREEN = 68;  // 绿大苗：快长成的高绿秆
export const RICE_MATURE = 69; // 黄大苗 = 熟了，顶上一坨金穗子
export const SEAWEED = 70;     // 水草：长在浅水底的绿色植物，挖了能带走再种回水里
export const STAR_WOOL = 71;   // 星空羊毛：会发光的羊毛，底下必须踩着实地方块才能放
export const STAR_TABLE = 72;  // 星空工作台：会发光的 3×3 大合成台
export const CARPET_BLOOD = 73; // 血尸红地毯：白地毯 + 血尸红颜料染出来，不在染色台色板里
export const MANHOLE = 76;          // 方井盖：一块铁锭压出来的带铆钉铁板，铺在地上
export const STAR_DYE_TABLE = 77;   // 星空染色台：能染星空地毯 + 融合颜料
export const CARPET_GRAY = 78;
export const CARPET_SWAN = 79;      // 天鹅黄地毯：奶呼呼的淡黄色
export const CARPET_LIGHTGREEN = 80;// 淡草绿地毯
export const CARPET_STAR = 81;      // 星空地毯：会发光的星星毯，只有星空染色台染得出来
export const BED_STAR = 82;         // 星空床：3 木头 + 星空地毯，睡着也发光
// —— 沼泽泽液：一圈圈的毒水，从外到内越来越凶；溺泽液像水一样会淹人 ——
export const SWAMP_LIGHT = 83;   // 淡沼泽液：最外圈，轻轻的毒
export const SWAMP_MID = 84;     // 沼泽液：第二圈
export const SWAMP_PHANTOM = 85; // 幻泽液：第三圈，碰到镜头会打转
export const SWAMP_DEEP = 86;    // 深泽液：中心之一，毒最狠
export const SWAMP_DROWN = 87;   // 溺泽液：中心之一，泡进去像掉水里会憋气
export const CHEM_DECOMP = 74; // 化学拆解器：拿水桶对它按 M，水变氢气
export const HYDROGEN_ENGINE = 75; // 永动氢气引擎：10 氢气瓶 + 1 铁块（功能以后再定）
/** 物品（不是方块，不能放到地上） */
export const RAW_MEAT = 100;
export const COOKED_MEAT = 101;
export const STICK = 102;
export const SOUL_DYE = 103;
export const DYE_RED = 104;
export const DYE_YELLOW = 105;
export const DYE_BLUE = 106;
export const DYE_GREEN = 107;
export const DYE_PINK = 108;
export const DYE_ORANGE = 109;
export const DIY_MANUAL = 110; // 写着制作方法的小手册，捡到就学不会进背包
export const IRON_NUGGET = 111;
export const GOLD_NUGGET = 112;
export const BLUE_SHARD = 113; // 蓝钻石碎
export const IRON_INGOT = 114;
export const GOLD_INGOT = 115;
export const BLUE_DIAMOND = 116;
export const DYE_BLACK = 117;
export const DYE_GRAY = 118;
export const BUCKET = 119; // 铁桶：铁粒敲出来的小桶
export const RICE_GRAIN = 120; // 稻粒：水稻的种子也是收成，对着水按 L 播种
export const WATER_BUCKET = 121; // 水桶：铁桶对着水按 P 盛满水得到的，按 L 倒出一格水
export const STAR_SHARD = 122;   // 星星碎片：只有睡觉才会从天上掉下来的宝贝（50% 概率）
export const BLOOD_MEAT = 123;   // 血尸肉：打死血尸掉的，能拆成 生肉×2 + 血尸红颜料
export const DYE_BLOOD = 124;    // 血尸红颜料：很深的褐红色，白地毯 + 它 = 血尸红地毯
export const PICKLE_BARREL = 125; // 腌菜桶：64 个草做一桶，吃了 +3 血还跑得快 1 分钟
export const HYDROGEN = 126;      // 氢气瓶：化学拆解器把水分解出来的
export const RUBBER = 127;        // 橡胶：砍树 10% 掉，做轮子用
export const WHEEL = 128;         // 轮子：铁锭+橡胶+黑颜料
export const TANK = 129;          // 坦克：最难做的东西，放地上按 M 能开着跑
export const TANK_BULLET = 130;   // 炮弹：两个铁粒做一发，坦克开炮消耗它
export const DYE_WHITE = 131;       // 白颜料
export const DYE_PURPLE = 132;      // 紫颜料
export const DYE_SWAN = 133;        // 天鹅黄颜料：淡淡的奶黄色
export const DYE_LIGHTGREEN = 134;  // 淡草绿颜料
export const DYE_STAR = 135;        // 星空色颜料：闪着星光的蓝紫色
export const CHALLENGE_HOUSE = 136; // 挑战房：64 石头 + 1 门做出来，放 5×5 平地变成打怪房
export const CHALLENGE_STONE = 137; // 挑战石：挑战房的墙，挖不动
export const CHALLENGE_DOOR = 138;  // 挑战门：对着按 M 交门票开打，也挖不动
export const CARROT = 139;        // 胡萝卜：种子也是收成，对着草地/泥土按 L 种，吃一根回一颗心
export const CARROT_SEED = 140;   // 胡萝卜芽：刚种下去一点点绿
export const CARROT_SPROUT = 141; // 胡萝卜小苗
export const CARROT_GREEN = 142;  // 胡萝卜大苗：绿叶长高了
export const CARROT_MATURE = 143; // 成熟胡萝卜：叶子下面露出橙尖尖
// —— 羽毛：鸟掉的（颜色跟鸟走），羽毛的用途以后再说 ——
export const FEATHER_WHITE = 144;
export const FEATHER_GRAY = 145;   // 灰羽毛拆解 → 白羽毛 + 灰颜料
export const FEATHER_GREEN = 146;
export const FEATHER_BLUE = 147;
export const FEATHER_YELLOW = 148;
export const FEATHER_BLACK = 149;  // 乌鸦羽毛拆解 → 白羽毛 + 黑颜料
// —— 玻璃小件：碎片是原料，锥是小刀，瓶是药水容器，玻璃桶能装泽液 ——
export const GLASS_SHARD = 150;   // 玻璃碎片：1 玻璃拆 4 个
export const GLASS_CONE = 151;    // 玻璃锥：3 碎片磨的小刀，攻击 1.5 倍拳，用完 2/3 概率碎
export const GLASS_BOTTLE = 152;  // 玻璃瓶：2 碎片吹的，装药水用
export const GLASS_BUCKET = 153;  // 玻璃桶：5 碎片做的，和铁桶一样能装泽液
// —— 药水瓶：泽液 + 玻璃瓶；P 扔 E 喝 ——
export const POTION_POISON = 154;  // 毒药瓶：砸中每 3 秒 -1 血，持续 15 秒
export const POTION_PHANTOM = 155; // 幻药瓶：砸中怪移速减半；自己喝会头晕打转
export const POTION_DEADLY = 156;  // 剧毒瓶：砸中每 2 秒 -2 血，持续 14 秒
export const POTION_BREATH = 157;  // 防溺瓶：自己喝，水下呼吸 60 秒
export const DYE_DEEPGREEN = 158;  // 深绿颜料：黑+绿融合；僵尸 1/20 掉；深泽液能拆成它
// —— 装了泽液的桶：铁桶 5 种 + 玻璃桶 5 种，count = 装了几格（最多 3，不混装） ——
export const SW_BUCKET_LIGHT = 159;
export const SW_BUCKET_MID = 160;
export const SW_BUCKET_PHANTOM = 161;
export const SW_BUCKET_DEEP = 162;
export const SW_BUCKET_DROWN = 163;
export const GS_BUCKET_LIGHT = 164;
export const GS_BUCKET_MID = 165;
export const GS_BUCKET_PHANTOM = 166;
export const GS_BUCKET_DEEP = 167;
export const GS_BUCKET_DROWN = 168;

/** 五种泽液 ID 表（从外到内越来越凶） */
export const SWAMP_IDS = [SWAMP_LIGHT, SWAMP_MID, SWAMP_PHANTOM, SWAMP_DEEP, SWAMP_DROWN];
export const isSwamp = (id: number): boolean => SWAMP_IDS.includes(id);
/** 装满泽液的桶 → 它空桶的样子和装的什么泽液 */
export const SWAMP_FILL: Record<number, { bucket: number; liquid: number }> = {
  [SW_BUCKET_LIGHT]: { bucket: BUCKET, liquid: SWAMP_LIGHT },
  [SW_BUCKET_MID]: { bucket: BUCKET, liquid: SWAMP_MID },
  [SW_BUCKET_PHANTOM]: { bucket: BUCKET, liquid: SWAMP_PHANTOM },
  [SW_BUCKET_DEEP]: { bucket: BUCKET, liquid: SWAMP_DEEP },
  [SW_BUCKET_DROWN]: { bucket: BUCKET, liquid: SWAMP_DROWN },
  [GS_BUCKET_LIGHT]: { bucket: GLASS_BUCKET, liquid: SWAMP_LIGHT },
  [GS_BUCKET_MID]: { bucket: GLASS_BUCKET, liquid: SWAMP_MID },
  [GS_BUCKET_PHANTOM]: { bucket: GLASS_BUCKET, liquid: SWAMP_PHANTOM },
  [GS_BUCKET_DEEP]: { bucket: GLASS_BUCKET, liquid: SWAMP_DEEP },
  [GS_BUCKET_DROWN]: { bucket: GLASS_BUCKET, liquid: SWAMP_DROWN },
};
/** 玻璃瓶装一格液体 → 空瓶和装的什么（玻璃瓶只装 1 格，清水和泽液都能装） */
export const BOTTLE_FILL: Record<number, { bucket: number; liquid: number }> = {
  [BOTTLE_WATER]: { bucket: GLASS_BOTTLE, liquid: WATER },
  [BOTTLE_SW_LIGHT]: { bucket: GLASS_BOTTLE, liquid: SWAMP_LIGHT },
  [BOTTLE_SW_MID]: { bucket: GLASS_BOTTLE, liquid: SWAMP_MID },
  [BOTTLE_SW_PHANTOM]: { bucket: GLASS_BOTTLE, liquid: SWAMP_PHANTOM },
  [BOTTLE_SW_DEEP]: { bucket: GLASS_BOTTLE, liquid: SWAMP_DEEP },
  [BOTTLE_SW_DROWN]: { bucket: GLASS_BOTTLE, liquid: SWAMP_DROWN },
};
/** 所有装满的液体容器 → 空容器 + 装的液体（铁桶水/铁桶泽液/玻璃桶泽液/玻璃瓶一切） */
export const LIQUID_FILL: Record<number, { bucket: number; liquid: number }> = {
  [WATER_BUCKET]: { bucket: BUCKET, liquid: WATER },
  ...SWAMP_FILL,
  ...BOTTLE_FILL,
};
/** 空容器 + 液体 → 装满后变成的容器 ID（舀液体用：铁桶、玻璃桶、玻璃瓶统一查这张表） */
export const FILLED_ID: Record<string, number> = Object.fromEntries(
  Object.entries(LIQUID_FILL).map(([fid, v]) => [`${v.bucket}:${v.liquid}`, Number(fid)]),
);
/** 这容器能装几格液体：玻璃瓶 1 格，铁桶/玻璃桶 BUCKET_WATER_MAX 格（容器填"空"的样子） */
export const liquidCapOf = (container: number): number => container === GLASS_BOTTLE ? 1 : BUCKET_WATER_MAX;
/** 这桶能不能装泽液（空桶/玻璃桶/玻璃瓶/已经装了泽液的容器都行） */
export const isSwampBucket = (id: number): boolean => id === BUCKET || id === GLASS_BUCKET || id === GLASS_BOTTLE || id in SWAMP_FILL;
/** 算液体的方块：清水 + 五种泽液（都会往下流，不会往旁边流） */
export const isLiquid = (id: number): boolean => id === WATER || isSwamp(id);
/** 算梯子的方块：木梯子 + 藤蔓梯子（藤蔓只是装饰，两种都能爬） */
export const isLadder = (id: number): boolean => id === LADDER || id === VINE_LADDER;
/** 四种药水瓶 ID 表 */
// —— 黄金系列编号（211~223）：编号放在 ID 段里，避免和 GoldenItems.ts 互相 import 成环
export const DYE_GOLD = 211;
export const BAG_GOLD = 212;
export const GOLD_CRAFT_TABLE = 213;
export const GOLD_DYE_TABLE = 214;
export const GOLD_CHEM_DECOMP = 215;
export const ICE_MOLECULE = 216;
export const POTION_ICE = 217;
export const GOLD_PICKAXE = 218;
export const DIY_GOLD_MANUAL = 219;
export const DIY_GOLD_CRAFT_TABLE = 220;
export const DIY_GOLD_DYE_TABLE = 221;
export const DIY_GOLD_CHEM_DECOMP = 222;
export const DIY_GOLD_PICKAXE = 223;

/** 拿在手上的黄金小物件（不是方块） */
const goldItem = (cn: string, tex: string) => ({ cn, tex: { top: tex, side: tex }, solid: false, seeThrough: true, hardness: 0, item: true });
/** 能放在地上的黄金方块 */
const goldBlock = (cn: string, top: string, side = top) => ({ cn, tex: { top, side }, solid: true, seeThrough: false, hardness: 1.2 });

/** 黄金系列的方块属性：和别的方块一样进 BLOCKS 表，不再启动后往里塞 */
const GOLDEN_BLOCKS = {
  [DYE_GOLD]: goldItem('金色颜料', 'dye_gold'),
  [BAG_GOLD]: goldItem('金色腰包', 'bag_gold'),
  [GOLD_CRAFT_TABLE]: goldBlock('黄金工作台', 'gold_workbench_top', 'gold_workbench_side'),
  [GOLD_DYE_TABLE]: goldBlock('黄金地毯染色台', 'gold_dye_top', 'gold_dye_side'),
  [GOLD_CHEM_DECOMP]: goldBlock('金色分解器', 'gold_chem_decomp'),
  [ICE_MOLECULE]: goldItem('冰分子', 'ice_molecule'),
  [POTION_ICE]: goldItem('寒冰瓶', 'potion_ice'),
  [GOLD_PICKAXE]: goldItem('金稿子', 'gold_pickaxe'),
  [DIY_GOLD_MANUAL]: goldItem('金色DIY手册', 'gold_manual'),
  [DIY_GOLD_CRAFT_TABLE]: goldItem('黄金工作台DIY手册', 'gold_manual'),
  [DIY_GOLD_DYE_TABLE]: goldItem('黄金地毯染色台DIY手册', 'gold_manual'),
  [DIY_GOLD_CHEM_DECOMP]: goldItem('金色分解器DIY手册', 'gold_manual'),
  [DIY_GOLD_PICKAXE]: goldItem('金稿子DIY手册', 'gold_manual'),
};

export const POTION_IDS = [POTION_POISON, POTION_PHANTOM, POTION_DEADLY, POTION_BREATH, POTION_ICE];
// —— 煤系列：地下煤矿挖出煤块，再加工成条/炭/粉 ——
export const COAL_CHUNK = 169;  // 煤块：挖煤矿掉落
export const COAL_BAR = 170;    // 煤条：3 煤块合 1 个
export const COAL = 171;        // 煤炭：2 煤块合 1 个
export const COAL_DUST = 172;   // 煤粉：1 煤块拆 3 个，做熔炉要它
// —— 芒星碎片和三种能灯 ——
export const MANG_SHARD = 173;     // 芒星碎片：黄白色的星星碎片，睡觉一半概率掉
export const MANG_LAMP = 174;      // 芒能灯：玻璃 + 2 芒星碎片，淡黄色灯光
export const STAR_LAMP = 175;      // 星能灯：玻璃 + 3 星星碎片，青白灯光
export const HYDROGEN_LAMP = 176;  // 氢能灯：玻璃 + 2 氢气瓶，绿色灯光
export const ROLLER_SKATES = 177;  // 轮滑鞋：8 轮子 + 4 橡胶；穿在靴子格，耐久 3 次
export const COAL_ORE = 178;      // 煤矿：地下石头层里生成，挖掉掉 1 个煤块
export const COBBLE_SHARD = 179;  // 圆石碎：1 个圆石能做 2 个
export const COAL_FIRESTARTER = 180;
export const MANG_FIRESTARTER = 181;
export const STAR_FIRESTARTER = 182;
export const SOUL_FIRESTARTER = 183;
export const HYDROGEN_FIRESTARTER = 184;
export const FIRESTARTER_IDS = [COAL_FIRESTARTER, MANG_FIRESTARTER, STAR_FIRESTARTER, SOUL_FIRESTARTER, HYDROGEN_FIRESTARTER];
export const BAG_WOOL = 185;
export const BAG_MANG = 186;
export const BAG_STAR = 187;
export const BAG_GLASS = 188;
export const BAG_GRASS = 189;
export const BAG_LEAF = 190;
export const BAG_BAMBOO = 191;
export const BAG_FEATHER = 192;
export const BAG_RUBBER = 193;
export const BAG_WOOL_RED = 194;
export const BAG_WOOL_YELLOW = 195;
export const BAG_WOOL_BLUE = 196;
export const BAG_WOOL_GREEN = 197;
export const BAG_WOOL_PINK = 198;
export const BAG_WOOL_ORANGE = 199;
export const BAG_WOOL_BLACK = 200;
export const BAG_WOOL_GRAY = 201;
export const BAG_WOOL_PURPLE = 202;
export const BAG_WOOL_SWAN = 203;
export const BAG_WOOL_LIGHTGREEN = 204;
export const BAG_WOOL_STAR = 205;
export const BAG_WOOL_BLOOD = 206;
export const BAG_WOOL_DEEPGREEN = 207;
export const BAMBOO = 208;             // 竹子：竹林中的茎，每格挖掉掉 1 个竹子
export const BAMBOO_SHOOT_PLANT = 209; // 竹笋植株
export const BAMBOO_SHOOT = 210;       // 挖竹笋植株得到的物品
// —— 南瓜与西瓜（224~235）：实心果实 → 切片（可吃）→ 种子（按 L 播种），苗期 3 阶段长成结果 ——
export const PUMPKIN = 224;            // 南瓜（实心方块，不能直接吃）
export const MELON = 225;              // 西瓜（实心方块，不能直接吃）
export const PUMPKIN_SLICE = 226;      // 南瓜片（+2 饥饿 +1 血）
export const MELON_SLICE = 227;        // 西瓜片（+1 饥饿 +1 血）
export const PUMPKIN_SEED = 228;       // 南瓜籽（对着草地/泥土按 L 播种）
export const MELON_SEED = 229;         // 西瓜籽（对着草地/泥土按 L 播种）
export const PUMPKIN_STAGE1 = 230;     // 南瓜小苗（刚种下）
export const PUMPKIN_STAGE2 = 231;     // 南瓜幼苗
export const PUMPKIN_STAGE3 = 232;     // 南瓜大苗（带叶）
export const MELON_STAGE1 = 233;       // 西瓜小苗（刚种下）
export const MELON_STAGE2 = 234;       // 西瓜幼苗
export const MELON_STAGE3 = 235;       // 西瓜大苗（带叶）
// —— 专属岛屿水果（236~238）：挖掉本岛树叶 5% 概率掉落，各有食用加成 ——
export const APPLE = 236;              // 苹果（+1 饥饿 +1.5 血）
export const PEACH = 237;              // 桃子（+2 饥饿 +0.5 血）
export const ORANGE = 238;             // 橙子（+1 饥饿 +1 血 + 3 秒移动速度 ×1.25）
// —— 大厅三台机器（239~241）：摆在大厅角落，对着按 M 使用，挖不动也不进创造面板 ——
export const VENDING_SPECIAL = 239;    // 特殊物品售卖机：卖小战士召唤蛋
export const VENDING_DRINK = 240;      // 饮料售卖机：卖各种果汁饮料
export const BUY_BOX = 241;            // 收购箱：东西放进去自动换成岛币
export const VENDING_STORE = 297;      // 杂货铺：大厅第四台机器，基础建材每天各限购 1 个
// —— 椰子树（242~244）：沙滩上长的浅色木，四瓣叶子，叶下挂着椰子方块 ——
export const PALM_WOOD = 242;
export const PALM_LEAVES = 243;
export const COCONUT = 244;
// —— 饮料（245~251）：水果/材料 + 玻璃瓶榨的，能喝也能卖给收购箱 ——
export const JUICE_APPLE = 245;
export const JUICE_ORANGE = 246;
export const JUICE_PEACH = 247;
export const WINE = 248;
export const JUICE_COCONUT = 249;
export const JUICE_MELON = 250;
export const JUICE_CARROT = 251;
// —— 小战士召唤蛋（252~254）：拿着对地按 M 召唤保镖，品质越高越能打 ——
export const EGG_WARRIOR_NORMAL = 252;   // 普通：血 36（僵尸三倍），跟僵尸一样能打
export const EGG_WARRIOR_ADVANCED = 253; // 高级：血 72，会自己回血
export const EGG_WARRIOR_EPIC = 254;     // 绝世：血 108 攻×2，会秒杀
export const WARRIOR_EGG_IDS = [EGG_WARRIOR_NORMAL, EGG_WARRIOR_ADVANCED, EGG_WARRIOR_EPIC];

// —— 四种鱼（255~258）：海里游的小家伙，下水按 P 打，打死掉生鱼 ——
export const FISH_CLOWN = 255;   // 小丑鱼：橙底白条
export const FISH_COD = 256;     // 鳕鱼：青背白肚
export const FISH_SALMON = 257;  // 鲑鱼：粉红身子
export const FISH_PUFFER = 258;  // 河豚：黄黄圆圆一身刺，会扎人
// —— 梨子汁与柿子饼（284~285）：季节限定的进阶食物，只能自己做、买不到 ——
export const JUICE_PEAR = 284;      // 梨子汁：1 梨 + 1 玻璃瓶榨的，喝着跟啃梨一样
export const PERSIMMON_CAKE = 285;  // 柿子饼：10 稻粒 + 1 柿子摊的，柿子的回血再加 3 点

export const WAISTBAG_SLOT = 1; // 装备栏从上往下第二格，也就是从下往上第三格
export const WOOL_BAG_DYES = [
  { dye: DYE_RED, id: BAG_WOOL_RED, color: '红', texture: 'bag_wool_red' },
  { dye: DYE_YELLOW, id: BAG_WOOL_YELLOW, color: '黄', texture: 'bag_wool_yellow' },
  { dye: DYE_BLUE, id: BAG_WOOL_BLUE, color: '蓝', texture: 'bag_wool_blue' },
  { dye: DYE_GREEN, id: BAG_WOOL_GREEN, color: '绿', texture: 'bag_wool_green' },
  { dye: DYE_PINK, id: BAG_WOOL_PINK, color: '粉', texture: 'bag_wool_pink' },
  { dye: DYE_ORANGE, id: BAG_WOOL_ORANGE, color: '橙', texture: 'bag_wool_orange' },
  { dye: DYE_BLACK, id: BAG_WOOL_BLACK, color: '黑', texture: 'bag_wool_black' },
  { dye: DYE_GRAY, id: BAG_WOOL_GRAY, color: '灰', texture: 'bag_wool_gray' },
  { dye: DYE_PURPLE, id: BAG_WOOL_PURPLE, color: '紫', texture: 'bag_wool_purple' },
  { dye: DYE_SWAN, id: BAG_WOOL_SWAN, color: '天鹅黄', texture: 'bag_wool_swan' },
  { dye: DYE_LIGHTGREEN, id: BAG_WOOL_LIGHTGREEN, color: '淡草绿', texture: 'bag_wool_lightgreen' },
  { dye: DYE_STAR, id: BAG_WOOL_STAR, color: '星空', texture: 'bag_wool_star' },
  { dye: DYE_BLOOD, id: BAG_WOOL_BLOOD, color: '血尸红', texture: 'bag_wool_blood' },
  { dye: DYE_DEEPGREEN, id: BAG_WOOL_DEEPGREEN, color: '深绿', texture: 'bag_wool_deepgreen' },
] as const;
export const WAISTBAG_CAPACITY: Record<number, number> = {
  [BAG_WOOL]: 8, [BAG_MANG]: 10, [BAG_STAR]: 10, [BAG_GLASS]: 8,
  [BAG_GRASS]: 6, [BAG_LEAF]: 4, [BAG_BAMBOO]: 4, [BAG_FEATHER]: 6, [BAG_RUBBER]: 4, [BAG_GOLD]: 10,
  [WILLOW_BAG]: 6, [BAG_SAKURA]: 6, [BAG_MAPLE]: 6,
  ...Object.fromEntries(WOOL_BAG_DYES.map(({ id }) => [id, 8])),
};
export const WAISTBAG_IDS = Object.keys(WAISTBAG_CAPACITY).map(Number);
export const isWaistbag = (id: number): boolean => id in WAISTBAG_CAPACITY;
export const WAISTBAG_TEXTURES: Record<number, string> = {
  [BAG_WOOL]: 'bag_wool', [BAG_MANG]: 'bag_mang', [BAG_STAR]: 'bag_star',
  [BAG_GLASS]: 'bag_glass', [BAG_GRASS]: 'bag_grass', [BAG_LEAF]: 'bag_leaf',
  [BAG_BAMBOO]: 'bag_bamboo', [BAG_FEATHER]: 'bag_feather', [BAG_RUBBER]: 'bag_rubber', [BAG_GOLD]: 'bag_gold',
  [WILLOW_BAG]: 'bag_willow', [BAG_SAKURA]: 'bag_sakura', [BAG_MAPLE]: 'bag_maple',
  ...Object.fromEntries(WOOL_BAG_DYES.map(({ id, texture }) => [id, texture])),
};

/** 同色系东西的 ID 列表（染色台扣地毯、羊掉羊毛、批量生成贴图都用它） */
export const WOOL_IDS = [WOOL_WHITE, WOOL_RED, WOOL_YELLOW, WOOL_BLUE, WOOL_GREEN, WOOL_PINK, WOOL_ORANGE, WOOL_BLACK, WOOL_GRAY];
export const CARPET_IDS = [CARPET_WHITE, CARPET_RED, CARPET_YELLOW, CARPET_BLUE, CARPET_GREEN, CARPET_PURPLE, CARPET_BLACK];
/** 普通染色台新增的三种颜色（星空地毯只有星空染色台能染） */
export const CARPET_EXTRA = [CARPET_GRAY, CARPET_SWAN, CARPET_LIGHTGREEN];
/** 所有能被染色台收走的地毯（染别的颜色） */
export const DYEABLE_CARPETS = [...CARPET_IDS, ...CARPET_EXTRA, CARPET_STAR];
export const DYE_IDS = [DYE_RED, DYE_YELLOW, DYE_BLUE, DYE_GREEN, DYE_PINK, DYE_ORANGE, DYE_BLACK, DYE_GRAY, DYE_GOLD];
/** 星空染色台融合出来的新颜料（白/紫/天鹅黄/淡草绿/星空色） */
export const DYE_NEW = [DYE_WHITE, DYE_PURPLE, DYE_SWAN, DYE_LIGHTGREEN, DYE_STAR, DYE_GOLD];
/** 床颜色顺序和地毯一一对应：第 i 张地毯合成第 i 张床 */
export const BED_IDS = [BED_WHITE, BED_RED, BED_YELLOW, BED_BLUE, BED_GREEN, BED_PURPLE, BED_BLACK, BED_STAR];

/** 每种颜色东西的 CSS 主色：贴图、羊的身体、染色台按钮共用一张表 */
export const COLOR_CSS: Record<number, string> = {
  [WOOL_WHITE]: '#e8e8e8', [WOOL_RED]: '#b03a2e', [WOOL_YELLOW]: '#f0cf3a',
  [WOOL_BLUE]: '#3d5fb0', [WOOL_GREEN]: '#4e9e46', [WOOL_PINK]: '#e893b8', [WOOL_ORANGE]: '#d97b2e',
  [WOOL_BLACK]: '#2e2e2e', [WOOL_GRAY]: '#9a9a9a',
  [CARPET_WHITE]: '#e8e8e8', [CARPET_RED]: '#b03a2e', [CARPET_YELLOW]: '#f0cf3a',
  [CARPET_BLUE]: '#3d5fb0', [CARPET_GREEN]: '#4e9e46', [CARPET_PURPLE]: '#7a3fa0', [CARPET_BLACK]: '#2e2e2e',
  [CARPET_BLOOD]: '#5a1510',
  [CARPET_GRAY]: '#9a9a9a', [CARPET_SWAN]: '#f2e2a8', [CARPET_LIGHTGREEN]: '#a8d87a', [CARPET_STAR]: '#4a48b8',
  [DYE_RED]: '#b03a2e', [DYE_YELLOW]: '#f0cf3a', [DYE_BLUE]: '#3d5fb0',
  [DYE_GREEN]: '#4e9e46', [DYE_PINK]: '#e893b8', [DYE_ORANGE]: '#d97b2e',
  [DYE_BLACK]: '#2e2e2e', [DYE_GRAY]: '#9a9a9a', [DYE_BLOOD]: '#5a1510',
  [DYE_WHITE]: '#f5f5f0', [DYE_PURPLE]: '#7a3fa0', [DYE_SWAN]: '#f2e2a8',
  [DYE_LIGHTGREEN]: '#a8d87a', [DYE_STAR]: '#4a48b8', [DYE_DEEPGREEN]: '#1e5c2a', [DYE_GOLD]: '#e0aa00',
  [BED_WHITE]: '#e8e8e8', [BED_RED]: '#b03a2e', [BED_YELLOW]: '#f0cf3a',
  [BED_BLUE]: '#3d5fb0', [BED_GREEN]: '#4e9e46', [BED_PURPLE]: '#7a3fa0', [BED_BLACK]: '#2e2e2e',
  [BED_STAR]: '#4a48b8',
};

/** 特殊形状（不是整个立方体的方块） */
export type Shape = 'slab' | 'stairs' | 'fence' | 'sign' | 'chest' | 'cross' | 'carpet' | 'bed' | 'ladder' | 'fountain' | 'bamboo';

export interface BlockDef {
  /** 中文名，显示在物品栏和背包里 */
  cn: string;
  /** 贴图名：顶面 / 侧面 / 底面（底面省略时和侧面一样）；front = 朝玩家的那面（熔炉等） */
  tex: { top: string; side: string; bottom?: string; front?: string };
  /** 实心方块会挡人挡视线 */
  solid: boolean;
  /** 透明方块：挨着的面要画出来（空气、水、玻璃、开着的门、异形方块） */
  seeThrough: boolean;
  /** 挖掉它要几秒（Infinity = 永远挖不动） */
  hardness: number;
  /** 挖掉后掉什么（缺省 = 掉自己） */
  drop?: number;
  /** 开着的门：画成一块薄板 */
  doorPanel?: boolean;
  /** 贴图带透明度，要走半透明通道渲染（水、玻璃） */
  alphaBlend?: boolean;
  /** 是物品不是方块：不能放到世界里 */
  item?: boolean;
  /** 特殊形状：slab/stairs/fence/sign/chest/cross（交叉薄片，花草用）/carpet（地毯薄片） */
  shape?: Shape;
  /** 能挡射线但不算实心（告示牌、开着的门） */
  targetable?: boolean;
  /** 放置时要记录朝向（楼梯、熔炉、告示牌、床） */
  oriented?: boolean;
  /** 床头那半的贴图：床横着占两格，meta≥4 的那格是床头（枕头） */
  texHead?: { top: string; side: string };
  /** 自己会发光：永远满亮度显示，黑夜里也亮堂堂（星空系列） */
  glow?: boolean;
}

const INF = Infinity;

export const BLOCKS: Record<number, BlockDef> = {
  ...GOLDEN_BLOCKS, // 黄金系列（blocks.golden.ts）：和别的方块一样进表，不再运行时塞
  ...TREE_BLOCKS,   // 果树一族（blocks.trees.ts）：5 种果树叶 + 梨/柿子 + 6 种三阶段树苗
  ...MUSHROOM_BLOCKS, // 蘑菇一族（blocks.mushrooms.ts）：四种蘑菇 + 孢子
  ...SNOW_BLOCKS,     // 季节小物（blocks.season.ts）：雪花
  ...FOOD_BLOCKS,     // 新食物与饮品（blocks.food.ts）：两种茶/草饼/香蕉液/两种拼盘
  ...BLACK_BLOCKS,    // 黑色售卖机一族（blocks.black.ts）：机器 + 黑色木镐 + 三形态小战士弓
  ...SWORD_BLOCKS,    // 六把剑（blocks.swords.ts）：木/铁/金/钻石/雪花/血腥
  ...PLANK_BLOCKS,    // 染色木板一族（blocks.planks.ts）：深/浅/灵魂蓝
  ...BOTTLE_BLOCKS,   // 玻璃瓶装液体一族（blocks.bottles.ts）：一格一瓶
  ...DECO_BLOCKS,     // 装饰方块一族（blocks.deco.ts）：藤蔓梯子等
  ...RADISH_BLOCKS,   // 白萝卜（radish.ts）：黑色售卖机周一进货的炒股道具
  ...WILLOW_BLOCKS,   // 柳树一族（blocks.willow.ts）：柳树干/柳叶/三阶段树苗/柳絮孢子/柳条/柳絮腰包
  ...LEAF_DROP_BLOCKS, // 树冠季节产物（blocks.leafdrops.ts）：樱花花瓣/枫叶
  ...ARENA_BLOCKS,    // 红焰大赛箱（blocks.arena.ts）：大厅赛事入口
  ...NEWGEAR_BLOCKS,  // 四季 DIY 道具（blocks.newgear.ts）：两个腰包/飞刀/柳条陷阱五态
  ...SEASON_FOOD_BLOCKS, // 四季节日道具（blocks.seasonfood.ts）：春卷/菖蒲叶/香囊/护盾/拼盘/珠子/甜饼/礼花
  [AIR]:         { cn: '空气',   tex: { top: '', side: '' }, solid: false, seeThrough: true, hardness: 0 },
  [GRASS]:       { cn: '草方块', tex: { top: 'grass_top', side: 'grass_side', bottom: 'dirt' }, solid: true, seeThrough: false, hardness: 0.6, drop: DIRT },
  [DIRT]:        { cn: '泥土',   tex: { top: 'dirt', side: 'dirt' }, solid: true, seeThrough: false, hardness: 0.5 },
  [STONE]:       { cn: '石头',   tex: { top: 'stone', side: 'stone' }, solid: true, seeThrough: false, hardness: 2, drop: COBBLE },
  [SAND]:        { cn: '沙子',   tex: { top: 'sand', side: 'sand' }, solid: true, seeThrough: false, hardness: 0.5 },
  [WATER]:       { cn: '水',     tex: { top: 'water', side: 'water' }, solid: false, seeThrough: true, hardness: INF, alphaBlend: true },
  [WOOD]:        { cn: '木头',   tex: { top: 'wood_top', side: 'wood_side' }, solid: true, seeThrough: false, hardness: 1.2 },
  [LEAVES]:      { cn: '树叶',   tex: { top: 'leaves', side: 'leaves' }, solid: true, seeThrough: false, hardness: 0.25 },
  [PLANKS]:      { cn: '木板',   tex: { top: 'planks', side: 'planks' }, solid: true, seeThrough: false, hardness: 1 },
  [DOOR_CLOSED]: { cn: '门',     tex: { top: 'door', side: 'door' }, solid: true, seeThrough: true, hardness: 1, drop: DOOR_CLOSED },
  [DOOR_OPEN]:   { cn: '门(开)', tex: { top: 'door', side: 'door' }, solid: false, seeThrough: true, hardness: 1, drop: DOOR_CLOSED, doorPanel: true, targetable: true },
  [GLASS]:       { cn: '玻璃',   tex: { top: 'glass', side: 'glass' }, solid: true, seeThrough: true, hardness: 0.4, alphaBlend: true },
  [COBBLE]:      { cn: '圆石',   tex: { top: 'cobble', side: 'cobble' }, solid: true, seeThrough: false, hardness: 2 },
  [BRICK]:       { cn: '砖块',   tex: { top: 'brick', side: 'brick' }, solid: true, seeThrough: false, hardness: 2.2 },
  [CRAFTING_TABLE]: { cn: '工作台', tex: { top: 'craft_top', side: 'craft_side' }, solid: true, seeThrough: false, hardness: 1.2 },
  [WOOD_SLAB]:   { cn: '木台阶', tex: { top: 'planks', side: 'planks' }, solid: true, seeThrough: true, hardness: 1, shape: 'slab' },
  [STONE_SLAB]:  { cn: '石台阶', tex: { top: 'stone', side: 'stone' }, solid: true, seeThrough: true, hardness: 2, shape: 'slab' },
  [WOOD_STAIRS]: { cn: '木楼梯', tex: { top: 'planks', side: 'planks' }, solid: true, seeThrough: true, hardness: 1, shape: 'stairs', oriented: true },
  [FENCE]:       { cn: '木栅栏', tex: { top: 'planks', side: 'fence' }, solid: true, seeThrough: true, hardness: 1, shape: 'fence' },
  [SIGN]:        { cn: '木告示牌', tex: { top: 'sign', side: 'sign' }, solid: false, seeThrough: true, hardness: 0.5, shape: 'sign', oriented: true, targetable: true },
  [CHEST]:       { cn: '箱子',   tex: { top: 'chest_side', side: 'chest_side', front: 'chest_front' }, solid: true, seeThrough: true, hardness: 1.2, shape: 'chest', oriented: true },
  [FURNACE]:     { cn: '熔炉',   tex: { top: 'furnace_top', side: 'furnace_side', front: 'furnace_front' }, solid: true, seeThrough: false, hardness: 2, oriented: true },
  [SANDSTONE]:   { cn: '砂岩',   tex: { top: 'sandstone', side: 'sandstone' }, solid: true, seeThrough: false, hardness: 1 },
  [SOUL_GRASS]:  { cn: '灵魂草方块', tex: { top: 'soul_grass_top', side: 'soul_grass_side', bottom: 'dirt' }, solid: true, seeThrough: false, hardness: 0.6 },
  [SOUL_CHEST]:  { cn: '灵魂蓝箱子', tex: { top: 'soul_chest_side', side: 'soul_chest_side', front: 'soul_chest_front' }, solid: true, seeThrough: true, hardness: 1.2, shape: 'chest', oriented: true },
  [SOUL_WOOD_SLAB]: { cn: '灵魂蓝木台阶', tex: { top: 'soul_planks', side: 'soul_planks' }, solid: true, seeThrough: true, hardness: 1, shape: 'slab' },
  [SOUL_STONE_SLAB]: { cn: '灵魂蓝石台阶', tex: { top: 'soul_stone', side: 'soul_stone' }, solid: true, seeThrough: true, hardness: 2, shape: 'slab' },
  [SOUL_FURNACE]: { cn: '灵魂火熔炉', tex: { top: 'furnace_top', side: 'furnace_side', front: 'soul_furnace_front' }, solid: true, seeThrough: false, hardness: 2, oriented: true },
  [TALL_GRASS]:  { cn: '杂草',   tex: { top: 'tall_grass', side: 'tall_grass' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true },
  [DANDELION]:   { cn: '蒲公英', tex: { top: 'dandelion', side: 'dandelion' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true },
  [POPPY]:       { cn: '小红花', tex: { top: 'poppy', side: 'poppy' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true },
  [SNOW]:        { cn: '雪块',   tex: { top: 'snow', side: 'snow' }, solid: true, seeThrough: false, hardness: 0.4 },
  [ICE]:         { cn: '冰',     tex: { top: 'ice', side: 'ice' }, solid: true, seeThrough: true, hardness: 0.6, alphaBlend: true },
  [CACTUS]:      { cn: '仙人掌', tex: { top: 'cactus_top', side: 'cactus_side' }, solid: true, seeThrough: false, hardness: 0.4 },
  [RAW_MEAT]:    { cn: '生肉',   tex: { top: 'meat', side: 'meat' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [COOKED_MEAT]: { cn: '熟肉',   tex: { top: 'meat_cooked', side: 'meat_cooked' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [STICK]:       { cn: '木棍',   tex: { top: 'stick', side: 'stick' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [SOUL_DYE]:    { cn: '灵魂蓝颜料', tex: { top: 'soul_dye', side: 'soul_dye' }, solid: false, seeThrough: true, hardness: 0, item: true },
  // —— 羊毛：软方块，彩色羊毛能拆成 白羊毛+同色颜料 ——
  [WOOL_WHITE]:  { cn: '白羊毛', tex: { top: 'wool_white', side: 'wool_white' }, solid: true, seeThrough: false, hardness: 0.5 },
  [WOOL_RED]:    { cn: '红羊毛', tex: { top: 'wool_red', side: 'wool_red' }, solid: true, seeThrough: false, hardness: 0.5 },
  [WOOL_YELLOW]: { cn: '黄羊毛', tex: { top: 'wool_yellow', side: 'wool_yellow' }, solid: true, seeThrough: false, hardness: 0.5 },
  [WOOL_BLUE]:   { cn: '蓝羊毛', tex: { top: 'wool_blue', side: 'wool_blue' }, solid: true, seeThrough: false, hardness: 0.5 },
  [WOOL_GREEN]:  { cn: '绿羊毛', tex: { top: 'wool_green', side: 'wool_green' }, solid: true, seeThrough: false, hardness: 0.5 },
  [WOOL_PINK]:   { cn: '粉羊毛', tex: { top: 'wool_pink', side: 'wool_pink' }, solid: true, seeThrough: false, hardness: 0.5 },
  [WOOL_ORANGE]: { cn: '橙羊毛', tex: { top: 'wool_orange', side: 'wool_orange' }, solid: true, seeThrough: false, hardness: 0.5 },
  [WOOL_BLACK]:  { cn: '黑羊毛', tex: { top: 'wool_black', side: 'wool_black' }, solid: true, seeThrough: false, hardness: 0.5 },
  [WOOL_GRAY]:   { cn: '灰羊毛', tex: { top: 'wool_gray', side: 'wool_gray' }, solid: true, seeThrough: false, hardness: 0.5 },
  // —— 地毯：能穿过去的薄片，挖它要点得到所以 targetable ——
  [CARPET_WHITE]:  { cn: '白地毯', tex: { top: 'carpet_white', side: 'carpet_white' }, solid: false, seeThrough: true, hardness: 0.2, shape: 'carpet', targetable: true },
  [CARPET_RED]:    { cn: '红地毯', tex: { top: 'carpet_red', side: 'carpet_red' }, solid: false, seeThrough: true, hardness: 0.2, shape: 'carpet', targetable: true },
  [CARPET_YELLOW]: { cn: '黄地毯', tex: { top: 'carpet_yellow', side: 'carpet_yellow' }, solid: false, seeThrough: true, hardness: 0.2, shape: 'carpet', targetable: true },
  [CARPET_BLUE]:   { cn: '蓝地毯', tex: { top: 'carpet_blue', side: 'carpet_blue' }, solid: false, seeThrough: true, hardness: 0.2, shape: 'carpet', targetable: true },
  [CARPET_GREEN]:  { cn: '绿地毯', tex: { top: 'carpet_green', side: 'carpet_green' }, solid: false, seeThrough: true, hardness: 0.2, shape: 'carpet', targetable: true },
  [CARPET_PURPLE]: { cn: '紫地毯', tex: { top: 'carpet_purple', side: 'carpet_purple' }, solid: false, seeThrough: true, hardness: 0.2, shape: 'carpet', targetable: true },
  [CARPET_BLACK]:  { cn: '黑地毯', tex: { top: 'carpet_black', side: 'carpet_black' }, solid: false, seeThrough: true, hardness: 0.2, shape: 'carpet', targetable: true },
  // 染色台：front 借给图标用（图标画正面=画漂亮的顶面），本身不朝向
  [DYE_TABLE]:   { cn: '地毯染色台', tex: { top: 'dye_table_top', side: 'dye_table_side', front: 'dye_table_top' }, solid: true, seeThrough: false, hardness: 1.2 },
  // —— 床：横着占两格（指着的格是床尾被子，面前一格是床头枕头），颜色跟地毯走 ——
  [BED_WHITE]:   { cn: '白床', tex: { top: 'bed_white_ftop', side: 'bed_white_fside' }, texHead: { top: 'bed_white_htop', side: 'bed_white_hside' }, solid: true, seeThrough: true, hardness: 0.5, shape: 'bed', oriented: true },
  [BED_RED]:     { cn: '红床', tex: { top: 'bed_red_ftop', side: 'bed_red_fside' }, texHead: { top: 'bed_red_htop', side: 'bed_red_hside' }, solid: true, seeThrough: true, hardness: 0.5, shape: 'bed', oriented: true },
  [BED_YELLOW]:  { cn: '黄床', tex: { top: 'bed_yellow_ftop', side: 'bed_yellow_fside' }, texHead: { top: 'bed_yellow_htop', side: 'bed_yellow_hside' }, solid: true, seeThrough: true, hardness: 0.5, shape: 'bed', oriented: true },
  [BED_BLUE]:    { cn: '蓝床', tex: { top: 'bed_blue_ftop', side: 'bed_blue_fside' }, texHead: { top: 'bed_blue_htop', side: 'bed_blue_hside' }, solid: true, seeThrough: true, hardness: 0.5, shape: 'bed', oriented: true },
  [BED_GREEN]:   { cn: '绿床', tex: { top: 'bed_green_ftop', side: 'bed_green_fside' }, texHead: { top: 'bed_green_htop', side: 'bed_green_hside' }, solid: true, seeThrough: true, hardness: 0.5, shape: 'bed', oriented: true },
  [BED_PURPLE]:  { cn: '紫床', tex: { top: 'bed_purple_ftop', side: 'bed_purple_fside' }, texHead: { top: 'bed_purple_htop', side: 'bed_purple_hside' }, solid: true, seeThrough: true, hardness: 0.5, shape: 'bed', oriented: true },
  [BED_BLACK]:   { cn: '黑床', tex: { top: 'bed_black_ftop', side: 'bed_black_fside' }, texHead: { top: 'bed_black_htop', side: 'bed_black_hside' }, solid: true, seeThrough: true, hardness: 0.5, shape: 'bed', oriented: true },
  [BED_STAR]:    { cn: '星空床', tex: { top: 'bed_star_ftop', side: 'bed_star_fside' }, texHead: { top: 'bed_star_htop', side: 'bed_star_hside' }, solid: true, seeThrough: true, hardness: 0.5, shape: 'bed', oriented: true, glow: true },
  // —— 颜料：拆彩色羊毛得到，攒齐 6 种 + 工作台 = 染色台 ——
  [DYE_RED]:    { cn: '红颜料', tex: { top: 'dye_red', side: 'dye_red' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [DYE_YELLOW]: { cn: '黄颜料', tex: { top: 'dye_yellow', side: 'dye_yellow' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [DYE_BLUE]:   { cn: '蓝颜料', tex: { top: 'dye_blue', side: 'dye_blue' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [DYE_GREEN]:  { cn: '绿颜料', tex: { top: 'dye_green', side: 'dye_green' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [DYE_PINK]:   { cn: '粉颜料', tex: { top: 'dye_pink', side: 'dye_pink' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [DYE_ORANGE]: { cn: '橙颜料', tex: { top: 'dye_orange', side: 'dye_orange' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [DYE_BLACK]:  { cn: '黑颜料', tex: { top: 'dye_black', side: 'dye_black' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [DYE_GRAY]:   { cn: '灰颜料', tex: { top: 'dye_gray', side: 'dye_gray' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [DIY_MANUAL]: { cn: 'DIY手册', tex: { top: 'manual', side: 'manual' }, solid: false, seeThrough: true, hardness: 0, item: true },
  // —— 矿石：比石头难挖一点，挖出来掉的是粒/碎不是方块自己 ——
  [IRON_ORE]:    { cn: '铁矿石',   tex: { top: 'iron_ore', side: 'iron_ore' }, solid: true, seeThrough: false, hardness: 2.5, drop: IRON_NUGGET },
  [GOLD_ORE]:    { cn: '金矿石',   tex: { top: 'gold_ore', side: 'gold_ore' }, solid: true, seeThrough: false, hardness: 2.5, drop: GOLD_NUGGET },
  [BLUE_ORE]:    { cn: '蓝钻石矿', tex: { top: 'blue_ore', side: 'blue_ore' }, solid: true, seeThrough: false, hardness: 3, drop: BLUE_SHARD },
  [COAL_ORE]:    { cn: '煤矿',     tex: { top: 'coal_ore', side: 'coal_ore' }, solid: true, seeThrough: false, hardness: 2, drop: COAL_CHUNK },
  // —— 金属块：攒出来的宝贝，摆家里显摆 ——
  [IRON_BLOCK]:  { cn: '铁块',     tex: { top: 'iron_block', side: 'iron_block' }, solid: true, seeThrough: false, hardness: 2.5 },
  [GOLD_BLOCK]:  { cn: '金块',     tex: { top: 'gold_block', side: 'gold_block' }, solid: true, seeThrough: false, hardness: 2.5 },
  [BLUE_BLOCK]:  { cn: '蓝钻石块', tex: { top: 'blue_block', side: 'blue_block' }, solid: true, seeThrough: false, hardness: 3 },
  // —— 矿物物品：粒/碎/锭/钻 ——
  [IRON_NUGGET]: { cn: '铁粒',     tex: { top: 'iron_nugget', side: 'iron_nugget' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [GOLD_NUGGET]: { cn: '金粒',     tex: { top: 'gold_nugget', side: 'gold_nugget' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [BLUE_SHARD]:  { cn: '蓝钻石碎', tex: { top: 'blue_shard', side: 'blue_shard' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [IRON_INGOT]:  { cn: '铁锭',     tex: { top: 'iron_ingot', side: 'iron_ingot' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [GOLD_INGOT]:  { cn: '金锭',     tex: { top: 'gold_ingot', side: 'gold_ingot' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [BLUE_DIAMOND]: { cn: '蓝钻石',  tex: { top: 'blue_diamond', side: 'blue_diamond' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [BUCKET]:       { cn: '铁桶',    tex: { top: 'bucket', side: 'bucket' }, solid: false, seeThrough: true, hardness: 0, item: true },
  // 梯子：贴墙的薄片（meta 决定贴哪面），人能穿过去 → 才能爬
  [LADDER]:    { cn: '木梯子', tex: { top: 'ladder', side: 'ladder' }, solid: false, seeThrough: true, hardness: 0.4, shape: 'ladder', oriented: true, targetable: true },
  // 喷泉：front 借给图标用（画个小喷泉），世界里用 fountain_stone 拼造型
  [FOUNTAIN]:  { cn: '喷泉',   tex: { top: 'fountain_stone', side: 'fountain_stone', front: 'fountain_icon' }, solid: true, seeThrough: true, hardness: 2, shape: 'fountain' },
  // —— 水稻四个阶段：都是交叉薄片、一碰就掉；没熟的挖掉退 1 粒种子，熟的收 5~10 粒 ——
  [RICE_SEED]:   { cn: '水稻种子', tex: { top: 'rice_seed', side: 'rice_seed' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true, drop: RICE_GRAIN },
  [RICE_SPROUT]: { cn: '水稻小苗', tex: { top: 'rice_sprout', side: 'rice_sprout' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true, drop: RICE_GRAIN },
  [RICE_GREEN]:  { cn: '水稻大苗', tex: { top: 'rice_green', side: 'rice_green' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true, drop: RICE_GRAIN },
  [RICE_MATURE]: { cn: '金黄水稻', tex: { top: 'rice_mature', side: 'rice_mature' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true, drop: RICE_GRAIN },
  [RICE_GRAIN]:  { cn: '稻粒', tex: { top: 'rice_grain', side: 'rice_grain' }, solid: false, seeThrough: true, hardness: 0, item: true },
  // 水草：长在水底的绿色水草，只能种回水里（脚底下那格得是实地）
  [SEAWEED]:     { cn: '水草', tex: { top: 'seaweed', side: 'seaweed' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true },
  [WATER_BUCKET]: { cn: '水桶', tex: { top: 'bucket_water', side: 'bucket_water' }, solid: false, seeThrough: true, hardness: 0, item: true },
  // —— 星空系列：星星碎片睡觉才掉，都会发光（贴图画得亮晶晶） ——
  [STAR_WOOL]:   { cn: '星空羊毛', tex: { top: 'starwool', side: 'starwool' }, solid: true, seeThrough: false, hardness: 0.5, glow: true },
  [STAR_TABLE]:  { cn: '星空工作台', tex: { top: 'star_table_top', side: 'star_table_side', front: 'star_table_top' }, solid: true, seeThrough: false, hardness: 1.2, glow: true },
  [STAR_SHARD]:  { cn: '星星碎片', tex: { top: 'star_shard', side: 'star_shard' }, solid: false, seeThrough: true, hardness: 0, item: true, glow: true },
  // —— 血尸系列：晚上才出没的血尸掉的战利品 ——
  [BLOOD_MEAT]:    { cn: '血尸肉', tex: { top: 'meat_blood', side: 'meat_blood' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [DYE_BLOOD]:     { cn: '血尸红颜料', tex: { top: 'dye_blood', side: 'dye_blood' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [CARPET_BLOOD]:  { cn: '血尸红地毯', tex: { top: 'carpet_blood', side: 'carpet_blood' }, solid: false, seeThrough: true, hardness: 0.2, shape: 'carpet', targetable: true },
  // —— 化学系列：水 → 氢气 → 引擎 ——
  [CHEM_DECOMP]:     { cn: '化学拆解器', tex: { top: 'chem_decomp', side: 'chem_decomp' }, solid: true, seeThrough: false, hardness: 1.5 },
  [HYDROGEN_ENGINE]: { cn: '永动氢气引擎', tex: { top: 'hydrogen_engine', side: 'hydrogen_engine' }, solid: true, seeThrough: false, hardness: 2 },
  [PICKLE_BARREL]:   { cn: '腌菜桶', tex: { top: 'pickle_barrel', side: 'pickle_barrel' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [HYDROGEN]:        { cn: '氢气瓶', tex: { top: 'hydrogen', side: 'hydrogen' }, solid: false, seeThrough: true, hardness: 0, item: true },
  // —— 坦克线：橡胶→轮子→坦克（收藏品，拿到手就是本事） ——
  [RUBBER]:          { cn: '橡胶',   tex: { top: 'rubber', side: 'rubber' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [WHEEL]:           { cn: '轮子',   tex: { top: 'wheel', side: 'wheel' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [TANK]:            { cn: '坦克',   tex: { top: 'tank', side: 'tank' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [TANK_BULLET]:     { cn: '炮弹',   tex: { top: 'tank_bullet', side: 'tank_bullet' }, solid: false, seeThrough: true, hardness: 0, item: true },
  // 挑战房：道具放下后自己长成 5×5×5 石头房；墙和门都是基岩级硬度，挖不动
  [CHALLENGE_HOUSE]: { cn: '挑战房', tex: { top: 'challenge', side: 'challenge' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [CHALLENGE_STONE]: { cn: '挑战石', tex: { top: 'challenge_stone', side: 'challenge_stone' }, solid: true, seeThrough: false, hardness: Infinity },
  [CHALLENGE_DOOR]:  { cn: '挑战门', tex: { top: 'challenge_door', side: 'challenge_door' }, solid: true, seeThrough: true, hardness: Infinity, targetable: true },
  // 胡萝卜四阶段：跟水稻一套规矩，就是种在地里不在水里
  [CARROT_SEED]:    { cn: '胡萝卜芽',   tex: { top: 'carrot_seed', side: 'carrot_seed' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true, drop: CARROT },
  [CARROT_SPROUT]:  { cn: '胡萝卜小苗', tex: { top: 'carrot_sprout', side: 'carrot_sprout' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true, drop: CARROT },
  [CARROT_GREEN]:   { cn: '胡萝卜大苗', tex: { top: 'carrot_green', side: 'carrot_green' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true, drop: CARROT },
  [CARROT_MATURE]:  { cn: '成熟胡萝卜', tex: { top: 'carrot_mature', side: 'carrot_mature' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true, drop: CARROT },
  [CARROT]:         { cn: '胡萝卜', tex: { top: 'carrot', side: 'carrot' }, solid: false, seeThrough: true, hardness: 0, item: true },
  // 羽毛六色
  [FEATHER_WHITE]:  { cn: '白羽毛',   tex: { top: 'feather_white', side: 'feather_white' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [FEATHER_GRAY]:   { cn: '灰羽毛',   tex: { top: 'feather_gray', side: 'feather_gray' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [FEATHER_GREEN]:  { cn: '绿羽毛',   tex: { top: 'feather_green', side: 'feather_green' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [FEATHER_BLUE]:   { cn: '蓝羽毛',   tex: { top: 'feather_blue', side: 'feather_blue' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [FEATHER_YELLOW]: { cn: '黄羽毛',   tex: { top: 'feather_yellow', side: 'feather_yellow' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [FEATHER_BLACK]:  { cn: '黑羽毛',   tex: { top: 'feather_black', side: 'feather_black' }, solid: false, seeThrough: true, hardness: 0, item: true },
  // 煤系列
  [COAL_CHUNK]:     { cn: '煤块', tex: { top: 'coal_chunk', side: 'coal_chunk' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [COAL_BAR]:       { cn: '煤条', tex: { top: 'coal_bar', side: 'coal_bar' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [COAL]:           { cn: '煤炭', tex: { top: 'coal', side: 'coal' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [COAL_DUST]:      { cn: '煤粉', tex: { top: 'coal_dust', side: 'coal_dust' }, solid: false, seeThrough: true, hardness: 0, item: true },
  // 芒星碎片 + 三种能灯（夜里自己发光，跟星空系列一样挂 glow）
  [MANG_SHARD]:     { cn: '芒星碎片', tex: { top: 'mang_shard', side: 'mang_shard' }, solid: false, seeThrough: true, hardness: 0, item: true, glow: true },
  [MANG_LAMP]:      { cn: '芒能灯',   tex: { top: 'mang_lamp', side: 'mang_lamp' }, solid: true, seeThrough: false, hardness: 0.6, glow: true },
  [STAR_LAMP]:      { cn: '星能灯',   tex: { top: 'star_lamp', side: 'star_lamp' }, solid: true, seeThrough: false, hardness: 0.6, glow: true },
  [HYDROGEN_LAMP]:  { cn: '氢能灯',   tex: { top: 'hydrogen_lamp', side: 'hydrogen_lamp' }, solid: true, seeThrough: false, hardness: 0.6, glow: true },
  [ROLLER_SKATES]:  { cn: '轮滑鞋',   tex: { top: 'roller_skates', side: 'roller_skates' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [COBBLE_SHARD]:   { cn: '圆石碎',   tex: { top: 'cobble_shard', side: 'cobble_shard' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [COAL_FIRESTARTER]:     { cn: '煤式打火石', tex: { top: 'firestarter_coal', side: 'firestarter_coal' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [MANG_FIRESTARTER]:     { cn: '芒式打火石', tex: { top: 'firestarter_mang', side: 'firestarter_mang' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [STAR_FIRESTARTER]:     { cn: '星式打火石', tex: { top: 'firestarter_star', side: 'firestarter_star' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [SOUL_FIRESTARTER]:     { cn: '灵火打火石', tex: { top: 'firestarter_soul', side: 'firestarter_soul' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [HYDROGEN_FIRESTARTER]: { cn: '氢式打火石', tex: { top: 'firestarter_hydrogen', side: 'firestarter_hydrogen' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [BAG_WOOL]:   { cn: '羊毛腰包', tex: { top: 'bag_wool', side: 'bag_wool' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [BAG_MANG]:   { cn: '芒星腰包', tex: { top: 'bag_mang', side: 'bag_mang' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [BAG_STAR]:   { cn: '星星腰包', tex: { top: 'bag_star', side: 'bag_star' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [BAG_GLASS]:  { cn: '玻璃腰包', tex: { top: 'bag_glass', side: 'bag_glass' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [BAG_GRASS]:  { cn: '草花腰包', tex: { top: 'bag_grass', side: 'bag_grass' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [BAG_LEAF]:   { cn: '树叶腰包', tex: { top: 'bag_leaf', side: 'bag_leaf' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [BAG_BAMBOO]: { cn: '竹编腰包', tex: { top: 'bag_bamboo', side: 'bag_bamboo' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [BAG_FEATHER]:{ cn: '羽毛腰包', tex: { top: 'bag_feather', side: 'bag_feather' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [BAG_RUBBER]: { cn: '橡胶腰包', tex: { top: 'bag_rubber', side: 'bag_rubber' }, solid: false, seeThrough: true, hardness: 0, item: true },
  ...Object.fromEntries(WOOL_BAG_DYES.map(({ id, color, texture }) => [id, { cn: `${color}羊毛腰包`, tex: { top: texture, side: texture }, solid: false, seeThrough: true, hardness: 0, item: true }])),
  [BAMBOO]: { cn: '竹子', tex: { top: 'bamboo_top', side: 'bamboo_side', front: 'bamboo' }, solid: true, seeThrough: false, hardness: 0.3, drop: BAMBOO, shape: 'bamboo' }, // 细杆形状；front 借给物品图标画细竹竿剪影
  [BAMBOO_SHOOT_PLANT]: { cn: '竹笋', tex: { top: 'bamboo_shoot', side: 'bamboo_shoot' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true, drop: BAMBOO_SHOOT },
  [BAMBOO_SHOOT]: { cn: '竹笋', tex: { top: 'bamboo_shoot', side: 'bamboo_shoot' }, solid: false, seeThrough: true, hardness: 0, item: true },
  // —— 井盖和星空染色系列 ——
  [MANHOLE]:         { cn: '方井盖', tex: { top: 'manhole', side: 'manhole' }, solid: false, seeThrough: true, hardness: 0.8, shape: 'carpet', targetable: true },
  [STAR_DYE_TABLE]:  { cn: '星空染色台', tex: { top: 'star_dye_top', side: 'star_dye_side', front: 'star_dye_top' }, solid: true, seeThrough: false, hardness: 1.2, glow: true },
  [CARPET_GRAY]:        { cn: '灰地毯',   tex: { top: 'carpet_gray', side: 'carpet_gray' }, solid: false, seeThrough: true, hardness: 0.2, shape: 'carpet', targetable: true },
  [CARPET_SWAN]:        { cn: '天鹅黄地毯', tex: { top: 'carpet_swan', side: 'carpet_swan' }, solid: false, seeThrough: true, hardness: 0.2, shape: 'carpet', targetable: true },
  [CARPET_LIGHTGREEN]:  { cn: '淡草绿地毯', tex: { top: 'carpet_lightgreen', side: 'carpet_lightgreen' }, solid: false, seeThrough: true, hardness: 0.2, shape: 'carpet', targetable: true },
  [CARPET_STAR]:        { cn: '星空地毯', tex: { top: 'carpet_star', side: 'carpet_star' }, solid: false, seeThrough: true, hardness: 0.2, shape: 'carpet', targetable: true, glow: true },
  [DYE_WHITE]:       { cn: '白颜料',     tex: { top: 'dye_white', side: 'dye_white' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [DYE_PURPLE]:      { cn: '紫颜料',     tex: { top: 'dye_purple', side: 'dye_purple' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [DYE_SWAN]:        { cn: '天鹅黄颜料', tex: { top: 'dye_swan', side: 'dye_swan' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [DYE_LIGHTGREEN]:  { cn: '淡草绿颜料', tex: { top: 'dye_lightgreen', side: 'dye_lightgreen' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [DYE_STAR]:        { cn: '星空色颜料', tex: { top: 'dye_star', side: 'dye_star' }, solid: false, seeThrough: true, hardness: 0, item: true, glow: true },
  // —— 沼泽泽液：像水一样透明不挡人（但碰到会扣血），挖不动只能用桶舀 ——
  [SWAMP_LIGHT]:   { cn: '淡沼泽液', tex: { top: 'swamp_light', side: 'swamp_light' }, solid: false, seeThrough: true, hardness: INF, alphaBlend: true },
  [SWAMP_MID]:     { cn: '沼泽液',   tex: { top: 'swamp_mid', side: 'swamp_mid' }, solid: false, seeThrough: true, hardness: INF, alphaBlend: true },
  [SWAMP_PHANTOM]: { cn: '幻泽液',   tex: { top: 'swamp_phantom', side: 'swamp_phantom' }, solid: false, seeThrough: true, hardness: INF, alphaBlend: true },
  [SWAMP_DEEP]:    { cn: '深泽液',   tex: { top: 'swamp_deep', side: 'swamp_deep' }, solid: false, seeThrough: true, hardness: INF, alphaBlend: true },
  [SWAMP_DROWN]:   { cn: '溺泽液',   tex: { top: 'swamp_drown', side: 'swamp_drown' }, solid: false, seeThrough: true, hardness: INF, alphaBlend: true },
  // —— 玻璃小件和药水瓶 ——
  [GLASS_SHARD]:   { cn: '玻璃碎片', tex: { top: 'glass_shard', side: 'glass_shard' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [GLASS_CONE]:    { cn: '玻璃锥',   tex: { top: 'glass_cone', side: 'glass_cone' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [GLASS_BOTTLE]:  { cn: '玻璃瓶',   tex: { top: 'glass_bottle', side: 'glass_bottle' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [GLASS_BUCKET]:  { cn: '玻璃桶',   tex: { top: 'glass_bucket', side: 'glass_bucket' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [POTION_POISON]:  { cn: '毒药瓶',   tex: { top: 'potion_poison', side: 'potion_poison' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [POTION_PHANTOM]: { cn: '幻药瓶',   tex: { top: 'potion_phantom', side: 'potion_phantom' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [POTION_DEADLY]:  { cn: '剧毒瓶',   tex: { top: 'potion_deadly', side: 'potion_deadly' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [POTION_BREATH]:  { cn: '防溺瓶',   tex: { top: 'potion_breath', side: 'potion_breath' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [DYE_DEEPGREEN]:  { cn: '深绿颜料', tex: { top: 'dye_deepgreen', side: 'dye_deepgreen' }, solid: false, seeThrough: true, hardness: 0, item: true },
  // —— 装了泽液的桶（count 是装了几格） ——
  [SW_BUCKET_LIGHT]:   { cn: '铁桶(淡沼泽液)', tex: { top: 'bucket_sw_light', side: 'bucket_sw_light' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [SW_BUCKET_MID]:     { cn: '铁桶(沼泽液)',   tex: { top: 'bucket_sw_mid', side: 'bucket_sw_mid' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [SW_BUCKET_PHANTOM]: { cn: '铁桶(幻泽液)',   tex: { top: 'bucket_sw_phantom', side: 'bucket_sw_phantom' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [SW_BUCKET_DEEP]:    { cn: '铁桶(深泽液)',   tex: { top: 'bucket_sw_deep', side: 'bucket_sw_deep' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [SW_BUCKET_DROWN]:   { cn: '铁桶(溺泽液)',   tex: { top: 'bucket_sw_drown', side: 'bucket_sw_drown' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [GS_BUCKET_LIGHT]:   { cn: '玻璃桶(淡沼泽液)', tex: { top: 'gbucket_sw_light', side: 'gbucket_sw_light' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [GS_BUCKET_MID]:     { cn: '玻璃桶(沼泽液)',   tex: { top: 'gbucket_sw_mid', side: 'gbucket_sw_mid' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [GS_BUCKET_PHANTOM]: { cn: '玻璃桶(幻泽液)',   tex: { top: 'gbucket_sw_phantom', side: 'gbucket_sw_phantom' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [GS_BUCKET_DEEP]:    { cn: '玻璃桶(深泽液)',   tex: { top: 'gbucket_sw_deep', side: 'gbucket_sw_deep' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [GS_BUCKET_DROWN]:   { cn: '玻璃桶(溺泽液)',   tex: { top: 'gbucket_sw_drown', side: 'gbucket_sw_drown' }, solid: false, seeThrough: true, hardness: 0, item: true },
  // —— 南瓜与西瓜：果实为实心方块（不能直接吃），苗期打掉不掉东西，切片可吃，籽可播种 ——
  [PUMPKIN]:        { cn: '南瓜',     tex: { top: 'pumpkin_top', side: 'pumpkin_side' }, solid: true, seeThrough: false, hardness: 0.6 },
  [MELON]:          { cn: '西瓜',     tex: { top: 'melon_top', side: 'melon_side' }, solid: true, seeThrough: false, hardness: 0.6 },
  [PUMPKIN_SLICE]:  { cn: '南瓜片',   tex: { top: 'pumpkin_slice', side: 'pumpkin_slice' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [MELON_SLICE]:    { cn: '西瓜片',   tex: { top: 'melon_slice', side: 'melon_slice' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [PUMPKIN_SEED]:   { cn: '南瓜籽',   tex: { top: 'pumpkin_seed', side: 'pumpkin_seed' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [MELON_SEED]:     { cn: '西瓜籽',   tex: { top: 'melon_seed', side: 'melon_seed' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [PUMPKIN_STAGE1]: { cn: '南瓜小苗', tex: { top: 'pumpkin_stage1', side: 'pumpkin_stage1' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true, drop: AIR },
  [PUMPKIN_STAGE2]: { cn: '南瓜幼苗', tex: { top: 'pumpkin_stage2', side: 'pumpkin_stage2' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true, drop: AIR },
  [PUMPKIN_STAGE3]: { cn: '南瓜大苗', tex: { top: 'pumpkin_stage3', side: 'pumpkin_stage3' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true, drop: AIR },
  [MELON_STAGE1]:   { cn: '西瓜小苗', tex: { top: 'melon_stage1', side: 'melon_stage1' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true, drop: AIR },
  [MELON_STAGE2]:   { cn: '西瓜幼苗', tex: { top: 'melon_stage2', side: 'melon_stage2' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true, drop: AIR },
  [MELON_STAGE3]:   { cn: '西瓜大苗', tex: { top: 'melon_stage3', side: 'melon_stage3' }, solid: false, seeThrough: true, hardness: 0.05, shape: 'cross', targetable: true, drop: AIR },
  // —— 专属岛屿水果：树叶掉落的可食用物品 ——
  [APPLE]:          { cn: '苹果',     tex: { top: 'apple', side: 'apple' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [PEACH]:          { cn: '桃子',     tex: { top: 'peach', side: 'peach' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [ORANGE]:         { cn: '橘子',     tex: { top: 'orange', side: 'orange' }, solid: false, seeThrough: true, hardness: 0, item: true },
  // —— 大厅三台机器：挖不动，对着按 M 打开各自的面板 ——
  [VENDING_SPECIAL]: { cn: '特殊物品售卖机', tex: { top: 'vend_special_top', side: 'vend_special_side', front: 'vend_special_front' }, solid: true, seeThrough: false, hardness: Infinity },
  [VENDING_DRINK]:   { cn: '饮料售卖机',   tex: { top: 'vend_drink_top', side: 'vend_drink_side', front: 'vend_drink_front' }, solid: true, seeThrough: false, hardness: Infinity },
  [BUY_BOX]:         { cn: '收购箱',       tex: { top: 'buybox_top', side: 'buybox_side', front: 'buybox_front' }, solid: true, seeThrough: false, hardness: Infinity },
  [VENDING_STORE]:   { cn: '杂货铺',       tex: { top: 'store_top', side: 'store_side', front: 'store_front' }, solid: true, seeThrough: false, hardness: Infinity },
  // —— 椰子树：浅色木头 + 四瓣叶子 + 挂在叶下的椰子（挖椰子掉椰子，能榨汁也能卖） ——
  [PALM_WOOD]:   { cn: '椰子树干', tex: { top: 'palm_wood_top', side: 'palm_wood' }, solid: true, seeThrough: false, hardness: 1.2 },
  [PALM_LEAVES]: { cn: '椰子叶',   tex: { top: 'palm_leaves', side: 'palm_leaves' }, solid: true, seeThrough: false, hardness: 0.25 },
  [COCONUT]:     { cn: '椰子',     tex: { top: 'coconut', side: 'coconut' }, solid: false, seeThrough: true, hardness: 0.2, targetable: true, drop: COCONUT },
  // —— 饮料：水果/材料 + 玻璃瓶榨的，E 喝了有各自的效果，也能卖给收购箱 ——
  [JUICE_APPLE]:   { cn: '苹果汁',   tex: { top: 'juice_apple', side: 'juice_apple' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [JUICE_ORANGE]:  { cn: '橘子汁',   tex: { top: 'juice_orange', side: 'juice_orange' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [JUICE_PEACH]:   { cn: '桃子汁',   tex: { top: 'juice_peach', side: 'juice_peach' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [WINE]:          { cn: '酒',       tex: { top: 'wine', side: 'wine' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [JUICE_COCONUT]: { cn: '椰子汁',   tex: { top: 'juice_coconut', side: 'juice_coconut' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [JUICE_MELON]:   { cn: '西瓜汁',   tex: { top: 'juice_melon', side: 'juice_melon' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [JUICE_CARROT]:  { cn: '胡萝卜汁', tex: { top: 'juice_carrot', side: 'juice_carrot' }, solid: false, seeThrough: true, hardness: 0, item: true },
  // —— 梨子汁与柿子饼：买不到，只能自己做（梨榨汁，稻粒摊柿子饼）——
  [JUICE_PEAR]:      { cn: '梨子汁', tex: { top: 'juice_pear', side: 'juice_pear' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [PERSIMMON_CAKE]:  { cn: '柿子饼', tex: { top: 'persimmon_cake', side: 'persimmon_cake' }, solid: false, seeThrough: true, hardness: 0, item: true },
  // —— 小战士召唤蛋：拿着对地按 M 召唤保镖，品质写在蛋上 ——
  [EGG_WARRIOR_NORMAL]:   { cn: '小战士蛋（普通）', tex: { top: 'egg_warrior_normal', side: 'egg_warrior_normal' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [EGG_WARRIOR_ADVANCED]: { cn: '小战士蛋（高级）', tex: { top: 'egg_warrior_advanced', side: 'egg_warrior_advanced' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [EGG_WARRIOR_EPIC]:     { cn: '小战士蛋（绝世）', tex: { top: 'egg_warrior_epic', side: 'egg_warrior_epic' }, solid: false, seeThrough: true, hardness: 0, item: true },
  // —— 四种生鱼：从海里的鱼身上掉的，生吃能填一点肚子（河豚生吃会中毒） ——
  [FISH_CLOWN]:  { cn: '生小丑鱼', tex: { top: 'fish_clown', side: 'fish_clown' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [FISH_COD]:    { cn: '生鳕鱼',   tex: { top: 'fish_cod', side: 'fish_cod' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [FISH_SALMON]: { cn: '生鲑鱼',   tex: { top: 'fish_salmon', side: 'fish_salmon' }, solid: false, seeThrough: true, hardness: 0, item: true },
  [FISH_PUFFER]: { cn: '生河豚',   tex: { top: 'fish_puffer', side: 'fish_puffer' }, solid: false, seeThrough: true, hardness: 0, item: true },
};

/** 创造模式面板里能直接拿的东西（全部方块 + 物品） */
export const ALL_ITEMS = [
  GRASS, DIRT, STONE, COBBLE, BRICK, SAND, SANDSTONE, GLASS,
  WOOD, PLANKS, LEAVES, DOOR_CLOSED, CRAFTING_TABLE, CHEST, FURNACE,
  WOOD_SLAB, STONE_SLAB, WOOD_STAIRS, FENCE, SIGN,
  TALL_GRASS, DANDELION, POPPY, SNOW, ICE, CACTUS,
  SOUL_GRASS, SOUL_CHEST, SOUL_WOOD_SLAB, SOUL_STONE_SLAB, SOUL_FURNACE,
  RAW_MEAT, COOKED_MEAT, STICK, SOUL_DYE,
  // 羊毛 + 地毯 + 染色台 + 颜料 + 床
  ...WOOL_IDS, ...CARPET_IDS, DYE_TABLE, ...DYE_IDS, ...BED_IDS,
  // 矿石 + 金属块 + 矿物物品
  IRON_ORE, GOLD_ORE, BLUE_ORE, COAL_ORE, IRON_BLOCK, GOLD_BLOCK, BLUE_BLOCK,
  IRON_NUGGET, GOLD_NUGGET, BLUE_SHARD, IRON_INGOT, GOLD_INGOT, BLUE_DIAMOND,
  LADDER, FOUNTAIN, DIY_MANUAL, BUCKET, WATER_BUCKET, RICE_GRAIN, SEAWEED,
  STAR_SHARD, STAR_WOOL, STAR_TABLE,
  // 血尸战利品：肉、颜料、染出来的地毯
  BLOOD_MEAT, DYE_BLOOD, CARPET_BLOOD,
  // 化学系列：腌菜桶、氢气瓶、拆解器、引擎
  PICKLE_BARREL, HYDROGEN, CHEM_DECOMP, HYDROGEN_ENGINE,
  // 坦克线：橡胶、轮子、坦克、炮弹
  RUBBER, WHEEL, TANK, TANK_BULLET,
  // 井盖 + 星空染色台 + 新地毯 + 新颜料
  MANHOLE, STAR_DYE_TABLE, ...CARPET_EXTRA, CARPET_STAR, ...DYE_NEW,
  // 挑战房道具（挑战石/挑战门挖不动也不单卖，只能盖出来）
  CHALLENGE_HOUSE,
  CARROT,
  FEATHER_WHITE, FEATHER_GRAY, FEATHER_GREEN, FEATHER_BLUE, FEATHER_YELLOW, FEATHER_BLACK,
  COAL_CHUNK, COAL_BAR, COAL, COAL_DUST,
  // 沼泽泽液（创造模式能直接拿出来摆）+ 玻璃小件 + 药水瓶 + 深绿颜料 + 泽液桶
  ...SWAMP_IDS,
  GLASS_SHARD, GLASS_CONE, GLASS_BOTTLE, GLASS_BUCKET, ...POTION_IDS, DYE_DEEPGREEN,
  ...Object.keys(SWAMP_FILL).map(Number),
  ...Object.keys(BOTTLE_FILL).map(Number), // 六种玻璃瓶装液体（水瓶 + 五种泽液瓶）
  MANG_SHARD, MANG_LAMP, STAR_LAMP, HYDROGEN_LAMP,
  ROLLER_SKATES, COBBLE_SHARD, ...FIRESTARTER_IDS, ...WAISTBAG_IDS,
  BAMBOO, BAMBOO_SHOOT_PLANT, BAMBOO_SHOOT,
  // 黄金系列
  DYE_GOLD, BAG_GOLD, GOLD_CRAFT_TABLE, GOLD_DYE_TABLE, GOLD_CHEM_DECOMP,
  ICE_MOLECULE, POTION_ICE, GOLD_PICKAXE, DIY_GOLD_MANUAL,
  DIY_GOLD_CRAFT_TABLE, DIY_GOLD_DYE_TABLE, DIY_GOLD_CHEM_DECOMP, DIY_GOLD_PICKAXE,
  // 南瓜与西瓜系列 + 三种专属岛屿水果
  PUMPKIN, MELON, PUMPKIN_SLICE, MELON_SLICE, PUMPKIN_SEED, MELON_SEED,
  APPLE, PEACH, ORANGE, PEAR, PERSIMMON, BANANA,
  // 六种果树树叶 + 七种树苗（拿手上就能分清品种，种下慢慢长成大树）
  APPLE_LEAVES, PEACH_LEAVES, ORANGE_LEAVES, PEAR_LEAVES, PERSIMMON_LEAVES, BANANA_LEAVES,
  APPLE_SAP1, PEACH_SAP1, ORANGE_SAP1, PEAR_SAP1, PERSIMMON_SAP1, BANANA_SAP1, COCONUT_SAP1,
  // 椰子树 + 7 种饮料 + 3 档小战士召唤蛋（三台机器本体不进创造面板，跟挑战石一个待遇）
  PALM_WOOD, PALM_LEAVES, COCONUT,
  JUICE_APPLE, JUICE_ORANGE, JUICE_PEACH, WINE, JUICE_COCONUT, JUICE_MELON, JUICE_CARROT, JUICE_PEAR,
  PERSIMMON_CAKE,
  ...WARRIOR_EGG_IDS,
  // 四种生鱼（正常靠下海打鱼获得，创造面板也放一份方便）
  FISH_CLOWN, FISH_COD, FISH_SALMON, FISH_PUFFER,
  // 五种蘑菇 + 五种孢子（秋天草地上长，也能用孢子自己种；夜光蓝菇打星空尸也会掉）
  MUSHROOM_SPORE, MUSHROOM_SHIITAKE, MUSHROOM_ENOKI, MUSHROOM_OYSTER, MUSHROOM_RED, GLOW_SHROOM,
  GLOW_SPORE, SPORE_SHIITAKE, SPORE_OYSTER, SPORE_ENOKI, SPORE_RED,
  // 雪花（冬季岛的雪地里偶尔能挖到）
  SNOWFLAKE,
  // 新食物与饮品（blocks.food.ts）：两种茶、草饼、颠倒香蕉液、水果拼盘、蘑菇拼盘
  ...FOOD_IDS,
  // 黑色售卖机的货（blocks.black.ts）：黑色木镐 + 三形态小战士弓（机器本体不进面板，跟其他机器一个待遇）
  BLACK_PICKAXE, WARRIOR_BOW, WARRIOR_BOW_FIRE, WARRIOR_BOW_ICE,
  // 六把剑 + 樱花剑（blocks.swords.ts）
  ...ALL_SWORD_IDS,
  // 三种染色木板（blocks.planks.ts）：深色/浅色/灵魂蓝，能正常盖房子
  ...DYED_PLANK_IDS,
  // 装饰方块（blocks.deco.ts）：藤蔓梯子，缠了藤的梯子照样能爬
  VINE_LADDER,
  // 白萝卜（radish.ts）：周一黑市进货的炒股道具，下周一没卖会烂
  WHITE_RADISH,
  // 四季树冠产物与柳树一族（2026-10-27）：夏挖樱花花瓣、秋挖枫叶、沙滩柳树
  PETAL_SAKURA, MAPLE_LEAF,
  WILLOW_WOOD, WILLOW_LEAVES, WILLOW_SAP1, WILLOW_FLUFF, WILLOW_BRANCH, WILLOW_BAG,
  // 红焰大赛箱（大厅赛事入口，正常靠大厅里那台，创造面板也放一份方便摆）
  ARENA_BOX,
  // 四季 DIY 道具（2026-10-27）：樱花药包 / 枫叶腰包 / 枫叶飞刀 / 柳条陷阱（含五种伪装）
  BAG_SAKURA, BAG_MAPLE, KNIFE_MAPLE, WILLOW_TRAP, ...TRAP_BLOCK_IDS,
  // 四季节日道具（2026-10-27）：春卷/菖蒲叶/香囊/护盾/拼盘/三色珠子/甜饼/礼花
  CHUNK_ROLL, CALAMUS, POUCH_CALAMUS, SHIELD_CALAMUS, HARVEST_PLATTER, ...BEAD_IDS, XMAS_COOKIE, BEAD_FIREWORK,
];

/** 庄稼生长链：每 60 秒走一级（水稻/胡萝卜/南瓜/西瓜共用）；最后一级不在表里 = 熟透了不再长 */
export const CROP_NEXT: Record<number, number> = {
  [RICE_SEED]: RICE_SPROUT,
  [RICE_SPROUT]: RICE_GREEN,
  [RICE_GREEN]: RICE_MATURE,
  [CARROT_SEED]: CARROT_SPROUT,
  [CARROT_SPROUT]: CARROT_GREEN,
  [CARROT_GREEN]: CARROT_MATURE,
  [PUMPKIN_STAGE1]: PUMPKIN_STAGE2,
  [PUMPKIN_STAGE2]: PUMPKIN_STAGE3,
  [PUMPKIN_STAGE3]: PUMPKIN,
  [MELON_STAGE1]: MELON_STAGE2,
  [MELON_STAGE2]: MELON_STAGE3,
  [MELON_STAGE3]: MELON,
};

/** 挖这个方块掉几个（默认 1 个；金黄水稻收 5 或 10 粒；熟胡萝卜收 1~3 根） */
export function dropCountOf(id: number): number {
  if (id === RICE_MATURE) return Math.random() < 0.5 ? 5 : 10;
  if (id === CARROT_MATURE) return 1 + Math.floor(Math.random() * 3);
  return 1;
}

export function isBed(id: number): boolean {
  return BLOCKS[id]?.shape === 'bed';
}

/** 好友岛访客「指定清单（list 模式）」允许挖掘的方块（树叶/南瓜/西瓜/小麦(成熟水稻及作物)/胡萝卜） */
export const VISIT_LIST_BLOCKS: ReadonlySet<number> = new Set([
  LEAVES,
  PUMPKIN, PUMPKIN_STAGE1, PUMPKIN_STAGE2, PUMPKIN_STAGE3,
  MELON, MELON_STAGE1, MELON_STAGE2, MELON_STAGE3,
  RICE_SEED, RICE_SPROUT, RICE_GREEN, RICE_MATURE,
  CARROT_SEED, CARROT_SPROUT, CARROT_GREEN, CARROT_MATURE,
  APPLE, PEACH, ORANGE, PEAR, PERSIMMON,
  PALM_LEAVES, ...FRUIT_LEAF_IDS,
]);
