/** 灵魂蓝传送门 — 检测灵魂蓝木板围出的竖直门框，点火后把内腔填成传送门方块
 *
 *  用法：灵魂打火石对着门框内腔/门框点火 → ignitePortal() 两个方向各试一次，
 *  找到合法门框就填上 SOUL_PORTAL。内腔尺寸见 config.PORTAL（2×3 ~ 8×12）。 */

import { AIR, SOUL_PLANKS, SOUL_PORTAL } from '../blocks/Block';
import type { World } from '../World';
import { PORTAL } from '../../config';

/** 内腔算"空"的方块：空气或已点燃的传送门（重燃旧门框也认得出来） */
const isOpen = (id: number): boolean => id === AIR || id === SOUL_PORTAL;

/** 尝试把 (x,y,z) 当成某扇门框的内腔点燃；成功返回 true */
export function ignitePortal(world: World, x: number, y: number, z: number): boolean {
  if (!isOpen(world.getBlock(x, y, z))) return false;
  // 门面可以沿 x 轴铺（面朝 z），也可以沿 z 轴铺（面朝 x），两个方向都试
  for (const axis of ['x', 'z'] as const) {
    if (tryAxis(world, x, y, z, axis)) return true;
  }
  return false;
}

/** 沿指定水平轴扫内腔并验证四边门框，合法则填传送门方块 */
function tryAxis(world: World, x: number, y: number, z: number, axis: 'x' | 'z'): boolean {
  /** 门面坐标 → 世界坐标取方块 */
  const at = (a: number, yy: number): number =>
    axis === 'x' ? world.getBlock(a, yy, z) : world.getBlock(x, yy, a);
  const start = axis === 'x' ? x : z;

  // 横向：从点火格往两边扫空气，扫到非空方块为止；带 MAX_W 上限防止扫穿未生成区块
  let lo = start, hi = start;
  while (lo > start - PORTAL.MAX_W && isOpen(at(lo - 1, y))) lo--;
  while (hi < start + PORTAL.MAX_W && isOpen(at(hi + 1, y))) hi++;
  const w = hi - lo + 1;
  if (w < PORTAL.MIN_W || w > PORTAL.MAX_W) return false;

  // 竖向：在点火这一列上下扫空气定内腔高度（内腔是矩形，每列同高）
  let loY = y, hiY = y;
  while (loY > y - PORTAL.MAX_H && isOpen(at(start, loY - 1))) loY--;
  while (hiY < y + PORTAL.MAX_H && isOpen(at(start, hiY + 1))) hiY++;
  const h = hiY - loY + 1;
  if (h < PORTAL.MIN_H || h > PORTAL.MAX_H) return false;

  // 四边验证：左右两柱（内腔高度）+ 上下两行（含两个角），必须全是灵魂蓝木板
  const frameOk = (a0: number, a1: number, y0: number, y1: number): boolean => {
    for (let a = a0; a <= a1; a++) {
      for (let yy = y0; yy <= y1; yy++) {
        if (at(a, yy) !== SOUL_PLANKS) return false;
      }
    }
    return true;
  };
  if (!frameOk(lo - 1, lo - 1, loY, hiY)) return false;          // 左柱
  if (!frameOk(hi + 1, hi + 1, loY, hiY)) return false;          // 右柱
  if (!frameOk(lo - 1, hi + 1, loY - 1, loY - 1)) return false;  // 底行（含角）
  if (!frameOk(lo - 1, hi + 1, hiY + 1, hiY + 1)) return false;  // 顶行（含角）

  // 点燃：内腔全部填成传送门方块（重燃时本来就是 SOUL_PORTAL，填了也没事）
  for (let a = lo; a <= hi; a++) {
    for (let yy = loY; yy <= hiY; yy++) {
      if (axis === 'x') world.setBlock(a, yy, z, SOUL_PORTAL);
      else world.setBlock(x, yy, a, SOUL_PORTAL);
    }
  }
  return true;
}
