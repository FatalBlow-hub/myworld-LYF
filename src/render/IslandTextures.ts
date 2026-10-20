/** 小岛生存贴图 — 绘制南瓜与西瓜的果实方块、切片、种子、3 个苗期阶段及三种专属水果的 16×16 像素图 */

import { Painter, TILE, fill, speckle } from './TextureUtils';

export const ISLAND_TILE_NAMES = [
  'pumpkin_top', 'pumpkin_side', 'pumpkin_slice', 'pumpkin_seed',
  'pumpkin_stage1', 'pumpkin_stage2', 'pumpkin_stage3',
  'melon_top', 'melon_side', 'melon_slice', 'melon_seed',
  'melon_stage1', 'melon_stage2', 'melon_stage3',
  'apple', 'peach', 'orange', 'pear', 'persimmon', 'persimmon_cake', 'banana',
  // —— 六种果树树叶（本色 + 秋叶版；香蕉叶只有外出探索的香蕉岛才有）——
  'leaves_apple', 'leaves_peach', 'leaves_orange', 'leaves_pear', 'leaves_persimmon', 'leaves_banana',
  'leaves_apple_autumn', 'leaves_peach_autumn', 'leaves_orange_autumn', 'leaves_pear_autumn', 'leaves_persimmon_autumn', 'leaves_banana_autumn',
  // —— 六种树苗 × 三阶段（小苗/幼树/半成熟树） ——
  ...['apple', 'peach', 'orange', 'pear', 'persimmon', 'coconut'].flatMap((k) => [`sap_${k}_1`, `sap_${k}_2`, `sap_${k}_3`]),
];

