/** 程序化纹理 — 用 Canvas 手绘 16×16 像素贴图，拼成一张图集，不下载任何图片 */

import * as THREE from 'three';
import { BED_IDS, BED_STAR, BLOCKS, CARPET_BLOOD, CARPET_STAR, COLOR_CSS, DYEABLE_CARPETS, DYE_BLOOD, DYE_DEEPGREEN, DYE_IDS, DYE_NEW, DYE_STAR, SWAMP_DEEP, SWAMP_DROWN, SWAMP_LIGHT, SWAMP_MID, SWAMP_PHANTOM, WOOL_IDS } from '../../world/blocks/Block';
import { CROP_PAINTERS } from './CropTextures';
import { FEATHER_PAINTERS } from './BirdTextures';
import { COAL_PAINTERS } from './CoalTextures';
import { LAMP_PAINTERS } from './LampTextures';
import { FIRE_PAINTERS } from './FireTextures';
import { BASE_PAINTERS } from './BaseTextures';
import { addMetalPainters } from './MetalTextures';
import { SEASONAL_PAINTERS } from './SeasonalTextures';
import { GOLDEN_PAINTERS, GOLDEN_TILE_NAMES } from './GoldenTextures';
import { BAG_PAINTERS } from './BagTextures';
import { BAMBOO_PAINTERS } from './BambooTextures';
import { ISLAND_PAINTERS, ISLAND_TILE_NAMES } from './IslandTextures';
import { MUSHROOM_PAINTERS, MUSHROOM_TILE_NAMES } from './MushroomTextures';
import { SHOP_PAINTERS } from './ShopTextures';
import { FISH_PAINTERS, FISH_TILE_NAMES } from './FishTextures';
import { BLACKMARKET_PAINTERS, BLACKMARKET_TILE_NAMES } from './BlackMarketTextures';
import { SWORD_PAINTERS, SWORD_TILE_NAMES } from './SwordTextures';
import { SEASON_LEAF_PAINTERS, SEASON_LEAF_TILE_NAMES } from './SeasonLeafTextures';
import { WILLOW_PAINTERS, WILLOW_TILE_NAMES } from './WillowTextures';
import { ARENA_PAINTERS, ARENA_TILE_NAMES } from './ArenaTextures';
import { SEASON_FOOD_PAINTERS, SEASON_FOOD_TILE_NAMES } from './SeasonFoodTextures';
import { CS_PAINTERS, CS_TILE_NAMES } from './CsTextures';
import { COOKING_PAINTERS, COOKING_TILE_NAMES } from './CookingTextures';
import { ROPE_PAINTERS, ROPE_TILE_NAMES } from './RopeTextures';
import { Painter, TILE, fill, shade, speckle } from './TextureUtils';
export type { Painter } from './TextureUtils';

const COLS = 4;

