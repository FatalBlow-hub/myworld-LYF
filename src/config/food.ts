/** 全局配置 — 食物与战斗道具：食用效果表/药水/武器/陷阱/四季节日（2026-10-29 从 config.ts 拆出） */

import { HUNGER } from './player';

export const SMELT_TIME = 3; // 熔炉烧一个东西要几秒


/** 食物效果：饥饿变化 + 血量变化 + 可选的状态效果（2026-10-23 新增茶/拼盘/香蕉液） */
export interface FoodEffect {
  hunger: number;
  hp: number;
  /** 移速加成（秒）与倍率 */
  boostSeconds?: number;
  boostMult?: number;
  /** 接下来 seconds 秒里缓慢回 hp 点血（红花蜜茶 / 水果拼盘） */
  slowHeal?: { seconds: number; hp: number };
  /** 挖掘加速秒数（水果拼盘） */
  hasteSeconds?: number;
  /** 方向反转秒数：前进变后退、左右转互换（颠倒香蕉液） */
  flipSeconds?: number;
  /** 柔光照明秒数（蘑菇拼盘）：和夜视同一套亮度提升 */
  glowSeconds?: number;
  /** 解毒（蒲公英凉茶）：把身上中的毒一次清掉 */
  curePoison?: boolean;
  /** 春卷：接下来几秒完全不掉血，也不消耗饥饿 */
  godSeconds?: number;
  /** 负面豁免秒数（春卷 30 秒 / 圣诞甜饼 60 秒）：沼泽/幻泽液扣血与星空尸主动攻击都失效 */
  cleanseSeconds?: number;
  /** 攻击倍率持续秒数与倍率（丰收拼盘 ×1.25） */
  atkSeconds?: number;
  atkMult?: number;
}


