/** 腰包贴图 — 这两类以前漏画了：创造模式背包一打开就崩（iconFor 找不到 painter）；竹子贴图已拆到 BambooTextures.ts */

import { Painter, shade } from './TextureUtils';

/** 腰包通用画法：皮革底 + 布面 + 翻盖 + 铜扣，颜色由入参决定 */
const bag = (cloth: string): Painter => (c, x, y) => {
  c.fillStyle = '#8a5f30'; c.fillRect(x + 3, y + 5, 10, 9);          // 皮革底
  c.fillStyle = cloth;     c.fillRect(x + 4, y + 6, 8, 7);           // 布面
  c.fillStyle = shade(cloth, -25); c.fillRect(x + 3, y + 4, 10, 2);  // 翻盖
  c.fillStyle = '#f0c030'; c.fillRect(x + 7, y + 9, 2, 3);           // 铜扣
  c.fillStyle = '#fff2a6'; c.fillRect(x + 7, y + 9, 1, 1);           // 高光
};

/** 腰包颜色表：key 必须和 BLOCKS 里的 tex 名一一对应 */
const BAG_CLOTH: Record<string, string> = {
  bag_wool: '#e8e8e8', bag_mang: '#f0cf3a', bag_star: '#4a48b8', bag_glass: '#9fdcf8',
  bag_grass: '#4e9e46', bag_leaf: '#2f7a2a', bag_bamboo: '#7ab04a', bag_feather: '#f5f5f0',
  bag_rubber: '#2c2c30',
  bag_wool_red: '#b03a2e', bag_wool_yellow: '#f0cf3a', bag_wool_blue: '#3d5fb0',
  bag_wool_green: '#4e9e46', bag_wool_pink: '#e893b8', bag_wool_orange: '#d97b2e',
  bag_wool_black: '#2e2e2e', bag_wool_gray: '#9a9a9a', bag_wool_purple: '#7a3fa0',
  bag_wool_swan: '#f2e2a8', bag_wool_lightgreen: '#a8d87a', bag_wool_star: '#4a48b8',
  bag_wool_blood: '#5a1510', bag_wool_deepgreen: '#1e5c2a',
};

/** 23 种腰包的贴图（同一种画法换颜色） */
export const BAG_PAINTERS: Record<string, Painter> = Object.fromEntries(
  Object.entries(BAG_CLOTH).map(([name, cloth]) => [name, bag(cloth)]),
);
