/** 红焰大赛箱贴图 — 暗红箱体 + 火焰纹路前脸 + 金边顶盖
 *
 *  两格高，顶盖那一格用 arena_box_top，正面（朝玩家的那面）用 arena_box_front。 */

import { Painter, TILE, fill, shade, speckle } from './TextureUtils';

/** 箱体侧面：暗红木板 + 竖向接缝 + 底部铜边 */
const boxSide: Painter = (c, x, y) => {
  fill(c, x, y, '#8f2418');
  speckle(c, x, y, ['#7a1c12', '#a63020', '#6b150c'], 90);
  c.fillStyle = '#5e1008';
  c.fillRect(x, y + 2, TILE, 1);
  c.fillRect(x, y + 13, TILE, 1);
  c.fillStyle = '#d8b048';
  c.fillRect(x, y + 14, TILE, 1);
  c.fillStyle = '#3f0a04';
  c.fillRect(x + 7, y + 3, 1, 10);
};

export const ARENA_TILE_NAMES = ['arena_box', 'arena_box_top', 'arena_box_front'];

export const ARENA_PAINTERS: Record<string, Painter> = {
  arena_box: boxSide,
  // 顶盖：暗红底 + 金色包边 + 中间一颗火焰标记
  arena_box_top: (c, x, y) => {
    fill(c, x, y, '#7a1c12');
    c.fillStyle = '#d8b048';
    c.fillRect(x, y, TILE, 1);
    c.fillRect(x, y + TILE - 1, TILE, 1);
    c.fillRect(x, y, 1, TILE);
    c.fillRect(x + TILE - 1, y, 1, TILE);
    c.fillStyle = '#f0a030';
    c.fillRect(x + 7, y + 5, 2, 3);
    c.fillStyle = '#ffe070';
    c.fillRect(x + 7, y + 8, 2, 2);
    c.fillStyle = '#e8661e';
    c.fillRect(x + 5, y + 9, 6, 2);
  },
  // 前脸：箱门 + 火焰纹（远看像个烧着的大箱子）
  arena_box_front: (c, x, y) => {
    boxSide(c, x, y);
    c.fillStyle = '#40100a';
    c.fillRect(x + 3, y + 3, 10, 10);
    c.fillStyle = '#f0a030';
    c.fillRect(x + 7, y + 4, 2, 3);
    c.fillRect(x + 5, y + 7, 2, 2);
    c.fillRect(x + 9, y + 7, 2, 2);
    c.fillStyle = '#ffe070';
    c.fillRect(x + 7, y + 7, 2, 3);
    c.fillStyle = '#c8422a';
    c.fillRect(x + 4, y + 10, 8, 2);
    c.fillStyle = shade('#d8b048', 20);
    c.fillRect(x + 6, y + 11, 4, 1);
  },
};