/** 图集里所有贴图的名字，顺序决定它在图集里的格子位置 */
const TILE_NAMES = [
  'grass_top', 'grass_side', 'dirt', 'stone',
  'sand', 'water', 'wood_side', 'wood_top',
  'leaves', 'door', 'planks', 'glass', 'planks_dark', 'planks_light',
  'cobble', 'brick', 'craft_top', 'craft_side', 'meat',
  'stick', 'soul_dye', 'meat_cooked', 'sandstone',
  'chest_side', 'chest_front', 'furnace_side', 'furnace_top',
  'furnace_front', 'soul_furnace_front', 'soul_grass_top', 'soul_grass_side',
  'soul_planks', 'soul_stone', 'soul_chest_side', 'soul_chest_front',
  'sign', 'fence', 'tall_grass', 'dandelion', 'poppy',
  'snow', 'ice', 'cactus_side', 'cactus_top',
  // —— 羊毛 / 地毯 / 颜料 / 染色台 ——
  'wool_white', 'wool_red', 'wool_yellow', 'wool_blue', 'wool_green', 'wool_pink', 'wool_orange',
  'carpet_white', 'carpet_red', 'carpet_yellow', 'carpet_blue', 'carpet_green', 'carpet_purple', 'carpet_black',
  'dye_red', 'dye_yellow', 'dye_blue', 'dye_green', 'dye_pink', 'dye_orange',
  'dye_table_top', 'dye_table_side', 'manual',
  // 床占两格：床尾（被子）+ 床头（枕头），每种颜色 4 张
  ...BED_IDS.flatMap((id) => [BLOCKS[id].tex.top, BLOCKS[id].tex.side, BLOCKS[id].texHead!.top, BLOCKS[id].texHead!.side]),
  // —— 矿石 / 金属块 / 粒碎锭钻 ——
  'iron_ore', 'gold_ore', 'blue_ore', 'coal_ore',
  'iron_block', 'gold_block', 'blue_block',
  'iron_nugget', 'gold_nugget', 'blue_shard',
  'iron_ingot', 'gold_ingot', 'blue_diamond', 'bucket',
  // —— 梯子 / 喷泉 ——
  'ladder', 'vine_ladder', 'fountain_stone', 'fountain_icon',
  // —— 水稻四阶段 + 稻粒 + 水草 + 水桶 ——
  'rice_seed', 'rice_sprout', 'rice_green', 'rice_mature', 'rice_grain',
  'carrot_seed', 'carrot_sprout', 'carrot_green', 'carrot_mature', 'carrot', 'white_radish',
  'feather_white', 'feather_gray', 'feather_green', 'feather_blue', 'feather_yellow', 'feather_black',
  'coal_chunk', 'coal_bar', 'coal', 'coal_dust',
  ...Object.keys(FIRE_PAINTERS),
  'mang_shard', 'mang_lamp', 'star_lamp', 'hydrogen_lamp',
  'seaweed', 'bucket_water',
  // —— 星空系列 ——
  'star_shard', 'starwool', 'star_table_top', 'star_table_side',
  // —— 血尸系列 ——
  'meat_blood', 'dye_blood', 'carpet_blood',
  // —— 化学系列 ——
  'pickle_barrel', 'chem_decomp', 'hydrogen', 'hydrogen_engine',
  // —— 坦克线 ——
  'rubber', 'wheel', 'tank', 'tank_bullet', 'roller_skates',
  // —— 井盖 + 星空染色系列 ——
  'manhole', 'star_dye_top', 'star_dye_side',
  'carpet_gray', 'carpet_swan', 'carpet_lightgreen', 'carpet_star',
  'dye_white', 'dye_purple', 'dye_swan', 'dye_lightgreen', 'dye_star',
  // —— 挑战房 ——
  'challenge', 'challenge_stone', 'challenge_door',
  // —— 沼泽系列：五种泽液 + 玻璃小件 + 药水瓶 + 深绿颜料 + 泽液桶 ——
  'swamp_light', 'swamp_mid', 'swamp_phantom', 'swamp_deep', 'swamp_drown',
  'glass_shard', 'glass_cone', 'glass_bottle', 'glass_bucket',
  'potion_poison', 'potion_phantom', 'potion_deadly', 'potion_breath', 'dye_deepgreen',
  'bucket_sw_light', 'bucket_sw_mid', 'bucket_sw_phantom', 'bucket_sw_deep', 'bucket_sw_drown',
  'gbucket_sw_light', 'gbucket_sw_mid', 'gbucket_sw_phantom', 'gbucket_sw_deep', 'gbucket_sw_drown',
  // —— 玻璃瓶装液体：水瓶 + 五种泽液瓶（一格液体就是一瓶）——
  'bottle_water',
  'gbottle_sw_light', 'gbottle_sw_mid', 'gbottle_sw_phantom', 'gbottle_sw_deep', 'gbottle_sw_drown',
  ...GOLDEN_TILE_NAMES,
  // —— 竹子（方块要进图集，不然世界里的竹子没贴图）：杆侧面 / 竹节箍 / 杆顶截面 / 顶部竹叶大小两丛 / 物品图标 ——
  'bamboo', 'bamboo_side', 'bamboo_node', 'bamboo_top', 'bamboo_leaves', 'bamboo_leaves_small', 'bamboo_shoot',
  // —— 2026-10-23 新吃食（红花蜜茶/蒲公英凉茶/草饼/颠倒香蕉液/水果拼盘/蘑菇拼盘）——
  'tea_red', 'tea_dandelion', 'grass_cake', 'banana_flip', 'fruit_platter', 'mushroom_platter',
  ...ISLAND_TILE_NAMES,
  // —— 大厅三台机器（正面画在 front，背包图标也认 front）——
  'vend_special_top', 'vend_special_side', 'vend_special_front',
  'vend_drink_top', 'vend_drink_side', 'vend_drink_front',
  'buybox_top', 'buybox_side', 'buybox_front',
  'store_top', 'store_side', 'store_front',
  // —— 椰子树 + 饮料 + 召唤蛋 ——
  'palm_wood', 'palm_wood_top', 'palm_leaves', 'coconut',
  'juice_apple', 'juice_orange', 'juice_peach', 'wine',
  'juice_coconut', 'juice_melon', 'juice_carrot', 'juice_pear',
  'egg_warrior_normal', 'egg_warrior_advanced', 'egg_warrior_epic',
  // —— 黑色售卖机一族（机器 + 黑色木镐 + 小战士弓三形态，2026-10-24）——
  ...BLACKMARKET_TILE_NAMES,
  // —— 四种生鱼 ——
  ...FISH_TILE_NAMES,
  // —— 四种蘑菇 + 孢子（秋季限定）——
  ...MUSHROOM_TILE_NAMES,
  // —— 六把剑 ——
  ...SWORD_TILE_NAMES,
  // —— 灵魂传送门（半透明蓝幕，只占图集一格）——
  'soul_portal',
  // —— 四季树冠（夏樱花/冬积雪）+ 柳树一族 + 夏秋采下来的花瓣与枫叶 ——
  ...SEASON_LEAF_TILE_NAMES,
  ...WILLOW_TILE_NAMES,
  // —— 红焰大赛箱（两格高，正面带火焰纹）——
  ...ARENA_TILE_NAMES,
  // —— 四季节日道具（春卷/菖蒲叶/香囊/护盾/拼盘/三色珠子/甜饼/礼花）——
  ...SEASON_FOOD_TILE_NAMES,
  // —— CS 大赛道具（三把枪 + 弹药/闪光弹/手雷/毒药瓶）——
  ...CS_TILE_NAMES,
  // —— 美食烹饪（美食工作台 + 食材 + 料理）——
  ...COOKING_TILE_NAMES,
  // —— 绳索（拴动物）——
  ...ROPE_TILE_NAMES,
];

