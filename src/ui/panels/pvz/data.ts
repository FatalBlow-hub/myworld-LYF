/** 植物大战僵尸·数据表 — 全部植物/僵尸/关卡/助力卡数值（2026-11-04 用户定稿）
 *
 *  纯数据无逻辑：engine.ts 读表跑模拟，draw.ts 读表画图。
 *  数值口径：豌豆伤害=1；植物血按"僵尸每秒啃 2 点"折算；僵尸血=豌豆命中次数。
 *  全局：只有白天；天上掉阳光 32 秒一个、要点才收；产阳光植物把阳光刷在旁边的格子。 */

// —— 植物 ——
export type PlantKind =
  | 'sunflower' | 'sunbud' | 'pea' | 'snow' | 'venom' | 'nut' | 'potato' | 'catapult'
  | 'umbrella' | 'spike' | 'chomper' | 'hypno' | 'melon' | 'pumpkin' | 'gloom' | 'bamboo'
  | 'arrow' | 'iceshroom' | 'dandelion'
  | 'mosspea' | 'mossbox' | 'venombud' | 'toxin' | 'specialpea' | 'soulweed' | 'soulbox' | 'copycarrot'
  | 'sunbloom'
  | 'sunear' | 'venomspike' | 'icespike';

/** 只能种在毒液地块上的植物 */
export const VENOM_PLANTS: PlantKind[] = ['mosspea', 'mossbox', 'venombud', 'toxin'];

export interface PlantDef {
  cn: string;      // 名字
  cost: number;    // 阳光价
  hp: number;      // 被啃的血量
  cd: number;      // 卡片冷却秒（0=无冷却）
  color: string;   // 小图标底色
}

export const PLANTS: Record<PlantKind, PlantDef> = {
  sunflower: { cn: '像素向日葵', cost: 50, hp: 6, cd: 5, color: '#f0c53a' },
  sunbud:    { cn: '阳光小花',   cost: 25, hp: 3, cd: 10, color: '#f8e88a' },
  pea:       { cn: '豌豆发射器', cost: 100, hp: 6, cd: 5, color: '#4aa832' },
  snow:      { cn: '寒冰发射器', cost: 125, hp: 6, cd: 5, color: '#7ac8e8' },
  venom:     { cn: '毒液发射器', cost: 125, hp: 6, cd: 5, color: '#2a7a2a' },
  nut:       { cn: '木质坚果',   cost: 50, hp: 80, cd: 12, color: '#8a5a2a' },
  potato:    { cn: '土豆TNT',    cost: 25, hp: 3, cd: 30, color: '#c8a04a' },
  catapult:  { cn: '枫叶投手',   cost: 100, hp: 6, cd: 5, color: '#e8823a' },
  umbrella:  { cn: '香菇保护伞', cost: 100, hp: 8, cd: 8, color: '#b08a55' },
  spike:     { cn: '柳条刺刺',   cost: 100, hp: 999, cd: 5, color: '#7a5a3a' }, // 地刺不被啃（巨人/冰车会砸/碾）
  chomper:   { cn: '柳条大嘴花', cost: 150, hp: 6, cd: 8, color: '#8a3a8a' },
  hypno:     { cn: '粉伞伞',     cost: 125, hp: 6, cd: 8, color: '#e87ab8' },
  melon:     { cn: '变身西瓜',   cost: 175, hp: 6, cd: 8, color: '#3aa84a' },
  pumpkin:   { cn: '南瓜方框',   cost: 125, hp: 60, cd: 8, color: '#e88a2a' },
  gloom:     { cn: '氢能灯',     cost: 150, hp: 6, cd: 8, color: '#4a4ac8' },
  bamboo:    { cn: '竹子坚盾',   cost: 100, hp: 160, cd: 12, color: '#c8b04a' },
  arrow:     { cn: '箭羽草',     cost: 125, hp: 6, cd: 5, color: '#3a8a6a' },
  iceshroom: { cn: '冰霜菇',     cost: 75, hp: 6, cd: 30, color: '#b8e8f8' },
  dandelion: { cn: '蒲公英炸弹', cost: 125, hp: 6, cd: 5, color: '#f8f8d8' },
  // —— 二期毒液/蓝魂系（2026-11-05 定稿）——
  mosspea:    { cn: '葫芦藓',     cost: 75, hp: 6, cd: 5, color: '#4a7a3a' },
  mossbox:    { cn: '苔藓方框',   cost: 75, hp: 60, cd: 8, color: '#6a8a4a' },
  venombud:   { cn: '毒液花',     cost: 50, hp: 6, cd: 5, color: '#5a3a8a' },
  toxin:      { cn: '毒素菇',     cost: 100, hp: 6, cd: 8, color: '#7a4a9a' },
  specialpea: { cn: '特种豌豆',   cost: 175, hp: 6, cd: 5, color: '#2a5a3a' },
  soulweed:   { cn: '蓝魂草',     cost: 75, hp: 6, cd: 8, color: '#4a6ac8' },
  soulbox:    { cn: '蓝魂方框',   cost: 125, hp: 60, cd: 8, color: '#5a7ad8' },
  copycarrot: { cn: '复制胡萝卜', cost: 65, hp: 80, cd: 8, color: '#e8782a' },
  sunbloom:   { cn: '阳光蓓蕾',   cost: 50, hp: 6, cd: 55, color: '#ffd76a' },
  sunear:     { cn: '光穗草',     cost: 75, hp: 6, cd: 8, color: '#e8c85a' },
  venomspike: { cn: '毒液地刺',   cost: 125, hp: 999, cd: 5, color: '#6a3a8a' },
  icespike:   { cn: '冰地刺',     cost: 125, hp: 999, cd: 5, color: '#6aa8d8' },
};

