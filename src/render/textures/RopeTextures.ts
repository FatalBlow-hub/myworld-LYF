/** 绳索贴图 — 一段盘起来的麻绳（棕黄股绳交错） */

import { Painter, TILE } from './TextureUtils';

export const ROPE_TILE_NAMES = ['rope'];

export const ROPE_PAINTERS: Record<string, Painter> = {
  rope: (c, x, y) => {
    c.clearRect(x, y, TILE, TILE);
    // 盘成两圈的绳：外圈 + 内圈
    c.fillStyle = '#a8813c'; // 绳身
    c.fillRect(x + 3, y + 2, 10, 12);
    c.fillRect(x + 2, y + 3, 12, 10);
    c.fillStyle = '#8a6428'; // 暗侧
    c.fillRect(x + 3, y + 12, 10, 2);
    c.fillRect(x + 2, y + 3, 2, 10);
    c.fillStyle = '#c8a05a'; // 亮侧（三股绞痕）
    c.fillRect(x + 4, y + 3, 8, 2);
    c.fillRect(x + 12, y + 4, 2, 8);
    // 绞绳纹：斜向的股绳交错
    c.fillStyle = '#6f4e18';
    for (let i = 0; i < 6; i++) {
      c.fillRect(x + 4 + i * 1.5, y + 5 + (i % 3), 1, 1);
      c.fillRect(x + 5 + i * 1.5, y + 9 + (i % 3), 1, 1);
    }
    // 绳头：右上角拖出来一截
    c.fillStyle = '#a8813c';
    c.fillRect(x + 11, y + 1, 3, 2);
    c.fillStyle = '#c8a05a';
    c.fillRect(x + 11, y + 1, 3, 1);
  },
};
