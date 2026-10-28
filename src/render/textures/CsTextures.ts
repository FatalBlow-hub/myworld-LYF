/** CS 大赛道具贴图 — 手枪 / 弹药 / 闪光弹 / 手雷 / 步枪 / 毒药瓶 / AK47
 *
 *  全部纯 Canvas 现画，斜置长条枪械共用一套画法（枪管 + 机匣 + 弹匣/弹鼓 + 握把）。 */

import { Painter, shade } from './TextureUtils';

interface GunSkin {
  barrel: string;  // 枪管
  body: string;    // 机匣
  grip: string;    // 握把/弹匣
  long: boolean;   // 长枪（步枪/AK）还是短枪（手枪）
}

/** 一把枪：从左下握把斜指向右上枪口 */
const gun = (s: GunSkin): Painter => (c, x, y) => {
  const px = (dx: number, dy: number, col: string) => { c.fillStyle = col; c.fillRect(x + dx, y + dy, 1, 1); };
  if (s.long) {
    for (let t = 0; t < 8; t++) px(15 - t, t + 3, s.barrel);   // 长枪管
    px(8, 4, s.body); px(7, 5, s.body); px(6, 6, s.body); px(5, 7, s.body);
    px(6, 5, s.body); px(5, 6, s.body);
    px(4, 8, s.grip); px(3, 9, s.grip); px(3, 10, s.grip); px(2, 11, s.grip);
    px(7, 8, s.grip); px(7, 9, s.grip);                        // 弹匣
  } else {
    for (let t = 0; t < 5; t++) px(12 - t, t + 5, s.barrel);   // 短枪管
    px(8, 6, s.body); px(7, 7, s.body); px(6, 8, s.body);
    px(5, 8, s.grip); px(4, 9, s.grip); px(4, 10, s.grip); px(3, 11, s.grip);
  }
  px(15 - (s.long ? 0 : 7), s.long ? 3 : 5, shade(s.barrel, -40)); // 枪口暗口
};

export const CS_TILE_NAMES = ['cs_pistol', 'cs_rifle', 'cs_ak47', 'cs_ammo', 'cs_flash', 'cs_grenade', 'cs_toxic'];

export const CS_PAINTERS: Record<string, Painter> = {
  cs_pistol: gun({ barrel: '#7a8088', body: '#5a6068', grip: '#3a3030', long: false }),
  cs_rifle:  gun({ barrel: '#8a8f98', body: '#4a4048', grip: '#6b4423', long: true }),
  cs_ak47:   gun({ barrel: '#b8842e', body: '#5a3a1e', grip: '#7a5020', long: true }),
  // 弹药：一排黄铜子弹
  cs_ammo: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    for (let i = 0; i < 3; i++) {
      c.fillStyle = '#e0b048';
      c.fillRect(x + 2 + i * 4, y + 4, 3, 9);
      c.fillStyle = '#c08a20';
      c.fillRect(x + 2 + i * 4, y + 3, 3, 1);
      c.fillStyle = '#8a6a2a';
      c.fillRect(x + 2 + i * 4, y + 12, 3, 2);
    }
  },
  // 闪光弹：银色罐体 + 几个出光孔
  cs_flash: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#c8ccd4';
    c.fillRect(x + 5, y + 4, 6, 8);
    c.fillStyle = '#9aa0a8';
    c.fillRect(x + 5, y + 11, 6, 2);
    c.fillStyle = '#ffffff';
    c.fillRect(x + 6, y + 5, 1, 1);
    c.fillRect(x + 9, y + 6, 1, 1);
    c.fillRect(x + 7, y + 8, 1, 1);
    c.fillStyle = '#f2e07a';
    c.fillRect(x + 4, y + 2, 8, 1);
  },
  // 手雷：深绿球体 + 保险环
  cs_grenade: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#3e5a2e';
    c.fillRect(x + 4, y + 5, 8, 9);
    c.fillRect(x + 5, y + 4, 6, 1);
    c.fillRect(x + 5, y + 14, 6, 1);
    c.fillStyle = '#2a4020';
    for (let i = 0; i < 4; i++) c.fillRect(x + 5 + i * 2, y + 7, 1, 6);
    c.fillStyle = '#8a9098';
    c.fillRect(x + 9, y + 2, 3, 2);
    c.fillRect(x + 11, y + 1, 1, 1);
  },
  // 毒药瓶：墨绿玻璃瓶，瓶口塞着木塞
  cs_toxic: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#3a6a3a';
    c.fillRect(x + 5, y + 5, 6, 8);
    c.fillRect(x + 6, y + 4, 4, 1);
    c.fillStyle = '#244a26';
    c.fillRect(x + 6, y + 8, 4, 4);
    c.fillStyle = '#9a7a3a';
    c.fillRect(x + 6, y + 2, 4, 2);
    c.fillStyle = '#7ac84a';
    c.fillRect(x + 7, y + 6, 1, 1);
  },
};