// —— 僵尸 ——
export type ZKind =
  | 'basic' | 'cone' | 'bucket' | 'yeti' | 'ladder' | 'digger' | 'bike'
  | 'balloon' | 'white' | 'red' | 'diamond' | 'mech' | 'sunzombie';

export interface ZDef {
  cn: string; hp: number; speed: number; eatDps: number;
  color: string; flying?: boolean; // flying=不能被地面攻击打（豌豆/刺刺），投手/箭羽草/炸弹能打
}

export const ZOMBIES: Record<ZKind, ZDef> = {
  basic:   { cn: '普通僵尸',   hp: 10, speed: 0.15, eatDps: 2, color: '#6a8a4a' },
  cone:    { cn: '血尸',       hp: 28, speed: 0.15, eatDps: 2, color: '#a83a3a' },          // 路障
  bucket:  { cn: '圆石盾血尸', hp: 55, speed: 0.15, eatDps: 2, color: '#8a8a8a' },          // 铁桶
  yeti:    { cn: '雪傀儡',     hp: 30, speed: 0.12, eatDps: 2, color: '#e8f0f8' },          // 雪人：走几格回头跑
  ladder:  { cn: '木梯僵尸',   hp: 28, speed: 0.2, eatDps: 2, color: '#b89a5a' },           // 梯子架坚果就翻
  digger:  { cn: '木镐僵尸',   hp: 28, speed: 0.25, eatDps: 2, color: '#5a4a3a' },          // 矿工：挖地道偷后排
  bike:    { cn: '自行车僵尸', hp: 60, speed: 0.35, eatDps: 999, color: '#4a6a9a' },        // 冰车：碾压植物
  balloon: { cn: '气球腐败者', hp: 20, speed: 0.12, eatDps: 0, color: '#c85a8a', flying: true }, // 气球破了落地变普通僵尸
  white:   { cn: '白眼巨人',   hp: 75, speed: 0.08, eatDps: 999, color: '#d8d8e8' },         // 巨人砸植物不吃
  red:     { cn: '红眼巨人',   hp: 150, speed: 0.08, eatDps: 999, color: '#c83a3a' },        // 红眼更硬
  diamond: { cn: '蓝钻甲巨人', hp: 266, speed: 0.08, eatDps: 999, color: '#3a6ad8' },        // 小BOSS
  sunzombie: { cn: '阳光僵尸', hp: 10, speed: 0.15, eatDps: 2, color: '#e8e8d8' },           // 16关起混编：打死掉25阳光
  mech:    { cn: '腐败机甲',   hp: 400, speed: 0, eatDps: 0, color: '#2a1a3a' },             // BOSS：站右侧召唤+喷腐败球
};