export const ISLAND_PAINTERS: Record<string, Painter> = {
  pumpkin_top: (c, x, y) => {
    fill(c, x, y, '#d9761e');
    speckle(c, x, y, ['#e88a2e', '#b85c12'], 40);
    c.fillStyle = '#a84f0c';
    c.fillRect(x + 7, y, 2, TILE);
    c.fillRect(x, y + 7, TILE, 2);
    c.fillStyle = '#5a6e28';
    c.fillRect(x + 6, y + 6, 4, 4);
    c.fillStyle = '#3d4f18';
    c.fillRect(x + 7, y + 7, 2, 2);
  },
  pumpkin_side: (c, x, y) => {
    fill(c, x, y, '#d9761e');
    speckle(c, x, y, ['#e88a2e', '#c06214'], 36);
    c.fillStyle = '#a84f0c';
    for (const col of [2, 6, 10, 14]) c.fillRect(x + col, y, 1, TILE);
    c.fillStyle = '#f09c3e';
    for (const col of [0, 4, 8, 12]) c.fillRect(x + col, y + 2, 1, TILE - 4);
  },
  pumpkin_slice: (c, x, y) => {
    c.fillStyle = '#b85c12';
    c.fillRect(x + 3, y + 10, 10, 3);
    c.fillRect(x + 2, y + 8, 2, 3);
    c.fillRect(x + 12, y + 8, 2, 3);
    c.fillStyle = '#f29b38';
    c.fillRect(x + 4, y + 6, 8, 4);
    c.fillRect(x + 5, y + 4, 6, 2);
    c.fillStyle = '#ffd175';
    c.fillRect(x + 6, y + 6, 4, 2);
  },
  pumpkin_seed: (c, x, y) => {
    const seeds = [[4, 5], [9, 4], [6, 9], [10, 10]];
    for (const [sx, sy] of seeds) {
      c.fillStyle = '#d4be8d';
      c.fillRect(x + sx, y + sy, 3, 4);
      c.fillStyle = '#f5ebd1';
      c.fillRect(x + sx + 1, y + sy + 1, 1, 2);
    }
  },
  pumpkin_stage1: (c, x, y) => {
    c.fillStyle = '#6db33f';
    c.fillRect(x + 7, y + 12, 2, 4);
    c.fillStyle = '#8fd158';
    c.fillRect(x + 6, y + 11, 2, 2);
    c.fillRect(x + 8, y + 11, 2, 2);
  },
  pumpkin_stage2: (c, x, y) => {
    c.fillStyle = '#5a9e32';
    c.fillRect(x + 7, y + 8, 2, 8);
    c.fillStyle = '#76ba46';
    c.fillRect(x + 4, y + 9, 3, 2);
    c.fillRect(x + 9, y + 8, 3, 2);
    c.fillRect(x + 5, y + 12, 2, 2);
  },
  pumpkin_stage3: (c, x, y) => {
    c.fillStyle = '#4a8526';
    c.fillRect(x + 7, y + 4, 2, 12);
    c.fillStyle = '#65a838';
    c.fillRect(x + 3, y + 6, 4, 3);
    c.fillRect(x + 9, y + 5, 4, 3);
    c.fillRect(x + 4, y + 10, 3, 3);
    c.fillRect(x + 9, y + 10, 3, 3);
    c.fillStyle = '#f0b429';
    c.fillRect(x + 7, y + 3, 2, 2);
  },
  melon_top: (c, x, y) => {
    fill(c, x, y, '#3b7a28');
    speckle(c, x, y, ['#4f9638', '#2a5c1b'], 40);
    c.fillStyle = '#68b048';
    c.fillRect(x + 6, y + 2, 4, 12);
    c.fillRect(x + 2, y + 6, 12, 4);
    c.fillStyle = '#254d17';
    c.fillRect(x + 7, y + 7, 2, 2);
  },
  melon_side: (c, x, y) => {
    fill(c, x, y, '#3b7a28');
    c.fillStyle = '#68b048';
    for (const col of [1, 5, 9, 13]) c.fillRect(x + col, y, 2, TILE);
    c.fillStyle = '#254d17';
    for (const col of [0, 4, 8, 12, 15]) c.fillRect(x + col, y, 1, TILE);
    speckle(c, x, y, ['#4f9638', '#2a5c1b'], 24);
  },
  melon_slice: (c, x, y) => {
    c.fillStyle = '#2e6b22';
    c.fillRect(x + 3, y + 11, 10, 2);
    c.fillRect(x + 2, y + 9, 2, 2);
    c.fillRect(x + 12, y + 9, 2, 2);
    c.fillStyle = '#a8e070';
    c.fillRect(x + 4, y + 10, 8, 1);
    c.fillStyle = '#e03c3c';
    c.fillRect(x + 4, y + 6, 8, 4);
    c.fillRect(x + 5, y + 4, 6, 2);
    c.fillStyle = '#1c1c1c';
    c.fillRect(x + 6, y + 7, 1, 1);
    c.fillRect(x + 9, y + 7, 1, 1);
    c.fillRect(x + 7, y + 5, 1, 1);
  },
  melon_seed: (c, x, y) => {
    const seeds = [[4, 5], [9, 4], [6, 9], [10, 10]];
    for (const [sx, sy] of seeds) {
      c.fillStyle = '#2b241d';
      c.fillRect(x + sx, y + sy, 3, 4);
      c.fillStyle = '#5c4e3e';
      c.fillRect(x + sx + 1, y + sy + 1, 1, 2);
    }
  },
  melon_stage1: (c, x, y) => {
    c.fillStyle = '#5ca638';
    c.fillRect(x + 7, y + 12, 2, 4);
    c.fillStyle = '#82cc56';
    c.fillRect(x + 6, y + 11, 2, 2);
    c.fillRect(x + 8, y + 11, 2, 2);
  },
  melon_stage2: (c, x, y) => {
    c.fillStyle = '#498c28';
    c.fillRect(x + 7, y + 8, 2, 8);
    c.fillStyle = '#6db846';
    c.fillRect(x + 4, y + 8, 3, 2);
    c.fillRect(x + 9, y + 9, 3, 2);
    c.fillRect(x + 9, y + 12, 2, 2);
  },
  melon_stage3: (c, x, y) => {
    c.fillStyle = '#38731c';
    c.fillRect(x + 7, y + 4, 2, 12);
    c.fillStyle = '#58a134';
    c.fillRect(x + 3, y + 5, 4, 3);
    c.fillRect(x + 9, y + 6, 4, 3);
    c.fillRect(x + 3, y + 10, 4, 3);
    c.fillRect(x + 9, y + 10, 4, 3);
    c.fillStyle = '#ffd942';
    c.fillRect(x + 7, y + 3, 2, 2);
  },
  apple: (c, x, y) => {
    c.fillStyle = '#5a3a1e';
    c.fillRect(x + 7, y + 2, 2, 3);
    c.fillStyle = '#4e9e36';
    c.fillRect(x + 9, y + 2, 3, 2);
    c.fillStyle = '#d62828';
    c.fillRect(x + 4, y + 5, 8, 8);
    c.fillRect(x + 3, y + 6, 10, 6);
    c.fillStyle = '#a81c1c';
    c.fillRect(x + 4, y + 12, 8, 2);
    c.fillStyle = '#ff7b7b';
    c.fillRect(x + 5, y + 6, 2, 3);
  },
  peach: (c, x, y) => {
    c.fillStyle = '#4e9e36';
    c.fillRect(x + 6, y + 2, 4, 2);
    c.fillStyle = '#ff9ebb';
    c.fillRect(x + 4, y + 5, 8, 8);
    c.fillRect(x + 3, y + 6, 10, 6);
    c.fillRect(x + 7, y + 4, 2, 1);
    c.fillStyle = '#e85d88';
    c.fillRect(x + 7, y + 6, 1, 7);
    c.fillRect(x + 5, y + 12, 6, 2);
    c.fillStyle = '#ffd1e0';
    c.fillRect(x + 5, y + 6, 2, 2);
  },
  orange: (c, x, y) => {
    c.fillStyle = '#3d8528';
    c.fillRect(x + 7, y + 2, 3, 2);
    c.fillStyle = '#f28518';
    c.fillRect(x + 4, y + 4, 8, 10);
    c.fillRect(x + 3, y + 5, 10, 8);
    c.fillStyle = '#cc660a';
    c.fillRect(x + 9, y + 8, 1, 1);
    c.fillRect(x + 7, y + 11, 1, 1);
    c.fillRect(x + 10, y + 11, 1, 1);
    c.fillStyle = '#ffb84d';
    c.fillRect(x + 5, y + 5, 3, 2);
  },
  // 梨：上细下宽的葫芦形，淡青黄色
  pear: (c, x, y) => {
    c.fillStyle = '#5a3a1e';
    c.fillRect(x + 7, y + 1, 2, 3);
    c.fillStyle = '#3d8528';
    c.fillRect(x + 9, y + 2, 3, 2);
    c.fillStyle = '#d8e078';
    c.fillRect(x + 6, y + 4, 4, 4);
    c.fillRect(x + 4, y + 7, 8, 6);
    c.fillRect(x + 5, y + 13, 6, 1);
    c.fillStyle = '#b8c458';
    c.fillRect(x + 4, y + 11, 8, 2);
    c.fillStyle = '#f2f4b8';
    c.fillRect(x + 5, y + 8, 2, 3);
  },
  // 柿子：橙红色扁圆，顶上带绿色柿蒂，秋天的颜色
  persimmon: (c, x, y) => {
    c.fillStyle = '#5a3a1e';
    c.fillRect(x + 7, y + 1, 2, 2);
    c.fillStyle = '#3d8528';
    c.fillRect(x + 5, y + 3, 6, 2);
    c.fillStyle = '#e8661e';
    c.fillRect(x + 4, y + 5, 8, 8);
    c.fillRect(x + 3, y + 6, 10, 6);
    c.fillStyle = '#c84a10';
    c.fillRect(x + 4, y + 11, 8, 2);
    c.fillStyle = '#ffb060';
    c.fillRect(x + 5, y + 6, 2, 3);
  },
  // 柿子饼：柿肉摊成的小圆饼，边上烤出麦色，面上还沾着几粒麦子
  persimmon_cake: (c, x, y) => {
    c.fillStyle = '#c8792e';
    c.fillRect(x + 3, y + 4, 10, 8);
    c.fillRect(x + 2, y + 5, 12, 6);
    c.fillStyle = '#e8661e';
    c.fillRect(x + 4, y + 6, 8, 4);
    c.fillStyle = '#f0a040';
    c.fillRect(x + 5, y + 6, 2, 2);
    c.fillRect(x + 9, y + 7, 2, 1);
    c.fillStyle = '#a05a1e';
    c.fillRect(x + 3, y + 10, 3, 1);
    c.fillRect(x + 10, y + 5, 2, 1);
    c.fillStyle = '#f2e0a8';
    c.fillRect(x + 5, y + 4, 1, 1);
    c.fillRect(x + 10, y + 9, 1, 1);
    c.fillRect(x + 7, y + 11, 1, 1);
  },
};

