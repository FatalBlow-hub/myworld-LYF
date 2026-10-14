/** 小岛生存贴图 — 绘制南瓜与西瓜的果实方块、切片、种子、3 个苗期阶段及三种专属水果的 16×16 像素图 */

import { Painter, TILE, fill, speckle } from './TextureUtils';

export const ISLAND_TILE_NAMES = [
  'pumpkin_top', 'pumpkin_side', 'pumpkin_slice', 'pumpkin_seed',
  'pumpkin_stage1', 'pumpkin_stage2', 'pumpkin_stage3',
  'melon_top', 'melon_side', 'melon_slice', 'melon_seed',
  'melon_stage1', 'melon_stage2', 'melon_stage3',
  'apple', 'peach', 'orange',
];

export const ISLAND_PAINTERS: Record<string, Painter> = {
  pumpkin_top: (c, x, y) => {
    fill(c, x, y, '#d9761e');
    speckle(c, x, y, ['#e88a2e', '#b85c12'], 40);
    c.fillStyle = '#a84f0c';
    c.fillRect(x + 7, y, 2, TILE);
    c.fillRect(x, y + 7, TILE, 2);
    c.fillStyle = '#5a6e28';
    c.fillRect(x + 6, y + 6, 4, 4);
    c.fillStyle = '#3d4f18';
    c.fillRect(x + 7, y + 7, 2, 2);
  },
  pumpkin_side: (c, x, y) => {
    fill(c, x, y, '#d9761e');
    speckle(c, x, y, ['#e88a2e', '#c06214'], 36);
    c.fillStyle = '#a84f0c';
    for (const col of [2, 6, 10, 14]) c.fillRect(x + col, y, 1, TILE);
    c.fillStyle = '#f09c3e';
    for (const col of [0, 4, 8, 12]) c.fillRect(x + col, y + 2, 1, TILE - 4);
  },
  pumpkin_slice: (c, x, y) => {
    c.fillStyle = '#b85c12';
    c.fillRect(x + 3, y + 10, 10, 3);
    c.fillRect(x + 2, y + 8, 2, 3);
    c.fillRect(x + 12, y + 8, 2, 3);
    c.fillStyle = '#f29b38';
    c.fillRect(x + 4, y + 6, 8, 4);
    c.fillRect(x + 5, y + 4, 6, 2);
    c.fillStyle = '#ffd175';
    c.fillRect(x + 6, y + 6, 4, 2);
  },
  pumpkin_seed: (c, x, y) => {
    const seeds = [[4, 5], [9, 4], [6, 9], [10, 10]];
    for (const [sx, sy] of seeds) {
      c.fillStyle = '#d4be8d';
      c.fillRect(x + sx, y + sy, 3, 4);
      c.fillStyle = '#f5ebd1';
      c.fillRect(x + sx + 1, y + sy + 1, 1, 2);
    }
  },
  pumpkin_stage1: (c, x, y) => {
    c.fillStyle = '#6db33f';
    c.fillRect(x + 7, y + 12, 2, 4);
    c.fillStyle = '#8fd158';
    c.fillRect(x + 6, y + 11, 2, 2);
    c.fillRect(x + 8, y + 11, 2, 2);
  },
  pumpkin_stage2: (c, x, y) => {
    c.fillStyle = '#5a9e32';
    c.fillRect(x + 7, y + 8, 2, 8);
    c.fillStyle = '#76ba46';
    c.fillRect(x + 4, y + 9, 3, 2);
    c.fillRect(x + 9, y + 8, 3, 2);
    c.fillRect(x + 5, y + 12, 2, 2);
  },
  pumpkin_stage3: (c, x, y) => {
    c.fillStyle = '#4a8526';
    c.fillRect(x + 7, y + 4, 2, 12);
    c.fillStyle = '#65a838';
    c.fillRect(x + 3, y + 6, 4, 3);
    c.fillRect(x + 9, y + 5, 4, 3);
    c.fillRect(x + 4, y + 10, 3, 3);
    c.fillRect(x + 9, y + 10, 3, 3);
    c.fillStyle = '#f0b429';
    c.fillRect(x + 7, y + 3, 2, 2);
  },
  melon_top: (c, x, y) => {
    fill(c, x, y, '#3b7a28');
    speckle(c, x, y, ['#4f9638', '#2a5c1b'], 40);
    c.fillStyle = '#68b048';
    c.fillRect(x + 6, y + 2, 4, 12);
    c.fillRect(x + 2, y + 6, 12, 4);
    c.fillStyle = '#254d17';
    c.fillRect(x + 7, y + 7, 2, 2);
  },
  melon_side: (c, x, y) => {
    fill(c, x, y, '#3b7a28');
    c.fillStyle = '#68b048';
    for (const col of [1, 5, 9, 13]) c.fillRect(x + col, y, 2, TILE);
    c.fillStyle = '#254d17';
    for (const col of [0, 4, 8, 12, 15]) c.fillRect(x + col, y, 1, TILE);
    speckle(c, x, y, ['#4f9638', '#2a5c1b'], 24);
  },
  melon_slice: (c, x, y) => {
    c.fillStyle = '#2e6b22';
    c.fillRect(x + 3, y + 11, 10, 2);
    c.fillRect(x + 2, y + 9, 2, 2);
    c.fillRect(x + 12, y + 9, 2, 2);
    c.fillStyle = '#a8e070';
    c.fillRect(x + 4, y + 10, 8, 1);
    c.fillStyle = '#e03c3c';
    c.fillRect(x + 4, y + 6, 8, 4);
    c.fillRect(x + 5, y + 4, 6, 2);
    c.fillStyle = '#1c1c1c';
    c.fillRect(x + 6, y + 7, 1, 1);
    c.fillRect(x + 9, y + 7, 1, 1);
    c.fillRect(x + 7, y + 5, 1, 1);
  },
  melon_seed: (c, x, y) => {
    const seeds = [[4, 5], [9, 4], [6, 9], [10, 10]];
    for (const [sx, sy] of seeds) {
      c.fillStyle = '#2b241d';
      c.fillRect(x + sx, y + sy, 3, 4);
      c.fillStyle = '#5c4e3e';
      c.fillRect(x + sx + 1, y + sy + 1, 1, 2);
    }
  },
  melon_stage1: (c, x, y) => {
    c.fillStyle = '#5ca638';
    c.fillRect(x + 7, y + 12, 2, 4);
    c.fillStyle = '#82cc56';
    c.fillRect(x + 6, y + 11, 2, 2);
    c.fillRect(x + 8, y + 11, 2, 2);
  },
  melon_stage2: (c, x, y) => {
    c.fillStyle = '#498c28';
    c.fillRect(x + 7, y + 8, 2, 8);
    c.fillStyle = '#6db846';
    c.fillRect(x + 4, y + 8, 3, 2);
    c.fillRect(x + 9, y + 9, 3, 2);
    c.fillRect(x + 9, y + 12, 2, 2);
  },
  melon_stage3: (c, x, y) => {
    c.fillStyle = '#38731c';
    c.fillRect(x + 7, y + 4, 2, 12);
    c.fillStyle = '#58a134';
    c.fillRect(x + 3, y + 5, 4, 3);
    c.fillRect(x + 9, y + 6, 4, 3);
    c.fillRect(x + 3, y + 10, 4, 3);
    c.fillRect(x + 9, y + 10, 4, 3);
    c.fillStyle = '#ffd942';
    c.fillRect(x + 7, y + 3, 2, 2);
  },
  apple: (c, x, y) => {
    c.fillStyle = '#5a3a1e';
    c.fillRect(x + 7, y + 2, 2, 3);
    c.fillStyle = '#4e9e36';
    c.fillRect(x + 9, y + 2, 3, 2);
    c.fillStyle = '#d62828';
    c.fillRect(x + 4, y + 5, 8, 8);
    c.fillRect(x + 3, y + 6, 10, 6);
    c.fillStyle = '#a81c1c';
    c.fillRect(x + 4, y + 12, 8, 2);
    c.fillStyle = '#ff7b7b';
    c.fillRect(x + 5, y + 6, 2, 3);
  },
  peach: (c, x, y) => {
    c.fillStyle = '#4e9e36';
    c.fillRect(x + 6, y + 2, 4, 2);
    c.fillStyle = '#ff9ebb';
    c.fillRect(x + 4, y + 5, 8, 8);
    c.fillRect(x + 3, y + 6, 10, 6);
    c.fillRect(x + 7, y + 4, 2, 1);
    c.fillStyle = '#e85d88';
    c.fillRect(x + 7, y + 6, 1, 7);
    c.fillRect(x + 5, y + 12, 6, 2);
    c.fillStyle = '#ffd1e0';
    c.fillRect(x + 5, y + 6, 2, 2);
  },
  orange: (c, x, y) => {
    c.fillStyle = '#3d8528';
    c.fillRect(x + 7, y + 2, 3, 2);
    c.fillStyle = '#f28518';
    c.fillRect(x + 4, y + 4, 8, 10);
    c.fillRect(x + 3, y + 5, 10, 8);
    c.fillStyle = '#cc660a';
    c.fillRect(x + 9, y + 8, 1, 1);
    c.fillRect(x + 7, y + 11, 1, 1);
    c.fillRect(x + 10, y + 11, 1, 1);
    c.fillStyle = '#ffb84d';
    c.fillRect(x + 5, y + 5, 3, 2);
  },
};
