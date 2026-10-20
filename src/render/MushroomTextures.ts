/** 蘑菇贴图 — 四种蘑菇（香菇/金针菇/平菇/红伞伞）+ 蘑菇孢子
 *  都是透明底的小图案：蘑菇是交叉薄片方块，孢子是物品图标。 */

import { Painter, speckle } from './TextureUtils';

export const MUSHROOM_TILE_NAMES = ['mush_shiitake', 'mush_enoki', 'mush_oyster', 'mush_red', 'mushroom_spore'];

export const MUSHROOM_PAINTERS: Record<string, Painter> = {
  // 香菇：厚实的褐色伞 + 米色柄
  mush_shiitake: (c, x, y) => {
    c.fillStyle = '#e8dcc0';
    c.fillRect(x + 6, y + 9, 4, 5);
    c.fillStyle = '#8a5a2e';
    c.fillRect(x + 3, y + 4, 10, 4);
    c.fillRect(x + 4, y + 3, 8, 1);
    c.fillStyle = '#a8743c';
    c.fillRect(x + 4, y + 4, 8, 2);
    c.fillStyle = '#f2e8d0';
    c.fillRect(x + 5, y + 2, 2, 1);
    c.fillRect(x + 9, y + 2, 2, 1);
    speckle(c, x + 3, y + 4, ['#7a4a22', '#9a6634'], 20);
  },
  // 金针菇：一丛细长的白柄，顶着一排小黄帽
  mush_enoki: (c, x, y) => {
    c.fillStyle = '#f2ecd8';
    for (const dx of [3, 6, 9, 12]) c.fillRect(x + dx, y + 7, 2, 7);
    c.fillStyle = '#dcd4bc';
    for (const dx of [3, 6, 9, 12]) c.fillRect(x + dx, y + 12, 2, 2);
    c.fillStyle = '#e8c860';
    for (const dx of [3, 6, 9, 12]) c.fillRect(x + dx - 1, y + 5, 4, 2);
    c.fillStyle = '#f8e8a0';
    for (const dx of [3, 6, 9, 12]) c.fillRect(x + dx - 1, y + 5, 2, 1);
  },
  // 平菇：灰白的扇形叠在一起
  mush_oyster: (c, x, y) => {
    c.fillStyle = '#d8d4c8';
    c.fillRect(x + 2, y + 6, 12, 3);
    c.fillRect(x + 4, y + 9, 8, 2);
    c.fillStyle = '#eeeae0';
    c.fillRect(x + 3, y + 6, 9, 1);
    c.fillStyle = '#c0bcb0';
    c.fillRect(x + 6, y + 11, 4, 3);
    c.fillStyle = '#b0aca0';
    c.fillRect(x + 2, y + 8, 12, 1);
  },
  // 红伞伞：鲜红伞盖 + 白点，白柄（有毒的那个）
  mush_red: (c, x, y) => {
    c.fillStyle = '#ece4d4';
    c.fillRect(x + 6, y + 9, 4, 5);
    c.fillStyle = '#d63a2e';
    c.fillRect(x + 2, y + 4, 12, 4);
    c.fillRect(x + 4, y + 2, 8, 2);
    c.fillStyle = '#ffffff';
    for (const [dx, dy] of [[3, 5], [7, 3], [11, 5], [6, 6], [10, 6]] as const) c.fillRect(x + dx, y + dy, 2, 1);
    c.fillStyle = '#a82a20';
    c.fillRect(x + 2, y + 7, 12, 1);
  },
  // 蘑菇孢子：一小撮淡紫孢子
  mushroom_spore: (c, x, y) => {
    c.fillStyle = '#8a6ad0';
    c.fillRect(x + 4, y + 7, 2, 2);
    c.fillRect(x + 9, y + 5, 2, 2);
    c.fillRect(x + 7, y + 10, 2, 2);
    c.fillRect(x + 11, y + 10, 1, 1);
    c.fillStyle = '#bca8f0';
    c.fillRect(x + 4, y + 7, 1, 1);
    c.fillRect(x + 9, y + 5, 1, 1);
    c.fillRect(x + 7, y + 10, 1, 1);
    // 底下画一层淡淡的孢子雾，看起来像在飘
    c.fillStyle = 'rgba(150,120,220,0.35)';
    c.fillRect(x + 3, y + 13, 10, 1);
  },
};
