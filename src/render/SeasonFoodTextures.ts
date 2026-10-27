/** 四季节日道具贴图 — 春卷 / 菖蒲叶与两件佩戴物 / 丰收拼盘 / 三色珠子 / 圣诞甜饼 / 彩珠礼花
 *
 *  全部纯 Canvas 现画，不引外部图片。 */

import { Painter, shade } from './TextureUtils';

export const SEASON_FOOD_TILE_NAMES = [
  'chunk_roll', 'calamus', 'pouch_calamus', 'shield_calamus', 'harvest_platter',
  'bead_red', 'bead_yellow', 'bead_blue', 'xmas_cookie', 'firework',
];

/** 一颗珠子：透明底 + 圆珠 + 左上高光 */
const bead = (base: string): Painter => (c, x, y) => {
  c.clearRect(x, y, 16, 16);
  c.fillStyle = base;
  c.fillRect(x + 5, y + 4, 6, 8);
  c.fillRect(x + 4, y + 6, 8, 4);
  c.fillStyle = shade(base, 40);
  c.fillRect(x + 6, y + 5, 2, 2);
  c.fillStyle = shade(base, -40);
  c.fillRect(x + 7, y + 10, 3, 1);
};

export const SEASON_FOOD_PAINTERS: Record<string, Painter> = {
  // 春卷：金黄炸皮卷，斜放，两头露馅
  chunk_roll: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#e0a83c';
    c.fillRect(x + 3, y + 6, 11, 5);
    c.fillRect(x + 4, y + 5, 9, 1);
    c.fillStyle = '#c8871e';
    c.fillRect(x + 3, y + 10, 11, 1);
    c.fillStyle = '#f2d27a';
    c.fillRect(x + 5, y + 6, 3, 1);
    c.fillStyle = '#7ab04a';
    c.fillRect(x + 13, y + 7, 2, 2);
    c.fillStyle = '#e8661e';
    c.fillRect(x + 2, y + 8, 1, 2);
  },
  // 菖蒲叶：两三片细长剑形叶，从水面往上长
  calamus: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#4e9e46';
    c.fillRect(x + 7, y + 2, 2, 14);
    c.fillRect(x + 4, y + 5, 2, 11);
    c.fillRect(x + 10, y + 6, 2, 10);
    c.fillStyle = '#6fbf5c';
    c.fillRect(x + 7, y + 2, 1, 10);
    c.fillRect(x + 4, y + 5, 1, 7);
    c.fillStyle = '#2f6b2a';
    c.fillRect(x + 8, y + 8, 1, 6);
    c.fillStyle = '#c8d86a';
    c.fillRect(x + 6, y + 1, 2, 1);
  },
  // 菖蒲香囊：布囊 + 抽绳 + 一片菖蒲叶
  pouch_calamus: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#4e9e46';
    c.fillRect(x + 4, y + 6, 8, 8);
    c.fillRect(x + 5, y + 5, 6, 1);
    c.fillStyle = '#3a7a34';
    c.fillRect(x + 4, y + 12, 8, 2);
    c.fillStyle = '#e8d8a0';
    c.fillRect(x + 6, y + 3, 4, 2);
    c.fillStyle = '#c8b070';
    c.fillRect(x + 7, y + 5, 2, 1);
    c.fillStyle = '#8fd47a';
    c.fillRect(x + 6, y + 8, 4, 1);
  },
  // 菖蒲护盾：一片编成盾形的菖蒲叶，中间一道木脊
  shield_calamus: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#4e9e46';
    c.fillRect(x + 3, y + 3, 10, 8);
    c.fillRect(x + 4, y + 11, 8, 2);
    c.fillRect(x + 6, y + 13, 4, 1);
    c.fillStyle = '#6fbf5c';
    c.fillRect(x + 4, y + 4, 8, 1);
    c.fillStyle = '#2f6b2a';
    c.fillRect(x + 7, y + 3, 2, 10);
    c.fillStyle = '#c8b070';
    c.fillRect(x + 6, y + 6, 4, 1);
  },
  // 丰收拼盘：浅盘里堆着水果和麦粒
  harvest_platter: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#b08050';
    c.fillRect(x + 2, y + 8, 12, 4);
    c.fillRect(x + 3, y + 12, 10, 1);
    c.fillStyle = '#d0a070';
    c.fillRect(x + 3, y + 8, 10, 1);
    c.fillStyle = '#d62828';
    c.fillRect(x + 4, y + 5, 3, 3);
    c.fillStyle = '#f28518';
    c.fillRect(x + 8, y + 4, 3, 4);
    c.fillStyle = '#e0d060';
    c.fillRect(x + 11, y + 6, 2, 2);
    c.fillRect(x + 6, y + 3, 2, 2);
  },
  bead_red: bead('#c8422a'),
  bead_yellow: bead('#e0b830'),
  bead_blue: bead('#3d6fb0'),
  // 圣诞甜饼：圆形饼干 + 糖霜点 + 一颗装饰珠子
  xmas_cookie: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#b07a3c';
    c.fillRect(x + 3, y + 4, 10, 9);
    c.fillRect(x + 4, y + 3, 8, 11);
    c.fillStyle = '#d0a060';
    c.fillRect(x + 4, y + 4, 8, 2);
    c.fillStyle = '#f2e8d0';
    c.fillRect(x + 5, y + 7, 2, 2);
    c.fillRect(x + 9, y + 9, 2, 2);
    c.fillRect(x + 7, y + 5, 1, 1);
    c.fillStyle = '#c8422a';
    c.fillRect(x + 8, y + 7, 2, 2);
  },
  // 彩珠礼花：三颗珠子绑成一束，顶上一点引信火光
  firework: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#8a6a42';
    c.fillRect(x + 7, y + 8, 2, 7);
    c.fillStyle = '#c8422a';
    c.fillRect(x + 4, y + 5, 3, 3);
    c.fillStyle = '#e0b830';
    c.fillRect(x + 7, y + 3, 3, 3);
    c.fillStyle = '#3d6fb0';
    c.fillRect(x + 10, y + 5, 3, 3);
    c.fillStyle = '#fff2a6';
    c.fillRect(x + 8, y + 1, 1, 2);
  },
};
