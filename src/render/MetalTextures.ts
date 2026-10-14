/** 金属与小物件贴图 — 注册矿石、矿粒、桶、喷泉等像素画 */

import { Painter, TILE, fill, shade, speckle } from './TextureUtils';

export function addMetalPainters(PAINTERS: Record<string, Painter>): void {
  // —— 矿石/金属/矿物物品：三套画法换颜色批量画 ——
  const ore = (base: string, hi: string): Painter => (c, x, y) => {
    PAINTERS.stone(c, x, y);
    for (const [px, py] of [[3, 4], [9, 2], [12, 8], [5, 10], [10, 12], [2, 13]] as const) {
      c.fillStyle = base; c.fillRect(x + px, y + py, 2, 2); c.fillStyle = hi; c.fillRect(x + px, y + py, 1, 1);
    }
  };
  const metalBlock = (base: string): Painter => (c, x, y) => {
    fill(c, x, y, base); c.fillStyle = shade(base, -45);
    c.fillRect(x, y + 14, TILE, 2); c.fillRect(x + 14, y, 2, TILE); c.fillStyle = shade(base, 35);
    c.fillRect(x, y, TILE, 2); c.fillRect(x, y, 2, TILE); speckle(c, x, y, [shade(base, 15), shade(base, -15)], 25);
  };
  const nugget = (base: string): Painter => (c, x, y) => {
    for (const [px, py] of [[4, 5], [9, 9], [6, 11]] as const) {
      c.fillStyle = base; c.fillRect(x + px, y + py, 3, 3); c.fillStyle = shade(base, 45); c.fillRect(x + px, y + py, 1, 1);
    }
  };
  const ingot = (base: string): Painter => (c, x, y) => {
    c.fillStyle = base; c.fillRect(x + 3, y + 6, 10, 5); c.fillStyle = shade(base, 35);
    c.fillRect(x + 3, y + 6, 10, 1); c.fillRect(x + 3, y + 6, 1, 5); c.fillStyle = shade(base, -35);
    c.fillRect(x + 3, y + 10, 10, 1); c.fillRect(x + 12, y + 6, 1, 5);
  };
  Object.assign(PAINTERS, {
    iron_ore: ore('#c9a08a', '#e8d0b8'), gold_ore: ore('#e8c030', '#f8e070'),
    blue_ore: ore('#4fc3dd', '#b8f0ff'), coal_ore: ore('#202024', '#08080a'),
    iron_block: metalBlock('#cfcfcf'), gold_block: metalBlock('#f0c030'), blue_block: metalBlock('#4fc3dd'),
    iron_nugget: nugget('#cfcfcf'), gold_nugget: nugget('#f0c030'),
    iron_ingot: ingot('#cfcfcf'), gold_ingot: ingot('#f0c030'),
  });
  PAINTERS.bucket = (c, x, y) => {
    c.fillStyle = '#ababab';
    for (let i = 0; i < 7; i++) c.fillRect(x + 3 + Math.floor(i / 3), y + 7 + i, 10 - Math.floor(i / 3) * 2, 1);
    c.fillStyle = '#dcdcdc'; c.fillRect(x + 3, y + 7, 10, 1); c.fillStyle = '#787878';
    c.fillRect(x + 5, y + 3, 6, 1); c.fillRect(x + 4, y + 4, 1, 3); c.fillRect(x + 11, y + 4, 1, 3);
  };
  PAINTERS.bucket_water = (c, x, y) => {
    PAINTERS.bucket(c, x, y); c.fillStyle = '#4aa8e0'; c.fillRect(x + 4, y + 7, 8, 2);
    c.fillStyle = '#9cd8f8'; c.fillRect(x + 5, y + 7, 3, 1);
  };
  PAINTERS.seaweed = (c, x, y) => {
    c.fillStyle = '#2e7d32';
    for (let s = 0; s < 4; s++) {
      const bx = x + 2 + s * 4, top = 1 + (s % 2) * 2;
      for (let i = top; i < TILE; i++) c.fillRect(bx + Math.floor(Math.sin(i * 0.8 + s) * 1.5), y + i, 1, 1);
    }
    c.fillStyle = '#43a047';
    for (let s = 0; s < 4; s++) c.fillRect(x + 2 + s * 4, y + 1 + (s % 2) * 2, 1, 1);
  };
  PAINTERS.blue_shard = (c, x, y) => {
    c.fillStyle = '#4fc3dd'; for (let i = 0; i < 7; i++) c.fillRect(x + 4, y + 4 + i, 1 + i, 1);
    c.fillStyle = '#a8ecf8'; for (let i = 0; i < 5; i++) c.fillRect(x + 5, y + 5 + i, 1, 1);
  };
  PAINTERS.blue_diamond = (c, x, y) => {
    c.fillStyle = '#4fc3dd'; c.fillRect(x + 5, y + 3, 6, 2);
    for (let i = 0; i < 7; i++) c.fillRect(x + 2 + i, y + 5 + i, 12 - i * 2, 1);
    c.fillStyle = '#a8ecf8'; c.fillRect(x + 5, y + 4, 2, 2); c.fillRect(x + 6, y + 6, 2, 1);
  };
  PAINTERS.ladder = (c, x, y) => {
    c.fillStyle = '#8a5f30'; c.fillRect(x + 3, y, 2, TILE); c.fillRect(x + 11, y, 2, TILE);
    c.fillStyle = '#6b4423'; for (let i = 2; i < TILE; i += 4) c.fillRect(x + 3, y + i, 10, 1);
  };
  PAINTERS.fountain_stone = (c, x, y) => {
    fill(c, x, y, '#9aa0a8'); c.fillStyle = '#7d848e';
    for (let i = 4; i < TILE; i += 5) c.fillRect(x, y + i, TILE, 1);
    speckle(c, x, y, ['#aab0b8', '#8a9098'], 50);
  };
  PAINTERS.fountain_icon = (c, x, y) => {
    c.fillStyle = '#8a9098'; c.fillRect(x + 1, y + 11, 14, 4); c.fillRect(x + 6, y + 5, 4, 6); c.fillRect(x + 4, y + 4, 8, 2);
    c.fillStyle = '#4aa8e0'; c.fillRect(x + 2, y + 11, 12, 2); c.fillRect(x + 5, y + 4, 6, 1); c.fillRect(x + 7, y + 1, 2, 3);
  };
}
