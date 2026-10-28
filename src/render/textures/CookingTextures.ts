/** 美食烹饪贴图 — 美食工作台 + 面粉/面团等食材 + 各道料理
 *
 *  全部纯 Canvas 现画，不引外部图片。同族画法用带参数的工厂，禁止复制粘贴。 */

import { Painter, fill, speckle } from './TextureUtils';

export const COOKING_TILE_NAMES = [
  // 工作台本体
  'food_table_top', 'food_table_side',
  // 食材（加工品）
  'flour', 'dough',
  // 料理
  'soup_mushroom', 'ham', 'baguette', 'sandwich', 'pumpkin_pie',
  'soup_puffer', 'fish_clown_fried', 'salmon_stew', 'cod_cutlet',
  'roujiamo', 'bamboo_rice', 'dumpling_carrot', 'carrot_cake', 'carrot_mushroom',
];

/** 一碗汤：碗 + 汤面 + 一颗料（`soup(base, topping)` 工厂，生菌汤/河豚汤/炖鲑鱼共用） */
const soup = (base: string, topping: string): Painter => (c, x, y) => {
  c.clearRect(x, y, 16, 16);
  c.fillStyle = '#8a8f96'; // 碗沿
  c.fillRect(x + 2, y + 6, 12, 7);
  c.fillStyle = '#6d7278'; // 碗身
  c.fillRect(x + 3, y + 10, 10, 3);
  c.fillStyle = '#e8e4d8'; // 碗口
  c.fillRect(x + 3, y + 7, 10, 2);
  c.fillStyle = base;      // 汤
  c.fillRect(x + 4, y + 7, 8, 2);
  c.fillStyle = topping;   // 漂的料
  c.fillRect(x + 5, y + 7, 2, 1);
  c.fillRect(x + 9, y + 7, 2, 1);
};