const PAINTERS: Record<string, Painter> = { ...BASE_PAINTERS };
addMetalPainters(PAINTERS);
Object.assign(PAINTERS, SEASONAL_PAINTERS);

// —— 血尸系列：深得发黑的褐红色 ——
PAINTERS.meat_blood = (c, x, y) => {
  // 血尸肉：暗到发黑的血红色肉块（和生肉一个画法，换血尸色）
  fill(c, x, y, '#5a1510');
  speckle(c, x, y, ['#4a0f0c', '#6b2018'], 50);
  c.fillStyle = '#3a0c08';
  c.fillRect(x + 2, y + 2, 4, 3); c.fillRect(x + 11, y + 11, 3, 3); // 发黑血块斑
};

// —— 化学系列：腌菜桶/拆解器/氢气瓶/引擎 ——
PAINTERS.pickle_barrel = (c, x, y) => {
  // 腌菜桶：小木桶塞满绿油油的腌菜（透明底）
  c.fillStyle = '#7a5a30'; // 木桶身
  c.fillRect(x + 3, y + 5, 10, 9);
  c.fillStyle = '#5e4220'; // 桶箍
  c.fillRect(x + 3, y + 7, 10, 1); c.fillRect(x + 3, y + 11, 10, 1);
  c.fillStyle = '#6fbf3d'; // 冒出来的腌菜
  c.fillRect(x + 4, y + 2, 8, 3);
  c.fillStyle = '#4e8f2a'; c.fillRect(x + 5, y + 1, 3, 2); c.fillRect(x + 9, y + 2, 3, 2);
  c.fillStyle = '#9adc5a'; c.fillRect(x + 6, y + 3, 2, 1); // 菜叶高光
};
PAINTERS.chem_decomp = (c, x, y) => {
  // 化学拆解器：铁机器顶上插着一根冒泡的玻璃管
  fill(c, x, y, '#8a9098'); // 铁壳
  speckle(c, x, y, ['#9aa0a8', '#7d848e'], 45);
  c.fillStyle = '#5a6068'; c.fillRect(x, y + 13, TILE, 3); // 底座
  c.fillStyle = '#aee6f8'; // 玻璃管里的水
  c.fillRect(x + 6, y + 1, 4, 8);
  c.fillStyle = '#d8f4ff'; c.fillRect(x + 6, y + 1, 1, 8); // 玻璃高光
  c.fillStyle = '#ffffff'; c.fillRect(x + 7, y + 3, 1, 1); c.fillRect(x + 8, y + 6, 1, 1); // 气泡
};
PAINTERS.hydrogen = (c, x, y) => {
  // 氢气瓶：浅蓝色小气瓶，写着 H（透明底）
  c.fillStyle = '#9fdcf8';
  c.fillRect(x + 5, y + 4, 6, 9); c.fillRect(x + 6, y + 2, 4, 2);
  c.fillStyle = '#5aa8d0'; c.fillRect(x + 6, y + 1, 4, 1);
  c.fillStyle = '#d8f4ff'; c.fillRect(x + 6, y + 5, 2, 7);
  c.fillStyle = '#2a78a0'; c.fillRect(x + 7, y + 7, 2, 4); c.fillRect(x + 7, y + 8, 2, 1);
};
PAINTERS.hydrogen_engine = (c, x, y) => {
  // 永动氢气引擎：铁壳机器，中间一颗会转的"水分子"灯 + 两根排气管
  fill(c, x, y, '#7d848e');
  speckle(c, x, y, ['#8d939d', '#6d737e'], 50);
  c.fillStyle = '#5a6068'; c.fillRect(x + 1, y + 1, 3, 5); c.fillRect(x + 12, y + 1, 3, 5);
  c.fillStyle = '#9fdcf8'; c.fillRect(x + 5, y + 5, 6, 6);
  c.fillStyle = '#d8f4ff'; c.fillRect(x + 6, y + 6, 2, 2);
  c.fillStyle = '#2a78a0'; c.fillRect(x + 7, y + 7, 2, 2);
};

