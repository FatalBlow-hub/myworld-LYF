/** DIY 手册条目表 — 每条"制作方法"的文字 + 卡片信息（图标/材料/分类/季节标记）
 *
 *  从 Recipes.ts 拆出来：那边只管配方数据，这边管手册怎么讲、卡片怎么摆。
 *  追加新条目一律放在 list.push 末尾，别打乱存档里学会的条目编号。 */

import {
  BAG_WOOL, BED_IDS, BLOCKS, CARPET_STAR, CARROT_SEED,
  CHEM_DECOMP, COAL_CHUNK, COAL_DUST, COAL_FIRESTARTER, COBBLE, COBBLE_SHARD,
  DYE_DEEPGREEN, GLASS, GLASS_BOTTLE, GLASS_BUCKET, GLASS_CONE, GS_BUCKET_MID, HYDROGEN,
  HYDROGEN_FIRESTARTER, IRON_NUGGET, MANG_FIRESTARTER, MANG_SHARD, MELON, MELON_SLICE,
  POTION_BREATH, POTION_DEADLY, POTION_PHANTOM, POTION_POISON, PUMPKIN, PUMPKIN_SLICE,
  RAW_MEAT, RICE_SEED, ROLLER_SKATES, ROPE, RUBBER, FOOD_TABLE, SOUL_DYE, SOUL_FIRESTARTER,
  STAR_DYE_TABLE, STAR_FIRESTARTER, STAR_SHARD, STAR_WOOL, STICK, SWAMP_DEEP, SWAMP_LIGHT,
  SWAMP_MID, SWAMP_PHANTOM, SWORD_WOOD, TANK, TANK_BULLET, WATER_BUCKET, WOOD,
  WOOL_IDS, WOOL_WHITE,
} from '../blocks/data';
import { WHITE_RADISH } from '../economy/radish';
import { RECIPES, SMELT, UNCRAFT } from './Recipes';
import { catOf, festOf, TutorialCat, FestTag } from './manualCats';

/** DIY 手册里能学到的所有"制作方法"：合成 + 拆解 + 熔炉烧制 + 小知识，写成一行中文说明 */
export interface Tutorial {
  /** 一句话配方，比如 "木板×4 → 工作台×1" */
  text: string;
  /** 卡片上画的物品图标（block id；小知识没有就不画） */
  icon?: number;
  /** 材料清单：材料齐了卡片角落会亮绿色对勾 */
  needs?: [number, number][];
  /** 分到哪一页 Tab（默认其他） */
  cat?: TutorialCat;
  /** 季节标记：snow=雪花（冬天）、pumpkin=南瓜（秋天） */
  fest?: FestTag;
}