// —— 助力卡：每波僵尸刷新前 1 秒随机抽一张，点卡再点草坪格激活，一次性 ——
export type CardKind =
  | 'sun150' | 'sunRate' | 'atkRate' | 'nutDrop' | 'peaDrop' | 'daytime'
  | 'freeze' | 'tntDrop' | 'hourglass' | 'wind' | 'freePlant';

export interface CardDef { cn: string; desc: string; color: string }

export const CARDS: Record<CardKind, CardDef> = {
  sun150:    { cn: '阳光小补', desc: '立刻+150阳光', color: '#f0c53a' },
  sunRate:   { cn: '产速增加', desc: '产阳光速度×2，30秒', color: '#f8e88a' },
  atkRate:   { cn: '攻速增加', desc: '攻击速度×2，24秒', color: '#e8823a' },
  nutDrop:   { cn: '防守急补', desc: '随机2空格出坚果', color: '#8a5a2a' },
  peaDrop:   { cn: '攻击急补', desc: '随机2空格出豌豆', color: '#4aa832' },
  daytime:   { cn: '今天白天', desc: '气球全破+产速×2，25秒', color: '#ffe97a' },
  freeze:    { cn: '冰冻一瞬', desc: '全场冻4秒(车免疫)', color: '#9adcf8' },
  tntDrop:   { cn: 'TNT预埋',  desc: '随机2空格出土豆TNT', color: '#c8a04a' },
  hourglass: { cn: '延时沙漏', desc: '下波僵尸晚来12秒', color: '#b8a8f8' },
  wind:      { cn: '自然大风', desc: '僵尸后退2格(巨人免疫)', color: '#a8d8a8' },
  freePlant: { cn: '免费种苗', desc: '下一株植物免费', color: '#d8f8d8' },
};
export const CARD_KINDS = Object.keys(CARDS) as CardKind[];

// —— 关卡：unlock=通关奖励（新植物）；waves=每波刷的怪 ——
export interface LevelDef { unlock: PlantKind[]; waves: Partial<Record<ZKind, number>>[]; boss?: boolean; special?: boolean; delayed?: { wave: number; kind: ZKind; t: number }[]; gaps?: Record<number, number> }

const mix = (z: Partial<Record<ZKind, number>>) => z;

