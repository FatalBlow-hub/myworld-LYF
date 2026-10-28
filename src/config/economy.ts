/** 全局配置 — 经济：售卖机/黑色木镐/白萝卜/收购箱价目表（2026-10-29 从 config.ts 拆出） */

/** 商店：售卖机买价与收购箱规则（单位：岛币，可以带小数） */
export const SHOP = {
  EGG_PRICE: 20,        // 特殊物品售卖机：小战士召唤蛋买价
  EGG_SELL: 10,         // 收购箱：还没孵化的蛋（三档同价）
  EGG_ROLL: [0.8, 0.19, 0.01] as const, // 买蛋抽品质概率：普通 / 高级 / 绝世
  DRINK_SELL_MULT: 0.5, // 收购箱收饮料 = 买价 × 0.5
  /** 杂货铺限量：每个账号每天对每种基础货只能买 1 个（独立模块见 world/shopLimits.ts） */
  STORE_STOCK: 1,
  /** 黑色售卖机（2026-10-24 设定）：每天三选一，黑色木镐 / 黑颜料(4) / 小战士弓(25) */
  BLACK_PICKAXE_PRICE: 10, // 黑色木镐：挖 30 块 ×1.75 速（设定没给价，先定 10，要改动这里）
  BLACK_DYE_PRICE: 4,      // 黑颜料
  BLACK_BOW_PRICE: 25,     // 小战士弓三形态同价
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


/** 白萝卜价格（2026-10-29 设定）：周一黑色售卖机进货价 4~10 岛币随机，
 *  每天回收价 2~12 岛币随机；都按「账号名 + 日期」当种子摇，同一个人同一天固定；
 *  下周一还没卖 → 全部烂掉 */
export const RADISH = {
  BUY_MIN: 4,
  BUY_MAX: 10,
  SELL_MIN: 2,
  SELL_MAX: 12,
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
  // —— 2026-10-28 美食 DIY 的料理（面粉/面团是加工食材，不收）——
  378: { coins: 4, per: 1 },  // 生菌汤
  379: { coins: 3, per: 1 },  // 火腿
  381: { coins: 2, per: 1 },  // 法式面包棍
  382: { coins: 7, per: 1 },  // 法式三明治
  383: { coins: 4, per: 1 },  // 南瓜饼
  384: { coins: 8, per: 1 },  // 河豚汤
  385: { coins: 5, per: 1 },  // 煎小丑鱼
  386: { coins: 9, per: 1 },  // 炖鲑鱼
  387: { coins: 6, per: 1 },  // 炸鳕鱼排
  388: { coins: 5, per: 1 },  // 肉夹馍
  389: { coins: 6, per: 1 },  // 竹筒饭
  390: { coins: 2, per: 1 },  // 胡萝卜肉饺（单个）
  391: { coins: 7, per: 1 },  // 胡萝卜蛋糕
  392: { coins: 3, per: 1 },  // 胡萝卜炒蘑菇
  // —— 2026-10-29 新价目：最便宜的基础料 + 三种泽液瓶（淡沼泽液不在价目表，收不了）——
  2:   { coins: 0.02, per: 1 },  // 泥土
  4:   { coins: 0.02, per: 1 },  // 沙子
  31:  { coins: 0.02, per: 1 },  // 雪块
  172: { coins: 0.05, per: 1 },  // 煤粉
  332: { coins: 3, per: 1 },     // 玻璃瓶(沼泽液)
  333: { coins: 3, per: 1 },     // 玻璃瓶(幻泽液)
  335: { coins: 3, per: 1 },     // 玻璃瓶(溺泽液)
};


/** 黑色木镐：挖满 30 个方块就坏，挖速是徒手的 1.75 倍 */
export const BLACK_PICK = {
  USES: 30,
  SPEED: 1.75,
};