// —— 坦克线：橡胶团 / 轮子 / 坦克侧视图 ——
PAINTERS.rubber = (c, x, y) => {
  // 橡胶：黑乎乎软塌塌的一团（透明底）
  c.fillStyle = '#1c1c1e'; c.fillRect(x + 4, y + 5, 8, 7); c.fillRect(x + 5, y + 4, 6, 9);
  c.fillStyle = '#3a3a3e'; c.fillRect(x + 5, y + 5, 3, 2);
};
PAINTERS.wheel = (c, x, y) => {
  // 轮子：黑轮胎 + 灰色轮毂（透明底）
  c.fillStyle = '#141416'; c.fillRect(x + 3, y + 4, 10, 8); c.fillRect(x + 4, y + 3, 8, 10);
  c.fillStyle = '#26262a'; c.fillRect(x + 5, y + 5, 6, 6);
  c.fillStyle = '#9aa0a8'; c.fillRect(x + 7, y + 7, 2, 2); c.fillStyle = '#4a4a50'; c.fillRect(x + 4, y + 4, 2, 1);
};
PAINTERS.tank = (c, x, y) => {
  // 坦克侧视图：绿色车身和炮塔，黑色履带包着灰轮子（透明底）
  c.fillStyle = '#3e6b2e'; c.fillRect(x + 1, y + 7, 13, 4); c.fillStyle = '#4e8539'; c.fillRect(x + 4, y + 4, 7, 3);
  c.fillStyle = '#3e6b2e'; c.fillRect(x + 10, y + 5, 6, 1); c.fillStyle = '#2c4e20'; c.fillRect(x + 1, y + 7, 13, 1);
  c.fillStyle = '#b03a2e'; c.fillRect(x + 6, y + 5, 2, 1); c.fillRect(x + 7, y + 4, 1, 3);
  c.fillStyle = '#141416'; c.fillRect(x + 2, y + 11, 12, 4); c.fillStyle = '#26262a';
  for (let i = 2; i < 14; i += 3) c.fillRect(x + i, y + 11, 1, 4);
  c.fillStyle = '#9aa0a8'; c.fillRect(x + 4, y + 12, 2, 2); c.fillRect(x + 8, y + 12, 2, 2); c.fillRect(x + 12, y + 12, 1, 2);
};
PAINTERS.roller_skates = (c, x, y) => {
  // 轮滑鞋：红鞋身 + 白鞋头，底下两个小轮子（透明底）
  c.fillStyle = '#b03a2e'; c.fillRect(x + 3, y + 4, 7, 5); c.fillRect(x + 3, y + 3, 4, 2);
  c.fillStyle = '#e8e6e2'; c.fillRect(x + 10, y + 6, 3, 3); c.fillStyle = '#7d4a2d'; c.fillRect(x + 3, y + 9, 10, 1);
  c.fillStyle = '#e8e6e2'; c.fillRect(x + 5, y + 4, 1, 2); c.fillRect(x + 7, y + 4, 1, 2);
  c.fillStyle = '#141416'; c.fillRect(x + 4, y + 11, 3, 3); c.fillRect(x + 10, y + 11, 3, 3);
  c.fillStyle = '#9aa0a8'; c.fillRect(x + 5, y + 12, 1, 1); c.fillRect(x + 11, y + 12, 1, 1);
};
PAINTERS.tank_bullet = (c, x, y) => {
  // 炮弹：黑铁小弹头，尖头朝右（透明底）
  c.fillStyle = '#2e2e33'; c.fillRect(x + 3, y + 6, 9, 4); c.fillRect(x + 12, y + 7, 2, 2);
  c.fillStyle = '#9aa0a8'; c.fillRect(x + 4, y + 6, 6, 1); c.fillStyle = '#b03a2e'; c.fillRect(x + 3, y + 5, 2, 1);
};

// —— 挑战房：道具是小房子图标；挑战石是带红条纹的砖；挑战门是黑门红缝 ——
PAINTERS.challenge = (c, x, y) => {
  c.fillStyle = '#8a8f96'; c.fillRect(x + 2, y + 6, 12, 8); c.fillStyle = '#5d636b'; c.fillRect(x + 1, y + 4, 14, 3);
  c.fillStyle = '#2e2e33'; c.fillRect(x + 6, y + 9, 4, 5); c.fillStyle = '#b03a2e'; c.fillRect(x + 6, y + 4, 4, 2);
};
PAINTERS.challenge_stone = (c, x, y) => {
  fill(c, x, y, '#7d848e'); c.fillStyle = '#565d66';
  for (let i = 0; i < TILE; i += 4) c.fillRect(x, y + i, TILE, 1);
  for (let i = 0; i < TILE; i += 8) {
    c.fillRect(x + i, y, 1, 4); c.fillRect(x + i + 4, y + 4, 1, 4); c.fillRect(x + i, y + 8, 1, 4); c.fillRect(x + i + 4, y + 12, 1, 4);
  }
  c.fillStyle = '#7a1f16'; c.fillRect(x, y, TILE, 1); c.fillRect(x, y + 15, TILE, 1);
};
PAINTERS.challenge_door = (c, x, y) => {
  fill(c, x, y, '#26262a'); c.fillStyle = '#141416';
  c.fillRect(x + 1, y + 1, TILE - 2, 2); c.fillRect(x + 1, y + TILE - 3, TILE - 2, 2);
  c.fillStyle = '#b03a2e'; c.fillRect(x + 7, y + 2, 2, TILE - 4);
  c.fillStyle = '#4a4a50'; c.fillRect(x + 3, y + 6, 2, 2); c.fillRect(x + 11, y + 6, 2, 2);
};

