/** 全局配置 — 世界底座：区块/视距/种子/沼泽/降雪/树木植被参数（2026-10-29 从 config.ts 拆出） */

export const CHUNK = {
  SIZE: 16,      // 区块边长（格）
  HEIGHT: 64,    // 世界高度（格）
};


export const VIEW_DISTANCE = 4;   // 玩家周围生成多少个区块（半径）
export const SEA_LEVEL = 24;      // 海平面高度，低于它的坑会被水填满
export const WORLD_SEED = 20260924; // 地形种子，固定则每次世界一样
export const VOID_Y = -8;           // 挖出世界底掉下去，掉过这条线就算摔死重生
export const STACK_MAX = 64;      // 一格最多叠多少个方块


/** 水桶：桶的叠放数 = 里面有几格水，一桶最多灌 3 格 */
export const BUCKET_WATER_MAX = 3;


export const BAMBOO_FOREST = {
  CELL_SIZE: 96,          // 竹林中心分布网格
  CHANCE: 0.45,           // 每个网格出现竹林的概率
  RADIUS: 6,              // 圆形林地面积约 113 格（100~119 格）
  STALKS_MIN: 10,
  STALKS_MAX: 18,
  SHOOTS_MIN: 1,
  SHOOTS_MAX: 2,
  HEIGHT_MIN: 4,
  HEIGHT_MAX: 5,
};


/** 冬季降雪粒子：只在「冬季 + 站在雪地上」时开，纯视觉，不写世界数据 */
export const SNOWFALL = {
  PARTICLES: 260,   // 同屏雪花数量
  AREA: 22,         // 玩家周围多宽的范围里下雪
  HEIGHT: 14,       // 在玩家头顶多高生成
  BELOW: 6,         // 落到玩家脚下多低就回头顶重生
  FALL_SPEED: 1.8,  // 下落速度（格/秒）
  DRIFT: 0.35,      // 横向飘的速度（格/秒）
  SIZE: 0.12,       // 雪花大小
  COLOR: 0xffffff,
  RECHECK: 0.5,     // 隔几秒重新判断要不要下雪
  // —— 蓝雪花：偶尔从白点里变出来一朵大的六角蓝雪花，落地变成雪花物品 ——
  BLUE_CHANCE: 0.005, // 每颗白点重生时变成蓝雪花的概率（0.5%）
  BLUE_MAX: 4,        // 同屏最多飘几朵蓝雪花
  BLUE_SIZE: 0.45,    // 蓝雪花大小（格，比白点大好认）
  BLUE_SPEED: 1.2,    // 蓝雪花下落速度（比白点慢，飘得显眼）
};


/** 雪花：挖雪地时极低概率掉一朵（冬季岛满地是雪，看运气） */
export const SNOWFLAKE_DROP = {
  CHANCE: 0.001,
};


/** 无尽方块：挖石头时极低概率这块石头其实是无尽方块（2026-11-01 设定：0.01%，中彩票级别） */
export const ENDLESS_DROP = {
  CHANCE: 0.0001,
};


/** 掉落物：背包塞不下时不硬捡，把剩下的弹开，几秒内不再往玩家身上飞 */
export const PICKUP = {
  REFUSE_SECONDS: 2,
};


/** 椰子树：只长在沙滩（沙子地面、离海平面 2 格以内），树顶挂 3~4 个椰子 */
export const PALM = {
  CHANCE: 0.006,     // 每格沙滩长出椰子树的概率
  HEIGHT_MIN: 5,     // 树干高度（格）
  HEIGHT_MAX: 7,
  COCONUT_MIN: 3,    // 树顶挂几个椰子
  COCONUT_MAX: 4,
};


/** 柳树（沙滩专属树）：只长在沙滩窄带，春天在树冠旁飘柳絮孢子 */
export const WILLOW = {
  CHANCE: 0.012,     // 每格沙滩长出柳树的概率（比椰子树略高一点，柳树矮、成排）
  FLUFF_CHANCE: 1,   // 挖柳树叶必掉 1 个柳絮孢子（留给以后的采集设定用）
};


/** 柳絮孢子粒子：春季柳树附近生成，随风漂移、1 分钟后消散、玩家靠近直接入包 */
export const FLUFF = {
  MAX: 40,           // 同屏最多几颗
  SPAWN_EVERY: 1.2,  // 每隔几秒补一颗
  LIFE: 60,          // 每颗活多久（秒），到点消散
  FALL: 0.15,        // 下落速度（格/秒）
  DRIFT: 0.5,        // 水平漂移速度上限（格/秒）
  PICK_DIST: 1.2,    // 玩家离多近能捡（格）
  NEAR: 8,           // 多近有柳树叶才算"柳树附近"（格）
};


export const WATER_FLOW = {
  EVERY: 0.6,       // 每隔几秒水尝试往下流一次
  GROW: 0.7,        // 70% 概率源头留着、下面多一格水（水越流越多）
                    // 剩下 30% 整格挪下去（源头没了，水不变多）
};


/** 沼泽地形：一圈圈的毒水塘 */
export const SWAMP = {
  RADIUS: 8,     // 沼泽圆半径：2+2+2+2 四层泽液
  CELL: 64,      // 每 64×64 格地皮里最多一个沼泽
  CHANCE: 0.7,   // 这块地皮长沼泽的概率（草地/雪地上才有）
  FLAT: 1,       // 整圈允许的高低差（格）：0 = 必须完全同高（太苛刻），1 = 容一格小起伏
};


/** 泽液碰一下的伤害节奏（秒/血）；溺泽液不算毒，它是当水喝 */
export const SWAMP_HURT = {
  LIGHT:   { dmg: 0.5, every: 1.5 }, // 淡沼泽液
  MID:     { dmg: 1,   every: 1.5 }, // 沼泽液
  PHANTOM: { dmg: 0.5, every: 3 },   // 幻泽液
  DEEP:    { dmg: 1,   every: 1 },   // 深泽液
};


/** 幻泽液的镜头摇摆：左 30° 1 秒 → 右 30° 1 秒 → 回正 1 秒 */
export const SWAY = {
  ANGLE: Math.PI / 6, // 30 度
  CYCLE: 3,           // 一轮几秒
  LINGER: 4,          // 离开幻泽液后还多晕几秒
};


export const ORE = {
  COAL_CHANCE: 0.05,   // 地下石头层里约 5% 生成看得见的煤矿
  IRON_CHANCE: 0.03,   // 石头层里 3% 是铁矿，哪一层都有
  GOLD_MAX_Y: 20,      // 金矿只埋在 20 层以下
  GOLD_CHANCE: 0.015,
  BLUE_MAX_Y: 12,      // 蓝钻石矿只埋在最底下 12 层
  BLUE_CHANCE: 0.008,
};