/** 吃东西的效果：物品ID → { hunger: 回饥饿, hp: 回血（负数=扣血，生肉难吃！） } */
export const EAT_HP: Record<number, FoodEffect> = {
  100: { hunger: 1, hp: -1 }, // 生肉 +1 饥饿 -1 血
  101: { hunger: 1, hp: 4 },  // 熟肉 +1 饥饿 +4 血
  120: { hunger: 1, hp: 1 },  // 稻粒 +1 饥饿 +1 血（半颗心）
  125: { hunger: 0, hp: 3, boostSeconds: 60, boostMult: 1.5 }, // 腌菜桶 +3 血，吃完还跑得快（看下面的 BOOST）
  139: { hunger: 1, hp: 2 },  // 胡萝卜 +1 饥饿 +2 血（一整颗心）
  226: { hunger: 2, hp: 1 },  // 南瓜片 +2 饥饿 +1 血
  227: { hunger: 1, hp: 1 },  // 西瓜片 +1 饥饿 +1 血
  236: { hunger: 1, hp: 1.5 }, // 苹果 +1 饥饿 +1.5 血
  237: { hunger: 2, hp: 0.5 }, // 桃子 +2 饥饿 +0.5 血
  238: { hunger: 1, hp: 1, boostSeconds: HUNGER.ORANGE_BOOST_SECONDS, boostMult: HUNGER.ORANGE_BOOST_MULT }, // 橙子 +1 饥饿 +1 血 + 3 秒 ×1.25 加速
  244: { hunger: 2, hp: 1 },   // 椰子 +2 饥饿 +1 血（椰肉顶饱）
  259: { hunger: 3, hp: 0 },   // 梨 +3 饥饿
  260: { hunger: 0, hp: 2.5 }, // 柿子 +2.5 血
  287: { hunger: 2, hp: 1 },   // 香蕉 +2 饥饿 +1 血（香蕉岛专属）
  // —— 四种蘑菇（秋季限定；红伞伞的毒在 Survival 里特判）——
  292: { hunger: 1, hp: 0 },   // 香菇：+1 饥饿
  293: { hunger: 1, hp: 0 },   // 金针菇：+1 饥饿（旧版回血，按 2026-10-22 设定改）
  294: { hunger: 0, hp: 1, boostSeconds: 3, boostMult: 1.25 }, // 平菇：半颗心 + 3 秒 ×1.25 移速
  295: { hunger: 1, hp: 0 },   // 红伞伞：先回 1 饥饿，随后中毒
  298: { hunger: 1, hp: 0 },   // 夜光蓝菇：+1 饥饿 + 5 秒夜视（夜视在 Survival 里特判）
  // —— 7 种饮料：水果榨的 = 原水果效果再 +1 饥饿；酒是"更饱但掉血"；椰子汁直接回满饥饿 ——
  245: { hunger: 2, hp: 1.5 },  // 苹果汁：苹果(1,1.5) +1 饥饿
  246: { hunger: 2, hp: 1, boostSeconds: HUNGER.ORANGE_BOOST_SECONDS, boostMult: HUNGER.ORANGE_BOOST_MULT }, // 橘子汁：橙子 +1 饥饿
  247: { hunger: 3, hp: 0.5 },  // 桃子汁：桃子(2,0.5) +1 饥饿
  248: { hunger: 2, hp: -1 },   // 酒：-1 血 +2 饥饿（更饱但上头）
  249: { hunger: HUNGER.MAX, hp: 0 }, // 椰子汁：饥饿直接回满
  250: { hunger: 1, hp: 2 },    // 西瓜汁：+2 血 +1 饥饿
  251: { hunger: 1, hp: 1 },    // 胡萝卜汁：+1 血 +1 饥饿
  // —— 四种生鱼：河豚有毒别乱吃 ——
  255: { hunger: 1, hp: 0.5 },  // 生小丑鱼
  256: { hunger: 1, hp: 1 },    // 生鳕鱼
  257: { hunger: 2, hp: 1 },    // 生鲑鱼
  258: { hunger: 1, hp: -2 },   // 生河豚：有毒！-2 血 +1 饥饿
  284: { hunger: 3, hp: 0 },    // 梨子汁：跟直接啃梨一个效果（只管饱，不回血）
  285: { hunger: 0, hp: 5.5 },  // 柿子饼：柿子本身的 2.5 血，再额外 +3 血
  // —— 2026-10-23 新加的自制吃食（用户在聊天里下的设定）——
  309: { hunger: 1, hp: 0, slowHeal: { seconds: 6, hp: 2 } },             // 红花蜜茶：+1 饥饿，6 秒里慢慢回 2 血
  310: { hunger: 1, hp: 0, curePoison: true },                            // 蒲公英凉茶：+1 饥饿，解毒
  311: { hunger: 2, hp: 0 },                                              // 草饼：新手口粮，+2 饥饿
  312: { hunger: 1, hp: 0, flipSeconds: 8 },                              // 颠倒香蕉液：+1 饥饿，方向反 8 秒
  313: { hunger: 5, hp: 0, boostSeconds: 6, boostMult: 1.3, hasteSeconds: 6, slowHeal: { seconds: 6, hp: 2 } }, // 水果拼盘
  314: { hunger: 4, hp: 0, boostSeconds: 6, boostMult: 1.3, glowSeconds: 6 }, // 蘑菇拼盘
  // —— 2026-10-27 四季节日食物 ——
  359: { hunger: 1, hp: 0, godSeconds: 15, cleanseSeconds: 30 },                      // 春卷：15 秒免伤 + 不耗饥饿，30 秒负面豁免
  363: { hunger: 2, hp: 0, atkSeconds: 10, atkMult: 1.25 },                           // 丰收拼盘：+2 饥饿，10 秒攻击 ×1.25
  367: { hunger: 2, hp: 1, cleanseSeconds: 60 },                                      // 圣诞甜饼：+2 饥饿 +1 血，1 分钟负面豁免
  // —— 2026-10-28 美食 DIY（面粉/面团是加工食材，不能吃也没标价）——
  378: { hunger: 2, hp: 1 },                                     // 生菌汤
  379: { hunger: 2, hp: 0 },                                     // 火腿
  381: { hunger: 1.5, hp: 0 },                                   // 法式面包棍
  382: { hunger: 3, hp: 1 },                                     // 法式三明治
  383: { hunger: 2, hp: 0 },                                     // 南瓜饼
  384: { hunger: 2.5, hp: 2, boostSeconds: 10, boostMult: 1.1 }, // 河豚汤：+2.5 饥饿 +2 血，10 秒移速 ×1.1
  385: { hunger: 2, hp: 0 },                                     // 煎小丑鱼
  386: { hunger: 3, hp: 2 },                                     // 炖鲑鱼
  387: { hunger: 2, hp: 1 },                                     // 炸鳕鱼排
  388: { hunger: 2.5, hp: 0 },                                   // 肉夹馍
  389: { hunger: 3, hp: 0 },                                     // 竹筒饭
  390: { hunger: 1.2, hp: 0 },                                   // 胡萝卜肉饺（单个）
  391: { hunger: 2, hp: 0, slowHeal: { seconds: 15, hp: 2 } },   // 胡萝卜蛋糕：15 秒缓慢回血共 2 点
  392: { hunger: 1.5, hp: 0 },                                   // 胡萝卜炒蘑菇
  // 猎装与丝线（2026-11-01）：绷带是用品不是食物，但走同一张表——按 E 使用瞬间回 2 血，不顶饿
  395: { hunger: 0, hp: 2 },                                     // 速修绷带
};


