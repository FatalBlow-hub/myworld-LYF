/** 季节贴图 — 绘制水稻阶段和星空系列的像素画 */

import { Painter, TILE, fill, speckle } from './TextureUtils';

export const SEASONAL_PAINTERS: Record<string, Painter> = {};

SEASONAL_PAINTERS.rice_seed = (c, x, y) => {
  [[4, 3], [7, 4], [10, 2], [12, 3]].forEach(([bx, h], i) => {
    c.fillStyle = i % 2 ? '#5fa832' : '#6fbf3d';
    c.fillRect(x + bx, y + TILE - h, 1, h);
  });
};
SEASONAL_PAINTERS.rice_sprout = (c, x, y) => {
  const greens = ['#4e8f2a', '#5fa832', '#6fbf3d'];
  [[3, 6], [5, 8], [7, 5], [9, 7], [11, 6], [13, 8]].forEach(([bx, h], i) => {
    c.fillStyle = greens[i % greens.length]; c.fillRect(x + bx, y + TILE - h, 1, h);
  });
};
SEASONAL_PAINTERS.rice_green = (c, x, y) => {
  const greens = ['#3e7a24', '#4e8f2a', '#5fa832'];
  [[2, 11], [4, 14], [6, 10], [8, 15], [10, 12], [12, 14], [14, 9]].forEach(([bx, h], i) => {
    c.fillStyle = greens[i % greens.length]; c.fillRect(x + bx, y + TILE - h, 1, h); c.fillRect(x + bx + 1, y + TILE - h + 1, 1, 1);
  });
};
SEASONAL_PAINTERS.rice_mature = (c, x, y) => {
  [[3, 11], [6, 14], [9, 12], [12, 13]].forEach(([bx, h]) => {
    c.fillStyle = '#4e8f2a'; c.fillRect(x + bx, y + TILE - h + 3, 1, h - 3);
    c.fillStyle = '#f0cf3a'; c.fillRect(x + bx - 1, y + TILE - h, 3, 3);
    c.fillStyle = '#e0b028'; c.fillRect(x + bx, y + TILE - h + 2, 2, 2);
    c.fillStyle = '#f8e888'; c.fillRect(x + bx, y + TILE - h, 1, 1);
  });
};
SEASONAL_PAINTERS.rice_grain = (c, x, y) => {
  for (const [px, py] of [[5, 4], [9, 6], [4, 9], [10, 11], [7, 12]] as const) {
    c.fillStyle = '#e8c84a'; c.fillRect(x + px, y + py, 2, 3); c.fillStyle = '#f8e888'; c.fillRect(x + px, y + py, 1, 1);
  }
};
SEASONAL_PAINTERS.star_shard = (c, x, y) => {
  const cx = x + 8, cy = y + 8;
  c.fillStyle = '#7fe8f8';
  c.fillRect(cx - 1, cy - 6, 2, 5); c.fillRect(cx - 1, cy + 2, 2, 4); c.fillRect(cx - 6, cy - 1, 5, 2);
  c.fillRect(cx + 2, cy - 1, 5, 2); c.fillRect(cx - 3, cy + 2, 2, 3); c.fillRect(cx + 1, cy + 2, 2, 3); c.fillRect(cx - 2, cy - 2, 4, 4);
  c.fillStyle = '#e8fdff'; c.fillRect(cx - 1, cy - 1, 2, 2);
  [[1, 3], [14, 2], [13, 13], [2, 12]].forEach(([px, py]) => c.fillRect(x + px, y + py, 1, 1));
};
SEASONAL_PAINTERS.starwool = (c, x, y) => {
  fill(c, x, y, '#2b2a6e'); speckle(c, x, y, ['#4a4ab0', '#3d3d8f', '#6a5acd', '#7a3fa0'], 70);
  c.fillStyle = '#e893b8'; c.fillRect(x + 2, y + 3, 5, 3); c.fillRect(x + 4, y + 2, 3, 5);
  c.fillStyle = '#f0b8d8'; c.fillRect(x + 4, y + 4, 2, 2);
  c.fillStyle = '#7fe8f8'; c.fillRect(x + 9, y + 9, 5, 3); c.fillRect(x + 11, y + 8, 3, 5);
  c.fillStyle = '#b8f0ff'; c.fillRect(x + 11, y + 10, 2, 2); c.fillStyle = '#ffffff';
  [[1, 9], [7, 1], [14, 4], [5, 12], [13, 14], [9, 6]].forEach(([px, py]) => c.fillRect(x + px, y + py, 1, 1));
};
SEASONAL_PAINTERS.star_table_top = (c, x, y) => {
  SEASONAL_PAINTERS.starwool(c, x, y); c.fillStyle = '#e8fdff';
  c.fillRect(x, y, TILE, 1); c.fillRect(x, y + 15, TILE, 1); c.fillRect(x, y, 1, TILE); c.fillRect(x + 15, y, 1, TILE);
  c.fillRect(x + 5, y + 2, 1, 12); c.fillRect(x + 10, y + 2, 1, 12); c.fillRect(x + 2, y + 5, 12, 1); c.fillRect(x + 2, y + 10, 12, 1);
};
SEASONAL_PAINTERS.star_table_side = (c, x, y) => {
  SEASONAL_PAINTERS.starwool(c, x, y); c.fillStyle = '#e8fdff';
  c.fillRect(x, y, TILE, 2); c.fillRect(x, y + 14, TILE, 2); SEASONAL_PAINTERS.star_shard(c, x, y);
};