// —— 同色系批量贴图：颜色都从 Block.ts 的 COLOR_CSS 表里来 ——
// 羊毛 = 底色 + 横向织纹 + 噪点
for (const id of WOOL_IDS) {
  const base = COLOR_CSS[id];
  PAINTERS[BLOCKS[id].tex.top] = (c, x, y) => {
    fill(c, x, y, base); c.fillStyle = shade(base, -18);
    for (let i = 4; i < TILE; i += 4) c.fillRect(x, y + i, TILE, 1);
    speckle(c, x, y, [shade(base, 16), shade(base, -32)], 60);
  };
}
// 地毯 = 羊毛底 + 深色包边（像小毯子）；血尸红地毯不在染色台色板里，画法一样
for (const id of [...DYEABLE_CARPETS, CARPET_BLOOD]) {
  const base = COLOR_CSS[id];
  PAINTERS[BLOCKS[id].tex.top] = (c, x, y) => {
    fill(c, x, y, base); speckle(c, x, y, [shade(base, 14), shade(base, -25)], 40); c.fillStyle = shade(base, -45);
    c.fillRect(x, y, TILE, 2); c.fillRect(x, y + 14, TILE, 2); c.fillRect(x, y, 2, TILE); c.fillRect(x + 14, y, 2, TILE);
  };
}
// 床占两格：床尾那格整格被子（顶面花色 + 折痕），床头那格整格白枕头；侧面都是木床架 + 露出一条褥子
for (const id of BED_IDS) {
  const base = COLOR_CSS[id];
  PAINTERS[BLOCKS[id].tex.top] = (c, x, y) => {
    fill(c, x, y, base); speckle(c, x, y, [shade(base, 14), shade(base, -25)], 50); c.fillStyle = shade(base, -35);
    c.fillRect(x, y, TILE, 1); c.fillRect(x, y + 15, TILE, 1);
  };
  PAINTERS[BLOCKS[id].tex.side] = (c, x, y) => {
    PAINTERS.planks(c, x, y); c.fillStyle = base; c.fillRect(x, y, TILE, 5); c.fillStyle = shade(base, -30); c.fillRect(x, y + 4, TILE, 1);
  };
  const head = BLOCKS[id].texHead!;
  PAINTERS[head.top] = (c, x, y) => {
    fill(c, x, y, '#f2efe4'); speckle(c, x, y, ['#e2ddcf', '#faf8f0'], 35); c.fillStyle = '#d8d3c4';
    c.fillRect(x, y, TILE, 1); c.fillRect(x, y + 15, TILE, 1); c.fillRect(x, y, 1, TILE); c.fillRect(x + 15, y, 1, TILE);
    c.fillStyle = '#faf8f0'; c.fillRect(x + 3, y + 3, 10, 10);
  };
  PAINTERS[head.side] = (c, x, y) => {
    PAINTERS.planks(c, x, y); c.fillStyle = '#f2efe4'; c.fillRect(x, y, TILE, 5); c.fillStyle = '#d8d3c4'; c.fillRect(x, y + 4, TILE, 1);
  };
}
// 颜料 = 透明底上一小团颜料（菱形斑块 + 高光）；血尸红颜料和新颜料都算一种
for (const id of [...DYE_IDS, DYE_BLOOD, ...DYE_NEW, DYE_DEEPGREEN]) {
  const base = COLOR_CSS[id];
  PAINTERS[BLOCKS[id].tex.top] = (c, x, y) => {
    c.fillStyle = base; c.fillRect(x + 4, y + 5, 8, 6); c.fillRect(x + 5, y + 4, 6, 8);
    c.fillStyle = shade(base, 45); c.fillRect(x + 5, y + 6, 2, 2);
  };
}
// 星空地毯/星空色颜料/星空床被子：在普通画法上撒一把小星星
for (const name of [BLOCKS[CARPET_STAR].tex.top, BLOCKS[DYE_STAR].tex.top, BLOCKS[BED_STAR].tex.top]) {
  const prev = PAINTERS[name];
  PAINTERS[name] = (c, x, y) => {
    prev(c, x, y); c.fillStyle = '#e8f4ff';
    [[3, 3], [11, 4], [7, 8], [12, 11], [4, 12], [9, 14]].forEach(([sx, sy]) => {
      c.fillRect(x + sx, y + sy, 1, 1); c.fillRect(x + sx, y + sy - 1, 1, 1); c.fillRect(x + sx - 1, y + sy, 1, 1);
    });
  };
}
// 方井盖：深灰铁板分四块，接缝是十字，四角拧着铆钉，边上带锈迹
PAINTERS.manhole = (c, x, y) => {
  fill(c, x, y, '#3a3f46'); speckle(c, x, y, ['#464c55', '#2e333a'], 40); c.fillStyle = '#22262c';
  c.fillRect(x, y + 7, TILE, 2); c.fillRect(x + 7, y, 2, TILE); c.fillStyle = '#22262c';
  c.fillRect(x, y, TILE, 1); c.fillRect(x, y + 15, TILE, 1); c.fillRect(x, y, 1, TILE); c.fillRect(x + 15, y, 1, TILE);
  c.fillStyle = '#555c66';
  [[1, 1], [13, 1], [1, 13], [13, 13], [6, 6], [9, 6], [6, 9], [9, 9]].forEach(([rx, ry]) => {
    c.fillRect(x + rx, y + ry, 2, 2); c.fillStyle = '#8a929e'; c.fillRect(x + rx, y + ry, 1, 1); c.fillStyle = '#555c66';
  });
  speckle(c, x, y, ['#7a5a3a', '#6a4a2e'], 10);
};
// 星空染色台：深夜蓝桌面摆着星星调色盘和发光颜料碗
PAINTERS.star_dye_top = (c, x, y) => {
  fill(c, x, y, '#23264f'); speckle(c, x, y, ['#2e3270', '#1a1c3e'], 40); c.fillStyle = '#e8f4ff';
  [[2, 2], [14, 3], [8, 6], [13, 13]].forEach(([sx, sy]) => c.fillRect(x + sx, y + sy, 1, 1));
  c.fillStyle = '#3d3d80'; c.fillRect(x + 1, y + 8, 6, 6); c.fillStyle = '#4a48b8'; c.fillRect(x + 2, y + 9, 2, 2);
  c.fillStyle = '#7fe8f8'; c.fillRect(x + 4, y + 11, 2, 2); c.fillStyle = '#4a4a70'; c.fillRect(x + 9, y + 8, 5, 5);
  c.fillStyle = '#bfe8ff'; c.fillRect(x + 10, y + 9, 3, 3); c.fillStyle = '#e8f4ff'; c.fillRect(x + 9, y + 8, 5, 1);
};
PAINTERS.star_dye_side = (c, x, y) => {
  fill(c, x, y, '#23264f'); speckle(c, x, y, ['#2e3270', '#1a1c3e'], 40); c.fillStyle = '#e8f4ff';
  [[3, 4], [11, 6], [7, 12]].forEach(([sx, sy]) => c.fillRect(x + sx, y + sy, 1, 1));
  ['#4a48b8', '#7fe8f8', '#bfe8ff'].forEach((col, i) => {
    c.fillStyle = '#3a3a5c'; c.fillRect(x + 2 + i * 5, y + 9, 3, 5); c.fillStyle = col; c.fillRect(x + 3 + i * 5, y + 10, 1, 3);
  });
};