// —— 果树树叶：统一画法（底色 + 噪点 + 果实斑点），每种树换配色和果形 ——
const fruitDots = (c: CanvasRenderingContext2D, x: number, y: number, fruit: string, hi: string, long = false) => {
  const dots = [[3, 3], [11, 4], [6, 8], [12, 10], [4, 12]];
  c.fillStyle = fruit;
  for (const [dx, dy] of dots) c.fillRect(x + dx, y + dy, long ? 1 : 2, long ? 3 : 2);
  c.fillStyle = hi;
  for (const [dx, dy] of dots) c.fillRect(x + dx, y + dy, 1, 1);
};
const fruitLeaf = (base: string, spots: string[], fruit: string, hi: string, long = false): Painter =>
  (c, x, y) => {
    fill(c, x, y, base);
    speckle(c, x, y, spots, 120);
    fruitDots(c, x, y, fruit, hi, long);
  };
ISLAND_PAINTERS.leaves_apple = fruitLeaf('#2f6119', ['#264f14', '#3d7a24', '#1e3f0e'], '#d62828', '#ff7b7b');       // 深绿叶 + 红苹果
ISLAND_PAINTERS.leaves_peach = fruitLeaf('#7cb85c', ['#8fc96e', '#a8d98a', '#e8a0b8'], '#ff9ebb', '#ffd1e0');       // 嫩绿泛粉 + 粉桃子
ISLAND_PAINTERS.leaves_orange = fruitLeaf('#7a9e2e', ['#8fb03a', '#96b845', '#5f7a1e'], '#f28518', '#ffb84d');      // 黄绿圆冠 + 橙果
ISLAND_PAINTERS.leaves_pear = fruitLeaf('#a8c85c', ['#bcda70', '#94b845', '#c8e088'], '#e0d878', '#f5f0b0', true);  // 浅黄绿 + 长梨子
// 柿子树：深绿底 + 橙红秋叶斑块 + 橙红柿子，一眼秋天的感觉
ISLAND_PAINTERS.leaves_persimmon = (c, x, y) => {
  fill(c, x, y, '#2e5c1e');
  speckle(c, x, y, ['#c85a1e', '#d97b2e', '#3d7a24', '#8a3a10'], 90);
  c.fillStyle = '#c85a1e';
  c.fillRect(x + 1, y + 1, 3, 3); c.fillRect(x + 12, y + 13, 3, 3); c.fillRect(x + 13, y + 2, 2, 2);
  fruitDots(c, x, y, '#e85d1e', '#ff9a5c');
};

