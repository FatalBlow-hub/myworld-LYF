/** 全局配置 — 岛屿与日历：岛型规则/四季岛挑选/游戏日历（2026-10-29 从 config.ts 拆出） */

/** 游戏日历：一个月 10 天、开局 7 月 8 日（四季划分与日期推进见 core/Calendar.ts） */
export const CALENDAR = {
  MONTH_DAYS: 10,  // 一个月几天
  START_MONTH: 7,  // 新档从几月开始
  START_DAY: 8,    // 新档从几号开始
};


export const DAY = {
  LENGTH: 120,      // 一天多少秒
  NIGHT_FROM: 80,   // 第几秒开始天黑（80~120 是黑夜）
  RAMP: 10,         // 黄昏/黎明各用几秒渐变
  SLEEP_SECONDS: 1, // 睡觉黑屏几秒
  STAR_RANGE: 10,   // 碎片落在床附近多少格以内
  MANG_CHANCE: 0.5, // 睡醒只掉一颗：一半是芒星碎片，另一半是星星碎片
};


/** 专属岛屿类型与树叶掉水果配置（苹果/桃子/橙子/梨子/柿子 五种岛 + 只能外出探索才能到的香蕉岛） */
export type IslandType = 'apple' | 'peach' | 'orange' | 'pear' | 'persimmon' | 'banana'
  | 'spring' | 'summer' | 'autumn' | 'winter';


export const ISLAND_TYPES: Record<IslandType, { id: IslandType; cn: string; fruitId: number; leafId: number }> = {
  apple:     { id: 'apple',     cn: '苹果岛', fruitId: 236, leafId: 261 }, // 236 = APPLE，261 = 苹果树叶
  peach:     { id: 'peach',     cn: '桃子岛', fruitId: 237, leafId: 262 },
  orange:    { id: 'orange',    cn: '橘子岛', fruitId: 238, leafId: 263 },
  pear:      { id: 'pear',      cn: '梨子岛', fruitId: 259, leafId: 264 }, // 259 = 梨，264 = 梨树叶
  persimmon: { id: 'persimmon', cn: '柿子岛', fruitId: 260, leafId: 265 }, // 260 = 柿子，265 = 柿子树叶
  banana:    { id: 'banana',    cn: '香蕉岛', fruitId: 287, leafId: 286 }, // 287 = 香蕉，286 = 香蕉树叶
  // —— 四季岛：新档自家岛就落在这四种里，各 1/4；地形与资源规则见 SEASON_ISLAND_RULES ——
  spring:    { id: 'spring',    cn: '春季岛', fruitId: 237, leafId: 262 },
  summer:    { id: 'summer',    cn: '夏季岛', fruitId: 236, leafId: 261 },
  autumn:    { id: 'autumn',    cn: '秋季岛', fruitId: 260, leafId: 265 },
  winter:    { id: 'winter',    cn: '冬季岛', fruitId: 0,   leafId: 0 },   // 冬季岛不长果树
};


/** 季节岛的自家岛 id（新档抽签用；落地后品种固定，见 SEASON_ISLAND_PICKS） */
export type SeasonIslandId = 'spring' | 'summer' | 'autumn' | 'winter';


/** 能当自家岛的"品种岛"（冬季岛没有果树，其余每个对应一种树） */
export type FruitIslandId = 'peach' | 'apple' | 'pear' | 'banana' | 'orange' | 'persimmon' | 'winter';


/** 岛屿生成规则（用户 2026-10-20 定稿）：
 *  先按季节各 1/4 抽，再在该季的候选岛型里抽一个——
 *  春 = 桃岛；夏 = 苹果岛/梨岛/香蕉岛三选一；秋 = 橘子岛/柿子岛二选一；冬 = 冬季岛（雪地）。
 *  **品种一旦确定就固定**：苹果岛永远只有苹果树、梨岛永远只有梨树……不会随玩家日期长出别的树。 */
export const SEASON_ISLAND_PICKS: Record<SeasonIslandId, IslandType[]> = {
  spring: ['peach'],
  summer: ['apple', 'pear', 'banana'],
  autumn: ['orange', 'persimmon'],
  winter: ['winter'],
};


/** 每个岛型的固有规则（与玩家日期无关，生成时定死）：
 *  春岛（桃）没竹林；夏/秋/冬三季的岛附带竹林；秋岛常年长蘑菇 0.2%；冬岛全岛雪地。 */
export const ISLAND_RULES: Record<FruitIslandId, {
  season: SeasonIslandId;
  bamboo: boolean;
  /** 全岛按雪地生成（地表盖雪、湖面结冰） */
  snowOnly?: boolean;
}> = {
  peach:     { season: 'spring', bamboo: false },
  apple:     { season: 'summer', bamboo: true },
  pear:      { season: 'summer', bamboo: true },
  banana:    { season: 'summer', bamboo: true },
  orange:    { season: 'autumn', bamboo: true },
  persimmon: { season: 'autumn', bamboo: true },
  winter:    { season: 'winter', bamboo: true, snowOnly: true },
};


/** 按规则抽一座岛：季节各 1/4 → 该季候选里再抽一个。
 *  excludeBanana = true 时夏季三分支排除香蕉（**登录出生**永远落不到香蕉岛；外出随机可以） */
export function pickIslandType(rand: () => number = Math.random, excludeBanana = false): IslandType {
  const seasons: SeasonIslandId[] = ['spring', 'summer', 'autumn', 'winter'];
  const season = seasons[Math.floor(rand() * seasons.length)];
  let picks = SEASON_ISLAND_PICKS[season];
  if (excludeBanana && picks.includes('banana')) picks = picks.filter((t) => t !== 'banana');
  return picks[Math.floor(rand() * picks.length)];
}


/** 旧季节岛（P6 的"一岛多树"版）→ 品种岛映射：读档时自动升级，品种岛本身原样保留 */
export const LEGACY_ISLAND_MAP: Record<string, IslandType> = {
  spring: 'peach',
  summer: 'apple',
  autumn: 'orange',
};


export const ISLAND = {
  LEAF_STICK_CHANCE: 0.1,    // 挖掉普通树叶额外掉 1 个木棍的概率（2026-10-28 起普通树不掉了，改掉杂项）
  FRUIT_LEAF_CHANCE: 0.15,   // 挖掉果树树叶掉对应水果的概率（15%：果树上果子本来就多）
  FRUIT_TREE_CHANCE: 0.31,   // 落地后约两成的树是本岛果树（hash 在区块边缘偏密，果树又要多留一格边，得掷高些才够两成）
};
