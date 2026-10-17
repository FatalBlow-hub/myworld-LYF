/** 鱼类贴图 — 四种生鱼的 16×16 背包图标：小丑鱼/鳕鱼/鲑鱼/河豚 */

import { Painter } from './TextureUtils';

export const FISH_TILE_NAMES = ['fish_clown', 'fish_cod', 'fish_salmon', 'fish_puffer'];

export const FISH_PAINTERS: Record<string, Painter> = {
  // 小丑鱼：橙色椭圆身子 + 两条黑边白竖纹 + 白尾巴
  fish_clown: (c, x, y) => {
    c.fillStyle = '#2a2a2a';                     // 尾巴黑边
    c.fillRect(x + 11, y + 6, 3, 5);
    c.fillStyle = '#f2f2f2';                     // 白尾巴
    c.fillRect(x + 11, y + 7, 3, 3);
    c.fillStyle = '#e8681c';                     // 橙身体
    c.fillRect(x + 3, y + 6, 8, 5);
    c.fillRect(x + 4, y + 5, 6, 7);
    c.fillStyle = '#2a2a2a';                     // 条纹黑边
    c.fillRect(x + 4, y + 5, 2, 7);
    c.fillRect(x + 8, y + 5, 2, 7);
    c.fillStyle = '#f2f2f2';                     // 白条纹
    c.fillRect(x + 5, y + 5, 1, 7);
    c.fillRect(x + 9, y + 6, 1, 5);
    c.fillStyle = '#1a1a1a';                     // 眼睛
    c.fillRect(x + 3, y + 7, 1, 1);
  },
  // 鳕鱼：细长身子，青灰背 + 米白肚皮 + 尾鳍
  fish_cod: (c, x, y) => {
    c.fillStyle = '#5a7a5e';                     // 尾巴
    c.fillRect(x + 12, y + 6, 2, 5);
    c.fillStyle = '#6f9173';                     // 青灰背部
    c.fillRect(x + 2, y + 6, 10, 3);
    c.fillRect(x + 3, y + 5, 8, 1);
    c.fillStyle = '#e8e0cc';                     // 米白肚子
    c.fillRect(x + 2, y + 9, 10, 2);
    c.fillRect(x + 4, y + 11, 6, 1);
    c.fillStyle = '#4a6350';                     // 背鳍
    c.fillRect(x + 5, y + 4, 3, 1);
    c.fillRect(x + 9, y + 4, 2, 1);
    c.fillStyle = '#1a1a1a';                     // 眼睛
    c.fillRect(x + 3, y + 7, 1, 1);
  },
  // 鲑鱼：粉红细长身子 + 浅色肚皮 + 深粉尾巴
  fish_salmon: (c, x, y) => {
    c.fillStyle = '#c2503c';                     // 尾巴
    c.fillRect(x + 12, y + 6, 2, 5);
    c.fillStyle = '#e07052';                     // 粉红背部
    c.fillRect(x + 2, y + 6, 10, 3);
    c.fillRect(x + 3, y + 5, 8, 1);
    c.fillStyle = '#f2c4a8';                     // 浅粉肚皮
    c.fillRect(x + 2, y + 9, 10, 2);
    c.fillStyle = '#b0402e';                     // 深色斑点
    c.fillRect(x + 5, y + 6, 1, 1);
    c.fillRect(x + 8, y + 7, 1, 1);
    c.fillRect(x + 6, y + 5, 1, 1);
    c.fillStyle = '#a83828';                     // 背鳍
    c.fillRect(x + 6, y + 4, 3, 1);
    c.fillStyle = '#1a1a1a';                     // 眼睛
    c.fillRect(x + 3, y + 7, 1, 1);
  },
  // 河豚：黄色圆球身子 + 一圈小尖刺 + 大眼睛 + 浅色肚皮
  fish_puffer: (c, x, y) => {
    c.fillStyle = '#8a6a28';                     // 尖刺（上下左右各几根）
    for (const [sx, sy] of [[5, 2], [8, 2], [11, 2], [3, 4], [13, 4], [2, 7], [14, 7], [3, 11], [13, 11], [5, 13], [8, 13], [11, 13]]) {
      c.fillRect(x + sx, y + sy, 1, 2);
    }
    c.fillStyle = '#d8b048';                     // 黄色圆身体
    c.fillRect(x + 4, y + 4, 8, 8);
    c.fillRect(x + 3, y + 5, 10, 6);
    c.fillRect(x + 5, y + 3, 6, 10);
    c.fillStyle = '#f2e0b0';                     // 浅色肚皮
    c.fillRect(x + 5, y + 10, 6, 2);
    c.fillStyle = '#1a1a1a';                     // 大眼睛
    c.fillRect(x + 4, y + 6, 2, 2);
    c.fillStyle = '#f2f2f2';
    c.fillRect(x + 4, y + 6, 1, 1);
    c.fillStyle = '#6a4f1c';                     // 小尾巴
    c.fillRect(x + 13, y + 7, 2, 2);
  },
};
