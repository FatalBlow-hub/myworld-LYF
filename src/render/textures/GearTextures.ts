/** 猎装与丝线贴图 — 丝线/绷带/牵引绳索/减速网/三根钓鱼竿/狼星碎片/狼之利爪（2026-11-01 设定批次） */

import { Painter, TILE } from './TextureUtils';

/** 钓鱼竿：一根斜放的竿 + 竿稍垂下一截线和一个钩，按档位换颜色 */
const rodPainter = (rod: string, reel: string): Painter => (c, x, y) => {
  c.clearRect(x, y, TILE, TILE);
  c.strokeStyle = rod;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(x + 2, y + 14);
  c.quadraticCurveTo(x + 8, y + 8, x + 13, y + 2);
  c.stroke();
  c.fillStyle = reel; // 线轮
  c.fillRect(x + 5, y + 9, 3, 3);
  c.strokeStyle = '#d8d8d8'; // 垂下来的鱼线
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(x + 13, y + 2);
  c.quadraticCurveTo(x + 14, y + 6, x + 12, y + 9);
  c.stroke();
  c.fillStyle = '#c8c8c8'; // 小鱼钩
  c.fillRect(x + 11, y + 9, 2, 2);
};

export const GEAR_TILE_NAMES = [
  'silk', 'bandage', 'lead_rope', 'slow_net',
  'rod_fish', 'rod_gold', 'rod_iron',
  'wolf_star_shard', 'wolf_claw',
];

export const GEAR_PAINTERS: Record<string, Painter> = {
  // 丝线：一小卷灰白的线，中间一根线轴
  silk: (c, x, y) => {
    c.clearRect(x, y, TILE, TILE);
    c.fillStyle = '#e4e2da';
    c.fillRect(x + 3, y + 5, 10, 7);
    c.fillStyle = '#cfcabc';
    c.fillRect(x + 3, y + 7, 10, 1);
    c.fillRect(x + 3, y + 10, 10, 1);
    c.fillStyle = '#8a6a42'; // 线轴两头
    c.fillRect(x + 4, y + 3, 8, 2);
    c.fillRect(x + 4, y + 12, 8, 2);
    c.fillStyle = '#ffffff';
    c.fillRect(x + 5, y + 6, 2, 1);
    c.fillRect(x + 9, y + 9, 2, 1);
  },
  // 速修绷带：一卷白绷带，缠着两道布纹
  bandage: (c, x, y) => {
    c.clearRect(x, y, TILE, TILE);
    c.fillStyle = '#f2efe6';
    c.fillRect(x + 3, y + 4, 10, 9);
    c.fillStyle = '#d8d2c0';
    c.fillRect(x + 3, y + 6, 10, 1);
    c.fillRect(x + 3, y + 10, 10, 1);
    c.fillStyle = '#b8b2a0'; // 卷芯
    c.fillRect(x + 7, y + 8, 2, 2);
    c.fillStyle = '#e8949a'; // 中间的小红十字
    c.fillRect(x + 7, y + 4, 2, 1);
    c.fillRect(x + 7, y + 12, 2, 1);
  },
  // 牵引绳索：一盘深色绳圈 + 铜扣（比普通绳索多股了一截丝线）
  lead_rope: (c, x, y) => {
    c.clearRect(x, y, TILE, TILE);
    c.strokeStyle = '#a8845a';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(x + 8, y + 8, 5, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = '#e4e2da'; // 缠上去的丝线
    c.lineWidth = 1;
    c.beginPath();
    c.arc(x + 8, y + 8, 5, -0.6, 1.2);
    c.stroke();
    c.fillStyle = '#c8942a'; // 铜扣
    c.fillRect(x + 11, y + 3, 3, 3);
    c.fillStyle = '#8a6a42';
    c.fillRect(x + 12, y + 4, 1, 1);
  },
  // 减速网：灰绿色的粗网格（铺在地上的那一面）
  slow_net: (c, x, y) => {
    c.clearRect(x, y, TILE, TILE);
    c.strokeStyle = '#7a9488';
    c.lineWidth = 2;
    for (let i = 1; i < TILE; i += 4) {
      c.beginPath(); c.moveTo(x + i, y); c.lineTo(x + i, y + TILE); c.stroke();
      c.beginPath(); c.moveTo(x, y + i); c.lineTo(x + TILE, y + i); c.stroke();
    }
    c.fillStyle = '#5a7468'; // 网结
    for (const [dx, dy] of [[3, 3], [7, 3], [11, 3], [3, 7], [7, 7], [11, 7], [3, 11], [7, 11], [11, 11]]) {
      c.fillRect(x + dx, y + dy, 2, 2);
    }
  },
  rod_fish: rodPainter('#8a6a42', '#5e8c34'),   // 普通竿：木色 + 绿线轮
  rod_gold: rodPainter('#d9a92c', '#c8942a'),   // 金色竿：金黄
  rod_iron: rodPainter('#5a5a62', '#8a8f96'),   // 铸铁竿：铁灰
  // 狼星碎片：灰白相间的六角星（星星碎片的狼版）
  wolf_star_shard: (c, x, y) => {
    c.clearRect(x, y, TILE, TILE);
    c.fillStyle = '#b8bcc0';
    c.fillRect(x + 6, y + 6, 4, 4);
    const arms: [number, number][] = [[5, 2], [2, 5], [10, 2], [13, 5], [3, 10], [12, 10], [6, 12], [9, 12]];
    for (const [dx, dy] of arms) c.fillRect(x + dx, y + dy, 2, 2);
    c.fillStyle = '#eceef0';
    c.fillRect(x + 7, y + 4, 2, 3);
    c.fillRect(x + 4, y + 7, 3, 2);
    c.fillStyle = '#84888c';
    c.fillRect(x + 7, y + 10, 1, 4);
  },
  // 狼之利爪：三根灰白狼牙爪指 + 一圈皮绑带
  wolf_claw: (c, x, y) => {
    c.clearRect(x, y, TILE, TILE);
    c.fillStyle = '#6a4e2e'; // 皮绑带
    c.fillRect(x + 3, y + 11, 10, 3);
    c.fillStyle = '#4e3820';
    c.fillRect(x + 3, y + 13, 10, 1);
    const claws: [number, number, string][] = [
      [4, 4, '#d8dce0'], [7, 3, '#eceef0'], [10, 4, '#c8ccd0'],
    ];
    for (const [dx, dy, col] of claws) {
      c.fillStyle = col;
      c.fillRect(x + dx, y + dy, 2, 7);
      c.fillStyle = '#ffffff'; // 尖端
      c.fillRect(x + dx, y + dy, 1, 2);
    }
  },
};
