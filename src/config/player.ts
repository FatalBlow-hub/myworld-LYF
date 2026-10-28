/** 全局配置 — 玩家与输入：角色参数/血量饥饿/按键表/触屏与平台判定（2026-10-29 从 config.ts 拆出） */

export const WAISTBAG = {
  GLASS_SPEED: 0.75,
  GRID_COLUMNS: 5,
};


export const GOLDEN = {
  WATER_USES_FOR_MANUAL: 10,
  FREEZE_DAMAGE: 2,
  FREEZE_SECONDS: 2,
  PICKAXE_SPEED: 3,
  PICKAXE_COOLDOWN: 0.5,
};


export const SPAWN = {
  RANGE: 20000, // 随机出生点离家最远距离（格）
  TRIES: 20,    // 掷骰子找出生点最多试几次
};


export const PLAYER = {
  WIDTH: 0.6,        // 身体宽（格）
  HEIGHT: 1.8,       // 身高（格）
  EYE: 1.62,         // 眼睛离脚的高度
  SPEED: 5,          // 走路速度（格/秒）
  TURN_SPEED: 2.6,   // 左右转向速度（弧度/秒）
  LOOK_SPEED: 1.8,   // 上下看速度（弧度/秒）
  LOOK_LIMIT: 1.5,   // 抬头低头最大角度（约 86 度）
  JUMP: 8.5,         // 起跳速度
  GRAVITY: 24,       // 重力加速度
  WATER_GRAVITY: 4,  // 水中下坠加速度（小=下沉慢）
  WATER_DRAG: 2.5,   // 水中阻力
  SWIM_UP: 3.5,      // 水中按空格上浮速度
  REACH: 5,          // 手能够到的最远距离（格）
  STEP_HEIGHT: 0.6,  // 走上一格台阶不用跳（像走楼梯）
  FLY_SPEED: 10,     // 创造模式飞行升降速度（格/秒）
  FLY_MOVE: 1.6,     // 飞行时水平移动提速倍数
  CLIMB: 2,          // 爬梯子速度（格/秒）：按住前上爬、按住后下爬
};


/** 鼠标视角（PC 端指针锁定）：点一下画面锁住鼠标，之后移动鼠标就是转视角 */
export const MOUSE = {
  SENS: 0.0022,      // 灵敏度：每像素转多少弧度（约 0.13°/px）
  INVERT_Y: false,   // true = 鼠标上移反而低头（飞行摇杆式），默认跟主流沙盒一致
  HINT: '点击画面锁定鼠标转视角 · ESC 解锁',
};


/** 手机端：右侧（其实是整屏空白处）拖动看视角 */
export const TOUCH = {
  LOOK_SENS: 0.005,  // 灵敏度：每像素转多少弧度。手指行程比鼠标短，所以比 MOUSE.SENS 调高
  INVERT_Y: false,   // true = 往上拖反而低头
};


export const HEALTH = {
  MAX_HP: 20,            // 满血 = 10 颗心 × 2
  OXYGEN_MAX: 15,        // 水下憋气秒数
  DROWN_INTERVAL: 1,     // 缺氧后每隔几秒扣一次血
  DROWN_DAMAGE: 2,       // 每次溺水扣血（1 颗心）
  FALL_SAFE: 3,          // 掉落不超过几格不受伤
  FALL_DAMAGE: 2,        // 每多掉 1 格扣多少血
  RESPAWN_INVINCIBLE: 2, // 重生后无敌秒数
  REGEN_EVERY: 60,       // 每隔几秒自动回血
  REGEN_HP: 1,           // 每次回多少血
};


export const HUNGER = {
  MAX: 7,                // 饥饿条满格数（7 个鸡腿）
  DRAIN_EVERY: 60,       // 开启后每隔几秒掉 1 格饥饿
  STARVE_EVERY: 2,       // 饿到 0 后每隔几秒扣一次血
  STARVE_DAMAGE: 1,      // 每次饥饿扣血量
  ORANGE_BOOST_SECONDS: 3, // 橙子速度加成持续秒数（A11 预留）
  ORANGE_BOOST_MULT: 1.25, // 橙子速度加成倍率（A11 预留）
};


