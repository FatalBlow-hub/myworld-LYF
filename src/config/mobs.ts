/** 全局配置 — 生物数值：动物/僵尸系/鱼鸟/小战士与弓箭手（2026-10-29 从 config.ts 拆出） */

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


export const MANUAL = {
  DROP_CHANCE: 0.5, // 打死动物掉 DIY 手册的概率
  GOLD_CHANCE: 0.01,

};


/** 小战士（保镖）：数值基准就是普通僵尸；血量三档再各放大三倍（12 → 36/72/108），外加各自的特技 */
export const WARRIOR = {
  SPEED: 3.4,        // 跟着主人走的正常速度（比僵尸快一点才追得上）
  CHASE_MULT: 1.5,   // 离主人太远时加速追
  FOLLOW_DIST: 2.5,  // 比这还近就原地待命
  FAR_DIST: 8,       // 离主人超过这么多格开始加速追
  AGGRO: 12,         // 看到几格内的怪就上去打
  ATTACK_DIST: 1.5,  // 几格内能砍到怪
  TELEPORT_DIST: 32, // 离主人超过这么多格直接闪现回身边，别走丢
  MEMORY: 6,         // 「怪在打主人 / 主人在打怪」记几秒，用来排攻击优先级
  RETREAT_HP: 0.35,  // 血量掉到这个比例以下就不硬拼，先往后退
  RECOVER_HP: 0.6,   // 退着养回到这个比例才重新上前（留出回差，免得一上去就被打回来）
  RETREAT_RANGE: 10, // 后退时最多离主人这么远，再远就往主人身边靠
  RETREAT_HEAL: 1.2, // 后退时每秒回多少血（缓过来再上）
  /** 三档：血量与攻击是僵尸的倍数（血量 3/6/9 = 36/72/108，每档都比原来硬三倍）；
   *  attackEvery 是各自的攻击间隔（2026-10-29 设定：普通 3 秒 / 高级 2 秒 / 绝世 1 秒一刀）；
   *  其余是各自的特技（普通暴击 / 高级回血 / 绝世秒杀+回血） */
  TIERS: {
    normal: { hpMult: 3, dmgMult: 1, attackEvery: 3, critEvery: 8, critChance: 0.02 },
    advanced: { hpMult: 6, dmgMult: 1, attackEvery: 2, healEvery: 10, healChance: 0.04 },
    epic: {
      hpMult: 9, dmgMult: 2, attackEvery: 1,
      killEvery: 3, killChance: 0.10,          // 每 3 秒 10% 秒杀正在打的怪
      regenEvery: 5, regenChance: 0.05,        // 每 5 秒 5% 回一口血（约等于挨僵尸打两次）
      regenAmount: ZOMBIE.DAMAGE * 2,
    },
  },
};


/** 弓箭手小战士（小战士弓/火弓/冰弓召唤的哨兵，2026-10-24 设定；射速/伤害 2026-10-29 分形态定档）：
 *  血量/防御 = 普通僵尸，移速 = 僵尸一半；离怪 4~5 格停下放箭，最大射程 5 格 */
export const ARCHER = {
  SPEED: ZOMBIE.SPEED / 2,  // 移速 = 僵尸的一半（1.1）
  KEEP_DIST: 4,            // 距离怪这么远就停下开射，不贴脸（4~5 格站位）
  SHOOT_RANGE: 5,          // 箭矢最大攻击射程（格）
  /** 射箭间隔（秒）：普通 2 秒一箭 / 火 1.5 秒 / 冰 1.75 秒 */
  SHOOT_EVERY: { normal: 2, fire: 1.5, ice: 1.75 },
  /** 每箭伤害（血量点数）：火弓 1.5 无特效不叠加，冰弓 1 点带控制 */
  DMG: { normal: 1, fire: 1.5, ice: 1 },
  AGGRO: 12,               // 看到几格内的怪（和普通小战士同一只眼力）
  ARROW_SPEED: 16,         // 箭速（格/秒），直线飞行
  ARROW_RANGE: 14,         // 箭最远飞几格
  ICE_FREEZE: 0.5,         // 冰弓：命中先冻结几秒
  ICE_SLOW: 0.5,           // 冰弓：冻完再半速几秒（连续命中要等上一轮走完才开新一轮）
};


/** 猫（2026-11-01 设定）：五种毛色纯外观、属性全一样；打死掉生肉，还有概率摸下一根丝线 */
export const CAT = {
  COLORS: 5,          // 毛色变体数（橙/黑/白/黄/橙黑花斑），生成概率均等
  SILK_CHANCE: 0.125, // 额外掉 1 根丝线的概率
  BREED_EVERY: 30,    // 成年猫每隔几秒生一只小猫（2026-11-01 设定：猫比别的动物勤快）
  NEAR_RADIUS: 10,    // 保底范围：玩家方圆几格内一只猫都没有就补刷
  SPAWN_NEAR: 4,      // 保底补刷在最近几格外（得落在 NEAR_RADIUS 里，不然刚生完又判定"没猫"）
  SPAWN_FAR: 9,       // 保底补刷在最远几格内
};


/** 狼之利爪（2026-11-01 设定）：腐败人掉狼星碎片，三个碎片加一个羊毛合成，戴着攻击翻倍 */
export const WOLF = {
  SHARD_CHANCE: 0.125, // 腐败人额外掉 1 个狼星碎片的概率
  DMG_MULT: 2,         // 戴上狼之利爪后的攻击倍率
};


/** 羊牛猪保底（2026-11-01 设定）：玩家方圆 10 格内一只都没有就补刷一只 */
export const NEAR_HOOFED = {
  RADIUS: 10,     // 判定范围（格）
  SPAWN_NEAR: 10, // 补刷离玩家最近几格
  SPAWN_FAR: 16,  // 补刷最远几格
};


/** 僵尸掉深绿颜料的概率（1/20） */
export const DEEPGREEN_DROP = 0.05;