/** 钓鱼（2026-11-01 设定）：手持鱼竿按 P 抛竿 → 等咬钩浮标下沉 → 限时收杆；每钓一条磨 1 点耐久 */
export const FISHING = {
  CAST_MIN: 2,        // 抛竿落点最近几格
  CAST_MAX: 6,        // 抛竿最远几格
  FISH_NEAR: 4,       // 落点几格内有真鱼才咬钩（没鱼白抛）
  BITE_MIN: 3,        // 咬钩最少等几秒
  BITE_MAX: 8,        // 咬钩最多等几秒
  FOLLOW_DIST: 3,     // 收杆后鱼算到手：浮标附近几格内的鱼就是咬钩那只
  /** 浮标下沉后几秒内收杆才算钓到（普通 1 秒 / 铸铁 1.5 / 金色 2） */
  REEL_WINDOW: { normal: 1, iron: 1.5, gold: 2 },
  /** 三根竿的耐久（每钓一条磨 1 点，磨完竿断） */
  DURABILITY: { normal: 20, iron: 66, gold: 99 },
};


export const CROP = {
  GROW_EVERY: 60,           // 庄稼每 60 秒长一级：小苗→幼苗→带叶大苗→结果
  SPLIT_COUNT: 3,           // 南瓜/西瓜按 1:3 转化（1 果 → 3 片，1 片 → 3 籽）
  CARROT_CHANCE: 0.01,      // 草方块自然生成胡萝卜植株的概率（1%）
  PUMPKIN_CHANCE: 0.005,    // 草方块自然生成南瓜植株的概率（0.5%）
  MELON_CHANCE: 0.005,      // 草方块自然生成西瓜植株的概率（0.5%）
};


/** 玻璃锥：玻璃碴磨的小刀 */
export const CONE = {
  DMG_MULT: 1.5,     // 攻击力是拳头的几倍
  SURVIVE: 1 / 3,    // 用完没碎的概率（2/3 直接碎掉）
};


/** 六把剑：攻击都是拳头的几倍，砍一刀磨 1 点耐久，耐久用完剑断（雪花剑附带减速、血剑概率暴击） */
export const SWORDS = {
  WOOD:    { mult: 1.5, uses: 20 },
  IRON:    { mult: 2,   uses: 25 },
  GOLD:    { mult: 2.5, uses: 44 },
  DIAMOND: { mult: 3,   uses: 57 },
  SNOW:    { mult: 2,   uses: 21, slowSeconds: 1 },          // 被打的怪 1 秒走路减半速
  BLOOD:   { mult: 2,   uses: 12, critChance: 0.2, critMult: 4 }, // 20% 概率这一刀变 4 倍
  // 樱花剑：单次半格血（1 点）、10 刀、0.33 秒一刀、只够到 3 格——轻快但很脆
  SAKURA:  { mult: 0.5, uses: 10, reach: 3, cooldown: 0.33 },
} as const;