// —— 沼泽系列 ——
// 泽液 = 半透明水 + 各自的浑色；越往里颜色越邪乎
const SWAMP_CSS: Record<number, [string, string]> = {
  [SWAMP_LIGHT]: ['rgba(168,200,120,0.72)', 'rgba(200,224,150,0.55)'],
  [SWAMP_MID]: ['rgba(86,138,70,0.78)', 'rgba(130,178,110,0.55)'],
  [SWAMP_PHANTOM]: ['rgba(150,104,198,0.72)', 'rgba(196,160,230,0.55)'],
  [SWAMP_DEEP]: ['rgba(24,66,26,0.85)', 'rgba(60,110,62,0.6)'],
  [SWAMP_DROWN]: ['rgba(26,52,86,0.85)', 'rgba(70,110,160,0.6)'],
};
for (const [id, [base, light]] of Object.entries(SWAMP_CSS)) {
  PAINTERS[BLOCKS[+id].tex.top] = (c, x, y) => {
    c.fillStyle = base; c.fillRect(x, y, TILE, TILE); c.fillStyle = light;
    for (let i = 0; i < 4; i++) c.fillRect(x + Math.floor(Math.random() * 12), y + i * 4 + 1, 4, 1);
    c.fillRect(x + 3, y + 4, 1, 1); c.fillRect(x + 11, y + 9, 1, 1); c.fillRect(x + 7, y + 12, 1, 1);
  };
}
// 玻璃碎片：透明底上三片发亮的尖碴子
PAINTERS.glass_shard = (c, x, y) => {
  c.fillStyle = '#bfe8f2'; c.fillRect(x + 2, y + 8, 4, 5); c.fillRect(x + 3, y + 6, 2, 2);
  c.fillRect(x + 8, y + 4, 4, 9); c.fillRect(x + 9, y + 3, 2, 1); c.fillRect(x + 12, y + 9, 2, 4);
  c.fillStyle = '#e8fbff'; c.fillRect(x + 8, y + 5, 1, 6); c.fillRect(x + 3, y + 9, 1, 3);
};
// 玻璃锥：一支尖尖的玻璃刺（拿着扎人）
PAINTERS.glass_cone = (c, x, y) => {
  c.fillStyle = '#bfe8f2';
  for (let i = 0; i < 12; i++) c.fillRect(x + 8 - Math.ceil(i / 3), y + 2 + i, Math.ceil(i / 3) * 2, 1);
  c.fillStyle = '#e8fbff'; for (let i = 0; i < 10; i++) c.fillRect(x + 8, y + 3 + i, 1, 1);
  c.fillStyle = '#8ec8d8'; c.fillRect(x + 6, y + 13, 5, 2);
};
// 玻璃瓶：透明小瓶 + 软木塞
PAINTERS.glass_bottle = (c, x, y) => {
  c.fillStyle = '#bfe8f2'; c.fillRect(x + 5, y + 5, 6, 9); c.fillRect(x + 6, y + 2, 4, 3);
  c.fillStyle = '#e8fbff'; c.fillRect(x + 6, y + 6, 1, 7); c.fillStyle = '#b0894e'; c.fillRect(x + 6, y + 1, 4, 2);
};
// 玻璃桶：淡蓝色透明桶身 + 亮边
PAINTERS.glass_bucket = (c, x, y) => {
  c.fillStyle = '#bfe8f2';
  for (let i = 0; i < 7; i++) c.fillRect(x + 3 + Math.floor(i / 3), y + 7 + i, 10 - Math.floor(i / 3) * 2, 1);
  c.fillStyle = '#e8fbff'; c.fillRect(x + 3, y + 7, 10, 1); c.fillStyle = '#8ec8d8';
  c.fillRect(x + 5, y + 3, 6, 1); c.fillRect(x + 4, y + 4, 1, 3); c.fillRect(x + 11, y + 4, 1, 3);
};
// 药水瓶 = 玻璃瓶 + 灌满不同颜色的药水
const POTION_FILL: Record<string, string> = {
  potion_poison: '#5a8a46', potion_phantom: '#9a68c6', potion_deadly: '#1a4a1e', potion_breath: '#3d6fb0',
};
for (const [name, col] of Object.entries(POTION_FILL)) {
  PAINTERS[name] = (c, x, y) => {
    PAINTERS.glass_bottle(c, x, y); c.fillStyle = col; c.fillRect(x + 6, y + 7, 4, 6); c.fillStyle = '#ffffff88'; c.fillRect(x + 7, y + 7, 1, 2);
  };
}
// 装了泽液的桶 = 桶 + 桶口一汪对应颜色的泽液（铁桶和玻璃桶各一套）
const SW_BUCKET_LIQ: Record<string, string> = {
  bucket_sw_light: '#a8c878', bucket_sw_mid: '#568a46', bucket_sw_phantom: '#9668c6', bucket_sw_deep: '#18421a', bucket_sw_drown: '#1a3456',
  gbucket_sw_light: '#a8c878', gbucket_sw_mid: '#568a46', gbucket_sw_phantom: '#9668c6', gbucket_sw_deep: '#18421a', gbucket_sw_drown: '#1a3456',
};
for (const [name, col] of Object.entries(SW_BUCKET_LIQ)) {
  PAINTERS[name] = (c, x, y) => {
    (name.startsWith('gbucket') ? PAINTERS.glass_bucket : PAINTERS.bucket)(c, x, y);
    c.fillStyle = col; c.fillRect(x + 4, y + 7, 8, 2); c.fillStyle = '#ffffff66'; c.fillRect(x + 5, y + 7, 3, 1);
  };
}
// 装了液体的玻璃瓶 = 玻璃瓶 + 瓶里一格对应颜色的液体（水/五种泽液，一格就是一瓶）
const BOTTLE_LIQ: Record<string, string> = {
  bottle_water: '#3d6fb0',
  gbottle_sw_light: '#a8c878', gbottle_sw_mid: '#568a46', gbottle_sw_phantom: '#9668c6', gbottle_sw_deep: '#18421a', gbottle_sw_drown: '#1a3456',
};
for (const [name, col] of Object.entries(BOTTLE_LIQ)) {
  PAINTERS[name] = (c, x, y) => {
    PAINTERS.glass_bottle(c, x, y); c.fillStyle = col; c.fillRect(x + 6, y + 7, 4, 6); c.fillStyle = '#ffffff88'; c.fillRect(x + 7, y + 7, 1, 2);
  };
}

