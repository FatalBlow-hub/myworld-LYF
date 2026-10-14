/** 能灯贴图 — 芒星碎片 + 三种能灯（玻璃罩子包着发光的灯芯） */

import type { Painter } from './Textures';

const TILE = 16;

/** 画一盏能灯：玻璃边框 + 中间发光的灯芯方块 */
const lamp = (core: string, coreHi: string, glow: string): Painter => (c, x, y) => {
  // 玻璃罩：浅灰边框 + 四角铆钉，看着像毛玻璃
  c.fillStyle = '#cfd8dc';
  c.fillRect(x, y, TILE, 1); c.fillRect(x, y + TILE - 1, TILE, 1);
  c.fillRect(x, y, 1, TILE); c.fillRect(x + TILE - 1, y, 1, TILE);
  c.fillStyle = '#9fb3ba';
  [[0, 0], [TILE - 1, 0], [0, TILE - 1], [TILE - 1, TILE - 1]].forEach(([px, py]) => c.fillRect(x + px, y + py, 1, 1));
  // 淡淡的光晕打底
  c.fillStyle = glow;
  c.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  // 灯芯：中心一块亮方块 + 白热核心
  c.fillStyle = core;
  c.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
  c.fillStyle = coreHi;
  c.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
};

export const LAMP_PAINTERS: Record<string, Painter> = {
  mang_shard: (c, x, y) => {
    // 芒星碎片：黄白色五角星（和青色星星碎片一个画法换色），中心白热
    const cx = x + 8, cy = y + 8;
    c.fillStyle = '#f0d040'; // 黄星芒
    c.fillRect(cx - 1, cy - 6, 2, 5);   // 上角
    c.fillRect(cx - 1, cy + 2, 2, 4);   // 下
    c.fillRect(cx - 6, cy - 1, 5, 2);   // 左角
    c.fillRect(cx + 2, cy - 1, 5, 2);   // 右角
    c.fillRect(cx - 3, cy + 2, 2, 3);   // 左下
    c.fillRect(cx + 1, cy + 2, 2, 3);   // 右下
    c.fillStyle = '#fff8dc'; // 白色星身
    c.fillRect(cx - 2, cy - 2, 4, 4);
    c.fillStyle = '#ffffff'; // 中心白热
    c.fillRect(cx - 1, cy - 1, 2, 2);
    // 周围散几颗黄色小光点
    c.fillStyle = '#f0d040';
    [[1, 3], [14, 2], [13, 13], [2, 12]].forEach(([px, py]) => {
      c.fillRect(x + px, y + py, 1, 1);
    });
  },
  mang_lamp:     lamp('#f0d040', '#fffbe0', '#f8f0c0'), // 芒能灯：淡黄光
  star_lamp:     lamp('#7fe8f8', '#e8fdff', '#d0f0f8'), // 星能灯：青白光
  hydrogen_lamp: lamp('#4ec85e', '#d8ffd8', '#c0e8c0'), // 氢能灯：绿光
};