/** 枫叶飞刀：一次性投掷物，命中扣 2 点血（一颗心），扔空就没了 */
export const KNIFE = {
  DAMAGE: 2,        // 命中敌人扣多少血
  SPEED: 22,        // 飞多快（格/秒）
  GRAVITY: 8,       // 抛物线重力（比药瓶轻，飞得更直）
  RANGE: 18,        // 最多飞多远（格）
  STEP: 1 / 120,    // 分步碰撞的步长
};


/** 四季节日玩法：菖蒲香囊光环、冬季珠子掉率、菖蒲叶生成概率、旅者解锁价 */
export const SEASON_FOOD = {
  POUCH_RADIUS: 4,     // 菖蒲香囊：自身方圆几格内的怪物
  POUCH_EVERY: 4,      // 每几秒扣一次血
  POUCH_DAMAGE: 1,     // 每次扣几点
  /** 菖蒲香囊耐久（秒，2026-10-29 设定）：戴着每秒磨 1 点，磨完就烂掉 */
  POUCH_DURABILITY: 1000,
  /** 菖蒲护盾（2026-10-29 设定）：受击 50% 概率免掉 1 点伤害，每次挡下磨 1 点耐久 */
  SHIELD_CHANCE: 0.5,
  SHIELD_BLOCK: 1,
  SHIELD_DURABILITY: 55,
  BEAD_CHANCE: 0.125,  // 冬季挖树叶掉装饰珠子的概率
  BIRCH_SNOWFLAKE_CHANCE: 0.15, // 冬季挖普通树叶（设定的"桦树叶"）额外掉一朵雪花的概率
  WILLOW_SNOWFLAKE_CHANCE: 0.125, // 冬季挖柳树叶（枝条挂细雪）额外掉一朵雪花的概率（2026-10-31 设定）
  CALAMUS_CHANCE: 0.125, // 夏季水面长出菖蒲叶的概率
  UNLOCK_COST: 3,      // 旅者对话里收费解锁的那几本（3 岛币）
  TALK_DIST: 3,        // 站多近能跟旅者说话（格）
  TRAVELER_DAYS: 3,    // 旅者每季只出现头几天（2026-11-01 设定：一季 30 天里只来 3 天）
};


/** 柳条陷阱：踩上去禁锢 3 秒后陷阱自毁；挖掉能捡回本体 */
export const TRAP = {
  FREEZE: 3,        // 禁锢几秒
  HARDNESS: 0.3,    // 挖掉要多久
};


/** 药水瓶：P 扔 E 喝 */
export const POTION = {
  THROW_SPEED: 14,   // 扔出去飞多快
  STEP: 1 / 120,
  LIFT: 1.5,
  PHANTOM_DAMAGE: { dmg: 1, every: 5 },
  GRAVITY: 18,       // 抛物线下坠
  RANGE: 14,         // 最远飞几格
  SPLASH: 1.6,       // 落地溅到周围几格内的活物
  POISON: { dmg: 1, every: 3, dur: 15 },   // 毒药瓶：每 3 秒 -1 血，15 秒
  DEADLY: { dmg: 2, every: 2, dur: 14 },   // 剧毒瓶：每 2 秒 -2 血，14 秒
  SLOW: { mult: 0.5, dur: 15 },            // 幻药瓶砸中怪：速度减半 15 秒
  BREATH: 60,        // 防溺瓶：水下呼吸 60 秒
  HALLUCINATE: 6,    // 自己喝幻药瓶：晕几秒镜头摇摆
  /** 药水扣饥饿（2026-10-29 设定）：药水效果期间每隔这么久多扣 1 点饥饿 */
  HUNGER_EVERY: 10,
};
