/** 羽毛贴图 — 六种颜色的羽毛共用一个画法：白色羽轴 + 本色羽片，只是换颜色 */

import type { Painter } from './Textures';

/** 一根斜羽毛：白色羽轴 + 彩色羽片（左边深色右边亮色） */
const feather = (main: string, dark: string, lite: string): Painter => (c, x, y) => {
  // 羽轴：从右上到左下的白线
  for (let i = 0; i < 12; i++) {
    c.fillStyle = '#f5f5f5';
    c.fillRect(x + 12 - i, y + 1 + i, 1, 1);
  }
  // 羽片：羽轴两边的小点，上半段密、下半段稀
  const vane: [number, number][] = [
    [10, 1], [11, 2], [9, 2],
    [10, 3], [8, 3], [9, 4], [7, 4],
    [8, 5], [6, 5], [7, 6], [5, 6],
    [6, 7], [4, 7], [5, 8], [3, 8],
    [4, 9], [2, 9], [3, 10], [2, 11],
  ];
  vane.forEach(([vx, vy], i) => {
    c.fillStyle = i % 3 === 0 ? dark : i % 3 === 1 ? main : lite;
    c.fillRect(x + vx, y + vy, 1, 1);
  });
};

export const FEATHER_PAINTERS: Record<string, Painter> = {
  feather_white:  feather('#e8e8e8', '#c8c8c8', '#fafafa'),
  feather_gray:   feather('#9a9a9a', '#6e6e6e', '#b8b8b8'),
  feather_green:  feather('#4ea83e', '#35702a', '#6ec85e'),
  feather_blue:   feather('#4a80b8', '#2e5a8a', '#6aa8d8'),
  feather_yellow: feather('#e0cc3a', '#b09a24', '#f2e26a'),
  feather_black:  feather('#2a2a2a', '#121212', '#484848'),
};
