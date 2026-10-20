/** 商店与椰子树贴图 — 程序化画椰子树的木头/四瓣叶/椰子、7 种饮料瓶、3 档小战士召唤蛋 */

import { Painter, TILE, fill, shade, speckle } from './TextureUtils';

const GLASS = '#cfe8f0';        // 玻璃瓶身
const GLASS_DARK = '#8fb8c4';   // 玻璃暗面
const CAP = '#7a5a30';          // 瓶盖（软木塞）

/** 竖着的一只玻璃瓶：瓶盖 + 瓶颈 + 瓶身 + 里面一种颜色的饮料 */
const bottle = (liquid: string, cap = CAP): Painter => (c, x, y) => {
  const px = (dx: number, dy: number, w: number, h: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(x + dx, y + dy, w, h);
  };
  px(6, 1, 4, 2, cap);                     // 瓶盖
  px(6, 3, 4, 2, GLASS_DARK);              // 瓶颈
  px(5, 5, 6, 1, GLASS);                   // 肩
  px(4, 6, 8, 8, GLASS);                   // 瓶身
  px(5, 7, 6, 6, liquid);                  // 里面的饮料
  px(5, 7, 1, 5, shade(liquid, 45));       // 高光
  px(9, 8, 1, 4, shade(liquid, -35));      // 暗面
  px(4, 13, 8, 1, GLASS_DARK);             // 瓶底
  px(6, 4, 1, 1, '#ffffff');               // 玻璃反光
};

/** 一颗蛋：底宽顶尖的椭圆 + 高光 + 斑点，三档换色 */
const egg = (base: string, light: string, spot: string): Painter => (c, x, y) => {
  const px = (dx: number, dy: number, w: number, h: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(x + dx, y + dy, w, h);
  };
  px(6, 1, 4, 2, base);
  px(5, 3, 6, 1, base);
  px(4, 4, 8, 8, base);
  px(5, 12, 6, 2, base);
  px(6, 14, 4, 1, shade(base, -30));
  px(5, 4, 2, 4, light);                   // 高光
  px(6, 2, 1, 2, light);
  c.fillStyle = spot;
  for (const [sx, sy] of [[8, 5], [6, 8], [9, 10], [7, 12], [10, 7]]) c.fillRect(x + sx, y + sy, 1, 1);
};

export const SHOP_PAINTERS: Record<string, Painter> = {
  // —— 椰子树三件套 ——
  palm_wood: (c, x, y) => {
    fill(c, x, y, '#d8b878');
    speckle(c, x, y, ['#c8a668', '#e8cc90'], 40);
    c.fillStyle = '#b89050';                       // 竖纹
    for (const col of [2, 6, 10, 14]) c.fillRect(x + col, y, 1, TILE);
    c.fillStyle = '#a88040';                       // 节环
    c.fillRect(x, y + 5, TILE, 1);
    c.fillRect(x, y + 11, TILE, 1);
  },
  palm_wood_top: (c, x, y) => {
    fill(c, x, y, '#e0c084');
    speckle(c, x, y, ['#d0b074', '#f0d498'], 36);
    c.fillStyle = '#b89050';
    c.fillRect(x + 2, y + 2, 12, 1); c.fillRect(x + 2, y + 13, 12, 1);
    c.fillRect(x + 2, y + 2, 1, 12); c.fillRect(x + 13, y + 2, 1, 12);
    c.fillStyle = '#c8a060';
    c.fillRect(x + 5, y + 5, 6, 6);
    c.fillStyle = '#a88040';
    c.fillRect(x + 7, y + 7, 2, 2);
  },
  palm_leaves: (c, x, y) => {
    // 四瓣：一横一竖两片大叶 + 四个斜向小叶，中间是深色叶心
    c.fillStyle = '#2f6b26';
    c.fillRect(x + 7, y, 2, TILE);
    c.fillRect(x, y + 7, TILE, 2);
    c.fillStyle = '#4a9a38';
    c.fillRect(x + 7, y + 1, 1, TILE - 2);
    c.fillRect(x + 1, y + 7, TILE - 2, 1);
    c.fillStyle = '#5fb845';
    for (const [dx, dy] of [[3, 3], [10, 3], [3, 10], [10, 10]]) c.fillRect(x + dx, y + dy, 3, 3);
    c.fillStyle = '#7fd45f';
    c.fillRect(x + 7, y + 1, 2, 2); c.fillRect(x + 7, y + 13, 2, 2);
    c.fillRect(x + 1, y + 7, 2, 2); c.fillRect(x + 13, y + 7, 2, 2);
    c.fillStyle = '#1e4a18';
    c.fillRect(x + 7, y + 7, 2, 2);
    speckle(c, x, y, ['#3d8a2e', '#6cc44e'], 24);
  },
  coconut: (c, x, y) => {
    const px = (dx: number, dy: number, w: number, h: number, col: string) => {
      c.fillStyle = col;
      c.fillRect(x + dx, y + dy, w, h);
    };
    px(3, 2, 10, 12, '#6b4423');
    px(4, 3, 8, 5, '#835528');
    px(5, 4, 2, 4, '#9a6a34');
    px(3, 12, 10, 2, '#4a2c14');
    px(5, 5, 2, 2, '#33200e');             // 三个芽眼
    px(9, 5, 2, 2, '#33200e');
    px(7, 8, 2, 2, '#33200e');
  },

  // —— 7 种饮料 ——
  juice_apple: bottle('#e8c040'),
  juice_orange: bottle('#f08a20'),
  juice_peach: bottle('#f0a0a8'),
  wine: bottle('#8e2f3c', '#4a2a18'),
  juice_coconut: bottle('#f2efe2', '#e8e0c8'),
  juice_melon: bottle('#e8506a'),
  juice_carrot: bottle('#e8802a'),
  juice_pear: bottle('#d8d060'),

  // —— 三档小战士召唤蛋 ——
  egg_warrior_normal: egg('#dfe4ea', '#ffffff', '#8fa8c0'),
  egg_warrior_advanced: egg('#8a5fd0', '#c0a0f0', '#5a34a0'),
  egg_warrior_epic: egg('#e0a020', '#ffe08a', '#c03020'),
};