// —— 秋叶版：秋天到了这五种果树换这身叶子（颜色按设定：桃黄、苹果淡黄、梨深黄、橘橙、柿红）——
ISLAND_PAINTERS.leaves_apple_autumn = fruitLeaf('#e3d071', ['#d4bf58', '#efe08d', '#c9b04a'], '#d62828', '#ff7b7b');       // 苹果：淡黄
ISLAND_PAINTERS.leaves_peach_autumn = fruitLeaf('#e8c84a', ['#d6b437', '#f2dc74', '#c9a52a'], '#ff9ebb', '#ffd1e0');       // 桃子：黄
ISLAND_PAINTERS.leaves_pear_autumn = fruitLeaf('#c9a02a', ['#b58c1c', '#dbb840', '#9c7614'], '#e0d878', '#f5f0b0', true);  // 梨：深黄
ISLAND_PAINTERS.leaves_orange_autumn = fruitLeaf('#dd8a2c', ['#c97618', '#efa844', '#b06010'], '#f28518', '#ffb84d');      // 橘子：橙
ISLAND_PAINTERS.leaves_persimmon_autumn = fruitLeaf('#c8422a', ['#b03118', '#dc5f3c', '#8f2410'], '#e85d1e', '#ff9a5c');   // 柿子：红

// —— 香蕉：本色大片宽叶，秋天按设定黄黑相间；果子是一串弯香蕉 ——
ISLAND_PAINTERS.leaves_banana = (c, x, y) => {
  fill(c, x, y, '#3f8f2e');
  speckle(c, x, y, ['#357a26', '#4fa83a', '#2c6a1e'], 120);
  // 宽叶的叶脉：两道斜纹
  c.fillStyle = '#2a6a1c';
  c.fillRect(x + 2, y + 10, 11, 1);
  c.fillRect(x + 4, y + 5, 9, 1);
  fruitDots(c, x, y, '#f0d040', '#fff0a0');
};
ISLAND_PAINTERS.leaves_banana_autumn = (c, x, y) => {
  fill(c, x, y, '#e8c832');
  speckle(c, x, y, ['#d4b424', '#f2d854', '#c9a81c'], 110);
  c.fillStyle = '#26261e'; // 黄黑相间的黑条纹
  c.fillRect(x + 1, y + 3, 14, 2);
  c.fillRect(x + 2, y + 9, 12, 2);
  c.fillStyle = '#f2d854';
  c.fillRect(x + 3, y + 3, 4, 1);
  c.fillRect(x + 8, y + 9, 3, 1);
  fruitDots(c, x, y, '#f0d040', '#fff0a0');
};
ISLAND_PAINTERS.banana = (c, x, y) => {
  // 一串三根弯香蕉：外黄内浅黄，两头带一点褐
  const px = (dx: number, dy: number, w: number, h: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(x + dx, y + dy, w, h);
  };
  px(3, 3, 4, 9, '#f0d040');
  px(7, 4, 4, 9, '#f5dc58');
  px(11, 5, 3, 8, '#e8c832');
  px(4, 4, 1, 7, '#fff0a0');
  px(8, 5, 1, 7, '#fff6b8');
  px(3, 11, 3, 2, '#8a6a20'); // 蒂
  px(7, 12, 3, 2, '#8a6a20');
  px(11, 12, 3, 2, '#7a5c18');
};

