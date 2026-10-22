/** 基础贴图 — 绘制地形、木石、家具、花草和染色台的像素画 */

import { Painter, TILE, fill, speckle } from './TextureUtils';

export const BASE_PAINTERS: Record<string, Painter> = {
  grass_top: (c, x, y) => { fill(c, x, y, '#5fa832'); speckle(c, x, y, ['#4e8f2a', '#6fbf3d', '#7ecb49'], 90); },
  dirt:      (c, x, y) => { fill(c, x, y, '#8a5f3c'); speckle(c, x, y, ['#755032', '#9c6f47', '#6b452a'], 70); },
  grass_side: (c, x, y) => {
    BASE_PAINTERS.dirt(c, x, y);
    c.fillStyle = '#5fa832';
    c.fillRect(x, y, TILE, 4);
    for (let i = 0; i < TILE; i += 2) c.fillRect(x + i, y + 4, 1, 1 + (i % 3));
  },
  stone: (c, x, y) => { fill(c, x, y, '#8d8d8d'); speckle(c, x, y, ['#7a7a7a', '#9e9e9e', '#6e6e6e'], 80); },
  sand: (c, x, y) => { fill(c, x, y, '#e0d39a'); speckle(c, x, y, ['#cfc188', '#eee3ac', '#bfae74'], 60); },
  water: (c, x, y) => {
    c.fillStyle = 'rgba(48,110,200,0.78)';
    c.fillRect(x, y, TILE, TILE);
    c.fillStyle = 'rgba(90,150,230,0.6)';
    for (let i = 0; i < 4; i++) c.fillRect(x + Math.floor(Math.random() * 12), y + i * 4 + 1, 4, 1);
  },
  wood_side: (c, x, y) => {
    fill(c, x, y, '#6b4a2a');
    c.fillStyle = '#57391f';
    for (let i = 0; i < TILE; i += 4) c.fillRect(x + i, y, 2, TILE);
    speckle(c, x, y, ['#7d5834'], 20);
  },
  wood_top: (c, x, y) => {
    fill(c, x, y, '#b08a55');
    c.strokeStyle = '#8a6a3e';
    for (const r of [6, 4, 2]) c.strokeRect(x + 8 - r, y + 8 - r, r * 2, r * 2);
  },
  leaves: (c, x, y) => { fill(c, x, y, '#3d7a24'); speckle(c, x, y, ['#2f6119', '#4c9430', '#264f14'], 130); },
  door: (c, x, y) => {
    fill(c, x, y, '#8a5f30');
    c.fillStyle = '#5f3f1c';
    c.fillRect(x, y, TILE, 1); c.fillRect(x, y + 15, TILE, 1);
    c.fillRect(x, y, 1, TILE); c.fillRect(x + 15, y, 1, TILE);
    c.fillRect(x + 4, y + 4, 8, 4);
    c.fillStyle = '#e8d26a';
    c.fillRect(x + 11, y + 8, 2, 2);
  },
  planks: (c, x, y) => {
    fill(c, x, y, '#b08a55');
    c.fillStyle = '#8a6a3e';
    for (let i = 4; i < TILE; i += 4) c.fillRect(x, y + i, TILE, 1);
    speckle(c, x, y, ['#c09a62'], 20);
  },
  glass: (c, x, y) => {
    c.fillStyle = 'rgba(200,225,255,0.9)';
    c.fillRect(x, y, TILE, 1); c.fillRect(x, y + 15, TILE, 1);
    c.fillRect(x, y, 1, TILE); c.fillRect(x + 15, y, 1, TILE);
    c.fillStyle = 'rgba(220,240,255,0.5)';
    for (let i = 0; i < 6; i++) c.fillRect(x + 3 + i, y + 10 - i, 1, 1);
  },
  cobble: (c, x, y) => {
    fill(c, x, y, '#8a8a8a');
    c.fillStyle = '#6b6b6b';
    for (const [bx, by, bw, bh] of [[0,0,6,5],[7,0,9,6],[0,6,8,5],[9,7,7,5],[0,12,5,4],[6,12,10,4],[7,6,2,1]] as const)
      c.fillRect(x + bx, y + by, bw, bh);
    speckle(c, x, y, ['#9c9c9c', '#7a7a7a'], 40);
  },
  brick: (c, x, y) => {
    fill(c, x, y, '#9e4f38');
    c.fillStyle = '#d8c9b8';
    for (let i = 0; i < TILE; i += 4) c.fillRect(x, y + i, TILE, 1);
    for (let row = 0; row < 4; row++) {
      const off = row % 2 === 0 ? 0 : 8;
      for (let i = off; i < TILE; i += 8) c.fillRect(x + i, y + row * 4, 1, 4);
    }
  },
  craft_top: (c, x, y) => {
    BASE_PAINTERS.planks(c, x, y);
    c.strokeStyle = '#5f3f1c';
    c.strokeRect(x + 3, y + 3, 10, 10);
    c.beginPath(); c.moveTo(x + 8, y + 3); c.lineTo(x + 8, y + 13);
    c.moveTo(x + 3, y + 8); c.lineTo(x + 13, y + 8); c.stroke();
  },
  craft_side: (c, x, y) => {
    BASE_PAINTERS.planks(c, x, y);
    c.fillStyle = '#5f3f1c';
    c.fillRect(x + 2, y + 4, 5, 5); c.fillRect(x + 9, y + 4, 5, 5);
  },
  meat: (c, x, y) => {
    fill(c, x, y, '#c94f4f');
    speckle(c, x, y, ['#b03d3d', '#d96a6a'], 50);
    c.fillStyle = '#f2d5d5';
    c.fillRect(x + 2, y + 2, 4, 3); c.fillRect(x + 11, y + 11, 3, 3);
  },
  meat_cooked: (c, x, y) => {
    fill(c, x, y, '#8a5a2e');
    speckle(c, x, y, ['#6e4423', '#9e6c3a'], 50);
    c.fillStyle = '#5a3417';
    c.fillRect(x + 2, y + 2, 4, 3); c.fillRect(x + 11, y + 11, 3, 3);
  },
  stick: (c, x, y) => {
    c.fillStyle = '#8a5f30';
    for (let i = 0; i < 12; i++) c.fillRect(x + 4 + i, y + 12 - i, 2, 2);
  },
  soul_dye: (c, x, y) => {
    fill(c, x, y, '#1a3a4a');
    c.fillStyle = '#4fd8ff'; c.fillRect(x + 4, y + 5, 8, 7);
    c.fillStyle = '#8aeaff'; c.fillRect(x + 5, y + 6, 3, 2);
  },
  sandstone: (c, x, y) => {
    fill(c, x, y, '#e0cf9a');
    c.fillStyle = '#c4b078';
    c.fillRect(x, y + 3, TILE, 1); c.fillRect(x, y + 12, TILE, 1);
    speckle(c, x, y, ['#d4c088'], 30);
  },
  chest_side: (c, x, y) => {
    BASE_PAINTERS.planks(c, x, y);
    c.fillStyle = '#3a2a14';
    c.fillRect(x, y, TILE, 1); c.fillRect(x, y + 15, TILE, 1);
  },
  chest_front: (c, x, y) => {
    BASE_PAINTERS.chest_side(c, x, y);
    c.fillStyle = '#d8c24a'; c.fillRect(x + 6, y + 6, 4, 5);
    c.fillStyle = '#8a7420'; c.fillRect(x + 7, y + 7, 2, 2);
  },
  furnace_side: (c, x, y) => {
    BASE_PAINTERS.cobble(c, x, y);
    c.fillStyle = 'rgba(60,60,60,0.35)';
    c.fillRect(x, y, TILE, 2); c.fillRect(x, y + 14, TILE, 2);
  },
  furnace_top: (c, x, y) => BASE_PAINTERS.cobble(c, x, y),
  furnace_front: (c, x, y) => {
    BASE_PAINTERS.cobble(c, x, y);
    c.fillStyle = '#1a1a1a'; c.fillRect(x + 4, y + 5, 8, 8);
    c.fillStyle = '#ff8c42'; c.fillRect(x + 6, y + 9, 2, 3); c.fillRect(x + 9, y + 8, 2, 4);
  },
  soul_furnace_front: (c, x, y) => {
    BASE_PAINTERS.cobble(c, x, y);
    c.fillStyle = '#0d2a38'; c.fillRect(x + 4, y + 5, 8, 8);
    c.fillStyle = '#4fd8ff'; c.fillRect(x + 6, y + 9, 2, 3); c.fillRect(x + 9, y + 8, 2, 4);
    c.fillStyle = '#bdf3ff'; c.fillRect(x + 7, y + 10, 1, 2);
  },
  soul_grass_top: (c, x, y) => { fill(c, x, y, '#2e8a94'); speckle(c, x, y, ['#24707a', '#3aa8b4', '#4fd8ff'], 90); },
  soul_grass_side: (c, x, y) => {
    BASE_PAINTERS.dirt(c, x, y);
    c.fillStyle = '#2e8a94'; c.fillRect(x, y, TILE, 4);
    for (let i = 0; i < TILE; i += 2) c.fillRect(x + i, y + 4, 1, 1 + (i % 3));
  },
  soul_planks: (c, x, y) => {
    fill(c, x, y, '#3a6a8a'); c.fillStyle = '#2c5570';
    for (let i = 4; i < TILE; i += 4) c.fillRect(x, y + i, TILE, 1);
    speckle(c, x, y, ['#4a80a4'], 20);
  },
  soul_stone: (c, x, y) => { fill(c, x, y, '#4a6a8a'); speckle(c, x, y, ['#3d5a75', '#5a80a5'], 80); },
  soul_chest_side: (c, x, y) => {
    BASE_PAINTERS.soul_planks(c, x, y); c.fillStyle = '#16303f';
    c.fillRect(x, y, TILE, 1); c.fillRect(x, y + 15, TILE, 1);
  },
  soul_chest_front: (c, x, y) => {
    BASE_PAINTERS.soul_chest_side(c, x, y); c.fillStyle = '#4fd8ff';
    c.fillRect(x + 6, y + 6, 4, 5); c.fillStyle = '#1a6a8a'; c.fillRect(x + 7, y + 7, 2, 2);
  },
  sign: (c, x, y) => {
    fill(c, x, y, '#c9a86a'); c.fillStyle = '#8a6a3e';
    c.fillRect(x, y + 3, TILE, 1); c.fillRect(x, y + 8, TILE, 1); c.fillRect(x, y + 13, TILE, 1);
  },
  fence: (c, x, y) => { fill(c, x, y, '#7d5c34'); speckle(c, x, y, ['#6b4d29', '#8f6c40'], 30); },
  tall_grass: (c, x, y) => {
    const greens = ['#4e8f2a', '#5fa832', '#6fbf3d'];
    [[2, 7], [4, 11], [6, 6], [8, 9], [10, 5], [12, 8], [14, 6]].forEach(([bx, h], i) => {
      c.fillStyle = greens[i % greens.length]; c.fillRect(x + bx, y + TILE - h, 1, h); c.fillRect(x + bx + 1, y + TILE - h + 2, 1, h - 2);
    });
  },
  // 蒲公英：白绒球（用户 2026-10-22 要求改成白色，参考图是雪地里的白绒球）
  dandelion: (c, x, y) => {
    c.fillStyle = '#4a7a2a'; c.fillRect(x + 7, y + 7, 2, 9); c.fillRect(x + 5, y + 11, 2, 1); c.fillRect(x + 9, y + 12, 2, 1);
    c.fillStyle = '#f6f8f4'; c.fillRect(x + 5, y + 2, 6, 5); c.fillRect(x + 6, y + 1, 4, 7);
    c.fillStyle = '#e2e8de'; c.fillRect(x + 6, y + 3, 4, 3);
    c.fillStyle = '#ffffff'; c.fillRect(x + 7, y + 2, 2, 2); // 绒球高光
    c.fillStyle = '#c8d2c4'; c.fillRect(x + 7, y + 7, 2, 1); // 花托
  },
  poppy: (c, x, y) => {
    c.fillStyle = '#4a7a2a'; c.fillRect(x + 7, y + 8, 2, 8); c.fillRect(x + 5, y + 12, 2, 1);
    c.fillStyle = '#d43a2a'; c.fillRect(x + 5, y + 3, 6, 4); c.fillRect(x + 6, y + 2, 4, 6);
    c.fillStyle = '#3a1a10'; c.fillRect(x + 7, y + 4, 2, 2);
  },
  // 雪块：白底雪粒 + 正中一枚像素雪花 + 四角小方块（照用户给的参考图：雪块上带雪花浮雕感）
  snow: (c, x, y) => {
    fill(c, x, y, '#eef4f6');
    speckle(c, x, y, ['#dde8ec', '#f8fbfb', '#cfdde2'], 70);
    // 11×11 六芒雪花：六条臂 + 每条臂上两对分叉，颜色只比雪白深一点，远看是白雪、近看才看得出花
    c.fillStyle = '#c3d6e2';
    const cx0 = 7, cy0 = 7; // 雪花中心（16 格贴图的视觉中心）
    const put = (px: number, py: number) => c.fillRect(x + px, y + py, 1, 1);
    put(cx0, cy0);
    for (let a = 0; a < 6; a++) {
      const th = (a * 60) * Math.PI / 180;
      for (let r = 1; r <= 5; r++) put(cx0 + Math.round(Math.cos(th) * r), cy0 + Math.round(Math.sin(th) * r));
      for (const side of [-1, 1]) {
        const tb = th + side * Math.PI / 6;
        for (let r = 1; r <= 2; r++) {
          put(cx0 + Math.round(Math.cos(th) * 3 + Math.cos(tb) * r), cy0 + Math.round(Math.sin(th) * 3 + Math.sin(tb) * r));
        }
      }
    }
    c.fillStyle = '#e6eff4';
    for (const [cx, cy] of [[2, 2], [12, 2], [2, 12], [12, 12]]) c.fillRect(x + cx, y + cy, 2, 2);
  },
  ice: (c, x, y) => {
    c.fillStyle = 'rgba(170,215,245,0.72)'; c.fillRect(x, y, TILE, TILE);
    c.fillStyle = 'rgba(230,245,255,0.8)';
    for (let i = 0; i < 5; i++) c.fillRect(x + 2 + i * 3, y + 3 + i * 2, 3, 1);
    c.fillStyle = 'rgba(120,180,225,0.5)';
    for (let i = 0; i < 4; i++) c.fillRect(x + 1 + i * 4, y + 10 + i, 4, 1);
  },
  cactus_side: (c, x, y) => {
    fill(c, x, y, '#3e7a2a'); c.fillStyle = '#2f6119';
    for (let i = 2; i < TILE; i += 5) c.fillRect(x + i, y, 1, TILE);
    c.fillStyle = '#6fbf3d';
    for (let i = 0; i < TILE; i += 4) c.fillRect(x + i + 1, y + 3 + (i % 3) * 4, 1, 1);
  },
  cactus_top: (c, x, y) => {
    fill(c, x, y, '#3e7a2a'); c.fillStyle = '#4e9434'; c.fillRect(x + 2, y + 2, 12, 12);
    c.fillStyle = '#6fbf3d'; c.fillRect(x + 6, y + 6, 4, 4);
  },
  dye_table_top: (c, x, y) => {
    BASE_PAINTERS.planks(c, x, y);
    c.fillStyle = '#d8d8d8'; c.fillRect(x + 1, y + 2, 6, 6);
    c.fillStyle = '#9a9a9a'; c.fillRect(x + 1, y + 2, 6, 1);
    c.fillStyle = '#3d5fb0'; c.fillRect(x + 2, y + 4, 2, 2); c.fillStyle = '#b03a2e'; c.fillRect(x + 4, y + 3, 2, 2);
    c.fillStyle = '#f0cf3a'; c.fillRect(x + 4, y + 6, 2, 2); c.fillStyle = '#8a5f30'; c.fillRect(x + 9, y + 2, 6, 5);
    c.fillStyle = '#7a3fa0'; c.fillRect(x + 10, y + 3, 4, 3); c.fillStyle = '#a8773e';
    for (let i = 0; i < 6; i++) c.fillRect(x + 5 + i, y + 13 - i, 2, 1);
    c.fillStyle = '#4a4a4a'; c.fillRect(x + 10, y + 8, 3, 2); speckle(c, x, y, ['#b03a2e', '#3d5fb0', '#4e9e46'], 8);
  },
  dye_table_side: (c, x, y) => {
    BASE_PAINTERS.planks(c, x, y);
    ['#b03a2e', '#f0cf3a', '#3d5fb0', '#4e9e46'].forEach((col, i) => {
      c.fillStyle = '#5f3f1c'; c.fillRect(x + 1 + i * 4, y + 4, 3, 5); c.fillStyle = col; c.fillRect(x + 2 + i * 4, y + 5, 1, 3);
    });
  },
  manual: (c, x, y) => {
    fill(c, x, y, '#f2efe4'); c.fillStyle = '#c9c4b0'; c.fillRect(x, y + 15, TILE, 1); c.fillRect(x + 15, y, 1, TILE);
    c.fillStyle = '#333333';
    for (let i = 0; i < 4; i++) c.fillRect(x + 3, y + 3 + i * 3, 10 - i * 2, 1);
  },
};