/** 轮滑鞋：穿靴子格（装备栏最下面那格），滑得快但会摔 */
export const SKATES = {
  SPEED_MULT: 1.5,   // 滑起来是走路的几倍
  SLIP_EVERY: 10,    // 连续滑几秒摔一跤
  FALL_SECONDS: 1,   // 摔倒躺几秒才爬起来
  FALL_TILT_SECONDS: 0.18, // 镜头倒下/站起各花多少秒
  FALL_ANGLE: Math.PI / 2, // 倒地时镜头侧倾角度
  MAX_FALLS: 3,      // 摔几次鞋就烂了
};


/** 挖掘加速（水果拼盘 6 秒）：挖掘速度倍率 */
export const HASTE = { MULT: 1.5 } as const;


/** 吃完腌菜桶/橙子等食物的加速效果 */
export const BOOST = {
  SECONDS: 60,        // 腌菜桶加速持续多少秒
  MULT: 1.5,          // 腌菜桶走路速度变几倍
  ORANGE_SECONDS: 3,  // 橙子加速持续多少秒（A11 预留）
  ORANGE_MULT: 1.25,  // 橙子走路速度变几倍（A11 预留）
};


export const KEYS = {
  // 走路交给 WASD：W/S 前后、A/D 横移（方向键不再管走路）
  forward: ['KeyW'],
  back: ['KeyS'],
  turnLeft: ['ArrowLeft'],
  turnRight: ['ArrowRight'],
  strafeLeft: ['KeyA'],
  strafeRight: ['KeyD'],
  // 方向键专职调视角：↑↓ 抬头低头、←→ 转身；8/2 留作别名，老习惯不用改
  lookUp: ['ArrowUp', 'Digit8', 'Numpad8'],
  lookDown: ['ArrowDown', 'Digit2', 'Numpad2'],
  jump: ['Space'],
  descend: ['ShiftLeft', 'ShiftRight'],
  mine: ['KeyP'],
  place: ['KeyL'],
  door: ['KeyM'],
  prevSlot: ['Digit4', 'Numpad4'],
  nextSlot: ['Digit6', 'Numpad6'],
  inventory: ['Digit9', 'Numpad9'],
  split: ['KeyK'],
  eat: ['KeyE'],
  toggleHunger: ['KeyO'],
  toggleZombieSpawn: ['KeyN'],
  pause: ['Escape'],
  save: ['Digit1', 'Numpad1'], // 手动存档
  respawn: ['Digit3', 'Numpad3'], // 回城：瞬移回重生点（不掉血不死）
  book: ['Digit7', 'Numpad7'], // 打开制作方法收集册（DIY 手册学过的方法都在这）
  quit: ['KeyQ'], // 暂停时按它存档回菜单（原 0 键让给聊天了，暂停菜单里也有按钮）
  hall: ['KeyH'], // 在自己的岛与大厅之间来回切换
  settings: ['KeyB'], // 设置：手册提示方式、提示语开关
  board: ['KeyT'], // 大厅留言板：看大家说什么，自己也能发一条（B 让给设置了）
  mail: ['KeyV'], // 信箱：看别人写给自己的私信
  give: ['KeyC'], // 访岛同屏时打开「送礼物」面板，把岛币/物品给对面的人
  chat: ['Digit0', 'Numpad0'], // 访岛同屏时打开聊天框，跟对面说话
} as const;


/** 手机版域名：Nginx 把这些域名反代到同一个服务，前端据此切换手机 UI */
export const MOBILE = {
  /** 域名前缀：`m.7shu.asia` 这类一级子域，命中即手机版。
   *  注意要用一级子域：现有证书是 `*.7shu.asia` 通配，三层域名（m.ms.7shu.asia）吃不到，得再签证书 */
  HOST_PREFIXES: ['m.'],
  /** 完整域名白名单：域名不满足前缀规则时写这里 */
  HOSTS: [] as readonly string[],
} as const;


export type Action = keyof typeof KEYS;