// —— 大厅三台机器：统一铁壳售货机造型，正面开一扇取货窗 ——
const vendBody = (shell: string, dark: string) => (c: CanvasRenderingContext2D, x: number, y: number) => {
  fill(c, x, y, shell); speckle(c, x, y, [shade(shell, 12), shade(shell, -16)], 35);
  c.fillStyle = dark; c.fillRect(x, y + 14, TILE, 2); // 底座
};
PAINTERS.vend_special_top = vendBody('#7a4fc0', '#4a2e78');
PAINTERS.vend_special_side = vendBody('#6a45ad', '#4a2e78');
PAINTERS.vend_special_front = (c, x, y) => {
  PAINTERS.vend_special_side(c, x, y);
  c.fillStyle = '#2e1e50'; c.fillRect(x + 3, y + 3, 10, 8);          // 取货窗
  c.fillStyle = '#f8e8a0'; c.fillRect(x + 5, y + 5, 6, 4);           // 窗里的蛋
  c.fillStyle = '#d8b830'; c.fillRect(x + 6, y + 6, 4, 2);
  c.fillStyle = '#e8e8f0'; c.fillRect(x + 3, y + 12, 10, 1);         // 取货口
};
PAINTERS.vend_drink_top = vendBody('#3a7ec0', '#26548a');
PAINTERS.vend_drink_side = vendBody('#3570ad', '#26548a');
PAINTERS.vend_drink_front = (c, x, y) => {
  PAINTERS.vend_drink_side(c, x, y);
  c.fillStyle = '#1e3a5c'; c.fillRect(x + 3, y + 3, 10, 8);          // 取货窗
  c.fillStyle = '#f09838'; c.fillRect(x + 5, y + 5, 6, 5);           // 窗里的饮料瓶
  c.fillStyle = '#bfe8f2'; c.fillRect(x + 6, y + 3, 4, 2);
  c.fillStyle = '#e8e8f0'; c.fillRect(x + 3, y + 12, 10, 1);         // 取货口
};
PAINTERS.buybox_top = vendBody('#3e8a46', '#265a2a');
PAINTERS.buybox_side = vendBody('#357a3c', '#265a2a');
PAINTERS.buybox_front = (c, x, y) => {
  PAINTERS.buybox_side(c, x, y);
  c.fillStyle = '#1e4a22'; c.fillRect(x + 3, y + 3, 10, 8);          // 投放口
  c.fillStyle = '#f8d848'; c.fillRect(x + 6, y + 5, 4, 4);           // 里面的金币
  c.fillStyle = '#d8a820'; c.fillRect(x + 6, y + 6, 4, 1);
  c.fillStyle = '#e8e8f0'; c.fillRect(x + 3, y + 12, 10, 1);
};
// —— 杂货铺：木头箱子 + 小价签，卖基础建材（每种每天限购 1 个）——
PAINTERS.store_top = vendBody('#a8763e', '#7a5228');
PAINTERS.store_side = vendBody('#95663a', '#7a5228');
PAINTERS.store_front = (c, x, y) => {
  PAINTERS.store_side(c, x, y);
  c.fillStyle = '#6a4420'; c.fillRect(x + 3, y + 3, 10, 8);          // 木头橱窗
  c.fillStyle = '#f0e0c0'; c.fillRect(x + 4, y + 6, 8, 4);           // 窗里堆的货
  c.fillStyle = '#c08040'; c.fillRect(x + 5, y + 7, 2, 2);           // 木板
  c.fillRect(x + 9, y + 7, 2, 2);                                    // 圆石
  c.fillStyle = '#f8f0d8'; c.fillRect(x + 4, y + 4, 3, 2);           // 小价签
  c.fillStyle = '#a08040'; c.fillRect(x + 4, y + 4, 3, 1);
  c.fillStyle = '#e8e8f0'; c.fillRect(x + 3, y + 12, 10, 1);         // 取货口
};

