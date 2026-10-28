/** CS 大赛道具 — 手枪 / 弹药 / 闪光弹 / 手雷 / 步枪 / 毒药瓶 / AK47
 *
 *  纯数据。玻璃锥直接复用现有的（151），不另开 ID。
 *  这些都只在 CS 大赛里用：报名时背包被清空，比赛结束一律清除、带不出来。 */

import type { BlockDef } from './data';

export const PISTOL = 369;       // 手枪：开赛赠送，伤害 12、0.8 秒一发
export const AMMO = 370;         // 弹药：一包 16 发（买一次给 16 发）
export const FLASHBANG = 371;    // 闪光弹：炸开后范围内的人几秒内看不见
export const GRENADE = 372;      // 手雷：炸开有范围伤害
export const RIFLE = 373;        // 步枪：伤害 25、1.5 秒一发
export const TOXIC_BOTTLE = 374; // 毒药瓶：砸到身上扣 4 血
export const AK47 = 375;         // AK47：伤害 20、0.5 秒一发

/** 七样 CS 道具（玻璃锥复用 151）：赛后要一次性清掉，不能带出比赛 */
export const CS_ITEM_IDS = [PISTOL, AMMO, FLASHBANG, GRENADE, RIFLE, TOXIC_BOTTLE, AK47, 151];
/** 三把枪（手持它们按 P 才是开枪，不是挖方块） */
export const CS_GUN_IDS = [PISTOL, RIFLE, AK47];
/** 三个能扔出去的东西 */
export const CS_THROWN_IDS = [FLASHBANG, GRENADE, TOXIC_BOTTLE];

const itemDef = (cn: string, tex: string): BlockDef => ({
  cn, tex: { top: tex, side: tex }, solid: false, seeThrough: true, hardness: 0, item: true,
});

export const CS_BLOCKS: Record<number, BlockDef> = {
  [PISTOL]:       itemDef('手枪', 'cs_pistol'),
  [AMMO]:         itemDef('弹药', 'cs_ammo'),
  [FLASHBANG]:    itemDef('闪光弹', 'cs_flash'),
  [GRENADE]:      itemDef('手雷', 'cs_grenade'),
  [RIFLE]:        itemDef('步枪', 'cs_rifle'),
  [TOXIC_BOTTLE]: itemDef('毒药瓶', 'cs_toxic'),
  [AK47]:         itemDef('AK47', 'cs_ak47'),
};
