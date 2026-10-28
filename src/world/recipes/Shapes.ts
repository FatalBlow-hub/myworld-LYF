/** 方块形状 — 异形方块（台阶/楼梯/栅栏/箱子/告示牌/门）的碰撞盒和渲染盒；花草（cross）是薄片没有盒子，由网格化器单独画 */

import { BLOCKS } from '../blocks/Block';

/** 一个盒子：[x0, y0, z0, x1, y1, z1]，坐标是格子内的 0~1 */
export type Box = [number, number, number, number, number, number];

const FULL: Box[] = [[0, 0, 0, 1, 1, 1]];
const SLAB: Box[] = [[0, 0, 0, 1, 0.5, 1]];
/** 楼梯 = 下半块 + 上半块（上半朝 -z，靠 meta 旋转到玩家朝向） */
const STAIR: Box[] = [[0, 0, 0, 1, 0.5, 1], [0, 0.5, 0, 1, 1, 0.5]];
const FENCE_POST: Box[] = [[0.375, 0, 0.375, 0.625, 1, 0.625]];
/** 竹子：细杆只占格子中心 3/16，四周全是空气（顶上两节另由网格化器补竹叶） */
const BAMBOO_HALF = 1.5 / 16;
const BAMBOO_COLUMN: Box[] = [
  [0.5 - BAMBOO_HALF, 0, 0.5 - BAMBOO_HALF, 0.5 + BAMBOO_HALF, 1, 0.5 + BAMBOO_HALF],
];
/** 竹节箍：比杆子粗一点点（4/16 对 3/16），位置对齐贴图上的竹节；由网格化器单独画，碰撞盒不算它 */
export const BAMBOO_NODE_RING: Box = [0.375, 0.4375, 0.375, 0.625, 0.5625, 0.625];
const FENCE_SOLID: Box[] = [[0.375, 0, 0.375, 0.625, 1.5, 0.625]]; // 碰撞 1.5 高，跳不过去
const CHEST_BOX: Box[] = [[0.0625, 0, 0.0625, 0.9375, 0.875, 0.9375]];
const SIGN_POLE: Box[] = [[0.4375, 0, 0.4375, 0.5625, 0.5, 0.5625]];
const SIGN_BOARD: Box = [0.0625, 0.5, 0.4375, 0.9375, 0.95, 0.5625];
const DOOR_PANEL: Box[] = [[0, 0, 0, 0.125, 1, 1]];
const CARPET_BOX: Box[] = [[0, 0, 0, 1, 0.0625, 1]]; // 地毯：铺满格底的 1/16 薄片
const BED_BOX: Box[] = [[0, 0, 0, 1, 0.3, 1]]; // 床：矮矮的一块，抬脚就能迈上去
/** 梯子：贴在 -z 墙上的薄板（meta 转到玩家放它时面对的那面墙） */
const LADDER_BOX: Box[] = [[0.125, 0, 0, 0.875, 1, 0.0625]];
/** 喷泉的石头部分：以格子为中心伸出 2×2，底座池沿 + 圆锥柱 + 顶层小池（坐标超出 0~1 是有意的） */
const FOUNTAIN_STONE: Box[] = [
  [-0.5, 0, -0.5, 1.5, 0.1, 1.5],          // 大池底
  [-0.5, 0.1, -0.5, 1.5, 0.42, -0.36],     // 池沿四面
  [-0.5, 0.1, 1.36, 1.5, 0.42, 1.5],
  [-0.5, 0.1, -0.36, -0.36, 0.42, 1.36],
  [1.36, 0.1, -0.36, 1.5, 0.42, 1.36],
  [0.3, 0.42, 0.3, 0.7, 0.8, 0.7],         // 圆锥柱：下粗上细
  [0.36, 0.8, 0.36, 0.64, 1.15, 0.64],
  [0.42, 1.15, 0.42, 0.58, 1.5, 0.58],
  [0.18, 1.5, 0.18, 0.82, 1.6, 0.82],      // 顶层小池底
  [0.18, 1.6, 0.18, 0.82, 1.72, 0.24],     // 小池沿四面
  [0.18, 1.6, 0.76, 0.82, 1.72, 0.82],
  [0.18, 1.6, 0.24, 0.24, 1.72, 0.76],
  [0.76, 1.6, 0.24, 0.82, 1.72, 0.76],
  [0.44, 1.72, 0.44, 0.56, 1.95, 0.56],    // 顶上小水嘴
];
/** 喷泉的水面：画到半透明层，薄薄一层贴着池子内壁 */
export const FOUNTAIN_WATER: Box[] = [
  [-0.36, 0.32, -0.36, 1.36, 0.36, 1.36],  // 大池的水
  [0.24, 1.62, 0.24, 0.76, 1.66, 0.76],    // 小池的水
];

/** meta → 朝向向量：0=-z 1=+x 2=+z 3=-x（顺时针转） */
export const META_DIRS: [number, number, number][] = [
  [0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0],
];

/** 玩家朝向 → meta（脸朝的方向） */
export function metaFromYaw(yaw: number): number {
  return ((Math.round(-yaw / (Math.PI / 2)) % 4) + 4) % 4;
}

/** 盒子绕格子中心水平旋转 rot 个 90°（让 -z 方向转到 META_DIRS[rot]） */
function rotateBox(b: Box, rot: number): Box {
  let [x0, y0, z0, x1, y1, z1] = b;
  for (let i = 0; i < rot % 4; i++) {
    const nx0 = 1 - z1, nz0 = x0, nx1 = 1 - z0, nz1 = x1;
    x0 = Math.min(nx0, nx1); x1 = Math.max(nx0, nx1);
    z0 = Math.min(nz0, nz1); z1 = Math.max(nz0, nz1);
  }
  return [x0, y0, z0, x1, y1, z1];
}

/** 碰撞盒：玩家和动物撞不撞得上按这些算 */
export function solidBoxes(id: number, meta: number): Box[] {
  const def = BLOCKS[id];
  if (!def?.solid) return [];
  switch (def.shape) {
    case 'slab': return SLAB;
    case 'stairs': return STAIR.map((b) => rotateBox(b, meta));
    case 'fence': return FENCE_SOLID;
    case 'chest': return CHEST_BOX;
    case 'carpet': return CARPET_BOX;
    case 'bed': return BED_BOX;
    case 'bamboo': return BAMBOO_COLUMN;
    default: return def.doorPanel ? [] : FULL;
  }
}

/** 渲染盒：画出来什么样（栅栏的连接杆由网格化器看邻居后追加） */
export function renderBoxes(id: number, meta: number): Box[] {
  const def = BLOCKS[id];
  switch (def?.shape) {
    case 'slab': return SLAB;
    case 'stairs': return STAIR.map((b) => rotateBox(b, meta));
    case 'fence': return FENCE_POST;
    case 'chest': return CHEST_BOX;
    case 'carpet': return CARPET_BOX;
    case 'bed': return BED_BOX;
    case 'ladder': return LADDER_BOX.map((b) => rotateBox(b, meta));
    case 'fountain': return FOUNTAIN_STONE;
    case 'sign': return [...SIGN_POLE, rotateBox(SIGN_BOARD, meta)];
    case 'cross': return [];
    case 'bamboo': return BAMBOO_COLUMN;
    default: return def?.doorPanel ? DOOR_PANEL : FULL;
  }
}