// 灵魂传送门：半透明的深夜蓝底上飘着几道青色光带，像一汪立起来的幽灵水
PAINTERS.soul_portal = (c, x, y) => {
  c.fillStyle = 'rgba(26,34,96,0.75)'; c.fillRect(x, y, TILE, TILE);
  c.fillStyle = 'rgba(110,215,240,0.5)';
  for (const [sx, w, top, hgt] of [[3, 2, 1, 11], [8, 1, 4, 12], [12, 2, 2, 10]] as const) {
    c.fillRect(x + sx, y + top, w, hgt);
  }
  c.fillStyle = 'rgba(190,240,255,0.7)';
  [[3, 2], [8, 5], [12, 3], [5, 9], [11, 11]].forEach(([px, py]) => c.fillRect(x + px, y + py, 1, 1));
};

// 庄稼/羽毛/煤贴图拆出去了（CropTextures / BirdTextures / CoalTextures），合并进大表
Object.assign(PAINTERS, CROP_PAINTERS, FEATHER_PAINTERS, COAL_PAINTERS, LAMP_PAINTERS, FIRE_PAINTERS, GOLDEN_PAINTERS, BAG_PAINTERS, BAMBOO_PAINTERS, ISLAND_PAINTERS, SHOP_PAINTERS, FISH_PAINTERS, MUSHROOM_PAINTERS, BLACKMARKET_PAINTERS, SWORD_PAINTERS, SEASON_LEAF_PAINTERS, WILLOW_PAINTERS, ARENA_PAINTERS, SEASON_FOOD_PAINTERS, CS_PAINTERS, COOKING_PAINTERS, ROPE_PAINTERS);

export interface Atlas {
  texture: THREE.CanvasTexture;
  /** 某个贴图在图集里的 UV 范围 [u0, v0, u1, v1] */
  uv(name: string): [number, number, number, number];
  /** 画一份独立小贴图给物品栏格子用 */
  tileCanvas(name: string): HTMLCanvasElement;
  /** 方块图标（dataURL），物品栏/背包显示用，带缓存 */
  iconFor(blockId: number): string;
}

export function createAtlas(): Atlas {
  const rows = Math.ceil(TILE_NAMES.length / COLS);
  const canvas = document.createElement('canvas');
  canvas.width = COLS * TILE;
  canvas.height = rows * TILE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  TILE_NAMES.forEach((name, i) => {
    const ox = (i % COLS) * TILE;
    const oy = Math.floor(i / COLS) * TILE;
    const painter = PAINTERS[name];
    if (typeof painter === 'function') painter(ctx, ox, oy);
    else console.warn('[贴图] 图集里缺少 painter：', name);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;

  const uv = (name: string): [number, number, number, number] => {
    const i = TILE_NAMES.indexOf(name);
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const u0 = (col * TILE) / canvas.width;
    const u1 = ((col + 1) * TILE) / canvas.width;
    const v1 = 1 - (row * TILE) / canvas.height;
    const v0 = 1 - ((row + 1) * TILE) / canvas.height;
    return [u0, v0, u1, v1];
  };

  /** 缺 painter 时画一块洋红占位并点名，避免一个物品没贴图导致整个面板打不开 */
  const missing = new Set<string>();
  const warnMissing = (name: string): void => {
    if (missing.has(name)) return;
    missing.add(name);
    console.warn('[贴图] 缺少 painter：', name);
  };

  const tileCanvas = (name: string): HTMLCanvasElement => {
    const c = document.createElement('canvas');
    c.width = TILE; c.height = TILE;
    const cctx = c.getContext('2d')!;
    cctx.imageSmoothingEnabled = false;
    const painter = PAINTERS[name];
    if (typeof painter !== 'function') {
      warnMissing(name);
      cctx.fillStyle = '#ff00aa'; // 洋红占位：一眼能看出是哪个格子没画
      cctx.fillRect(0, 0, TILE, TILE);
      return c;
    }
    painter(cctx, 0, 0);
    return c;
  };

  const iconCache = new Map<number, string>();
  const iconFor = (blockId: number): string => {
    let url = iconCache.get(blockId);
    if (!url) {
      // 有正面贴图（箱子锁扣、熔炉炉口）优先画正面，不然图标会认不出是什么
      const def = BLOCKS[blockId];
      url = tileCanvas(def.tex.front ?? def.tex.side).toDataURL();
      iconCache.set(blockId, url);
    }
    return url;
  };

  return { texture, uv, tileCanvas, iconFor };
}
