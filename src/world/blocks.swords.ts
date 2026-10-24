/** 六把剑 — 物品定义和战斗属性（不能放地上，纯武器；耐久按"还能砍几刀"记）

 *  配方都是「材料×2 + 木棍×1」：木板→木剑、铁粒→铁剑、金粒→金剑、
 *  蓝钻石→钻石剑、雪花→雪花剑、血尸肉→血腥之剑。 */

import { SWORDS } from '../config';
import type { BlockDef } from './blocks.data';

// 剑的物品 ID（只进背包不进世界，编号不用挤 255 以内）
export const SWORD_WOOD = 320;
export const SWORD_IRON = 321;
export const SWORD_GOLD = 322;
export const SWORD_DIAMOND = 323;
export const SWORD_SNOW = 324;
export const SWORD_BLOOD = 325;

export const SWORD_IDS = [SWORD_WOOD, SWORD_IRON, SWORD_GOLD, SWORD_DIAMOND, SWORD_SNOW, SWORD_BLOOD];

/** 一把剑的属性：攻击力是拳头几倍、能砍几刀；雪花剑带减速秒数、血剑带暴击概率和倍率 */
export interface SwordSpec {
  readonly mult: number;
  readonly uses: number;
  readonly slowSeconds?: number;
  readonly critChance?: number;
  readonly critMult?: number;
}

/** 剑 ID → 属性（数值全在 config.SWORDS，改手感只动那里） */
export const SWORD_OF: Record<number, SwordSpec> = {
  [SWORD_WOOD]:    SWORDS.WOOD,
  [SWORD_IRON]:    SWORDS.IRON,
  [SWORD_GOLD]:    SWORDS.GOLD,
  [SWORD_DIAMOND]: SWORDS.DIAMOND,
  [SWORD_SNOW]:    SWORDS.SNOW,
  [SWORD_BLOOD]:   SWORDS.BLOOD,
};

const swordDef = (cn: string, tex: string): BlockDef => ({
  cn, tex: { top: tex, side: tex }, solid: false, seeThrough: true, hardness: 0, item: true,
});

export const SWORD_BLOCKS: Record<number, BlockDef> = {
  [SWORD_WOOD]:    swordDef('木剑',     'sword_wood'),
  [SWORD_IRON]:    swordDef('铁剑',     'sword_iron'),
  [SWORD_GOLD]:    swordDef('金剑',     'sword_gold'),
  [SWORD_DIAMOND]: swordDef('钻石剑',   'sword_diamond'),
  [SWORD_SNOW]:    swordDef('雪花剑',   'sword_snow'),
  [SWORD_BLOOD]:   swordDef('血腥之剑', 'sword_blood'),
};