export const LEVELS: LevelDef[] = [
  { unlock: ['sunflower', 'pea'], waves: [mix({ basic: 1 }), mix({ basic: 2 })] },                                    // 1 教学
  { unlock: ['nut'], waves: [mix({ basic: 2 }), mix({ basic: 2, cone: 1 })] },                                        // 2
  { unlock: ['potato'], waves: [mix({ basic: 2, cone: 1 }), mix({ basic: 2, cone: 2 })] },                            // 3
  { unlock: ['sunbud'], waves: [mix({ basic: 2 }), mix({ basic: 2, cone: 2 })] },                                     // 4
  { unlock: ['chomper'], waves: [mix({ basic: 2, cone: 1 }), mix({ basic: 2, cone: 2, bucket: 1 })] },                // 5
  { unlock: ['catapult'], waves: [mix({ basic: 2, cone: 2 }), mix({ basic: 2, bucket: 1 }), mix({ basic: 1, cone: 1, ladder: 1 })] }, // 6
  { unlock: ['spike'], waves: [mix({ basic: 2, cone: 1 }), mix({ cone: 2, bucket: 1 }), mix({ ladder: 1, bike: 1 })] }, // 7
  { unlock: ['melon'], special: true, waves: [mix({ basic: 2, cone: 1 }), mix({ bucket: 1, bike: 1 }), mix({ basic: 2, cone: 1 })] }, // ★ 特殊关
  { unlock: ['umbrella'], waves: [mix({ basic: 2, cone: 2 }), mix({ bucket: 1, digger: 1 }), mix({ yeti: 1 })] },     // 8
  { unlock: ['iceshroom'], waves: [mix({ basic: 2, cone: 1 }), mix({ bucket: 1, yeti: 1 }), mix({ digger: 1 })] },    // 9
  { unlock: ['hypno'], waves: [mix({ basic: 2, cone: 2 }), mix({ bucket: 1, yeti: 1 }), mix({ balloon: 1 })] },       // 10
  { unlock: ['snow'], waves: [mix({ basic: 2, cone: 2 }), mix({ bucket: 1, bike: 1 }), mix({ balloon: 2 })] },        // 11
  { unlock: ['venom'], waves: [mix({ basic: 2, cone: 1 }), mix({ ladder: 1, digger: 1 }), mix({ yeti: 1, balloon: 1 })] }, // 12
  { unlock: ['dandelion'], waves: [mix({ basic: 2, cone: 2 }), mix({ bucket: 1 }), mix({ balloon: 2 })] },            // 13
  { unlock: ['pumpkin'], waves: [mix({ basic: 2, cone: 2 }), mix({ bucket: 2, ladder: 1 }), mix({ bike: 1, digger: 1, white: 1 })] }, // 14
  { unlock: ['gloom'], waves: [mix({ cone: 2, bucket: 1 }), mix({ yeti: 1 }), mix({ balloon: 2, white: 1 })] },                 // 15
  { unlock: ['arrow'], waves: [mix({ basic: 1, sunzombie: 1, cone: 2 }), mix({ ladder: 1, bike: 1 }), mix({ digger: 1, yeti: 1 }), mix({ balloon: 1, white: 1 })] }, // 16
  { unlock: ['bamboo'], waves: [mix({ basic: 1, sunzombie: 1, cone: 2 }), mix({ ladder: 1, bike: 1 }), mix({ digger: 1, yeti: 1 }), mix({ balloon: 1, white: 1, red: 1 })] }, // 17
  // —— 二期新关（2026-11-05 定稿）：18~25 关 + 小BOSS ——
  { unlock: ['mosspea'], waves: [mix({ basic: 1, sunzombie: 1 }), mix({ basic: 2 }), mix({ basic: 2, sunzombie: 1 })] }, // 18
  { unlock: ['venombud'], waves: [mix({ basic: 1, sunzombie: 1 }), mix({ basic: 2, ladder: 1 }), mix({ basic: 2, sunzombie: 1, ladder: 1 })] }, // 19
  { unlock: ['toxin'], waves: [mix({ basic: 1, sunzombie: 1 }), mix({ ladder: 1 }), mix({ basic: 1, sunzombie: 1, balloon: 1 })] }, // 20
  { unlock: ['specialpea'], waves: [mix({ basic: 1, sunzombie: 1 }), mix({ ladder: 2 }), mix({ basic: 1, sunzombie: 1, balloon: 1 })] }, // 21
  { unlock: ['soulweed'], waves: [mix({ basic: 1, sunzombie: 1 }), mix({ ladder: 2 }), mix({ basic: 1, sunzombie: 1, digger: 1 })] }, // 22
  { unlock: ['soulbox'], waves: [mix({ sunzombie: 1 }), mix({ basic: 1 }), mix({ basic: 1, sunzombie: 1 }), mix({ diamond: 1 })] }, // 23 小BOSS
  { unlock: ['mossbox'], waves: [mix({ basic: 1, sunzombie: 1, digger: 1 }), mix({ ladder: 2, balloon: 1 }), mix({ basic: 2, sunzombie: 1, digger: 1, white: 1 })] }, // 24
  { unlock: ['copycarrot'], waves: [mix({ basic: 1, sunzombie: 1, ladder: 1 }), mix({ digger: 2 }), mix({ balloon: 2, basic: 1, sunzombie: 1, red: 1 })] }, // 25
  { special: true, unlock: ['sunbloom'], waves: [mix({ basic: 5 }), mix({ basic: 10 }), mix({ bucket: 10, cone: 10 }), mix({ ladder: 10, white: 1 })], delayed: [{ wave: 3, kind: 'red', t: 10 }] }, // ★ 最后的普通关
  // —— 三期难关（金色特殊关之后、BOSS 之前）——
  { unlock: ['sunear'], waves: [mix({ basic: 3, cone: 2 }), mix({ bucket: 2, basic: 4 }), mix({ cone: 3, bucket: 2, white: 2 }), mix({ bucket: 3, cone: 4, white: 2, red: 1 })] }, // 29
  { unlock: ['venomspike'], waves: [mix({ basic: 4, cone: 2 }), mix({ cone: 3, bucket: 2, balloon: 2 }), mix({ bucket: 3, balloon: 2, white: 2 }), mix({ bucket: 4, balloon: 3, white: 3, red: 1 })] }, // 30
  { unlock: ['icespike'], waves: [mix({ cone: 3, bucket: 2 }), mix({ bucket: 3, bike: 1 }), mix({ bucket: 3, bike: 2, white: 2 }), mix({ bucket: 4, bike: 2, white: 3, red: 2 }), mix({ bucket: 5, bike: 3, white: 3, red: 5 })], gaps: { 4: 17 } }, // 31 第4波后17秒出第5波
  { unlock: [], waves: [mix({ basic: 1, sunzombie: 1, cone: 1 }), mix({ bucket: 1 }), mix({ balloon: 2 })], boss: true }, // 最终BOSS 腐败机甲
];

