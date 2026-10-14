/** 黄金注册表 — 把黄金方块、颜料、背包和手册加入现有物品表 */

import {
  ALL_ITEMS, BLOCKS, COLOR_CSS, DYE_IDS, DYE_NEW,
  POTION_IDS, WAISTBAG_CAPACITY, WAISTBAG_IDS, WAISTBAG_TEXTURES,
} from './Block';
import {
  BAG_GOLD, DIY_GOLD_CHEM_DECOMP, DIY_GOLD_CRAFT_TABLE, DIY_GOLD_DYE_TABLE,
  DIY_GOLD_MANUAL, DIY_GOLD_PICKAXE, DYE_GOLD, GOLD_CHEM_DECOMP,
  GOLD_CRAFT_TABLE, GOLD_DYE_TABLE, GOLD_PICKAXE, ICE_MOLECULE, POTION_ICE,
} from './GoldenItems';

let registered = false;

export function registerGoldenContent(): void {
  if (registered) return;
  registered = true;
  const item = (cn: string, tex: string) => ({ cn, tex: { top: tex, side: tex }, solid: false, seeThrough: true, hardness: 0, item: true });
  const block = (cn: string, top: string, side = top) => ({ cn, tex: { top, side }, solid: true, seeThrough: false, hardness: 1.2 });

  BLOCKS[DYE_GOLD] = item('金色颜料', 'dye_gold');
  BLOCKS[BAG_GOLD] = item('金色腰包', 'bag_gold');
  BLOCKS[GOLD_CRAFT_TABLE] = block('黄金工作台', 'gold_workbench_top', 'gold_workbench_side');
  BLOCKS[GOLD_DYE_TABLE] = block('黄金地毯染色台', 'gold_dye_top', 'gold_dye_side');
  BLOCKS[GOLD_CHEM_DECOMP] = block('金色分解器', 'gold_chem_decomp');
  BLOCKS[ICE_MOLECULE] = item('冰分子', 'ice_molecule');
  BLOCKS[POTION_ICE] = item('寒冰瓶', 'potion_ice');
  BLOCKS[GOLD_PICKAXE] = item('金稿子', 'gold_pickaxe');
  BLOCKS[DIY_GOLD_MANUAL] = item('金色DIY手册', 'gold_manual');
  BLOCKS[DIY_GOLD_CRAFT_TABLE] = item('黄金工作台DIY手册', 'gold_manual');
  BLOCKS[DIY_GOLD_DYE_TABLE] = item('黄金地毯染色台DIY手册', 'gold_manual');
  BLOCKS[DIY_GOLD_CHEM_DECOMP] = item('金色分解器DIY手册', 'gold_manual');
  BLOCKS[DIY_GOLD_PICKAXE] = item('金稿子DIY手册', 'gold_manual');

  COLOR_CSS[DYE_GOLD] = '#e0aa00';
  DYE_IDS.push(DYE_GOLD);
  DYE_NEW.push(DYE_GOLD);
  WAISTBAG_CAPACITY[BAG_GOLD] = 10;
  WAISTBAG_IDS.push(BAG_GOLD);
  WAISTBAG_TEXTURES[BAG_GOLD] = 'bag_gold';
  POTION_IDS.push(POTION_ICE);
  ALL_ITEMS.push(
    DYE_GOLD, BAG_GOLD, GOLD_CRAFT_TABLE, GOLD_DYE_TABLE, GOLD_CHEM_DECOMP,
    ICE_MOLECULE, POTION_ICE, GOLD_PICKAXE, DIY_GOLD_MANUAL,
    DIY_GOLD_CRAFT_TABLE, DIY_GOLD_DYE_TABLE, DIY_GOLD_CHEM_DECOMP, DIY_GOLD_PICKAXE,
  );
}
