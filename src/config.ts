/** 全局配置 — 所有可调参数集中在这里，改数字不用翻代码 */

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

export const SMELT_TIME = 3; // 熔炉烧一个东西要几秒

/** 食物效果：饥饿变化 + 血量变化（为 A8 南瓜片/西瓜片、A11 三种水果预留） */
export interface FoodEffect {
  hunger: number;
  hp: number;
  boostSeconds?: number;
  boostMult?: number;
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
};

/** 鱼：四种都住在海里（水里游来游去），下水按 P 打，打死掉对应的鱼物品 */
export const FISH = {
  HP: 4,              // 一拳头一条（空手一拳 4 血）
  COUNT: 6,           // 玩家周围海里最多几条
  SPEED: 1.2,         // 游动速度（慢悠悠）
  SPAWN_NEAR: 6,      // 刷在玩家这几格外
  SPAWN_FAR: 24,      // 这几格内
  DRY_SECONDS: 3,     // 离开水能扑腾几秒才死
  STING_RANGE: 0.9,   // 河豚扎人半径
  STING_DAMAGE: 1,    // 扎一下掉多少血
  STING_COOLDOWN: 2,  // 扎一次歇几秒
};

/** 鸟：三种都会飞不动只会蹦跶（先当地上走的小动物做）；命比别的动物短 */
export const BIRD = {
  HP: 6,             // 鸟皮薄，3 拳就死
  LIFE_SECONDS: 90,  // 寿命 90 秒，寿终正寝不掉东西
  FEATHER_CHANCE: 0.5, // 普通鸟/虎皮鹦鹉掉羽毛的概率
  BREED_EVERY: 25,   // 鸟命短，25 秒就生一胎（不然来不及传宗接代）
};