/** 初始就解锁的卡（第 1 关的奖励就是它俩，等于开局自带） */
export const BASE_CARDS: PlantKind[] = ['sunflower', 'pea'];

/** 已通关关卡数 → 本局能用的卡片列表（基础卡 + 已打通关卡的奖励，本关奖励通关后才给） */
export function unlockedCards(doneLevels: number): PlantKind[] {
  const set = new Set<PlantKind>(BASE_CARDS);
  for (let i = 0; i < doneLevels && i < LEVELS.length; i++) LEVELS[i].unlock.forEach((k) => set.add(k));
  return [...set];
}

// —— 节奏常量 ——
export const ROWS = 5, COLS = 9;
export const START_SUN = 50;
export const SKY_SUN_EVERY = 32;   // 天上掉阳光的间隔（定稿：32秒一个）
export const SKY_SUN_LIVE = 12;    // 阳光在地上亮多久
export const SUN_VALUE = 25;       // 天上阳光/向日葵 一个值多少
export const SUNBUD_VALUE = 15;    // 阳光小花产的值
export const SUNFLOWER_EVERY = 24; // 向日葵产一粒
export const SUNBUD_EVERY = 15;    // 阳光小花产一粒
export const POTATO_ARM = 15;      // 土豆 TNT 成型要几秒
export const POTATO_DMG = 22;      // 土豆 TNT 爆炸伤害（普通僵尸正好炸死，血尸掉一截）
export const CHOMPER_CHEW = 40;    // 大嘴花嚼几秒
export const Z_EAT_DPS = 2;        // 僵尸啃植物秒伤（表里有特例）
export const FIRST_WAVE = 60;      // 开局几秒刷第一波（BOSS关=机甲登场后再等60秒）
export const WAVE_GAP = 40;        // 普通波间隔：放出后10秒+冷却30秒
export const FINAL_GAP = 60;       // 最后一波前：放出后10秒+冷却50秒
export const CARD_BEFORE_WAVE = 1; // 波前 1 秒抽助力卡
export const SUN_RATE_T = 30;      // 产速增加卡持续
export const ATK_RATE_T = 24;      // 攻速增加卡持续
export const DAYTIME_T = 25;       // 今天是白天卡持续
export const FREEZE_T = 4;         // 冰冻秒数
export const HOURGLASS_DELAY = 12; // 沙漏推迟秒数
export const WIND_PUSH = 2;        // 大风吹退格数
export const MECH_SUMMON_EVERY = 3;// 机甲召唤杂兵间隔
export const MECH_BALL_EVERY = 16; // 机甲低头喷腐败球间隔
export const MECH_ROW_EVERY = 10;  // 机甲换行间隔
export const BALL_HP = 3;          // 腐败球被寒冰打几次爆
export const BALL_SPEED = 1.2;     // 腐败球每秒滚几格
// —— 二期常量 ——
export const VENOM_COL = 4;        // 19 关起第 5 列整列是毒液地块（含 BOSS 关）
export const VENOM_FROM = 18;      // 关卡下标 ≥18 自带毒液列
export const MOSSPEA_INT = 0.93;   // 葫芦藓攻速=豌豆 2/3
export const MOSSPEA_DMG = 0.5;    // 葫芦藓单发=半格
export const MOSSPEA_POISON = 2;   // 葫芦藓命中附毒 2 秒
export const TOXIN_POISON = 15;    // 毒素菇被吃附毒 15 秒
export const VENOMBUD_EVERY = 17;  // 毒液花产阳光间隔
export const SOUL_FREEZE = 5;      // 蓝魂草被吃冻结秒
export const SOUL_SLOW = 10;       // 蓝魂草冻结后减速秒
export const SOUL_DMG = 0.5;       // 蓝魂草固定扣半格
export const SOUL_SLOW_RATE = 2 / 3; // 蓝魂方框啃咬双减速
export const COPY_DELAY = 3;       // 复制胡萝卜种下几秒后生效
export const SUNEARD_EVERY = 22;   // 光穗草产阳光间隔
export const SUNEARD_VALUE = 50;   // 光穗草一次产多少
export const SUNEARD_AURA = 1.25;  // 3×3 内阳光植物产速×1.25（冷却-20%）
export const VSPIKE_POISON = 3;    // 毒液地刺附毒秒数
export const ISPIKE_SLOW = 2;      // 冰地刺减速秒数
// —— 能量豆大招表：dur=持续秒 int=大招攻击/产出间隔；不表里的植物放不了（一次性/防御类都不行）——
export const BEAN_T: Partial<Record<PlantKind, { dur: number; int: number }>> = {
  pea: { dur: 9, int: 0.5 }, snow: { dur: 9, int: 0.5 }, venom: { dur: 9, int: 0.5 },
  catapult: { dur: 9, int: 0.5 }, dandelion: { dur: 9, int: 0.5 }, mosspea: { dur: 5, int: 0.5 },
  sunbud: { dur: 7.2, int: 0.9 }, sunflower: { dur: 8, int: 1 }, venombud: { dur: 8, int: 1 },
  specialpea: { dur: 12, int: 1 / 6 }, // 特种豌豆大招：12 秒每 1/6 秒一颗（保留 50% 特殊弹）
  arrow: { dur: 9, int: 0.5 },         // 箭羽草大招：9 秒每 0.5 秒一支
  gloom: { dur: 9, int: 0.9 },         // 氢能灯大招：9 秒 5×5 毒雾每 0.9 秒扣 1 血
};
