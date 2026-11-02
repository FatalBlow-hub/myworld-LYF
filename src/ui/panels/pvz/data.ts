/** 植物大战僵尸·数据表 — 全部植物/僵尸/关卡数值（2026-11-02 用户定稿）
 *
 *  纯数据无逻辑：engine.ts 读表跑模拟，draw.ts 读表画图。
 *  数值口径：豌豆伤害=1；植物血按"僵尸每秒啃 2 点"折算；僵尸血=豌豆命中次数。 */

// —— 植物 ——
export type PlantKind =
  | 'sunflower' | 'pea' | 'snow' | 'venom' | 'nut' | 'potato' | 'catapult'
  | 'umbrella' | 'spike' | 'chomper' | 'hypno' | 'melon' | 'pumpkin' | 'gloom' | 'bamboo';

export interface PlantDef {
  cn: string;      // 名字
  cost: number;    // 麦粒价（=原版阳光）
  hp: number;      // 被啃的血量
  cd: number;      // 卡片冷却秒（0=无冷却）
  color: string;   // 小图标底色
}

export const PLANTS: Record<PlantKind, PlantDef> = {
  sunflower: { cn: '像素向日葵', cost: 50, hp: 6, cd: 5, color: '#f0c53a' },
  pea: { cn: '豌豆发射器', cost: 100, hp: 6, cd: 5, color: '#4aa832' },
  snow: { cn: '寒冰发射器', cost: 125, hp: 6, cd: 5, color: '#7ac8e8' },
  venom: { cn: '毒液发射器', cost: 125, hp: 6, cd: 5, color: '#2a7a2a' },
  nut: { cn: '木制坚果', cost: 50, hp: 80, cd: 12, color: '#8a5a2a' },
  potato: { cn: '土豆TNT', cost: 25, hp: 3, cd: 30, color: '#c8a04a' },
  catapult: { cn: '枫叶飞刀投手', cost: 100, hp: 6, cd: 5, color: '#e8823a' },
  umbrella: { cn: '香菇保护伞', cost: 100, hp: 8, cd: 8, color: '#b08a55' },
  spike: { cn: '柳条刺刺', cost: 100, hp: 999, cd: 5, color: '#7a5a3a' }, // 地刺不被啃（巨人/冰车会砸/碾）
  chomper: { cn: '柳条大嘴花', cost: 150, hp: 6, cd: 8, color: '#8a3a8a' },
  hypno: { cn: '粉伞伞', cost: 125, hp: 6, cd: 8, color: '#e87ab8' },
  melon: { cn: '变身西瓜', cost: 175, hp: 6, cd: 8, color: '#3aa84a' },
  pumpkin: { cn: '南瓜方框', cost: 125, hp: 60, cd: 8, color: '#e88a2a' },
  gloom: { cn: '氢能灯', cost: 150, hp: 6, cd: 8, color: '#4a4ac8' },
  bamboo: { cn: '竹子坚盾', cost: 100, hp: 160, cd: 12, color: '#c8b04a' },
};

// —— 僵尸 ——
export type ZKind =
  | 'basic' | 'cone' | 'bucket' | 'yeti' | 'ladder' | 'digger' | 'bike'
  | 'bungee' | 'balloon' | 'white' | 'red' | 'mech' | 'corrupt';

export interface ZDef {
  cn: string; hp: number; speed: number; eatDps: number;
  color: string; flying?: boolean; // flying=不能被地面攻击打（豌豆/刺刺），投手/氢能灯能打
}

