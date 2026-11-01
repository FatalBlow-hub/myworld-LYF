/** 科技贴图 — 芯片/电脑（顶面键盘 + 侧面显示器）/无尽方块/无尽之剑（2026-11-01 设定批次） */

import { Painter, TILE } from './TextureUtils';

export const TECH_TILE_NAMES = [
  'chip', 'computer_top', 'computer_side', 'endless_block', 'sword_endless',
];

/** 彩虹剑刃的渐变带（刀尖 → 刀根）：红橙黄绿青蓝紫依次排 */
const RAINBOW = ['#e84545', '#f08a2e', '#f0d43a', '#5ec84a', '#3ac8c8', '#4a7ae8', '#8a4ae8'];

export const TECH_PAINTERS: Record<string, Painter> = {
  // 芯片：绿板子 + 四边金脚针 + 中间一块黑核心
  chip: (c, x, y) => {
    c.clearRect(x, y, TILE, TILE);
    c.fillStyle = '#c8a84a'; // 金脚针
    for (let i = 2; i < TILE - 2; i += 3) {
      c.fillRect(x + i, y, 1, 2); c.fillRect(x + i, y + TILE - 2, 1, 2);
      c.fillRect(x, y + i, 2, 1); c.fillRect(x + TILE - 2, y + i, 2, 1);
    }
    c.fillStyle = '#2a7a3a'; // 绿板
    c.fillRect(x + 2, y + 2, 12, 12);
    c.fillStyle = '#1e5c2c'; // 板子纹路
    c.fillRect(x + 3, y + 5, 10, 1); c.fillRect(x + 3, y + 10, 10, 1);
    c.fillStyle = '#181818'; // 黑核心
    c.fillRect(x + 6, y + 6, 4, 4);
    c.fillStyle = '#d8d8d8';
    c.fillRect(x + 7, y + 7, 1, 1);
  },
  // 电脑顶面 = 键盘：深色底 + 三排浅色键帽 + 下面一条空格
  computer_top: (c, x, y) => {
    c.clearRect(x, y, TILE, TILE);
    c.fillStyle = '#3a3a42';
    c.fillRect(x, y, TILE, TILE);
    c.fillStyle = '#222228'; // 键盘底座
    c.fillRect(x + 1, y + 2, 14, 12);
    c.fillStyle = '#9a9aa8'; // 键帽三排
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < 7; i++) c.fillRect(x + 2 + i * 2, y + 3 + r * 3, 1, 2);
    }
    c.fillRect(x + 3, y + 12, 10, 2); // 空格
    c.fillStyle = '#5ec84a'; // 电源指示灯
    c.fillRect(x + 14, y + 2, 1, 1);
  },
  // 电脑侧面 = 显示器：深色边框 + 大黑屏 + 底下小支架（刚做好是黑屏的）
  computer_side: (c, x, y) => {
    c.clearRect(x, y, TILE, TILE);
    c.fillStyle = '#2a2a30';
    c.fillRect(x, y, TILE, TILE);
    c.fillStyle = '#4a4a55'; // 金属背壳
    c.fillRect(x + 1, y + 1, 14, 12);
    c.fillStyle = '#101014'; // 黑屏
    c.fillRect(x + 3, y + 3, 10, 8);
    c.fillStyle = '#c8ccd4'; // 苹果小 logo
    c.fillRect(x + 7, y + 6, 2, 2);
    c.fillStyle = '#3a3a42'; // 支架 + 底座
    c.fillRect(x + 7, y + 13, 2, 2);
    c.fillRect(x + 4, y + 15, 8, 1);
  },
  // 无尽方块：彩虹边框回纹 + 橙色雕花核心（照设定图的画法简化成小像素版）
  endless_block: (c, x, y) => {
    c.clearRect(x, y, TILE, TILE);
    // 边框：四条边各染一段彩虹色，转角压暗
    for (let i = 0; i < TILE; i++) {
      const col = RAINBOW[Math.min(RAINBOW.length - 1, Math.floor(i / (TILE / RAINBOW.length)))];
      c.fillStyle = col;
      c.fillRect(x + i, y, 1, 2); c.fillRect(x + i, y + TILE - 2, 1, 2);
      c.fillRect(x, y + i, 2, 1); c.fillRect(x + TILE - 2, y + i, 2, 1);
    }
    c.fillStyle = '#3a2418'; // 四角暗纹
    for (const [dx, dy] of [[0, 0], [13, 0], [0, 13], [13, 13]]) c.fillRect(x + dx, y + dy, 3, 3);
    c.fillStyle = '#c85a1a'; // 核心底
    c.fillRect(x + 3, y + 3, 10, 10);
    c.fillStyle = '#e8a03a'; // 双卷花纹（图上的蜗卷简化成两个圈）
    for (const cx of [5, 9]) {
      c.fillRect(x + cx, y + 5, 3, 3);
      c.fillStyle = '#7a3a10';
      c.fillRect(x + cx + 1, y + 6, 1, 1);
      c.fillStyle = '#e8a03a';
    }
    c.fillStyle = '#f0d43a'; // 核心上下描边
    c.fillRect(x + 4, y + 3, 8, 1); c.fillRect(x + 4, y + 12, 8, 1);
  },
  // 无尽之剑：彩虹渐变剑刃 + 深色剑柄 + 柄尾一颗小彩虹宝石（和其他剑一个斜姿势）
  sword_endless: (c, x, y) => {
    c.clearRect(x, y, TILE, TILE);
    const px = (dx: number, dy: number, col: string) => { c.fillStyle = col; c.fillRect(x + dx, y + dy, 1, 1); };
    // 剑刃：从右上角 (15,1) 斜到 (5,11)，沿长度染彩虹渐变，上缘加白色高光
    for (let t = 0; t <= 10; t++) {
      const col = RAINBOW[Math.min(RAINBOW.length - 1, Math.floor(t / 11 * RAINBOW.length))];
      px(15 - t, t + 2, col);
      px(15 - t, t + 1, t >= 2 ? '#f0f4ff' : col);
    }
    // 护手：紫黑
    px(4, 11, '#3a2a5a'); px(5, 11, '#3a2a5a'); px(4, 12, '#3a2a5a'); px(3, 12, '#3a2a5a');
    // 剑柄：深色
    px(4, 13, '#241a30'); px(3, 13, '#241a30'); px(3, 14, '#241a30'); px(2, 14, '#241a30'); px(2, 15, '#241a30');
    // 柄尾彩虹小宝石
    px(1, 15, '#e84545'); px(1, 14, '#5ec84a'); px(0, 15, '#4a7ae8');
  },
};
