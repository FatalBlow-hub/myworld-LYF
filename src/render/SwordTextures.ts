/** 剑贴图 — 六把剑共用同一个画法，只换配色：对角刀身 + 上缘高光 + 护手 + 深色手柄 */

import { Painter } from './TextureUtils';

interface SwordSkin {
  blade: string; // 刀身主色
  edge: string;  // 刀身上缘高光
  guard: string; // 护手
  grip: string;  // 手柄
}

/** 一把剑：刀尖朝右上角，手柄在左下角，MC 经典斜剑姿势 */
const sword = (s: SwordSkin): Painter => (c, x, y) => {
  const px = (dx: number, dy: number, col: string) => { c.fillStyle = col; c.fillRect(x + dx, y + dy, 1, 1); };
  // 刀身：2 像素宽的斜带，从 (15,1) 一路斜到 (5,11)；上缘一条亮色描边
  for (let t = 0; t <= 10; t++) {
    px(15 - t, t + 2, s.blade);
    px(15 - t, t + 1, t >= 2 ? s.edge : s.blade); // 靠剑尖的两格不高光，尖端收成一点
  }
  // 护手：横在刀身和手柄中间的小方块
  px(4, 11, s.guard); px(5, 11, s.guard); px(4, 12, s.guard); px(3, 12, s.guard);
  // 手柄：护手往左下角延出去的深色小短棍
  px(4, 13, s.grip); px(3, 13, s.grip); px(3, 14, s.grip); px(2, 14, s.grip); px(2, 15, s.grip); px(1, 15, s.grip);
};

/** 六把剑的配色：key 和 BLOCKS 里的 tex 名一一对应 */
const SWORD_SKINS: Record<string, SwordSkin> = {
  sword_wood:    { blade: '#8a5a2e', edge: '#b08040', guard: '#6b4423', grip: '#4a2e14' },
  sword_iron:    { blade: '#c8cdd4', edge: '#f0f4f8', guard: '#8a9098', grip: '#4a2e14' },
  sword_gold:    { blade: '#ffd94a', edge: '#fff2b0', guard: '#c89818', grip: '#4a2e14' },
  sword_diamond: { blade: '#6ee8e0', edge: '#d0fcf8', guard: '#30a8a0', grip: '#4a2e14' },
  sword_snow:    { blade: '#bfe8ff', edge: '#ffffff', guard: '#6aa8d0', grip: '#2e5470' },
  sword_blood:   { blade: '#8a1a1a', edge: '#d83a3a', guard: '#4a0f0c', grip: '#2e0a08' },
};

export const SWORD_TILE_NAMES = Object.keys(SWORD_SKINS);
export const SWORD_PAINTERS: Record<string, Painter> = Object.fromEntries(
  Object.entries(SWORD_SKINS).map(([name, skin]) => [name, sword(skin)]),
);
