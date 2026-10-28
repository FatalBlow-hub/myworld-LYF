/** 全局配置 — 场景与联机：传送门/虚空/大厅/PVP/CS大赛/存档防沉迷（2026-10-29 从 config.ts 拆出） */

import { ANIMAL } from './mobs';

/** 灵魂蓝传送门：灵魂蓝木板围竖直门框，灵魂打火石点燃内腔；
 *  内腔至少 2×3、至多 8×12，点燃后内腔填满能穿行的传送门方块 */
export const PORTAL = {
  MIN_W: 2, MIN_H: 3, MAX_W: 8, MAX_H: 12,
  COOLDOWN: 1.5, // 传送后短暂冷却，免得在门框里来回弹
};


/** 灵魂虚空：传送过去只有一座 9×9×1 灵魂蓝木板平台，脚下全虚空；
 *  掉下去=掉出世界，回本岛床/复活点；平台上有幽灵鬼游荡 */
export const VOID_REALM = {
  PLATFORM: 9,       // 平台边长（格）
  PLATFORM_Y: 10,    // 平台所在高度
  GHOST_MAX: 3,      // 同时在场的幽灵鬼上限
  GHOST_EVERY: 8,    // 补怪间隔（秒）
  GHOST_FALL_Y: -12, // 幽灵掉到这个高度就悄悄消失
};


/** 幽灵鬼：灵魂虚空专属的漂浮小鬼；必掉灵魂蓝颜料、一半概率掉雪花（挠人距离/节奏跟普通僵尸一样） */
export const GHOST = {
  SPEED: 2.2, DAMAGE: 2, HP: 10,
};


export const CHALLENGE = {
  SIZE: 5,           // 挑战房外壳 5×5×5（里面空心 3×3×3）
  CLEAR: 7,          // 盖房要求 5×5 平地往上 7 层全空
  MEAT_COST: 10,     // 进房门票：10 生肉
  CONFIRM_SECONDS: 5, // 按 M 后几秒内再按一次算确认交门票
};


export const TANK = {
  SPEED_MULT: 2,                          // 开坦克是走路的两倍快
  BULLET_DAMAGE: ANIMAL.PUNCH_DAMAGE * 10, // 一炮顶空手十拳（20 血，普通怪一炮秒）
  BULLET_SPEED: 25,                       // 炮弹飞多快（格/秒）
  BULLET_RANGE: 30,                       // 最多飞多远
  FIRE_EVERY: 0.35,                       // 开炮间隔（秒）
  PICK_COOLDOWN: 0.4,                     // 收坦克的按键冷却
};


/** 访客挖掘权限：模式三选一 + 水果例外开关（仅在 none / all 下生效） + 是否允许放置方块 */
export type VisitPermMode = 'none' | 'all' | 'list';
export interface VisitPerm {
  mode: VisitPermMode;
  fruitException?: boolean;
  /** 允许访客放置方块（岛主放行时勾选；缺省 = 不许放，兼容旧版） */
  place?: boolean;
  /** 开启误伤：同屏时双方可以互相打（每拳扣 PVP.DAMAGE 血 = 半颗心；缺省 = 不许打） */
  friendly?: boolean;
}


/** 玩家互打（误伤）：岛主开「误伤」后生效 */
export const PVP = {
  DAMAGE: 1,          // 打一下扣多少血（1 血 = 半颗心）
  HIT_COOLDOWN: 0.4,  // 攻击间隔（秒），和打怪同节奏
  HIT_DISTANCE: 3.2,  // 拳头要离对方身体多近才算打到（格）
};


/** 大厅场景：固定 16×16 木板平台 + 中间双层木桌 + 四周栅栏边界 */
export const HALL = {
  SIZE: 16,                         // 平台边长（1 个区块 16×16）
  FLOOR_Y: 20,                      // 平台木板层高度
  TABLE_X: [7, 8, 9] as const,      // 桌子横向占 3 格（底层左右木板中间空，二层铺满）
  TABLE_Z: 8,                       // 桌子所在 Z 行（平台中央）
  SPAWN: { x: 8.5, y: 23, z: 8.5 }, // 大厅出生点（平台中央，桌面高度 22 + 1）
  QUEUE_MAX: 32,                    // 大厅排队人数上限
  RANDOM_COIN_COST: 5,              // 随机陌生岛消耗岛币数量
  VISIT_TIMEOUT_MS: 60_000,         // 访岛申请 60 秒无响应超时
  VISIT_ACK_MS: 8_000,              // 访岛申请发出后 8 秒没等到服务器回执 = 申请多半丢在死管里，自动重连
  TICKET_TTL_MS: 5 * 60_000,        // 访问票据 5 分钟有效
  /** 大厅角落的机器：沿北墙（z=1）从角上摆开，y = FLOOR_Y + 1 */
  MACHINES: [
    { id: 239, x: 1, z: 1 },        // 特殊物品售卖机
    { id: 240, x: 2, z: 1 },        // 饮料售卖机
    { id: 241, x: 3, z: 1 },        // 收购箱
    { id: 297, x: 4, z: 1 },        // 杂货铺
    { id: 315, x: 5, z: 1 },        // 黑色售卖机（315 = VENDING_BLACK，每天只随机卖一种货）
    { id: 348, x: 6, z: 1, tall: true }, // 红焰大赛箱（348 = ARENA_BOX，两格高）
  ] as { id: number; x: number; z: number; tall?: boolean }[],
};