export const COOKING_PAINTERS: Record<string, Painter> = {
  // 工作台顶面：木台 + 一口架着的锅 + 几样配料
  food_table_top: (c, x, y) => {
    fill(c, x, y, '#8a6134');
    speckle(c, x, y, ['#75501f', '#9c7440'], 40);
    c.fillStyle = '#6b4a22';
    c.fillRect(x, y, 16, 1); c.fillRect(x, y + 15, 16, 1);
    c.fillStyle = '#4a4a4e'; // 锅
    c.fillRect(x + 4, y + 4, 8, 7);
    c.fillStyle = '#5f5f66';
    c.fillRect(x + 4, y + 4, 8, 1);
    c.fillStyle = '#2f2f33'; // 锅耳
    c.fillRect(x + 3, y + 5, 1, 2); c.fillRect(x + 12, y + 5, 1, 2);
    c.fillStyle = '#e0a83c'; // 锅里/旁边的食材
    c.fillRect(x + 6, y + 6, 2, 2); c.fillRect(x + 9, y + 7, 2, 1);
    c.fillStyle = '#e05a3a';
    c.fillRect(x + 12, y + 12, 3, 3); // 番茄
  },
  // 工作台侧面：木板 + 两条横撑 + 挂着的铲子
  food_table_side: (c, x, y) => {
    fill(c, x, y, '#7a5628');
    c.fillStyle = '#654620';
    for (let i = 0; i < 4; i++) c.fillRect(x, y + i * 4, 16, 1);
    c.fillStyle = '#a07a3c';
    c.fillRect(x + 1, y + 2, 14, 1); c.fillRect(x + 1, y + 11, 14, 1);
    c.fillStyle = '#9aa0a8'; // 挂着的铲子
    c.fillRect(x + 11, y + 3, 1, 5);
    c.fillStyle = '#c8ccd2';
    c.fillRect(x + 10, y + 8, 3, 5);
  },
  // 面粉：鼓袋子，袋口扎着，袋身上写着"面"
  flour: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#e8e0cc';
    c.fillRect(x + 3, y + 5, 10, 9);
    c.fillRect(x + 4, y + 3, 8, 2);
    c.fillStyle = '#cbbfa4';
    c.fillRect(x + 3, y + 12, 10, 2);
    c.fillStyle = '#8a7a58'; // 袋口绳
    c.fillRect(x + 5, y + 2, 6, 1);
    c.fillStyle = '#7a6a44'; // 袋身上的"面"字
    c.fillRect(x + 6, y + 7, 1, 1); c.fillRect(x + 7, y + 7, 1, 1); c.fillRect(x + 8, y + 7, 1, 1);
    c.fillRect(x + 7, y + 8, 1, 1); c.fillRect(x + 7, y + 9, 1, 1); c.fillRect(x + 7, y + 10, 1, 1);
    c.fillRect(x + 6, y + 10, 3, 1);
  },
  // 面团：一团白面，表面有裂纹
  dough: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#efe9d6';
    c.fillRect(x + 3, y + 5, 10, 8);
    c.fillRect(x + 4, y + 4, 8, 1); c.fillRect(x + 4, y + 12, 8, 1);
    c.fillStyle = '#d8d0b6';
    c.fillRect(x + 5, y + 8, 2, 1); c.fillRect(x + 9, y + 10, 2, 1);
    c.fillStyle = '#f7f3e6';
    c.fillRect(x + 5, y + 5, 3, 1); // 高光
  },
  soup_mushroom: soup('#9a7b4a', '#c8a05a'),     // 生菌汤：褐汤漂菇片
  soup_puffer: soup('#e8c45a', '#e07030'),       // 河豚汤：金黄汤
  salmon_stew: soup('#e07a4a', '#e8a0b0'),       // 炖鲑鱼：橙汤漂鱼肉
  // 火腿：一整块后腿，骨头一端露出来
  ham: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#c85a4a';
    c.fillRect(x + 2, y + 4, 10, 8);
    c.fillRect(x + 3, y + 3, 8, 1);
    c.fillStyle = '#e88a6a'; // 断面
    c.fillRect(x + 2, y + 4, 3, 8);
    c.fillStyle = '#f0e0c8'; // 骨头
    c.fillRect(x + 12, y + 6, 2, 4);
    c.fillStyle = '#a83a2e';
    c.fillRect(x + 6, y + 5, 2, 2); c.fillRect(x + 9, y + 8, 2, 2);
  },
  // 法式面包棍：一根斜放的长面包，外壳裂口
  baguette: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#c8913c';
    c.fillRect(x + 2, y + 6, 12, 4);
    c.fillRect(x + 1, y + 7, 1, 2); c.fillRect(x + 14, y + 7, 1, 2);
    c.fillStyle = '#e0b060';
    c.fillRect(x + 3, y + 6, 10, 1);
    c.fillStyle = '#9a6a24';
    c.fillRect(x + 5, y + 8, 1, 1); c.fillRect(x + 9, y + 8, 2, 1); c.fillRect(x + 12, y + 8, 1, 1);
  },
  // 法式三明治：三角两片，夹着生菜和火腿
  sandwich: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#d8a860'; // 面包底
    c.fillRect(x + 2, y + 8, 12, 3);
    c.fillStyle = '#7ab04a'; // 生菜
    c.fillRect(x + 2, y + 6, 12, 2);
    c.fillStyle = '#c85a4a'; // 火腿
    c.fillRect(x + 3, y + 4, 10, 2);
    c.fillStyle = '#e8c478'; // 上层面包（三角）
    c.fillRect(x + 4, y + 2, 8, 2); c.fillRect(x + 5, y + 1, 6, 1);
    c.fillStyle = '#f0e0b0';
    c.fillRect(x + 6, y + 1, 4, 1);
  },
  // 南瓜饼：金黄一块，上面压着格子纹
  pumpkin_pie: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#e0952c';
    c.fillRect(x + 2, y + 4, 12, 9);
    c.fillStyle = '#f0b850';
    c.fillRect(x + 3, y + 5, 10, 2);
    c.fillStyle = '#b86a18';
    c.fillRect(x + 4, y + 9, 1, 3); c.fillRect(x + 7, y + 9, 1, 3); c.fillRect(x + 10, y + 9, 1, 3);
    c.fillRect(x + 2, y + 12, 12, 1);
  },
  // 煎小丑鱼：一条橙底白条的鱼躺锅里
  fish_clown_fried: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#3a3a40'; // 锅底
    c.fillRect(x + 1, y + 7, 14, 7);
    c.fillStyle = '#e86a1e';
    c.fillRect(x + 3, y + 6, 10, 5);
    c.fillStyle = '#f0f0e8';
    c.fillRect(x + 5, y + 6, 1, 5); c.fillRect(x + 8, y + 6, 1, 5); c.fillRect(x + 11, y + 6, 1, 5);
    c.fillStyle = '#c04a10'; // 尾
    c.fillRect(x + 13, y + 5, 2, 2); c.fillRect(x + 13, y + 10, 2, 2);
  },
  // 炸鳕鱼排：两块裹粉鱼排，金黄脆皮
  cod_cutlet: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#e8b45a';
    c.fillRect(x + 2, y + 5, 6, 7); c.fillRect(x + 8, y + 5, 6, 7);
    c.fillStyle = '#f4d088';
    c.fillRect(x + 2, y + 5, 6, 1); c.fillRect(x + 8, y + 5, 6, 1);
    c.fillStyle = '#c88a2c'; // 脆皮颗粒
    c.fillRect(x + 4, y + 8, 1, 1); c.fillRect(x + 10, y + 9, 1, 1); c.fillRect(x + 6, y + 10, 1, 1);
    c.fillStyle = '#f0e0c0'; // 挤的柠檬
    c.fillRect(x + 7, y + 13, 2, 2);
  },
  // 肉夹馍：半个馍，切口夹着腊汁肉
  roujiamo: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#e0c888'; // 馍
    c.fillRect(x + 3, y + 3, 10, 6);
    c.fillRect(x + 3, y + 9, 10, 4);
    c.fillStyle = '#a8552c'; // 腊汁肉馅
    c.fillRect(x + 3, y + 9, 10, 2);
    c.fillStyle = '#7a3a18';
    c.fillRect(x + 5, y + 9, 2, 1); c.fillRect(x + 9, y + 9, 2, 1);
    c.fillStyle = '#f0e0b0';
    c.fillRect(x + 4, y + 4, 3, 1);
  },
  // 竹筒饭：一节竹筒，斜口露出米饭
  bamboo_rice: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#9ab04a'; // 竹筒
    c.fillRect(x + 4, y + 3, 8, 11);
    c.fillStyle = '#7a9436';
    c.fillRect(x + 4, y + 3, 8, 1); c.fillRect(x + 4, y + 13, 8, 1);
    c.fillStyle = '#c8a05a'; // 竹节
    c.fillRect(x + 4, y + 8, 8, 1);
    c.fillStyle = '#f0e8d0'; // 斜口露出的米饭
    c.fillRect(x + 5, y + 2, 6, 1); c.fillRect(x + 6, y + 1, 4, 1);
  },
  // 胡萝卜肉饺：三只月牙饺
  dumpling_carrot: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    const one = (ox: number) => {
      c.fillStyle = '#efe9d6';
      c.fillRect(ox + 1, y + 7, 8, 5);
      c.fillStyle = '#d8d0b6';
      c.fillRect(ox + 2, y + 6, 6, 1);
      c.fillStyle = '#e07030'; // 露出的胡萝卜馅
      c.fillRect(ox + 3, y + 11, 4, 1);
    };
    one(1); one(6); one(11);
  },
  // 胡萝卜蛋糕：方块蛋糕，顶上一层胡萝卜色糖霜
  carrot_cake: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#e08a3a'; // 糖霜
    c.fillRect(x + 2, y + 3, 12, 4);
    c.fillStyle = '#c87228';
    c.fillRect(x + 2, y + 7, 12, 1);
    c.fillStyle = '#e8d8b0'; // 糕体
    c.fillRect(x + 2, y + 8, 12, 6);
    c.fillStyle = '#c8a878';
    c.fillRect(x + 2, y + 13, 12, 1);
    c.fillStyle = '#f0c060';
    c.fillRect(x + 4, y + 4, 1, 1); c.fillRect(x + 8, y + 5, 1, 1); c.fillRect(x + 11, y + 4, 1, 1);
  },
  // 胡萝卜炒蘑菇：橙丝配灰白菇片
  carrot_mushroom: (c, x, y) => {
    c.clearRect(x, y, 16, 16);
    c.fillStyle = '#e07a2a'; // 胡萝卜片
    c.fillRect(x + 3, y + 4, 3, 3); c.fillRect(x + 9, y + 5, 3, 3); c.fillRect(x + 5, y + 10, 3, 3);
    c.fillStyle = '#d8d0c0'; // 蘑菇片
    c.fillRect(x + 8, y + 3, 3, 2); c.fillRect(x + 4, y + 8, 3, 2); c.fillRect(x + 10, y + 9, 3, 2);
    c.fillStyle = '#7a6a4a'; // 盘子
    c.fillRect(x + 2, y + 13, 12, 2);
  },
};
