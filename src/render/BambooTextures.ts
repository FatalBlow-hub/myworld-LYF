/**
 * 竹子贴图 — 程序化像素画，零外部素材（MC 原版竹子那股黄绿、细长、一节套一节）
 *
 * 世界里的竹子是「细杆」形状（见 Shapes.ts 的 bamboo）：杆子只占格子中心 3/16，
 * 所以侧面贴图整张会被压成 3 像素宽——横向的花纹压完就糊了，真正管用的是
 * 「纵向竖纹 + 竹节横带」，这里就按这个思路画：
 *   bamboo_side        杆的四张侧面：竖纹 + 一道深色竹节 + 节上亮边
 *   bamboo_node        竹节箍（比杆粗一圈的那圈）的贴图
 *   bamboo_top         杆顶截面：一圈竹壁 + 中间空芯
 *   bamboo_leaves      梢头一大丛竹叶：交叉薄片用，叶尖朝上张开、两片下垂
 *   bamboo_leaves_small 顶下一节的小丛竹叶
 *   bamboo             物品栏图标：细竹竿 + 两片小叶，透明底
 *   bamboo_shoot       竹笋：贴着地面冒出来的小尖笋
 */

import { Painter, TILE, shade } from './TextureUtils';

/** 竹子配色：偏黄绿，向 MC 原版靠，不用荧光绿 */
const POLE = '#7cb342';
const POLE_LIGHT = '#9ccc65';
const POLE_DARK = '#5a8c2e';
const POLE_EDGE = '#3f6b1e';
const NODE = '#3f6212';
const NODE_LIGHT = '#d4eaa0';

const LEAF_MID = '#74a83a';
const LEAF_DARK = shade(LEAF_MID, -46);
const LEAF_LIGHT = shade(LEAF_MID, 34);

/** 一片竹叶：起x 起y 终x 终y 根宽 粗段比例（比例之后收成 1 像素宽的叶尖） */
type Blade = [number, number, number, number, number, number];
/** 16×16 的透明度栅格，true = 有叶子 */
type Grid = boolean[][];

/** 把叶片列表打点到栅格上：叶片交叠在一起才连成一片，不会各画各的剩一堆碎线 */
function rasterBlades(list: Blade[]): Grid {
  const g: Grid = Array.from({ length: TILE }, () => Array<boolean>(TILE).fill(false));
  for (const [x0, y0, x1, y1, rootW, taper] of list) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = Math.round(x0 + (x1 - x0) * t);
      const py = Math.round(y0 + (y1 - y0) * t);
      const wide = t < taper ? rootW : 1;
      for (let k = 0; k < wide; k++) {
        if (px + k >= 0 && px + k < TILE && py >= 0 && py < TILE) g[py][px + k] = true;
      }
    }
  }
  return g;
}

/** 画一丛叶子：外圈描暗边、叶面铺主色、左上受光处提亮——像素画靠这三层撑出体积 */
function paintLeaves(c: CanvasRenderingContext2D, ox: number, oy: number, g: Grid): void {
  const on = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < TILE && y < TILE && g[y][x];
  const px = (x: number, y: number, color: string): void => {
    if (x < 0 || y < 0 || x >= TILE || y >= TILE) return; // 别画到隔壁图集格子里
    c.fillStyle = color;
    c.fillRect(ox + x, oy + y, 1, 1);
  };
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      if (on(x, y)) continue;
      if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) px(x, y, LEAF_DARK);
    }
  }
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      if (!on(x, y)) continue;
      px(x, y, (!on(x - 1, y) || !on(x, y - 1)) ? LEAF_LIGHT : LEAF_MID);
    }
  }
}

/**
 * 叶根分别扎在杆子两侧（叶子长在杆上，不是套在杆上）：贴图中线那几列正好被竹竿挡住，
 * 所以两簇叶子分别落在左右，绕杆一圈看过去才是「杆上一蓬一蓬的叶子」。
 */
const BIG_BLADES: Blade[] = [
  [5, 10, 1, 3, 2, 0.85],    // 左上长叶
  [5, 10, 7, 1, 2, 0.85],    // 左上内叶
  [5, 11, 2, 9, 2, 0.85],    // 左侧平出
  [5, 12, 3, 14, 2, 0.8],    // 左下斜垂
  [11, 10, 15, 3, 2, 0.85],  // 右上长叶
  [11, 10, 9, 1, 2, 0.85],   // 右上内叶
  [11, 11, 14, 9, 2, 0.85],  // 右侧平出
  [11, 12, 13, 14, 2, 0.8],  // 右下斜垂
];
/** 顶下一节的小丛：左右各两片短叶，缩在格子上半，别喧宾夺主 */
const SMALL_BLADES: Blade[] = [
  [5, 12, 2, 6, 2, 0.85],
  [5, 12, 7, 5, 1, 0.8],
  [11, 12, 14, 6, 2, 0.85],
  [11, 12, 9, 5, 1, 0.8],
];