export const ZOMBIES: Record<ZKind, ZDef> = {
  basic: { cn: '普通僵尸', hp: 10, speed: 0.15, eatDps: 2, color: '#6a8a4a' },
  cone: { cn: '血尸', hp: 28, speed: 0.15, eatDps: 2, color: '#a83a3a' },          // 路障
  bucket: { cn: '圆石盾血尸', hp: 55, speed: 0.15, eatDps: 2, color: '#8a8a8a' },  // 铁桶
  yeti: { cn: '雪傀儡', hp: 30, speed: 0.12, eatDps: 2, color: '#e8f0f8' },        // 雪人：走几格回头跑
  ladder: { cn: '木梯僵尸', hp: 28, speed: 0.2, eatDps: 2, color: '#b89a5a' },     // 梯子架坚果就翻
  digger: { cn: '木镐僵尸', hp: 28, speed: 0.25, eatDps: 2, color: '#5a4a3a' },    // 矿工：挖地道偷后排
  bike: { cn: '自行车僵尸', hp: 60, speed: 0.35, eatDps: 999, color: '#4a6a9a' }, // 冰车：碾压植物
  bungee: { cn: '腐败者', hp: 23, speed: 0, eatDps: 0, color: '#3a2a4a' },          // 蹦极：空降偷植物
  balloon: { cn: '气球腐败者', hp: 20, speed: 0.12, eatDps: 0, color: '#c85a8a', flying: true }, // 气球：飘过来
  white: { cn: '白眼巨人', hp: 150, speed: 0.08, eatDps: 999, color: '#d8d8e8' },  // 巨人砸植物不吃
  red: { cn: '红眼巨人', hp: 300, speed: 0.08, eatDps: 999, color: '#c83a3a' },    // 红眼更硬
  mech: { cn: '腐败机甲', hp: 400, speed: 0.04, eatDps: 0, color: '#2a1a3a' },      // BOSS：踩整行
  corrupt: { cn: '腐败尸', hp: 23, speed: 0.15, eatDps: 2, color: '#4a2a5a' },      // 气球落地/机甲驾驶员/蹦极落地
};

// —— 关卡：unlock=通关奖励（新植物）；waves=每波刷的怪 ——
export interface LevelDef { unlock: PlantKind[]; waves: Partial<Record<ZKind, number>>[]; boss?: boolean }

// 波次表按定稿转录；"混合增援/最终混合大波"按前面关卡的怪组合凑数
const M = (n: number): Partial<Record<ZKind, number>> => ({ basic: n });
const mix = (z: Partial<Record<ZKind, number>>) => z;

