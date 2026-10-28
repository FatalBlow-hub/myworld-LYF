/** 柳树贴图 — 柳树干 / 柳叶（垂挂）/ 三阶段树苗 / 柳絮孢子 / 柳条
 *
 *  柳絮腰包的画法在 BagTextures.ts（同一种腰包换配色），这里不管。 */

import { Painter, TILE, fill, shade, speckle } from './TextureUtils';

/** 柳树干：浅褐树皮 + 纵向裂纹（比普通木头浅一档，沙滩上看着清爽） */
const willowLog: Painter = (c, x, y) => {
  fill(c, x, y, '#8a6a42');
  speckle(c, x, y, ['#7a5c38', '#9a7a50', '#6a4e2e'], 90);
  c.fillStyle = '#5e4428';
  for (const dx of [3, 7, 11]) c.fillRect(x + dx, y + 1, 1, TILE - 2);
  c.fillStyle = '#a8885c';
  c.fillRect(x + 5, y + 2, 1, 5);
  c.fillRect(x + 9, y + 9, 1, 5);
};

/** 柳树叶：黄绿底 + 向下垂的细枝条（垂柳的辨识特征） */
const willowLeaf: Painter = (c, x, y) => {
  fill(c, x, y, '#8fc45a');
  speckle(c, x, y, ['#7cb04a', '#a2d46a', '#6b9e3c'], 110);
  c.fillStyle = '#5e8c34';
  for (const dx of [2, 6, 10, 14]) {
    c.fillRect(x + dx, y + 3, 1, 11);
    c.fillRect(x + dx - 1, y + 6, 1, 1);
    c.fillRect(x + dx + 1, y + 9, 1, 1);
  }
  c.fillStyle = '#c2e88a';
  for (const dx of [3, 8, 12]) c.fillRect(x + dx, y + 2, 1, 4);
};

/** 柳树苗：一根细茎 + 两片下垂的叶子，阶段越高越茂盛 */
const willowSap = (height: number, leaves: number): Painter => (c, x, y) => {
  c.clearRect(x, y, TILE, TILE);
  c.fillStyle = '#7a5c38';
  c.fillRect(x + 7, y + 16 - height, 2, height);
  c.fillStyle = '#8fc45a';
  for (let i = 0; i < leaves; i++) {
    const ly = y + 15 - Math.floor((height / leaves) * (i + 1));
    const side = i % 2 === 0 ? -1 : 1;
    c.fillRect(x + 7 + side * 4, ly, 4, 2);
    c.fillRect(x + 7 + side * 6, ly + 2, 1, 2);
  }
};

export const WILLOW_TILE_NAMES = [
  'willow_log', 'willow_log_top', 'leaves_willow',
  'sap_willow_1', 'sap_willow_2', 'sap_willow_3',
  'willow_fluff', 'willow_branch',
  'trap_willow', 'maple_knife',
];

export const WILLOW_PAINTERS: Record<string, Painter> = {
  willow_log: willowLog,
  willow_log_top: (c, x, y) => {
    fill(c, x, y, '#a8885c');
    c.strokeStyle = '#6a4e2e';
    c.lineWidth = 1;
    for (const r of [3, 6]) {
      c.beginPath();
      c.arc(x + TILE / 2, y + TILE / 2, r, 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = shade('#8a6a42', -18);
    c.fillRect(x + 7, y + 7, 2, 2);
  },
  leaves_willow: willowLeaf,
  sap_willow_1: willowSap(6, 2),
  sap_willow_2: willowSap(10, 4),
  sap_willow_3: willowSap(13, 6),
  // 柳絮孢子：透明底上一小团奶白色绒球，飘在春天里
  willow_fluff: (c, x, y) => {
    c.clearRect(x, y, TILE, TILE);
    c.fillStyle = '#f7f4dc';
    c.fillRect(x + 6, y + 6, 4, 4);
    c.fillStyle = '#fffdf0';
    c.fillRect(x + 5, y + 5, 2, 2);
    c.fillRect(x + 9, y + 5, 2, 2);
    c.fillRect(x + 5, y + 9, 2, 2);
    c.fillRect(x + 9, y + 9, 2, 2);
    c.fillStyle = '#d8d2a8';
    c.fillRect(x + 7, y + 7, 2, 2);
    c.fillStyle = '#ffffff';
    c.fillRect(x + 3, y + 3, 1, 1);
    c.fillRect(x + 12, y + 4, 1, 1);
    c.fillRect(x + 4, y + 12, 1, 1);
  },
  // 柳条陷阱：柳条编成的浅盘，中间一圈草绳（物品图标；放下后外观是伪装的方块）
  trap_willow: (c, x, y) => {
    c.clearRect(x, y, TILE, TILE);
    c.fillStyle = '#b8a44a';
    c.fillRect(x + 2, y + 6, 12, 6);
    c.fillRect(x + 3, y + 5, 10, 1);
    c.fillRect(x + 3, y + 12, 10, 1);
    c.fillStyle = '#8f7a2e';
    for (let i = 0; i < 5; i++) c.fillRect(x + 3 + i * 2, y + 6, 1, 6);
    c.fillStyle = '#7ab04a';
    c.fillRect(x + 6, y + 8, 4, 2);
    c.fillStyle = '#cfe88a';
    c.fillRect(x + 7, y + 8, 1, 1);
  },
  // 枫叶飞刀：一片红枫叶削成的薄刃，左下角一小截手柄
  maple_knife: (c, x, y) => {
    c.clearRect(x, y, TILE, TILE);
    c.fillStyle = '#c8422a';
    c.fillRect(x + 6, y + 2, 3, 4);
    c.fillRect(x + 4, y + 4, 7, 5);
    c.fillRect(x + 5, y + 8, 4, 2);
    c.fillStyle = '#e8661e';
    c.fillRect(x + 7, y + 3, 1, 6);
    c.fillStyle = '#8f2410';
    c.fillRect(x + 5, y + 10, 2, 4);
    c.fillStyle = '#e8b060';
    c.fillRect(x + 5, y + 13, 2, 1);
  },
  // 柳条：一根细长柔韧的枝条，带两片小叶
  willow_branch: (c, x, y) => {
    c.clearRect(x, y, TILE, TILE);
    c.strokeStyle = '#b8a44a';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x + 3, y + 13);
    c.quadraticCurveTo(x + 7, y + 6, x + 13, y + 3);
    c.stroke();
    c.fillStyle = '#8fc45a';
    c.fillRect(x + 8, y + 4, 3, 2);
    c.fillRect(x + 5, y + 8, 2, 2);
    c.fillStyle = '#c2e88a';
    c.fillRect(x + 12, y + 2, 1, 1);
  },
};
