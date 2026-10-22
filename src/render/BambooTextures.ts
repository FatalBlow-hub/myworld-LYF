/**
 * 竹子贴图 — 程序化像素画，零外部素材
 *
 * 世界里的竹子是「细杆」形状（见 Shapes.ts 的 bamboo），杆子只占格子中心
 * 4/16 宽，所以：
 *   bamboo_side  杆的四张侧面：满格画（几何体本身已经很细，贴图不能再留透明）
 *   bamboo_top   杆顶截面：一圈竹壁 + 中间空芯
 *   bamboo_leaves 顶端一节的竹叶：交叉薄片用，只有上半格有叶子
 *   bamboo       物品栏图标：细竹竿剪影，透明底（方块正面的 tex.front 借给图标用）
 */

import { Painter, TILE, shade } from './TextureUtils';

/** 竹子配色：偏黄绿、偏暗，向 MC 原版靠，不用荧光绿 */
const POLE = '#7fa63c';
const POLE_LIGHT = shade(POLE, 32);
const POLE_DARK = shade(POLE, -36);
const NODE = '#47621f';
const NODE_LIGHT = '#a9cc6a';

const LEAF_MID = '#6d9c33';
const LEAF_DARK = shade(LEAF_MID, -40);

/** 拉一条斜向竹叶：从 (x0,y0) 到 (x1,y1)，叶根宽、叶尖收成一条线，右下方压一圈暗边 */
function blade(c: CanvasRenderingContext2D, ox: number, oy: number, x0: number, y0: number, x1: number, y1: number, rootW: number): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let pass = 0; pass < 2; pass++) {
    c.fillStyle = pass === 0 ? LEAF_DARK : LEAF_MID;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = Math.round(x0 + (x1 - x0) * t);
      const py = Math.round(y0 + (y1 - y0) * t);
      const wide = t < 0.4 ? rootW : t < 0.75 ? rootW - 1 : 1;
      c.fillRect(ox + px + (pass === 0 ? 1 : 0), oy + py, wide, 1);
    }
  }
}

/** 竹叶张开的五片：上面两片长叶斜挑出去，下面两片长叶下垂，中间一根朝上的尖 */
const BLADES: [number, number, number, number, number][] = [
  [8, 7, 1, 3, 3],
  [8, 7, 15, 3, 3],
  [7, 8, 2, 13, 2],
  [9, 8, 14, 13, 2],
  [8, 6, 8, 1, 2],
];

export const BAMBOO_PAINTERS: Record<string, Painter> = {
  // 杆的侧面：左亮右暗的圆柱分面 + 一道竹节环
  bamboo_side: (c, x, y) => {
    c.fillStyle = POLE; c.fillRect(x, y, TILE, TILE);
    c.fillStyle = POLE_LIGHT; c.fillRect(x, y, 5, TILE);
    c.fillStyle = POLE_DARK; c.fillRect(x + 11, y, 5, TILE);
    // 竖着的细纹，几何压缩后仍有颗粒感
    [[2, 3], [8, 5], [13, 2], [4, 12], [10, 14], [14, 10]].forEach(([sx, sy], i) => {
      c.fillStyle = i % 2 ? POLE_DARK : POLE_LIGHT;
      c.fillRect(x + sx, y + sy, 1, 2);
    });
    // 竹节：一道深色环 + 下沿高光，像一节套一节
    c.fillStyle = NODE; c.fillRect(x, y + 7, TILE, 2);
    c.fillStyle = NODE_LIGHT; c.fillRect(x, y + 9, TILE, 1);
  },
  // 杆顶截面：外圈竹壁、内圈空芯
  bamboo_top: (c, x, y) => {
    c.fillStyle = POLE; c.fillRect(x, y, TILE, TILE);
    c.fillStyle = POLE_DARK;
    c.fillRect(x, y, TILE, 2); c.fillRect(x, y + TILE - 2, TILE, 2);
    c.fillRect(x, y, 2, TILE); c.fillRect(x + TILE - 2, y, 2, TILE);
    c.fillStyle = POLE_LIGHT; c.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
    c.fillStyle = shade(POLE, -12); c.fillRect(x + 6, y + 6, 4, 4);
  },
  // 顶端一节的竹叶：只有上半格有叶子，下半格留空让杆子露出来
  bamboo_leaves: (c, x, y) => {
    for (const [x0, y0, x1, y1, w] of BLADES) blade(c, x, y, x0, y0, x1, y1, w);
    c.fillStyle = NODE_LIGHT; c.fillRect(x + 7, y + 9, 2, 1); // 叶柄接杆处
  },
  // 物品图标：一根立着的细竹竿，透明底
  bamboo: (c, x, y) => {
    c.fillStyle = POLE; c.fillRect(x + 6, y + 1, 4, 14);
    c.fillStyle = POLE_LIGHT; c.fillRect(x + 6, y + 1, 1, 14);
    c.fillStyle = POLE_DARK; c.fillRect(x + 9, y + 1, 1, 14);
    for (const ny of [5, 10]) {
      c.fillStyle = NODE; c.fillRect(x + 5, y + ny, 6, 1);        // 节环
      c.fillStyle = NODE_LIGHT; c.fillRect(x + 5, y + ny + 1, 6, 1); // 节下高光
    }
    c.fillStyle = POLE_DARK; c.fillRect(x + 7, y + 15, 2, 1);      // 竿底切口
  },
  // 竹笋：贴着地面冒出来的小尖笋
  bamboo_shoot: (c, x, y) => {
    c.fillStyle = '#7ab04a'; c.fillRect(x + 6, y + 7, 4, 7);
    c.fillStyle = '#96c766'; c.fillRect(x + 7, y + 4, 2, 6);
    c.fillStyle = '#5c8c34'; c.fillRect(x + 5, y + 12, 6, 2);
  },
};