export const BAMBOO_PAINTERS: Record<string, Painter> = {
  // 杆的侧面：竖着的低对比细纹（横向花纹压窄就糊，竖向的压完还留得住）
  bamboo_side: (c, x, y) => {
    c.fillStyle = POLE; c.fillRect(x, y, TILE, TILE);
    const streaks: [number, number][] = [[3, 5], [7, -6], [11, 5], [14, -5]];
    for (const [sx, d] of streaks) {
      c.fillStyle = shade(POLE, d);
      c.fillRect(x + sx, y, 1, TILE);
    }
    // 竹节：深色箍在下、亮边在上（光从上面来），一节套一节的感觉全靠这两行
    c.fillStyle = shade(POLE, -10); c.fillRect(x, y + 5, TILE, 1);
    c.fillStyle = NODE_LIGHT; c.fillRect(x, y + 6, TILE, 1);
    c.fillStyle = NODE; c.fillRect(x, y + 7, TILE, 2);
    c.fillStyle = shade(POLE, -20); c.fillRect(x, y + 9, TILE, 1);
  },
  // 竹节箍：和杆子几乎同色，只比杆子暗一丁点（整张贴图会被压成一小条，只用得上平均色）
  bamboo_node: (c, x, y) => {
    c.fillStyle = shade(POLE, -8); c.fillRect(x, y, TILE, TILE);
    c.fillStyle = shade(POLE, 3); c.fillRect(x, y, TILE, 3);         // 箍顶受光
    c.fillStyle = shade(POLE, -18); c.fillRect(x, y + TILE - 4, TILE, 4);
  },
  // 杆顶截面：外圈竹壁、中间空芯（竹竿是空心的）
  bamboo_top: (c, x, y) => {
    c.fillStyle = POLE; c.fillRect(x, y, TILE, TILE);
    c.fillStyle = POLE_EDGE;
    c.fillRect(x, y, TILE, 2); c.fillRect(x, y + TILE - 2, TILE, 2);
    c.fillRect(x, y, 2, TILE); c.fillRect(x + TILE - 2, y, 2, TILE);
    c.fillStyle = shade(POLE, -26); c.fillRect(x + 5, y + 5, 6, 6); // 空芯
    c.fillStyle = POLE_EDGE; c.fillRect(x + 6, y + 6, 4, 4);
  },
  // 梢头一节的竹叶：叶子都在上半格，下半格留空让杆子露出来
  bamboo_leaves: (c, x, y) => {
    paintLeaves(c, x, y, rasterBlades(BIG_BLADES));
    c.fillStyle = NODE_LIGHT; c.fillRect(x + 7, y + 12, 2, 1); // 叶柄接杆处
  },
  // 顶下一节的小丛竹叶
  bamboo_leaves_small: (c, x, y) => {
    paintLeaves(c, x, y, rasterBlades(SMALL_BLADES));
    c.fillStyle = NODE_LIGHT; c.fillRect(x + 7, y + 13, 2, 1);
  },
  // 物品图标：一根立着的细竹竿 + 顶上几片小叶，透明底
  bamboo: (c, x, y) => {
    c.fillStyle = POLE; c.fillRect(x + 7, y + 1, 3, 14);
    c.fillStyle = POLE_LIGHT; c.fillRect(x + 7, y + 1, 1, 14);
    c.fillStyle = POLE_DARK; c.fillRect(x + 9, y + 1, 1, 14);
    for (const ny of [5, 11]) {
      c.fillStyle = NODE; c.fillRect(x + 6, y + ny, 5, 1);           // 节环
      c.fillStyle = NODE_LIGHT; c.fillRect(x + 6, y + ny + 1, 5, 1);  // 节上亮边
    }
    // 叶：两片朝右上，暗底 + 叶面
    const leaves: Blade[] = [[10, 4, 14, 1, 2, 0.5], [10, 5, 13, 7, 1, 0.4]];
    paintLeaves(c, x, y, rasterBlades(leaves));
    c.fillStyle = POLE_EDGE; c.fillRect(x + 7, y + 15, 3, 1);        // 竿底切口
  },
  // 竹笋：贴着地面冒出来的小尖笋
  bamboo_shoot: (c, x, y) => {
    c.fillStyle = '#7ab04a'; c.fillRect(x + 6, y + 7, 4, 7);
    c.fillStyle = '#96c766'; c.fillRect(x + 7, y + 4, 2, 6);
    c.fillStyle = '#5c8c34'; c.fillRect(x + 5, y + 12, 6, 2);
  },
};