/** 打火石：L 点火，火不会蔓延 */
export const FIRE = {
  RED_SECONDS: 10,
  SOUL_SECONDS: 15,
  WIDTH: 0.65,
  HEIGHT: 0.95,
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

/** 吃完腌菜桶/橙子等食物的加速效果 */
export const BOOST = {
  SECONDS: 60,        // 腌菜桶加速持续多少秒
  MULT: 1.5,          // 腌菜桶走路速度变几倍
  ORANGE_SECONDS: 3,  // 橙子加速持续多少秒（A11 预留）
  ORANGE_MULT: 1.25,  // 橙子走路速度变几倍（A11 预留）
};

export const ANIMAL = {
  COUNT: 8,           // 玩家周围保持几只动物（边跑边补，等于无限生成）
  SPEED: 1.4,         // 闲逛速度
  PUNCH_DAMAGE: 2,    // 空手一拳扣多少血
  HIT_COOLDOWN: 0.4,  // 攻击间隔（秒）
  DROP_AGE: 45,       // 掉落物几秒后消失
  RESPAWN_EVERY: 1,   // 每隔几秒检查一次要不要补动物
  SPAWN_NEAR: 12,     // 新动物至少离你几格（防止在眼前凭空蹦出来）
  SPAWN_FAR: 48,      // 新动物最远刷在几格外
  DESPAWN_DIST: 70,   // 离玩家超过几格的动物消失
  CHUNK_CHANCE: 0.5,  // 新生成的区块有一半概率本来就住着动物
  CHUNK_PACK: 2,      // 一个区块自带最多几只
  BREED_EVERY: 50,    // 成年动物每隔几秒生一只宝宝
  GROW_SECONDS: 30,   // 宝宝几秒长成成年
  MAX_TOTAL: 30,      // 动物总数上限（生太多会卡，到了就不再生）
  FOLLOW_DIST: 5,     // 驯服的羊离玩家超过几格就跟上去
  FOLLOW_SPEED: 4,    // 跟着玩家的速度（比闲逛快）
  TELEPORT_DIST: 25,  // 跟丢超过几格就直接传送到玩家脚边
};

export const ZOMBIE = {
  COUNT: 4,           // 玩家周围最多几只僵尸
  HP: 12,             // 僵尸血量（空手 6 拳打死）
  SPEED: 2.2,         // 追人速度（比人慢，跑得掉）
  AGGRO: 14,          // 几格内会发现你然后追过来
  ATTACK_DIST: 1.4,   // 几格内能挠到你
  ATTACK_EVERY: 0.8,  // 攻击间隔（秒）
  DAMAGE: 2,          // 挠一下掉多少血（1 颗心）
  MEAT_MIN: 3,        // 打死至少掉几个生肉
  MEAT_EXTRA: 1 / 3,  // 多掉 1 个生肉的概率
  COOKED_CHANCE: 1 / 10, // 掉熟肉的概率
};

export const BLOODZOMBIE = {
  COUNT: 2,                        // 玩家周围最多几只血尸
  HP: Math.round(ZOMBIE.HP * 1.5),      // 18 血：普通僵尸的 1.5 倍（空手 9 拳）
  SPEED: ZOMBIE.SPEED * 1.5,            // 3.3：跑得快，追人更凶
  DAMAGE: Math.round(ZOMBIE.DAMAGE * 1.5), // 3：挠一下 1 颗半心
  MEAT_EXTRA: 0.5,                 // 血尸肉在 1 个基础上多掉 1 个的概率
};

export const STARZOMBIE = {
  COUNT: 2,                    // 玩家周围最多几只星空尸
  HP: ZOMBIE.HP * 3,           // 36 血：普通僵尸的 3 倍
  DAMAGE: ZOMBIE.DAMAGE,       // 攻击和普通僵尸一样疼（1 倍）
  AGGRO: 18,                   // 几格内发现你（会瞬移所以放宽一点）
  TELEPORT_EVERY: 3,           // 不会走路：每 3 秒瞬移一次
  TELEPORT_NEAR: 2.5,          // 瞬移落点离你几格（贴脸挠人）
  TELEPORT_TRIES: 10,          // 瞬移找落点最多试几次
};

export const CORRUPT = {
  COUNT: 1,                       // 玩家周围最多几个腐败人（一次一个就够吓人）
  HP: ZOMBIE.HP * 2,              // 24 血：僵尸的两倍
  LAST_SECONDS: 10,               // 只在黑夜最后几秒出现
  LIVE_SECONDS: 100,              // 出现后活多久就自己消失（打不死它就跑了）
  RANGE: 3,                       // 玩家走进几格内开始吐老鼠
  SUMMON_EVERY: 3,                // 每隔几秒吐一只老鼠
  MAX_RATS: 5,                    // 同时在场的老鼠上限（太多会卡）
  NUGGETS: 6,                     // 打死腐败人掉几个铁粒
};

export const RAT = {
  HP: 1,                          // 老鼠 1 滴血：一拳就死
  SPEED: ZOMBIE.SPEED * 2,        // 4.4：僵尸的两倍快
  NUGGETS: 1,                     // 打死一只掉 1 个铁粒
};

export const RUBBER_DROP = {
  CHANCE: 0.60, // 砍树掉橡胶的概率（每挖掉一块木头掷一次）
  MIN: 1,       // 掉的话最少掉几个
  MAX: 2,       // 最多掉几个
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
  board: ['KeyB'], // 大厅留言板：看大家说什么，自己也能发一条
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

export const MANUAL = {
  DROP_CHANCE: 0.5, // 打死动物掉 DIY 手册的概率
  GOLD_CHANCE: 0.01,
  PAPER_SECONDS: 15, // 捡到时弹出的白纸停留几秒
};

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
};

/** 雪花：挖雪地时极低概率掉一朵（冬季岛满地是雪，看运气） */
export const SNOWFLAKE_DROP = {
  CHANCE: 0.001,
};

/** 掉落物：背包塞不下时不硬捡，把剩下的弹开，几秒内不再往玩家身上飞 */
export const PICKUP = {
  REFUSE_SECONDS: 2,
};

export const CROP = {
  GROW_EVERY: 60,           // 庄稼每 60 秒长一级：小苗→幼苗→带叶大苗→结果
  SPLIT_COUNT: 3,           // 南瓜/西瓜按 1:3 转化（1 果 → 3 片，1 片 → 3 籽）
  CARROT_CHANCE: 0.01,      // 草方块自然生成胡萝卜植株的概率（1%）
  PUMPKIN_CHANCE: 0.005,    // 草方块自然生成南瓜植株的概率（0.5%）
  MELON_CHANCE: 0.005,      // 草方块自然生成西瓜植株的概率（0.5%）
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
  LEAF_FRUIT_CHANCE: 0.05,   // 挖掉普通树叶掉本岛专属水果的概率（5%，兼容老存档）
  FRUIT_LEAF_CHANCE: 0.15,   // 挖掉果树树叶掉对应水果的概率（15%：果树上果子本来就多）
  FRUIT_TREE_CHANCE: 0.31,   // 落地后约两成的树是本岛果树（hash 在区块边缘偏密，果树又要多留一格边，得掷高些才够两成）
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
  ],
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

/** 商店：售卖机买价与收购箱规则（单位：岛币，可以带小数） */
export const SHOP = {
  EGG_PRICE: 20,        // 特殊物品售卖机：小战士召唤蛋买价
  EGG_SELL: 10,         // 收购箱：还没孵化的蛋（三档同价）
  EGG_ROLL: [0.8, 0.19, 0.01] as const, // 买蛋抽品质概率：普通 / 高级 / 绝世
  DRINK_SELL_MULT: 0.5, // 收购箱收饮料 = 买价 × 0.5
  /** 杂货铺限量：每个账号每天对每种基础货只能买 1 个（独立模块见 world/shopLimits.ts） */
  STORE_STOCK: 1,
  SKIN_PRISMARINE_PRICE: 70, // 特殊物品售卖机：海晶史蒂夫皮肤（买一次永久解锁）
  SKIN_ENDER_PRICE: 85,      // 特殊物品售卖机：末影史蒂夫皮肤（买一次永久解锁）
  SKIN_BLOODMOON_PRICE: 56,  // 特殊物品售卖机：血月史蒂夫皮肤（买一次永久解锁）
  SKIN_WHITE_PRICE: 34,      // 特殊物品售卖机：白衣使者皮肤（买一次永久解锁）
  SKIN_TECH_PRICE: 89,       // 特殊物品售卖机：科技史蒂夫皮肤（买一次永久解锁）
  SKIN_CRYSTAL_PRICE: 78,    // 特殊物品售卖机：蓝色水晶盔甲史蒂夫皮肤（买一次永久解锁）
  SKIN_DOG_PRICE: 58,        // 特殊物品售卖机：嘉宾犬人皮肤（买一次永久解锁）
  SKIN_RAINBOW_PRICE: 158,   // 特殊物品售卖机：彩色史蒂夫皮肤（买一次永久解锁）
  SKIN_GHOST_PRICE: 69,      // 特殊物品售卖机：史蒂夫鬼版·万圣节（买一次永久解锁）
  SKIN_PUMPKIN_PRICE: 32,    // 特殊物品售卖机：史蒂夫南瓜头版·万圣节（买一次永久解锁）
};

/** 收购箱价目表：物品ID → { coins: 一份换多少岛币, per: 几个算一份 }
 *  稻粒（麦子）特殊：64 个才算一份换 1 岛币，零头退回背包 */
export const SELL_PRICE: Record<number, { coins: number; per: number }> = {
  100: { coins: 0.25, per: 1 },  // 生肉
  112: { coins: 3, per: 1 },     // 金粒
  113: { coins: 5, per: 1 },     // 蓝钻石碎
  28:  { coins: 0.01, per: 1 },  // 杂草
  29:  { coins: 0.15, per: 1 },  // 蒲公英
  30:  { coins: 0.15, per: 1 },  // 小红花
  173: { coins: 2, per: 1 },     // 芒星碎片
  122: { coins: 0.75, per: 1 },  // 星星碎片
  144: { coins: 2, per: 1 },     // 白羽毛
  120: { coins: 1, per: 64 },    // 稻粒：64 个 = 1 岛币
  139: { coins: 0.25, per: 1 },  // 胡萝卜
  224: { coins: 3, per: 1 },     // 整个南瓜
  225: { coins: 3, per: 1 },     // 整个西瓜
  244: { coins: 1, per: 1 },     // 椰子
  236: { coins: 1, per: 1 },     // 苹果
  237: { coins: 1, per: 1 },     // 桃子
  238: { coins: 1, per: 1 },     // 橘子（橙子）
  259: { coins: 1, per: 1 },     // 梨
  260: { coins: 1, per: 1 },     // 柿子
  287: { coins: 1, per: 1 },     // 香蕉
  292: { coins: 1, per: 1 },     // 香菇
  293: { coins: 1, per: 1 },     // 金针菇
  294: { coins: 1, per: 1 },     // 平菇
  295: { coins: 2, per: 1 },     // 红伞伞（有毒但更值钱）
  296: { coins: 1, per: 1 },     // 雪花（冬季岛雪地里挖到的收藏品）
  298: { coins: 4, per: 1 },     // 夜光蓝菇（会发光还能给夜视，最贵）
  7:   { coins: 0.01, per: 1 },  // 树叶
  243: { coins: 0.01, per: 1 },  // 椰子叶
  261: { coins: 0.01, per: 1 },  // 苹果树叶
  262: { coins: 0.01, per: 1 },  // 桃树叶
  263: { coins: 0.01, per: 1 },  // 橙子树叶
  264: { coins: 0.01, per: 1 },  // 梨树叶
  265: { coins: 0.01, per: 1 },  // 柿子树叶
  111: { coins: 1, per: 1 },     // 铁粒
  226: { coins: 0.33, per: 1 },  // 南瓜片
  227: { coins: 0.33, per: 1 },  // 西瓜片
  228: { coins: 0.11, per: 1 },  // 南瓜籽
  229: { coins: 0.11, per: 1 },  // 西瓜籽
  // 床什么颜色都收，一律 3 岛币（含星空床）
  49: { coins: 3, per: 1 }, 50: { coins: 3, per: 1 }, 51: { coins: 3, per: 1 },
  52: { coins: 3, per: 1 }, 53: { coins: 3, per: 1 }, 54: { coins: 3, per: 1 },
  55: { coins: 3, per: 1 }, 82: { coins: 3, per: 1 },
  // —— 海里的四种鱼：河豚带刺卖得贵，其他三种便宜 ——
  255: { coins: 0.1, per: 1 },   // 小丑鱼
  256: { coins: 0.1, per: 1 },   // 鳕鱼
  257: { coins: 0.1, per: 1 },   // 鲑鱼
  258: { coins: 0.5, per: 1 },   // 河豚
  // 羊毛什么颜色都收，一律 0.75
  34: { coins: 0.75, per: 1 }, 35: { coins: 0.75, per: 1 }, 36: { coins: 0.75, per: 1 },
  37: { coins: 0.75, per: 1 }, 38: { coins: 0.75, per: 1 }, 39: { coins: 0.75, per: 1 },
  40: { coins: 0.75, per: 1 }, 64: { coins: 0.75, per: 1 }, 65: { coins: 0.75, per: 1 },
};

/** 椰子树：只长在沙滩（沙子地面、离海平面 2 格以内），树顶挂 3~4 个椰子 */
export const PALM = {
  CHANCE: 0.006,     // 每格沙滩长出椰子树的概率
  HEIGHT_MIN: 5,     // 树干高度（格）
  HEIGHT_MAX: 7,
  COCONUT_MIN: 3,    // 树顶挂几个椰子
  COCONUT_MAX: 4,
};

/** 小战士（保镖）：数值基准就是普通僵尸，三档各自翻倍 + 各自的特技 */
export const WARRIOR = {
  SPEED: 3.4,        // 跟着主人走的正常速度（比僵尸快一点才追得上）
  CHASE_MULT: 1.5,   // 离主人太远时加速追
  FOLLOW_DIST: 2.5,  // 比这还近就原地待命
  FAR_DIST: 8,       // 离主人超过这么多格开始加速追
  AGGRO: 12,         // 看到几格内的怪就上去打
  ATTACK_DIST: 1.5,  // 几格内能砍到怪
  ATTACK_EVERY: 0.9, // 攻击间隔（秒）
  TELEPORT_DIST: 32, // 离主人超过这么多格直接闪现回身边，别走丢
  MEMORY: 6,         // 「怪在打主人 / 主人在打怪」记几秒，用来排攻击优先级
  /** 三档：血量与攻击是僵尸的倍数；其余是各自的特技（普通暴击 / 高级回血 / 绝世秒杀+回血） */
  TIERS: {
    normal: { hpMult: 1, dmgMult: 1, critEvery: 8, critChance: 0.02 },
    advanced: { hpMult: 2, dmgMult: 1, healEvery: 10, healChance: 0.04 },
    epic: {
      hpMult: 3, dmgMult: 2,
      killEvery: 3, killChance: 0.10,          // 每 3 秒 10% 秒杀正在打的怪
      regenEvery: 5, regenChance: 0.05,        // 每 5 秒 5% 回一口血（约等于挨僵尸打两次）
      regenAmount: ZOMBIE.DAMAGE * 2,
    },
  },
};

export const WATER_FLOW = {
  EVERY: 0.6,       // 每隔几秒水尝试往下流一次
  GROW: 0.7,        // 70% 概率源头留着、下面多一格水（水越流越多）
                    // 剩下 30% 整格挪下去（源头没了，水不变多）
};

/** 沼泽地形：一圈圈的毒水塘 */
export const SWAMP = {
  RADIUS: 8,     // 沼泽圆半径：2+2+2+2 四层泽液
  CELL: 96,      // 每 96×96 格地皮里最多一个沼泽
  CHANCE: 0.45,  // 这块地皮长沼泽的概率（草地上才有）
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

/** 玻璃锥：玻璃碴磨的小刀 */
export const CONE = {
  DMG_MULT: 1.5,     // 攻击力是拳头的几倍
  SURVIVE: 1 / 3,    // 用完没碎的概率（2/3 直接碎掉）
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
};

/** 僵尸掉深绿颜料的概率（1/20） */
export const DEEPGREEN_DROP = 0.05;

export const ORE = {
  COAL_CHANCE: 0.05,   // 地下石头层里约 5% 生成看得见的煤矿
  IRON_CHANCE: 0.03,   // 石头层里 3% 是铁矿，哪一层都有
  GOLD_MAX_Y: 20,      // 金矿只埋在 20 层以下
  GOLD_CHANCE: 0.015,
  BLUE_MAX_Y: 12,      // 蓝钻石矿只埋在最底下 12 层
  BLUE_CHANCE: 0.008,
};

export type Action = keyof typeof KEYS;

/** 渲染质量 — 三档预设与自动降档参数 */
export type QualityTier = 'high' | 'medium' | 'low';

export interface QualityPreset {
  pixelRatioMax: number;
  antialias: boolean;
  viewDistance: number;
  shadows: boolean;
  shadowMapSize: number;
  bloom: boolean;
  ao: boolean;
  waterWave: boolean;
  windSway: boolean;
}

export const QUALITY_PRESETS: Record<QualityTier, QualityPreset> = {
  high: {
    pixelRatioMax: 2,
    antialias: true,
    viewDistance: 4,
    shadows: true,
    shadowMapSize: 2048,
    bloom: true,
    ao: true,
    waterWave: true,
    windSway: true,
  },
  medium: {
    pixelRatioMax: 1.5,
    antialias: true,
    viewDistance: 4,
    shadows: true,
    shadowMapSize: 1024,
    bloom: false,
    ao: true,
    waterWave: true,
    windSway: true,
  },
  low: {
    pixelRatioMax: 1,
    antialias: false,
    viewDistance: 3,
    shadows: false,
    shadowMapSize: 0,
    bloom: false,
    ao: true,
    waterWave: true,
    windSway: true,
  },
};

export const QUALITY_ADAPT = {
  WINDOW_FRAMES: 90,        // 帧时间滑窗大小（帧数）
  DOWNGRADE_MS: 35,         // 滑窗平均帧耗超过此阈值（< 28 FPS）触发降档
  MAX_FRAME_MS: 250,        // 单帧耗时夹紧上限，防止切后台回来瞬间误降档
  CLOCK_MOD_SECONDS: 3600,  // 共享渲染时钟取模周期（秒），防 float32 精度抖动
};

/** 逐顶点 AO 曲线：occ 0~3 对应的亮度系数 */
export const AO_CURVE = [1.0, 0.82, 0.65, 0.5] as const;

/** 面方向明暗：顶面最亮、底面最暗、侧面分两档增强立体感 */
export const FACE_SHADE = {
  TOP: 1.0,
  SIDE_Z: 0.86,
  SIDE_X: 0.76,
  BOTTOM: 0.6,
} as const;

/** 水面波浪与波光参数（只作用于 aEffect > 0 的暴露液面顶点） */
export const WATER_FX = {
  WAVE1_FREQ_X: 1.8, WAVE1_FREQ_Z: 1.3, WAVE1_SPEED: 2.2, WAVE1_AMP: 0.018,
  WAVE2_FREQ_X: 2.9, WAVE2_FREQ_Z: 2.4, WAVE2_SPEED: 3.1, WAVE2_AMP: 0.012,
  NORMAL_STRENGTH: 3.2, UV_SCALE: 3.5,
  UV1_SPEED_X: 0.65, UV1_SPEED_Z: 0.45, UV2_SPEED_X: -0.5, UV2_SPEED_Z: 0.7,
  SHIMMER_STRENGTH: 0.16, SPEC_POWER: 48.0, SPEC_STRENGTH: 0.55,
  FRESNEL_POWER: 3.0, FRESNEL_STRENGTH: 0.18,
  SUN_DIR: [0.4264, 0.8528, 0.2558] as const,
} as const;

/** 花草庄稼随机化与风摆参数（只作用于 aEffect > 0 的 cross 顶边顶点） */
export const WIND_FX = {
  SWAY_AMP: 0.055, SWAY_SPEED: 2.4, PHASE_X: 1.7, PHASE_Z: 2.3,
  OFFSET_MAX: 0.1, HALF_SPAN: 0.38, HEIGHT_MIN: 0.82, HEIGHT_MAX: 1.0,
} as const;

/** 竹子的表现参数：竹叶探出格子外面才像一丛（MC 的竹叶模型也是超格的） */
export const BAMBOO_FX = {
  LEAF_SPAN: 0.62,        // 梢头大丛竹叶的半宽（1 格 = 0.5，0.62 即探出格子）
  SMALL_LEAF_SPAN: 0.46,  // 顶下一节小丛竹叶的半宽
} as const;

/** 天空渐变球与地平线雾（三段昼夜色 + 雾距系数） */
export const SKY = {
  RADIUS: 150, W_SEG: 32, H_SEG: 16, FOG_NEAR: 0.65, FOG_FAR: 1.1,
  DAY: { zenith: 0x3b86e0, horizon: 0x9bd7f2 },
  DUSK: { zenith: 0x383268, horizon: 0xf08a4b },
  NIGHT: { zenith: 0x060918, horizon: 0x101836 },
  CURVE: 0.6, SUN_GLOW: 0.22, SUN_POWER: 16.0,
} as const;

/** 跟随式平行光软阴影参数（正交范围、近远裁切面、抗摩尔纹偏移、夜晚关闭阈值） */
export const SHADOW = {
  EXTENT: 44, NEAR: 10, FAR: 160,
  BIAS: -0.0005, NORMAL_BIAS: 0.03,
  NIGHT_THRESHOLD: 0.15, SUN_OFFSET: [50, 100, 30] as const,
} as const;

/** HIGH 档轻量泛光后处理参数（阈值避开白天雪地/白羊毛，发光材质用 HDR 倍率触发） */
export const BLOOM = {
  THRESHOLD: 0.88, STRENGTH: 0.35, RADIUS: 0.3,
  SAMPLES: 4, GLOW_COLOR: [1.35, 1.35, 1.45] as const,
} as const;