/** 红焰大赛箱（极限季节挑战）：报名费 / 奖励 / 时长 / 刷怪节奏与两张图的地形参数 */
export const ARENA = {
  FEE: 2,              // 报名费（岛币）：中途死亡不退
  REWARD: 10,          // 撑满时间到点发的奖励（岛币）
  SECONDS: 120,        // 每场存活时长（秒）
  SPAWN_EVERY: 12,     // 每隔几秒刷一只怪
  CONFIRM_SECONDS: 5,  // 面板上点一次后几秒内再点才真扣钱
  FLOOR_Y: 20,         // 竞技场地板高度（和大厅一致）
  SNOW_SIZE: 16,       // 雪原图边长（正好一个区块）
  SNOW_WALL: 2,        // 雪原四周围墙高度
  VOID_SIZE: 11,       // 虚空图石台边长
  FALL_RESET: 8,       // 虚空图往下掉这么多格就传回台面（不死亡）
  SPAWN_NEAR: 8,       // 刷怪离玩家多远（雪原）
  SPAWN_NEAR_VOID: 3,  // 刷怪离玩家多远（虚空石台小，得凑近点）
};


export const SAVE = {
  EVERY: 15, // 每隔几秒自动存一次档
};


/** 幼儿防沉迷：每日在线时长上限、心跳与提醒节奏。
 *  服务端 addict_config 才是权威配置（家长在控制台改），这里是前端节奏与展示默认值 */
export const ADDICT = {
  LIMIT_SEC: 3600,        // 每日默认上限 1 小时（服务端没有配置行时生效）
  HEARTBEAT_MS: 30_000,   // 每 30 秒向服务端发一次心跳（时长由服务端按墙上时间累计）
  REMIND_SEC: 600,        // 每累计玩满 10 分钟弹一次提醒
  WARN_SEC: 600,          // 剩余不足 10 分钟，顶部倒计时变警示色
};


/** CS 大赛（本地 + AI 对手版）：报名费 / 奖励 / 五局三胜 / 枪械与投掷物数值 */
export const CS = {
  FEE: 2,               // 整套大赛只交一次（岛币）
  REWARD: 10,           // 整套打赢每人得 10 岛币
  WIN_ROUNDS: 3,        // 五局三胜：先赢 3 局
  ROUND_WIN: 1500,      // 单小局胜利的 CS 币
  ROUND_LOSS: 500,      // 单小局失败的 CS 币
  PREP_SECONDS: 5,      // 每小局开打前的准备时间（能开商店买东西）
  SWITCH_SECONDS: 3,    // 小局结束到下一小局的间隔
  SUPPLY_AMMO: 32,      // 每小局自带的弹药补给（发）
  KIT_AMMO: 32,         // 开赛赠送的子弹（发）
  SOLDIER_HP: 20,       // AI 士兵血量（和玩家满血一样）
  SOLDIER_SPEED: 3.2,   // AI 士兵移动速度（格/秒）
  SOLDIER_DAMAGE: 4,    // AI 每发子弹的伤害
  SOLDIER_EVERY: 1.6,   // AI 开枪间隔（秒）
  SOLDIER_ACCURACY: 0.6, // AI 命中率（不然三个一起扫玩家几秒就倒）
  SOLDIER_RANGE: 22,    // AI 多远才会开枪（格）
  AIM_RADIUS: 0.55,     // 子弹打中身体的判定半径（格）
  MUZZLE_LIGHT: 0.18,   // 开枪时视野亮一下的时长（秒）
  // 三把枪：伤害与射速（手枪是开赛赠送的）
  GUNS: {
    [369]: { damage: 12, every: 0.8 },  // 手枪
    [373]: { damage: 25, every: 1.5 },  // 步枪
    [375]: { damage: 20, every: 0.5 },  // AK47
  } as Record<number, { damage: number; every: number }>,
  THROW_SPEED: 16,      // 手雷/闪光/毒瓶飞出去的速度
  THROW_GRAVITY: 16,    // 投掷物重力
  THROW_RANGE: 22,      // 投掷物最远飞多远
  THROW_STEP: 1 / 120,  // 分步碰撞步长
  GRENADE_DAMAGE: 20,   // 手雷爆炸伤害（满血一炸就倒）
  GRENADE_RADIUS: 3,    // 手雷爆炸半径（格）
  FLASH_SECONDS: 4,     // 闪光弹致盲时长（秒）
  TOXIC_DAMAGE: 4,      // 毒药瓶命中扣血（用户拍板：400 是笔误，按 4）
  // CS 商店价目（CS 币）
  PRICES: { CONE: 100, AMMO: 100, FLASH: 200, GRENADE: 200, RIFLE: 500, TOXIC: 300, AK: 1000 },
  AMMO_PER_PACK: 16,    // 买一次弹药给多少发
};
