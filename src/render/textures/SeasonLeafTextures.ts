/** 四季树冠贴图 — 夏季粉色樱花、冬季雪点树冠，外加夏/秋采下来的樱花花瓣与枫叶
 *
 *  春/秋用现成本色与秋叶贴图（IslandTextures.ts），这里只补夏天与冬天那两套。
 *  同族贴图走参数化 painter 工厂（底色 + 噪点 + 积雪点），不逐张复制。 */

import { Painter, TILE, fill, speckle } from './TextureUtils';
import { willowStrand } from './WillowTextures';

/** 冬季树冠：各树原底色 + 顶部一层白色积雪 */
const snowyLeaf = (base: string, spots: string[]): Painter => (c, x, y) => {
  fill(c, x, y, base);
  speckle(c, x, y, spots, 110);
  // 积雪：上半部分的白色碎块，越靠顶越密
  c.fillStyle = '#e8f2f8';
  for (let i = 0; i < 22; i++) {
    const sx = Math.floor(Math.random() * TILE);
    const sy = Math.floor(Math.random() * 6);
    c.fillRect(x + sx, y + sy, 1 + Math.floor(Math.random() * 2), 1);
  }
  // 叶尖再点几粒亮白，远看是积在叶子上的雪
  c.fillStyle = '#ffffff';
  for (let i = 0; i < 8; i++) {
    c.fillRect(x + Math.floor(Math.random() * TILE), y + Math.floor(Math.random() * 3), 1, 1);
  }
};

/** 秋季统一樱花树冠：粉底 + 深浅粉噪点 + 五瓣花点 */
const sakuraLeaf: Painter = (c, x, y) => {
  fill(c, x, y, '#e894bd');
  speckle(c, x, y, ['#d97fa9', '#f2aecf', '#d06b98'], 130);
  const petals: [number, number][] = [[3, 4], [10, 3], [6, 9], [12, 11], [2, 12]];
  c.fillStyle = '#ffe3f0';
  for (const [dx, dy] of petals) c.fillRect(x + dx, y + dy, 2, 2);
  c.fillStyle = '#c85f8c';
  for (const [dx, dy] of petals) c.fillRect(x + dx, y + dy, 1, 1);
};

/** 普通树冬季：绿底树叶上铺一层细沙质感（灰黄颗粒 + 叶缘挂沙），不是积雪 */
const sandyLeaf: Painter = (c, x, y) => {
  fill(c, x, y, '#3f7a2a');
  speckle(c, x, y, ['#356a22', '#4a8c32', '#2c5c1c'], 110);
  c.fillStyle = '#cbb87a'; // 细沙颗粒
  for (let i = 0; i < 40; i++) {
    c.fillRect(x + Math.floor(Math.random() * TILE), y + Math.floor(Math.random() * TILE), 1, 1);
  }
  c.fillStyle = '#e0cfa0'; // 叶缘挂沙（顶边与两侧）
  for (let i = 0; i < 16; i++) {
    c.fillRect(x + Math.floor(Math.random() * TILE), y, 1, 1);
    c.fillRect(x + Math.floor(Math.random() * TILE), y + TILE - 1, 1, 1);
    c.fillRect(x, y + Math.floor(Math.random() * TILE), 1, 1);
    c.fillRect(x + TILE - 1, y + Math.floor(Math.random() * TILE), 1, 1);
  }
};

export const SEASON_LEAF_TILE_NAMES = [
  'leaves_sakura',
  'leaves_plain_autumn', 'leaves_plain_winter', 'leaves_plain_sand',
  'leaves_apple_winter', 'leaves_peach_winter', 'leaves_orange_winter',
  'leaves_pear_winter', 'leaves_persimmon_winter', 'leaves_banana_winter',
  'leaves_willow_winter',
  'petal_sakura', 'maple_leaf',
];

export const SEASON_LEAF_PAINTERS: Record<string, Painter> = {
  leaves_sakura: sakuraLeaf,
  // 普通树叶：秋天橙黄、冬天细沙质感（2026-10-28 起冬=沙，不再积雪）
  leaves_plain_autumn: (c, x, y) => {
    fill(c, x, y, '#d99a2a');
    speckle(c, x, y, ['#c47f1e', '#eeb84a', '#b06c14'], 120);
  },
  leaves_plain_winter: sandyLeaf,
  // 果树秋/冬走 IslandTextures 里各自带果子斑点的 *_autumn 贴图（这里不再放统一黄叶）
  leaves_apple_winter:      snowyLeaf('#2f6119', ['#264f14', '#3d7a24', '#1e3f0e']),
  leaves_peach_winter:      snowyLeaf('#7cb85c', ['#8fc96e', '#a8d98a', '#6aa04c']),
  leaves_orange_winter:     snowyLeaf('#7a9e2e', ['#8fb03a', '#96b845', '#5f7a1e']),
  leaves_pear_winter:       snowyLeaf('#a8c85c', ['#bcda70', '#94b845', '#c8e088']),
  leaves_persimmon_winter:  snowyLeaf('#2e5c1e', ['#3d7a24', '#26501a', '#34691f']),
  leaves_banana_winter:     snowyLeaf('#3f8f2e', ['#357a26', '#4fa83a', '#2c6a1e']),
  // 柳树叶：四季常青的透空柳枝（画法在 WillowTextures），只有冬天枝条挂细雪
  leaves_willow_winter: willowStrand(true),
  // 采下来的两样东西：樱花花瓣是一小撮粉色花瓣，枫叶是一片红橙五裂叶
  petal_sakura: (c, x, y) => {
    c.clearRect(x, y, TILE, TILE);
    const dots: [number, number, string][] = [[4, 5, '#ffd6e8'], [9, 4, '#f7a8c8'], [6, 9, '#ffe6f2'], [10, 10, '#e88bb4']];
    for (const [dx, dy, col] of dots) {
      c.fillStyle = col;
      c.fillRect(x + dx, y + dy, 3, 2);
      c.fillRect(x + dx + 1, y + dy - 1, 1, 1);
    }
    c.fillStyle = '#c85f8c';
    c.fillRect(x + 5, y + 10, 1, 1);
    c.fillRect(x + 11, y + 5, 1, 1);
  },
  maple_leaf: (c, x, y) => {
    c.clearRect(x, y, TILE, TILE);
    c.fillStyle = '#c8422a';
    c.fillRect(x + 6, y + 6, 4, 4);
    const arms: [number, number][] = [[5, 2], [2, 5], [10, 2], [13, 5], [3, 10], [12, 10], [6, 12], [9, 12]];
    for (const [dx, dy] of arms) c.fillRect(x + dx, y + dy, 2, 2);
    c.fillStyle = '#e8661e';
    c.fillRect(x + 7, y + 5, 2, 5);
    c.fillRect(x + 4, y + 6, 8, 2);
    c.fillStyle = '#8f2410';
    c.fillRect(x + 7, y + 10, 1, 4);
  },
};
