/** 金色物品贴图 — 绘制黄金配方、金色工具和寒冰瓶的像素图 */

import { Painter } from './TextureUtils';

export const GOLDEN_TILE_NAMES = [
  'dye_gold', 'bag_gold', 'gold_workbench_top', 'gold_workbench_side',
  'gold_dye_top', 'gold_dye_side', 'gold_chem_decomp', 'ice_molecule',
  'potion_ice', 'gold_pickaxe', 'gold_manual',
];

export const GOLDEN_PAINTERS: Record<string, Painter> = {
  dye_gold: (c, x, y) => {
    c.fillStyle = '#d9a900'; c.fillRect(x + 4, y + 5, 8, 6); c.fillRect(x + 5, y + 4, 6, 8);
    c.fillStyle = '#fff2a6'; c.fillRect(x + 5, y + 5, 3, 2); c.fillStyle = '#9d7200'; c.fillRect(x + 9, y + 9, 3, 2);
  },
  bag_gold: (c, x, y) => {
    c.fillStyle = '#8a5f30'; c.fillRect(x + 3, y + 5, 10, 9); c.fillRect(x + 5, y + 3, 6, 2);
    c.fillStyle = '#f0c030'; c.fillRect(x + 3, y + 5, 10, 2); c.fillRect(x + 3, y + 12, 10, 2);
    c.fillStyle = '#fff0a0'; c.fillRect(x + 5, y + 7, 6, 1); c.fillStyle = '#a67900'; c.fillRect(x + 7, y + 10, 2, 3);
  },
  gold_workbench_top: (c, x, y) => {
    c.fillStyle = '#d2a51c'; c.fillRect(x, y, 16, 16); c.fillStyle = '#f6d45a'; c.fillRect(x + 1, y + 1, 14, 14);
    c.fillStyle = '#9a720b'; c.strokeStyle = '#805b00'; c.strokeRect(x + 3, y + 3, 10, 10);
    c.beginPath(); c.moveTo(x + 8, y + 3); c.lineTo(x + 8, y + 13); c.moveTo(x + 3, y + 8); c.lineTo(x + 13, y + 8); c.stroke();
  },
  gold_workbench_side: (c, x, y) => {
    c.fillStyle = '#9a720b'; c.fillRect(x, y, 16, 16); c.fillStyle = '#f0c030'; c.fillRect(x, y + 1, 16, 4);
    c.fillStyle = '#d2a51c'; c.fillRect(x + 2, y + 7, 5, 6); c.fillRect(x + 9, y + 7, 5, 6);
  },
  gold_dye_top: (c, x, y) => {
    c.fillStyle = '#9a720b'; c.fillRect(x, y, 16, 16); c.fillStyle = '#f0c030'; c.fillRect(x + 1, y + 1, 14, 14);
    c.fillStyle = '#fff2a6'; c.fillRect(x + 2, y + 2, 2, 2); c.fillRect(x + 12, y + 3, 2, 2);
    c.fillStyle = '#b48600'; c.fillRect(x + 2, y + 8, 6, 6); c.fillStyle = '#f8df77'; c.fillRect(x + 3, y + 9, 4, 4);
    c.fillStyle = '#9a720b'; c.fillRect(x + 10, y + 8, 4, 5); c.fillStyle = '#fff2a6'; c.fillRect(x + 11, y + 9, 2, 3);
  },
  gold_dye_side: (c, x, y) => {
    c.fillStyle = '#9a720b'; c.fillRect(x, y, 16, 16); c.fillStyle = '#f0c030'; c.fillRect(x, y + 1, 16, 3);
    ['#b03a2e', '#f0c030', '#3d5fb0'].forEach((color, i) => {
      c.fillStyle = '#805b00'; c.fillRect(x + 2 + i * 5, y + 7, 3, 6); c.fillStyle = color; c.fillRect(x + 3 + i * 5, y + 8, 1, 4);
    });
  },
  gold_chem_decomp: (c, x, y) => {
    c.fillStyle = '#b48600'; c.fillRect(x, y + 12, 16, 4); c.fillStyle = '#f0c030'; c.fillRect(x + 3, y + 4, 10, 8);
    c.fillStyle = '#fff2a6'; c.fillRect(x + 6, y + 1, 4, 8); c.fillStyle = '#d8f4ff'; c.fillRect(x + 7, y + 2, 1, 6);
    c.fillStyle = '#ffffff'; c.fillRect(x + 8, y + 4, 1, 1); c.fillRect(x + 9, y + 7, 1, 1);
  },
  ice_molecule: (c, x, y) => {
    c.fillStyle = '#aee6f8'; c.fillRect(x + 6, y + 5, 4, 6); c.fillRect(x + 3, y + 3, 3, 3); c.fillRect(x + 10, y + 3, 3, 3);
    c.fillStyle = '#e8fbff'; c.fillRect(x + 4, y + 4, 2, 2); c.fillRect(x + 11, y + 4, 2, 2); c.fillRect(x + 7, y + 6, 2, 4);
    c.fillStyle = '#6ab8d8'; c.fillRect(x + 4, y + 11, 8, 1);
  },
  potion_ice: (c, x, y) => {
    c.fillStyle = '#bfe8f2'; c.fillRect(x + 5, y + 5, 6, 9); c.fillRect(x + 6, y + 2, 4, 3);
    c.fillStyle = '#e8fbff'; c.fillRect(x + 6, y + 6, 1, 7); c.fillStyle = '#7eddf8'; c.fillRect(x + 7, y + 8, 3, 5);
    c.fillStyle = '#ffffff'; c.fillRect(x + 7, y + 8, 1, 2); c.fillStyle = '#7baec0'; c.fillRect(x + 6, y + 1, 4, 2);
  },
  gold_pickaxe: (c, x, y) => {
    c.fillStyle = '#8a5f30';
    for (let i = 0; i < 9; i++) c.fillRect(x + 4 + i, y + 4 + i, 2, 2);
    c.fillStyle = '#f0c030'; c.fillRect(x + 2, y + 3, 12, 3); c.fillRect(x + 3, y + 2, 3, 2); c.fillRect(x + 10, y + 2, 3, 2);
    c.fillStyle = '#fff2a6'; c.fillRect(x + 3, y + 3, 3, 1); c.fillRect(x + 10, y + 3, 3, 1);
  },
  gold_manual: (c, x, y) => {
    c.fillStyle = '#f7e6a5'; c.fillRect(x + 1, y + 1, 14, 14); c.fillStyle = '#b48600'; c.fillRect(x + 1, y + 1, 14, 2);
    c.fillRect(x + 1, y + 13, 14, 2); c.fillRect(x + 1, y + 1, 2, 14); c.fillRect(x + 13, y + 1, 2, 14);
    c.fillStyle = '#8a5f00'; for (let i = 0; i < 4; i++) c.fillRect(x + 4, y + 5 + i * 2, 7 - i, 1);
    c.fillStyle = '#f0c030'; c.fillRect(x + 11, y + 4, 2, 2);
  },
};