// —— 树苗三阶段：同一种画法换配色；棕榈系的椰子树苗画扇形叶 ——
const saplingPainters = (leaf: string, leafHi: string, fruit: string, palm = false) => {
  const trunk = palm ? '#c8a878' : '#5a3a1e';
  return {
    1: ((c, x, y) => { // 小苗：刚冒芽的两片小叶
      c.fillStyle = trunk; c.fillRect(x + 7, y + 13, 2, 3);
      c.fillStyle = leaf;
      c.fillRect(x + 5, y + 11, 2, 2); c.fillRect(x + 9, y + 11, 2, 2);
      c.fillStyle = leafHi; c.fillRect(x + 5, y + 11, 1, 1); c.fillRect(x + 9, y + 11, 1, 1);
    }) as Painter,
    2: ((c, x, y) => { // 幼树：杆子长高了，又多一对叶
      c.fillStyle = trunk; c.fillRect(x + 7, y + 9, 2, 7);
      c.fillStyle = leaf;
      c.fillRect(x + 4, y + 10, 3, 2); c.fillRect(x + 9, y + 10, 3, 2);
      c.fillRect(x + 5, y + 7, 2, 2); c.fillRect(x + 9, y + 7, 2, 2);
      c.fillStyle = leafHi; c.fillRect(x + 4, y + 10, 1, 1); c.fillRect(x + 9, y + 7, 1, 1);
    }) as Painter,
    3: ((c, x, y) => { // 半成熟树：小树造型出来了，顶上顶着小树冠
      c.fillStyle = trunk; c.fillRect(x + 7, y + 9, 2, 7);
      c.fillStyle = leaf;
      if (palm) { // 棕榈：顶上四片扇叶散开
        c.fillRect(x + 3, y + 6, 10, 2); c.fillRect(x + 7, y + 3, 2, 8);
        c.fillRect(x + 4, y + 4, 2, 2); c.fillRect(x + 10, y + 4, 2, 2);
      } else { // 果树：一坨小树冠 + 果实斑点
        c.fillRect(x + 4, y + 4, 8, 5);
        c.fillRect(x + 5, y + 3, 6, 1); c.fillRect(x + 5, y + 9, 6, 1);
        c.fillStyle = leafHi; c.fillRect(x + 5, y + 5, 2, 2); c.fillRect(x + 10, y + 6, 2, 2);
        c.fillStyle = fruit;
        c.fillRect(x + 6, y + 6, 1, 1); c.fillRect(x + 9, y + 4, 1, 1); c.fillRect(x + 8, y + 8, 1, 1);
      }
    }) as Painter,
  };
};
const SAP_COLORS: Record<string, [string, string, string, boolean?]> = {
  apple:     ['#3d7a24', '#4c9430', '#d62828'],
  peach:     ['#8fc96e', '#b8e09a', '#ff9ebb'],
  orange:    ['#8fb03a', '#a8c84c', '#f28518'],
  pear:      ['#bcda70', '#d8ec94', '#e0d878'],
  persimmon: ['#c85a1e', '#d97b2e', '#e85d1e'], // 柿子苗就是秋叶色，从小透着股秋天的劲儿
  banana:    ['#4fa83a', '#6cc44e', '#f0d040'],
  coconut:   ['#4c9430', '#6db848', '#7a5a30', true],
};
for (const [key, [leaf, hi, fruit, palm]] of Object.entries(SAP_COLORS)) {
  const p = saplingPainters(leaf, hi, fruit, palm === true);
  ISLAND_PAINTERS[`sap_${key}_1`] = p[1];
  ISLAND_PAINTERS[`sap_${key}_2`] = p[2];
  ISLAND_PAINTERS[`sap_${key}_3`] = p[3];
}
