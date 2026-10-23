/** 黑色售卖机一族贴图 — 黑色售卖机机器 + 黑色木镐 + 小战士弓三形态
 *  机器沿用大厅铁壳售货机造型换黑漆；镐/弓是物品图标，透明底小图案。 */

import { Painter, fill, shade, speckle } from './TextureUtils';

export const BLACKMARKET_TILE_NAMES = [
  'vend_black_top', 'vend_black_side', 'vend_black_front',
  'pick_black', 'bow_warrior', 'bow_fire', 'bow_ice',
];

/** 机器铁壳：和另外四台同一个画法，换成近黑的外壳 */
const vendBlackBody = (shell: string): Painter => (c, x, y) => {
  fill(c, x, y, shell);
  speckle(c, x, y, [shade(shell, 10), shade(shell, -14)], 35);
  c.fillStyle = '#0d0d12';
  c.fillRect(x, y + 14, 16, 2); // 底座
};

export const BLACKMARKET_PAINTERS: Record<string, Painter> = {
  vend_black_top: vendBlackBody('#26262e'),
  vend_black_side: vendBlackBody('#1f1f27'),
  // 正面：一扇亮着神秘金光的取货窗（今天进的是什么货，开面板才知道）
  vend_black_front: (c, x, y) => {
    BLACKMARKET_PAINTERS.vend_black_side(c, x, y);
    c.fillStyle = '#101018'; c.fillRect(x + 3, y + 3, 10, 8);   // 取货窗
    c.fillStyle = '#f8e8a0'; c.fillRect(x + 7, y + 5, 2, 4);    // 窗里的问号竖笔
    c.fillRect(x + 6, y + 4, 2, 2);                              // 问号的小弯钩
    c.fillStyle = '#d8b830'; c.fillRect(x + 7, y + 10, 2, 1);    // 问号下面的点
    c.fillStyle = '#e8e8f0'; c.fillRect(x + 3, y + 12, 10, 1);   // 取货口
  },
  // 黑色木镐：深色木柄 + 乌黑镐头，比普通镐子哑光
  pick_black: (c, x, y) => {
    c.fillStyle = '#5a4028'; c.fillRect(x + 7, y + 6, 2, 8);    // 木柄
    c.fillStyle = '#7a5836'; c.fillRect(x + 7, y + 6, 1, 8);    // 柄上高光
    c.fillStyle = '#1c1c22';                                      // 镐头：一条拱起来的黑横梁
    c.fillRect(x + 3, y + 3, 10, 2);
    c.fillRect(x + 2, y + 4, 3, 3);
    c.fillRect(x + 11, y + 4, 3, 3);
    c.fillStyle = '#3c3c48';                                      // 镐头高光
    c.fillRect(x + 4, y + 3, 6, 1);
    c.fillRect(x + 3, y + 5, 1, 1);
    c.fillRect(x + 12, y + 5, 1, 1);
  },
};

/** 画一张弓：弓臂（accent 主色）+ 弦 + 中间的搭箭点，按形态换色加点缀 */
const bow = (arm: string, glow: string, deco: Painter | null): Painter => (c, x, y) => {
  // 弓臂：右一条弧线形的粗折带（MC 风格斜着的弓）
  c.fillStyle = arm;
  c.fillRect(x + 10, y + 2, 2, 3);
  c.fillRect(x + 11, y + 5, 2, 3);
  c.fillRect(x + 12, y + 8, 2, 2);
  c.fillRect(x + 11, y + 10, 2, 3);
  c.fillRect(x + 10, y + 13, 2, 2);
  c.fillStyle = shade(arm, 22);   // 弓臂受光边
  c.fillRect(x + 10, y + 2, 1, 3);
  c.fillRect(x + 11, y + 5, 1, 3);
  c.fillRect(x + 12, y + 8, 1, 2);
  // 弦：从弓臂两端拉到搭箭点
  c.fillStyle = '#e8e8e8';
  c.fillRect(x + 10, y + 4, 1, 1);
  for (let i = 0; i < 5; i++) c.fillRect(x + 9 - i, y + 5 + i, 1, 1);
  c.fillRect(x + 4, y + 10, 5, 1);
  for (let i = 0; i < 4; i++) c.fillRect(x + 5 + i, y + 11 + i, 1, 1);
  c.fillRect(x + 9, y + 14, 1, 1);
  // 搭箭点（握把）
  c.fillStyle = '#6a4a28'; c.fillRect(x + 8, y + 7, 3, 3);
  c.fillStyle = glow;      c.fillRect(x + 9, y + 8, 1, 1);  // 握把上的能量点
  deco?.(c, x, y);
};

BLACKMARKET_PAINTERS.bow_warrior = bow('#3f74c0', '#c8d4e4', (c, x, y) => {
  c.fillStyle = '#c8d4e4'; c.fillRect(x + 4, y + 3, 2, 1);   // 普通弓：青白小箭羽
  c.fillRect(x + 3, y + 4, 1, 2);
});
BLACKMARKET_PAINTERS.bow_fire = bow('#a03028', '#ffb050', (c, x, y) => {
  c.fillStyle = '#ff8830';                                     // 火弓：弓臂外侧窜小火苗
  c.fillRect(x + 12, y + 1, 2, 2);
  c.fillRect(x + 14, y + 7, 2, 3);
  c.fillRect(x + 12, y + 15, 2, 2);
  c.fillStyle = '#ffd060';
  c.fillRect(x + 13, y + 2, 1, 1);
  c.fillRect(x + 14, y + 8, 1, 2);
});
BLACKMARKET_PAINTERS.bow_ice = bow('#3d84b8', '#a8ecff', (c, x, y) => {
  c.fillStyle = '#a8ecff';                                     // 冰弓：周围三粒冰晶
  c.fillRect(x + 3, y + 2, 2, 2);
  c.fillRect(x + 13, y + 4, 2, 2);
  c.fillRect(x + 4, y + 12, 2, 2);
  c.fillStyle = '#e8faff';
  c.fillRect(x + 3, y + 2, 1, 1);
  c.fillRect(x + 13, y + 4, 1, 1);
  c.fillRect(x + 4, y + 12, 1, 1);
});
