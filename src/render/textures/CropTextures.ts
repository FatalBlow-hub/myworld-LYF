/** 庄稼贴图 — 胡萝卜四个生长阶段 + 胡萝卜物品，画法和 Textures 里水稻同一套 */

import type { Painter } from './Textures';

const TILE = 16;

export const CROP_PAINTERS: Record<string, Painter> = {
  carrot_seed: (c, x, y) => {
    // 刚种下：土缝里冒出两三根小绿芽
    [[5, 3], [8, 4], [11, 3]].forEach(([bx, h], i) => {
      c.fillStyle = i % 2 ? '#4e9e46' : '#5fb552';
      c.fillRect(x + bx, y + TILE - h, 1, h);
      c.fillRect(x + bx - 1, y + TILE - h, 1, 1); // 芽尖一撇
    });
  },
  carrot_sprout: (c, x, y) => {
    // 小苗：一丛半截高的羽毛状绿叶
    const greens = ['#3d8a3d', '#4e9e46', '#5fb552'];
    [[4, 7], [6, 9], [8, 6], [10, 8], [12, 7]].forEach(([bx, h], i) => {
      c.fillStyle = greens[i % greens.length];
      c.fillRect(x + bx, y + TILE - h, 1, h);
      c.fillRect(x + bx - 1, y + TILE - h + 2, 1, 1); // 左边小叶
      c.fillRect(x + bx + 1, y + TILE - h + 4, 1, 1); // 右边小叶
    });
  },
  carrot_green: (c, x, y) => {
    // 大苗：绿叶丛长高长密了
    const greens = ['#2e7a32', '#3d8a3d', '#4e9e46'];
    [[3, 10], [5, 13], [7, 11], [9, 14], [11, 12], [13, 10]].forEach(([bx, h], i) => {
      c.fillStyle = greens[i % greens.length];
      c.fillRect(x + bx, y + TILE - h, 1, h);
      c.fillRect(x + bx - 1, y + TILE - h + 2, 1, 2);
      c.fillRect(x + bx + 1, y + TILE - h + 5, 1, 2);
    });
  },
  carrot_mature: (c, x, y) => {
    // 熟了：绿叶丛底下露出橙色胡萝卜尖尖
    const greens = ['#2e7a32', '#3d8a3d', '#4e9e46'];
    [[3, 12], [6, 14], [9, 13], [12, 12]].forEach(([bx, h], i) => {
      c.fillStyle = greens[i % greens.length];
      c.fillRect(x + bx, y + TILE - h + 3, 1, h - 3);
    });
    for (const bx of [4, 8, 12]) {
      c.fillStyle = '#e08a2e';
      c.fillRect(x + bx, y + TILE - 3, 2, 3); // 橙尖尖顶出土面
      c.fillStyle = '#c97222';
      c.fillRect(x + bx, y + TILE - 1, 1, 1); // 尖上的阴影
    }
  },
  carrot: (c, x, y) => {
    // 胡萝卜（物品）：一根斜着的橙萝卜，头顶绿缨子，透明底
    c.fillStyle = '#4e9e46'; // 绿缨子
    c.fillRect(x + 4, y + 2, 2, 4); c.fillRect(x + 7, y + 2, 2, 4); c.fillRect(x + 5, y + 3, 2, 3);
    c.fillStyle = '#e08a2e'; // 萝卜身子（上粗下尖的斜三角）
    c.fillRect(x + 4, y + 6, 7, 2);
    c.fillRect(x + 5, y + 8, 6, 2);
    c.fillRect(x + 6, y + 10, 5, 2);
    c.fillRect(x + 7, y + 12, 3, 1);
    c.fillRect(x + 8, y + 13, 2, 1);
    c.fillStyle = '#c97222'; // 身上的横纹
    c.fillRect(x + 5, y + 7, 3, 1); c.fillRect(x + 7, y + 10, 3, 1);
    c.fillStyle = '#f5a94a'; // 高光
    c.fillRect(x + 5, y + 6, 2, 1);
  },
  white_radish: (c, x, y) => {
    // 白萝卜（物品）：跟胡萝卜同一个斜三角画法，身子换成奶白色
    c.fillStyle = '#4e9e46'; // 绿缨子
    c.fillRect(x + 4, y + 2, 2, 4); c.fillRect(x + 7, y + 2, 2, 4); c.fillRect(x + 5, y + 3, 2, 3);
    c.fillStyle = '#f0eee4'; // 萝卜身子（上粗下尖的斜三角）
    c.fillRect(x + 4, y + 6, 7, 2);
    c.fillRect(x + 5, y + 8, 6, 2);
    c.fillRect(x + 6, y + 10, 5, 2);
    c.fillRect(x + 7, y + 12, 3, 1);
    c.fillRect(x + 8, y + 13, 2, 1);
    c.fillStyle = '#cfcaba'; // 身上的横纹
    c.fillRect(x + 5, y + 7, 3, 1); c.fillRect(x + 7, y + 10, 3, 1);
    c.fillStyle = '#ffffff'; // 高光
    c.fillRect(x + 5, y + 6, 2, 1);
  },
};
