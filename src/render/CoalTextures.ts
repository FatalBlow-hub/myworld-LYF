/** 煤系列贴图 — 煤块/煤条/煤炭/煤粉，黑乎乎带点亮面，跟 BirdTextures 一套画法 */

import type { Painter } from './Textures';

/** 画一块煤疙瘩：深灰主体 + 黑色凹坑 + 亮灰高光 */
const lump = (spots: [number, number, number, number][]): Painter => (c, x, y) => {
  for (const [px, py, pw, ph] of spots) {
    c.fillStyle = '#3a3a3a';
    c.fillRect(x + px, y + py, pw, ph);
    c.fillStyle = '#1c1c1c';
    c.fillRect(x + px + 1, y + py + ph - 2, pw - 2, 1); // 下缘阴影
    c.fillStyle = '#5c5c5c';
    c.fillRect(x + px, y + py, 1, 1); // 左上角高光
  }
};

export const COAL_PAINTERS: Record<string, Painter> = {
  coal_chunk: lump([[3, 4, 5, 6], [8, 6, 5, 5], [5, 10, 4, 4]]), // 三块煤疙瘩堆一起
  coal_bar: (c, x, y) => {
    // 煤条：一根横放的长条
    c.fillStyle = '#3a3a3a';
    c.fillRect(x + 2, y + 6, 12, 4);
    c.fillStyle = '#1c1c1c';
    c.fillRect(x + 2, y + 9, 12, 1);
    c.fillStyle = '#5c5c5c';
    c.fillRect(x + 2, y + 6, 12, 1);
    c.fillStyle = '#2a2a2a';
    c.fillRect(x + 5, y + 7, 1, 2); c.fillRect(x + 9, y + 7, 1, 2); // 刻痕
  },
  coal: lump([[4, 4, 8, 8]]), // 煤炭：一整块光溜溜的煤
  coal_dust: (c, x, y) => {
    // 煤粉：一撮小黑点
    for (const [px, py] of [[4, 5], [7, 4], [10, 5], [5, 8], [9, 8], [12, 8], [4, 11], [7, 10], [10, 11], [6, 13], [11, 13]] as const) {
      c.fillStyle = '#2e2e2e';
      c.fillRect(x + px, y + py, 2, 2);
    }
  },
};