export const TUTORIALS: Tutorial[] = (() => {
  const name = (id: number) => BLOCKS[id].cn;
  const list: Tutorial[] = [];
  const swampEntries: Tutorial[] = [];
  const swampRecipes = new Set([GLASS, GLASS_CONE, GLASS_BOTTLE, GLASS_BUCKET, POTION_POISON, POTION_PHANTOM, POTION_DEADLY, POTION_BREATH, DYE_DEEPGREEN]);
  const swampUncraft = new Set([GLASS, SWAMP_LIGHT, SWAMP_PHANTOM, SWAMP_DEEP]);
  const islandUncraft = new Set([PUMPKIN, PUMPKIN_SLICE, MELON, MELON_SLICE]);
  for (const r of RECIPES) {
    // 7 种床的配方只差地毯颜色，合成一条讲清楚，不然手册里看着像重复
    if (BED_IDS.includes(r.out) || r.quiet) continue;
    const needs = r.needs.map(([id, n]) => `${name(id)}×${n}`).join(' + ');
    // 材料种类超过 4 种的，2×2 小格子摆不下，得用工作台开 3×3 大合成台
    // 美食配方只能放在美食工作台上做（2026-10-28 起）
    const big = r.bench === 'food' ? '（要美食工作台）' : r.needs.length > 4 ? '（要 3×3 大合成台）' : '';
    const batch = r.scale ? '（放几个出几个）' : '';
    (swampRecipes.has(r.out) ? swampEntries : list).push({
      text: `合成：${needs} → ${name(r.out)}×${r.outCount}${big}${batch}`,
      icon: r.out, needs: r.needs, cat: catOf(r.out), fest: festOf(r.needs),
    });
  }
  list.push({ text: `合成：${name(WOOD)}×3 + 地毯×1 → 床×1（地毯什么颜色，床就什么颜色）`, icon: BED_IDS[0], cat: 'build' });
  for (const [id, gives] of Object.entries(UNCRAFT)) {
    // 8 种彩色羊毛的拆法也一样，只差颜色，合并成一条
    if (WOOL_IDS.includes(Number(id)) || islandUncraft.has(Number(id))) continue;
    const outs = gives.map(([g, n]) => `${name(g)}×${n}`).join(' + ');
    (swampUncraft.has(Number(id)) ? swampEntries : list).push({
      text: `拆解：${name(Number(id))} → ${outs}`, icon: Number(id), cat: catOf(Number(id)),
    });
  }
  list.push({ text: `拆解：彩色羊毛 → ${name(WOOL_WHITE)}×1 + 同色颜料×1`, icon: WOOL_WHITE, cat: 'build' });
  // 隐藏配方预告：告诉玩家集齐手册有奖励，才有动力全收集
  list.push({ text: '秘方：手册集齐后，拿一整摞（64 个）生肉按 M → 铁粒×3', icon: IRON_NUGGET, needs: [[RAW_MEAT, 64]], cat: 'small' });
  for (const [id, out] of Object.entries(SMELT)) {
    list.push({ text: `熔炉：${name(Number(id))} → ${name(out)}`, icon: Number(out), needs: [[Number(id), 1]], cat: catOf(Number(out)) });
  }
  // 拆解器不是合成用的：拿水桶对它按 M，电解出一瓶氢气（加在最后，别打乱存档里的方法顺序号）
  list.push({ text: `使用：拿水桶对 ${name(CHEM_DECOMP)} 按 M → ${name(HYDROGEN)}×1`, icon: HYDROGEN, cat: 'small' });
  list.push({ text: `掉落：砍树有 60% 概率掉 1~2 个${name(RUBBER)}，做轮子用`, icon: RUBBER, cat: 'misc' });
  list.push({ text: `使用：拿着${name(TANK_BULLET)}对坦克按 L 装弹（开着车也行），按 P 开炮`, icon: TANK, cat: 'equip' });
  list.push({ text: `星空染色台：能染${name(CARPET_STAR)}，还能把颜料融合成新颜色（红+黄=橙、蓝+白+粉=星空色……）`, icon: STAR_DYE_TABLE, cat: 'build' });
  list.push({ text: `合成：${name(STAR_SHARD)}×1 + 任意羊毛×1 → ${name(STAR_WOOL)}×1`, icon: STAR_WOOL, cat: 'build' }); // 加在最后，别打乱存档里的方法顺序号
  list.push({ text: `使用：挑战房要 5×5 平地 + 上面全空才能放；对门按 M 交 10 生肉打 4 关，中途不许出来`, cat: 'misc' });
  // 种地两条：加在最后，别打乱存档里的方法顺序号
  list.push({ text: `使用：拿着稻粒对水按 L 种水稻，半天长一截；黄了挖掉收 5~10 粒，吃一粒回半颗心`, icon: RICE_SEED, cat: 'food' });
  list.push({ text: `使用：拿着胡萝卜对草地或泥土按 L 种地里；叶子底下露橙尖尖就是熟了，挖掉收 1~3 根，吃一根回 1 颗心`, icon: CARROT_SEED, cat: 'food' });
  list.push({ text: `掉落：打鸟掉生肉和羽毛——普通鸟掉 1~2 肉、虎皮鹦鹉掉 2 肉，一半概率掉同色羽毛；乌鸦必掉 1 肉 + 1 黑羽毛`, cat: 'misc' });
  list.push({ text: `使用：拿铁桶或玻璃瓶对水按 P 盛一格水，铁桶最多装 3 格、玻璃瓶只能装 1 格（数字就是水量）；对地面按 L 倒出一格`, icon: WATER_BUCKET, cat: 'small' });
  list.push({ text: `矿石：地下石头层约 5% 会生成煤矿，挖煤矿掉 1 个煤块；煤块能做煤条（3个合1）、煤炭（2个合1）和煤粉（1个拆3），做熔炉要用煤粉`, icon: COAL_CHUNK, cat: 'misc' });
  list.push({ text: `掉落：睡醒只掉1颗碎片，${name(STAR_SHARD)}和${name(MANG_SHARD)}各有1/2概率，分别能做星能灯/芒能灯`, icon: STAR_SHARD, cat: 'misc' });
  // —— 沼泽系列：加在最后，别打乱存档里的方法顺序号 ——
  swampEntries.push({ text: '拆解：把装满液体的桶或瓶放进合成格，得到空容器和里面全部液体；一次拆一个，背包要留空位', icon: GLASS_BUCKET, cat: 'small' });
  swampEntries.push({ text: `地形：草地上有圆形沼泽，越往中间越毒——淡沼泽液、沼泽液、幻泽液、深泽液、溺泽液`, icon: SWAMP_MID, cat: 'misc' });
  swampEntries.push({ text: `使用：拿铁桶、玻璃桶或玻璃瓶对泽液按 P 盛一格，桶最多 3 格、瓶只能 1 格，同一种才能混装；对地面按 L 倒出`, icon: GS_BUCKET_MID, cat: 'small' });
  swampEntries.push({ text: `掉落：打僵尸有 1/20 概率掉${name(DYE_DEEPGREEN)}，黑颜料+绿颜料也能融出来`, icon: DYE_DEEPGREEN, cat: 'misc' });
  swampEntries.push({ text: `使用：药水瓶按 E 喝、按 P 扔——毒药瓶每3秒扣1血共15秒，剧毒瓶每2秒扣2血共14秒；幻药瓶让怪减速一半、每5秒扣1血共15秒，自己喝幻觉6秒；防溺瓶水下呼吸60秒`, icon: POTION_POISON, cat: 'small' });
  swampEntries.push({ text: `使用：${name(GLASS_CONE)}是小刀，攻击是拳头的 1.5 倍，但用一次有 2/3 概率碎掉`, icon: GLASS_CONE, cat: 'equip' });
  list.push({ text: `装备：${name(ROLLER_SKATES)}放背包左边最下面那个格子穿上，走路变 1.5 倍快；连滑 10 秒会摔一跤，耐久显示还能摔几次，摔 3 次鞋就烂了`, icon: ROLLER_SKATES, cat: 'equip' });
  // 打火石做法追加在最后，避免打乱以前学会的方法编号
  list.push({ text: `合成：${name(COBBLE)}×1 → ${name(COBBLE_SHARD)}×2`, icon: COBBLE_SHARD, needs: [[COBBLE, 1]], cat: 'small' });
  list.push({ text: `合成：${name(COBBLE_SHARD)}×2 + ${name(COAL_DUST)}×1 → ${name(COAL_FIRESTARTER)}×1`, icon: COAL_FIRESTARTER, needs: [[COBBLE_SHARD, 2], [COAL_DUST, 1]], cat: 'equip' });
  list.push({ text: `合成：${name(COBBLE_SHARD)}×2 + ${name(MANG_SHARD)}×1 → ${name(MANG_FIRESTARTER)}×1`, icon: MANG_FIRESTARTER, needs: [[COBBLE_SHARD, 2], [MANG_SHARD, 1]], cat: 'equip' });
  list.push({ text: `合成：${name(COBBLE_SHARD)}×2 + ${name(STAR_SHARD)}×1 → ${name(STAR_FIRESTARTER)}×1`, icon: STAR_FIRESTARTER, needs: [[COBBLE_SHARD, 2], [STAR_SHARD, 1]], cat: 'equip' });
  list.push({ text: `合成：${name(COAL_FIRESTARTER)}×1 + ${name(SOUL_DYE)}×1 → ${name(SOUL_FIRESTARTER)}×1`, icon: SOUL_FIRESTARTER, needs: [[COAL_FIRESTARTER, 1], [SOUL_DYE, 1]], cat: 'equip' });
  list.push({ text: `合成：${name(COBBLE)}×2 + ${name(HYDROGEN)}×1 → ${name(HYDROGEN_FIRESTARTER)}×1`, icon: HYDROGEN_FIRESTARTER, needs: [[COBBLE, 2], [HYDROGEN, 1]], cat: 'equip' });
  list.push({ text: `使用：拿任意打火石对着方块按 L 点火；普通红火烧10秒，灵火蓝火烧15秒，不会蔓延，打火石不消耗`, icon: COAL_FIRESTARTER, cat: 'equip' });
  // 剑的说明追加在最后，别打乱以前学会的方法编号
  list.push({ text: `战斗：剑都是「材料×2 + ${name(STICK)}×1」合成的——木剑1.5倍拳、铁/雪花/血剑2倍、金剑2.5倍、钻石剑3倍；砍一刀磨1点耐久，用完剑断。雪花剑能把怪冻慢1秒，血腥之剑偶尔砍出4倍暴击`, icon: SWORD_WOOD, cat: 'equip' });
  // 腰包做法追加在最后，别打乱以前学会的方法编号
  list.push({ text: `装备：${name(WOOL_WHITE)}×4 + ${name(STICK)}×1 → ${name(BAG_WOOL)}（8格，穿在装备栏第二格；光放羊毛会变成地毯，记得加根木棍当包带）；羊毛腰包 + 任意颜料×1 染成同颜色的腰包，+ 玻璃/杂草/树叶/竹子/白羽毛/橡胶/芒星碎片/星星碎片 包出对应材质的腰包`, icon: BAG_WOOL, needs: [[WOOL_WHITE, 4], [STICK, 1]], cat: 'equip' });
  // 白萝卜炒股追加在最后，别打乱以前学会的方法编号
  list.push({ text: `使用：黑色售卖机每周一卖白萝卜（进货价每个人 4~10 随机）；买回来盯着每天的回收价（每个人 2~12 随机），哪天高了全部卖出赚差价——到了下周一还没卖，萝卜会全烂掉`, icon: WHITE_RADISH, cat: 'misc' });
  // 绳索与美食工作台追加在最后，别打乱以前学会的方法编号
  list.push({ text: `使用：拿着${name(ROPE)}对准牛/猪/羊/鸟按 M 拴住，动物会跟着你走；再按 M 一次就放开（蒲公英驯服那套不受影响）`, icon: ROPE, cat: 'small' });
  list.push({ text: `使用：${name(FOOD_TABLE)}是独立的功能台——只能做美食配方，普通工作台做不了美食；它也做不了道具配方。只在自由岛能用，带不进大赛`, icon: FOOD_TABLE, cat: 'build' });
  // 兜底：说明文字一模一样的只留一条
  return [...new Map([...list, ...swampEntries].map((t) => [t.text, t])).values()];
})();