export const LEVELS: LevelDef[] = [
  { unlock: ['sunflower', 'pea'], waves: [M(3), M(4), M(5)] },                                                    // 1
  { unlock: ['nut'], waves: [mix({ basic: 4, cone: 2 }), mix({ basic: 3, cone: 2 }), mix({ basic: 3, cone: 1 })] }, // 2
  { unlock: ['potato'], waves: [mix({ basic: 4, cone: 2 }), mix({ basic: 4, cone: 3 }), mix({ basic: 4, cone: 2 })] }, // 3
  { unlock: ['chomper'], waves: [mix({ basic: 3, cone: 2 }), mix({ basic: 3, cone: 2, bucket: 1 }), mix({ basic: 2, cone: 2, bucket: 2 }), mix({ basic: 2, cone: 1, bucket: 1 })] }, // 4
  { unlock: ['catapult'], waves: [mix({ basic: 3, cone: 2 }), mix({ basic: 3, cone: 2, bucket: 1 }), mix({ basic: 3, cone: 2, bucket: 2, ladder: 1 }), mix({ basic: 2, cone: 2, bucket: 1, ladder: 2 })] }, // 5
  { unlock: ['spike'], waves: [mix({ basic: 4, cone: 2 }), mix({ basic: 3, cone: 2, bucket: 1 }), mix({ basic: 3, cone: 2, bucket: 2, bike: 1 }), mix({ basic: 2, cone: 1, bucket: 1, bike: 2 })] }, // 6
  { unlock: ['melon'], waves: [mix({ basic: 3, cone: 2 }), mix({ basic: 2, cone: 2, bucket: 1 }), mix({ bucket: 2, bike: 1 }), mix({ basic: 3, cone: 1, bike: 1 })] }, // 6.5 特殊关：变身西瓜
  { unlock: ['umbrella'], waves: [mix({ basic: 3, cone: 2 }), mix({ basic: 3, cone: 2, bucket: 1 }), mix({ basic: 2, cone: 2, bucket: 1, digger: 2 }), mix({ basic: 2, cone: 1, digger: 1, bike: 2 })] }, // 7
  { unlock: ['hypno'], waves: [mix({ basic: 3, cone: 2 }), mix({ basic: 2, cone: 2, bucket: 1, yeti: 1 }), mix({ basic: 3, cone: 1, bucket: 2, yeti: 1, bungee: 1 }), mix({ basic: 2, cone: 1, bucket: 1, yeti: 1, bungee: 2 })] }, // 8
  { unlock: ['snow'], waves: [mix({ basic: 3, cone: 2 }), mix({ basic: 2, cone: 1, bucket: 2, bungee: 1 }), mix({ basic: 2, cone: 2, bucket: 1, bungee: 1, balloon: 2 }), mix({ basic: 2, cone: 1, bucket: 1, bungee: 1, balloon: 2 })] }, // 9
  { unlock: ['venom'], waves: [mix({ basic: 3, cone: 2 }), mix({ basic: 2, cone: 2, bucket: 1, ladder: 1 }), mix({ basic: 2, cone: 1, bucket: 1, bike: 1, digger: 1 }), mix({ yeti: 1, bungee: 1, balloon: 2 }), mix({ basic: 3, cone: 2, bucket: 2, balloon: 2 })] }, // 10
  { unlock: ['pumpkin'], waves: [mix({ basic: 3, cone: 2 }), mix({ basic: 2, cone: 2, bucket: 2 }), mix({ bucket: 1, ladder: 2, bike: 1 }), mix({ digger: 2, basic: 3, cone: 2, bucket: 2 })] }, // 11
  { unlock: ['gloom'], waves: [mix({ basic: 3, cone: 2 }), mix({ cone: 2, bucket: 2, yeti: 2 }), mix({ bungee: 2, balloon: 2 }), mix({ basic: 3, cone: 3, bucket: 2, balloon: 2 })] }, // 12
  { unlock: ['bamboo'], waves: [mix({ basic: 3, cone: 2 }), mix({ basic: 2, cone: 2, bucket: 2, ladder: 1 }), mix({ bike: 2, digger: 2, yeti: 1 }), mix({ bungee: 2, balloon: 2 }), mix({ basic: 4, cone: 3, bucket: 3, bike: 1, balloon: 2 })] }, // 13
  { unlock: [], waves: [mix({ basic: 4, cone: 2 }), mix({ bucket: 2, bungee: 2 }), mix({ balloon: 3 })], boss: true }, // 14 BOSS 腐败机甲战
];

/** 初始就解锁的卡（第 1 关的奖励就是它俩，等于开局自带） */
export const BASE_CARDS: PlantKind[] = ['sunflower', 'pea'];

/** 已通关关卡数 → 本局能用的卡片列表（基础卡 + 各关奖励） */
export function unlockedCards(doneLevels: number): PlantKind[] {
  const set = new Set<PlantKind>(BASE_CARDS);
  for (let i = 0; i <= doneLevels && i < LEVELS.length; i++) LEVELS[i].unlock.forEach((k) => set.add(k));
  return [...set];
}

// —— 节奏常量 ——
export const ROWS = 5, COLS = 9;
export const START_SUN = 50;
export const SKY_SUN_EVERY = 9;    // 天上掉麦粒的间隔
export const SKY_SUN_LIVE = 12;    // 麦粒在地上亮多久
export const SUN_VALUE = 25;
export const SUNFLOWER_EVERY = 24; // 向日葵产一粒
export const POTATO_ARM = 15;      // 土豆 TNT 成型要几秒
export const CHOMPER_CHEW = 40;    // 大嘴花嚼几秒
export const Z_EAT_DPS = 2;        // 僵尸啃植物秒伤（表里有特例）
export const WAVE_GAP = 28;        // 一波没清完最多等几秒就上下一波
export const FIRST_WAVE = 6;       // 开局几秒刷第一波
