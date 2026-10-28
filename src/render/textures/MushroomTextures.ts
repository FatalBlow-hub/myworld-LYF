/** 蘑菇贴图 — 五种蘑菇（含夜光蓝菇）+ 五种孢子（透明底小图案）
 *  蘑菇是交叉薄片方块，孢子是物品图标；颜色按品种区分：香菇褐、金针菇白、平菇灰、红伞伞红、夜光蓝菇蓝。 */

import { Painter, speckle } from './TextureUtils';

export const MUSHROOM_TILE_NAMES = [
  'mush_shiitake', 'mush_enoki', 'mush_oyster', 'mush_red', 'mush_glow',
  'spore_shiitake', 'spore_enoki', 'spore_oyster', 'spore_red', 'spore_glow',
];

/** 一小撮孢子粉末：底色 + 3~4 颗亮点，按品种换色 */
const spore = (base: string, light: string): Painter => (c, x, y) => {
  c.fillStyle = base;
  c.fillRect(x + 5, y + 6, 3, 3);
  c.fillRect(x + 9, y + 8, 2, 2);
  c.fillRect(x + 6, y + 10, 2, 2);
  c.fillStyle = light;
  c.fillRect(x + 5, y + 6, 1, 1);
  c.fillRect(x + 9, y + 8, 1, 1);
  c.fillRect(x + 6, y + 10, 1, 1);
  c.fillStyle = base;
  c.fillRect(x + 3, y + 12, 10, 1); // 落在地上的一层
};

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
  // 夜光蓝菇：蓝紫伞 + 白点，柄会发光（方块自带微光，夜里一眼能认）
  mush_glow: (c, x, y) => {
    c.fillStyle = '#dceff8';
    c.fillRect(x + 6, y + 9, 4, 5);
    c.fillStyle = '#3f7fd0';
    c.fillRect(x + 2, y + 4, 12, 4);
    c.fillRect(x + 4, y + 2, 8, 2);
    c.fillStyle = '#7fd0f0';
    c.fillRect(x + 4, y + 4, 8, 1);
    c.fillStyle = '#eafaff';
    for (const [dx, dy] of [[3, 5], [7, 3], [11, 5], [6, 6], [10, 6]] as const) c.fillRect(x + dx, y + dy, 2, 1);
    c.fillStyle = '#8fe0ff';
    c.fillRect(x + 7, y + 9, 2, 5); // 发光的柄
  },
  // 五种孢子粉末：按品种换色
  spore_shiitake: spore('#9a6634', '#e8dcc0'),
  spore_enoki: spore('#e0d8b8', '#fffbe8'),
  spore_oyster: spore('#c8c4b8', '#f4f2ec'),
  spore_red: spore('#d05a4a', '#ffd8d0'),
  spore_glow: spore('#4f9fd8', '#c8f0ff'),
};
