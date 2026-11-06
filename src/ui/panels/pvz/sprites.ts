/** 植物大战僵尸·角色立绘 — 按 PVZ+MC 风格用基础图形拼画，不再用"色块+文字"糊弄
 *
 *  坐标口径：植物画在格子中心 (x,y)；僵尸画在格底 (x,base) 头朝左（朝家走）。
 *  每个函数 = 一个角色；共用零件：茎秆/叶/眼睛/四肢。 */

import { PLANTS, ZOMBIES, ALIEN_P, ALIEN_Z } from './data';
import { Plant, Zombie } from './engine';

/** 外星来客模式开关（draw.ts 每帧同步 sim.alien） */
export let ALIEN = false;
export function setAlien(v: boolean): void { ALIEN = v; }

type C = CanvasRenderingContext2D;
const R = (c: C, x: number, y: number, w: number, h: number, col: string): void => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const O = (c: C, x: number, y: number, r: number, col: string): void => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
const TRI = (c: C, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, col: string): void => {
  c.fillStyle = col; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3); c.closePath(); c.fill();
};

/** 茎秆+两片小叶（大多数植物的下半身） */
function stem(c: C, x: number, y: number, h = 16): void {
  R(c, x - 2, y - h, 4, h, '#3a7a24');
  TRI(c, x - 2, y - h + 6, x - 10, y - h + 10, x - 2, y - h + 12, '#4a9a34');
  TRI(c, x + 2, y - h + 8, x + 10, y - h + 12, x + 2, y - h + 14, '#4a9a34');
}
/** 小草叶丛（底座） */
function grass(c: C, x: number, y: number): void {
  TRI(c, x - 8, y, x - 6, y - 8, x - 4, y, '#3a8a2e');
  TRI(c, x - 3, y, x - 1, y - 10, x + 1, y, '#46a038');
  TRI(c, x + 4, y, x + 6, y - 8, x + 8, y, '#3a8a2e');
}
/** 射手头：圆脑袋+朝右的炮口管 */
function shooterHead(c: C, x: number, y: number, head: string, tube: string): void {
  O(c, x, y - 22, 9, head);
  R(c, x + 6, y - 25, 9, 6, tube);                 // 炮口朝右（僵尸从右来）
  R(c, x + 13, y - 26, 3, 8, tube);                // 炮口沿
  O(c, x - 2, y - 24, 1.8, '#fff'); O(c, x - 2, y - 24, 1, '#222');
}
function leaf(c: C, x: number, y: number): void { TRI(c, x, y, x + 6, y - 8, x + 8, y, '#4a9a34'); }

export function drawPlant(c: C, p: Plant, x: number, y: number): void {
  if (ALIEN && ALIEN_P[p.kind]) { // 太空皮：脚下紫色光环
    c.fillStyle = ALIEN_P[p.kind]!.color;
    c.globalAlpha = 0.35; c.beginPath(); c.ellipse(x, y + 12, 15, 5, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
  }
  if ((p.blackhole ?? 0) > 0) { // 太空西瓜黑洞：黑漩涡
    c.fillStyle = '#0a0a1a'; c.beginPath(); c.arc(x, y, 14, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#6a5aff'; c.lineWidth = 2;
    c.beginPath(); c.arc(x, y, 10, 0, Math.PI * 1.4); c.stroke(); c.lineWidth = 1;
    return;
  }
  switch (p.kind) {
    case 'sunflower': {
      stem(c, x, y);
      for (let i = 0; i < 8; i++) {                  // 八片黄花瓣
        const a = (i / 8) * Math.PI * 2;
        O(c, x + Math.cos(a) * 9, y - 22 + Math.sin(a) * 9, 4, '#f8c81c');
      }
      O(c, x, y - 22, 7, '#7a4a1c');                 // 花盘
      O(c, x - 2, y - 24, 1.2, '#4a2c10'); O(c, x + 2, y - 20, 1.2, '#4a2c10');
      break;
    }
    case 'sunbud': {
      stem(c, x, y, 10);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        O(c, x + Math.cos(a) * 5, y - 14 + Math.sin(a) * 5, 2.5, '#f8e88a');
      }
      O(c, x, y - 14, 4, '#c89028');
      break;
    }
    case 'pea': case 'snow': case 'venom': {
      const icy = p.kind === 'snow', ven = p.kind === 'venom';
      stem(c, x, y);
      leaf(c, x - 4, y - 4);
      shooterHead(c, x, y, icy ? '#7ac8e8' : ven ? '#3a8a2a' : '#4aa832',
        icy ? '#58a8d0' : ven ? '#2a6a20' : '#388a24');
      if (icy) TRI(c, x - 3, y - 32, x, y - 38, x + 3, y - 32, '#b8e8f8'); // 头顶小冰棱
      if (ven) { O(c, x + 2, y - 26, 1.5, '#7a2a8a'); O(c, x - 4, y - 20, 1.5, '#7a2a8a'); }
      break;
    }
    case 'arrow': {
      grass(c, x, y);
      R(c, x - 2, y - 14, 4, 14, '#3a7a24');
      for (const dy of [-18, -13, -8]) {              // 三支箭斜架着
        R(c, x - 2, y + dy, 14, 1.5, '#c8b088');
        TRI(c, x + 12, y + dy + 1, x + 17, y + dy - 1, x + 17, y + dy + 3, '#5ad8a8'); // 箭头朝右
        R(c, x - 4, y + dy - 1, 3, 3, '#e8f0d8');     // 箭尾羽
      }
      break;
    }
    case 'nut': case 'bamboo': {
      if (p.kind === 'bamboo') {                      // 竹子坚盾：一截竹墙
        R(c, x - 10, y - 30, 20, 30, '#c8b04a');
        for (const dy of [-24, -14, -4]) R(c, x - 10, y + dy, 20, 3, '#8a7a2a'); // 竹节
        R(c, x - 10, y - 30, 20, 2, '#e0cc6a');
      } else {                                        // 坚果：胖椭球+裂纹
        O(c, x, y - 12, 13, '#8a5a2a');
        O(c, x, y - 14, 11, '#a8723a');
        if (p.hp < PLANTS.nut.hp * 0.5) { R(c, x - 3, y - 20, 2, 10, '#5f3f1c'); R(c, x + 2, y - 16, 2, 8, '#5f3f1c'); }
        O(c, x - 3, y - 12, 1.5, '#3a2a14'); O(c, x + 4, y - 12, 1.5, '#3a2a14'); // 眼睛
      }
      break;
    }
    case 'potato': {
      if (!p.armed) {                                 // 没成型：土包+信号杆
        O(c, x, y - 2, 8, '#6a4a26');
        R(c, x - 1, y - 16, 2, 14, '#4a3a20');
        O(c, x, y - 18, 3.5, '#e83a3a');              // 红灯
        O(c, x, y - 18, 1.5, '#ff9a8a');
      } else {
        O(c, x, y - 4, 10, '#c8a04a');                // 成型：大土豆
        O(c, x - 3, y - 8, 2, '#8a6a30'); O(c, x + 3, y - 6, 2, '#8a6a30');
        R(c, x - 1, y - 18, 2, 6, '#4a9a34');         // 顶芽
        O(c, x - 3, y - 10, 1.5, '#3a2a14'); O(c, x + 4, y - 10, 1.5, '#3a2a14');
      }
      break;
    }
    case 'catapult': {                                // 枫叶投手：木架子+抛臂+筐里枫叶
      R(c, x - 8, y - 4, 16, 4, '#7a5a30');           // 底座
      R(c, x - 2, y - 20, 4, 18, '#8a6a3a');          // 立杆
      R(c, x - 2, y - 22, 14, 3, '#a8804a');          // 抛臂
      R(c, x + 10, y - 24, 6, 5, '#5f4020');          // 筐
      TRI(c, x + 9, y - 24, x + 13, y - 30, x + 17, y - 24, '#e8823a'); // 枫叶弹
      O(c, x - 2, y - 21, 2, '#4a3010');
      break;
    }
    case 'umbrella': {                                // 香菇保护伞：大伞盖
      R(c, x - 3, y - 18, 6, 18, '#b08a55');
      O(c, x, y - 20, 20, '#c8a868');
      c.fillStyle = '#a8804a'; c.beginPath(); c.arc(x, y - 20, 20, Math.PI, 0); c.fill();
      O(c, x - 8, y - 24, 3, '#f0e0b0'); O(c, x + 6, y - 26, 3, '#f0e0b0');
      break;
    }
    case 'spike': {                                   // 柳条刺刺：一地尖刺
      for (const dx of [-12, -6, 0, 6, 12])
        TRI(c, x + dx - 3, y, x + dx, y - 12, x + dx + 3, y, '#7a5a3a');
      R(c, x - 14, y - 2, 28, 3, '#5a3a20');
      break;
    }
    case 'chomper': {                                 // 大嘴花：大紫色嘴巴+牙
      stem(c, x, y, 12);
      const open = (p.chew ?? 0) <= 0;
      O(c, x, y - 20, 11, '#8a3a8a');
      c.fillStyle = '#5f1a5f';
      c.beginPath(); c.ellipse(x, y - 20, 9, open ? 6 : 1.5, 0, 0, Math.PI * 2); c.fill();
      for (const dx of [-5, 0, 5]) TRI(c, x + dx - 2, y - 22, x + dx, y - 18, x + dx + 2, y - 22, '#fff'); // 牙
      break;
    }
    case 'hypno': {                                   // 粉伞伞：粉蘑菇+斑点
      R(c, x - 3, y - 14, 6, 14, '#e8c8d8');
      O(c, x, y - 18, 12, '#e87ab8');
      c.fillStyle = '#c85a98'; c.beginPath(); c.arc(x, y - 18, 12, Math.PI, 0); c.fill();
      O(c, x - 5, y - 22, 2.5, '#f8d8e8'); O(c, x + 5, y - 20, 2.5, '#f8d8e8'); O(c, x, y - 26, 2, '#f8d8e8');
      break;
    }
    case 'melon': {                                   // 变身西瓜：条纹瓜+问号
      O(c, x, y - 10, 12, '#3aa84a');
      for (const dx of [-6, 0, 6]) R(c, x + dx - 1, y - 20, 2, 18, '#2a7a34');
      c.fillStyle = '#fff'; c.font = 'bold 11px sans-serif'; c.textAlign = 'center';
      c.fillText('?', x, y - 6);
      break;
    }
    case 'gloom': {                                   // 氢能灯：灯杆+蓝光球
      R(c, x - 2, y - 16, 4, 16, '#3a3a8a');
      O(c, x, y - 22, 8, '#6a7af8');
      O(c, x, y - 22, 5, '#a8b8ff');
      O(c, x - 1, y - 24, 2, '#e0e8ff');
      break;
    }
    case 'iceshroom': {                               // 冰霜菇：冰蓝蘑菇+霜花
      R(c, x - 3, y - 10, 6, 10, '#d8f0f8');
      O(c, x, y - 14, 10, '#b8e8f8');
      c.fillStyle = '#88c8e8'; c.beginPath(); c.arc(x, y - 14, 10, Math.PI, 0); c.fill();
      O(c, x - 4, y - 16, 2, '#fff'); O(c, x + 4, y - 12, 2, '#fff');
      break;
    }
    case 'dandelion': {                               // 蒲公英：茎+白绒球
      stem(c, x, y, 14);
      O(c, x, y - 22, 8, '#f8f8e8');
      O(c, x, y - 22, 5, '#e8e8d0');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        R(c, x + Math.cos(a) * 9 - 0.5, y - 22 + Math.sin(a) * 9 - 0.5, 1.5, 1.5, '#fff');
      }
      break;
    }
    case 'mosspea': {                                // 葫芦藓：苔藓射手
      stem(c, x, y);
      leaf(c, x - 4, y - 4);
      shooterHead(c, x, y, '#4a7a3a', '#3a6a2c');
      O(c, x - 3, y - 27, 2, '#7ab05a'); O(c, x + 3, y - 30, 2, '#7ab05a'); // 头顶苔藓
      break;
    }
    case 'mossbox': {                                // 苔藓方框：绿苔壳（一般不单独出现，套植物上）
      c.strokeStyle = '#6a8a4a'; c.lineWidth = 4; c.strokeRect(x - 18, y - 34, 36, 36); c.lineWidth = 1;
      break;
    }
    case 'venombud': {                               // 毒液花：紫芯小花
      stem(c, x, y, 10);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        O(c, x + Math.cos(a) * 6, y - 15 + Math.sin(a) * 6, 3, '#7a4a9a');
      }
      O(c, x, y - 15, 4, '#3a1a4a');
      break;
    }
    case 'toxin': {                                  // 毒素菇：紫蘑菇+毒斑
      R(c, x - 3, y - 13, 6, 13, '#c8b8d8');
      O(c, x, y - 17, 11, '#7a4a9a');
      c.fillStyle = '#5a2a7a'; c.beginPath(); c.arc(x, y - 17, 11, Math.PI, 0); c.fill();
      O(c, x - 5, y - 20, 2.5, '#c86af8'); O(c, x + 4, y - 15, 2, '#c86af8');
      break;
    }
    case 'specialpea': {                             // 特种豌豆：三炮口
      stem(c, x, y);
      leaf(c, x - 4, y - 4);
      shooterHead(c, x, y, '#2a5a3a', '#1a4a28');
      R(c, x + 6, y - 29, 9, 4, '#1a4a28');          // 上炮口
      R(c, x + 6, y - 19, 9, 4, '#1a4a28');          // 下炮口
      break;
    }
    case 'soulweed': {                               // 蓝魂草：蓝色小魂火
      R(c, x - 2, y - 10, 4, 10, '#3a5aa8');
      O(c, x, y - 16, 8, '#4a6ac8');
      O(c, x, y - 17, 5, '#8aaef8');
      O(c, x - 1, y - 19, 2.5, '#d8e8ff');
      break;
    }
    case 'soulbox': {
      c.strokeStyle = '#5a7ad8'; c.lineWidth = 4; c.strokeRect(x - 18, y - 34, 36, 36); c.lineWidth = 1;
      break;
    }
    case 'copycarrot': {                             // 复制胡萝卜：橙萝卜+问号
      TRI(c, x - 6, y, x + 6, y, x, y - 22, '#e8782a');
      R(c, x - 2, y - 28, 2, 8, '#4a9a34'); R(c, x + 2, y - 28, 2, 8, '#4a9a34');
      c.fillStyle = '#fff'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center';
      c.fillText('?', x, y - 4);
      break;
    }
    case 'venomspike': {                             // 毒液地刺：紫尖刺+毒滴
      for (const dx of [-12, -6, 0, 6, 12])
        TRI(c, x + dx - 3, y, x + dx, y - 12, x + dx + 3, y, '#6a3a8a');
      R(c, x - 14, y - 2, 28, 3, '#3a1a4a');
      O(c, x - 6, y - 14, 1.5, '#c86af8'); O(c, x + 6, y - 14, 1.5, '#c86af8');
      break;
    }
    case 'icespike': {                               // 冰地刺：冰蓝尖刺
      for (const dx of [-12, -6, 0, 6, 12])
        TRI(c, x + dx - 3, y, x + dx, y - 12, x + dx + 3, y, '#6aa8d8');
      R(c, x - 14, y - 2, 28, 3, '#3a6a8a');
      O(c, x, y - 14, 1.5, '#d8f0ff');
      break;
    }
    case 'sunear': {                                 // 光穗草：金色麦穗+光晕
      R(c, x - 2, y - 24, 4, 24, '#3a8a34');
      for (let i = 0; i < 4; i++) {
        O(c, x - 5 + (i % 2) * 10, y - 26 - Math.floor(i / 2) * 5, 3, '#e8c85a');
      }
      O(c, x, y - 31, 3.5, '#ffd76a');
      c.strokeStyle = 'rgba(255,215,106,.5)'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(x, y - 16, 14, 0, Math.PI * 2); c.stroke(); c.lineWidth = 1;
      break;
    }
    case 'sunbloom': {                               // 阳光蓓蕾：金色花蕾，洒阳光时左右摇摆
      const sway = p.t > 0 ? (Math.floor(p.t * 4) % 2 ? 3 : -3) : 0;
      R(c, x - 2 + sway * 0.3, y - 16, 4, 16, '#3a8a34');
      O(c, x + sway, y - 20, 9, '#ffd76a');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + sway * 0.1;
        O(c, x + sway + Math.cos(a) * 9, y - 20 + Math.sin(a) * 9, 2.5, '#ffec9a');
      }
      O(c, x + sway, y - 20, 4.5, '#e8a83a');
      break;
    }
    default: {
      O(c, x, y - 10, 12, PLANTS[p.kind].color);
      break;
    }
  }
  // 苔藓壳/蓝魂壳
  if ((p.moss ?? 0) > 0) {
    c.strokeStyle = '#6a8a4a'; c.lineWidth = 4;
    c.strokeRect(x - 18, y - 34, 36, 36); c.lineWidth = 1;
  }
  if ((p.soul ?? 0) > 0) {
    c.strokeStyle = '#5a7ad8'; c.lineWidth = 5;
    c.strokeRect(x - 19, y - 35, 38, 38); c.lineWidth = 1;
    O(c, x - 19, y - 35, 3, '#8aaef8'); O(c, x + 19, y - 35, 3, '#8aaef8');
  }
  // 南瓜壳：画成橙色大边框角（套在植物外面）
  if ((p.pumpkin ?? 0) > 0) {
    c.strokeStyle = '#e88a2a'; c.lineWidth = 4;
    c.strokeRect(x - 18, y - 34, 36, 36); c.lineWidth = 1;
    c.fillStyle = '#e88a2a';
    for (const [cx, cy] of [[-18, -34], [18, -34], [-18, 2], [18, 2]]) { c.beginPath(); c.arc(x + cx, y + cy, 4, 0, Math.PI * 2); c.fill(); }
  }
  // 架上的木梯：又大又显眼，斜靠在植物上
  if (p.laddered) {
    const lx = x + 2;
    R(c, lx - 8, y - 40, 4, 42, '#a07830'); R(c, lx + 8, y - 40, 4, 42, '#a07830');
    for (let i = 0; i < 5; i++) R(c, lx - 8, y - 36 + i * 9, 20, 3, '#c8a85a');
    R(c, lx - 8, y - 40, 20, 3, '#8a6428');
  }
  if ((p.chew ?? 0) > 0) { c.fillStyle = '#fff'; c.font = '9px sans-serif'; c.textAlign = 'center'; c.fillText('嚼…', x, y - 36); }
}

/** 僵尸小人：方块头+身子+前伸双臂+两条腿；big=巨人大一号 */
function zBody(c: C, x: number, base: number, z: Zombie): void {
  const big = z.kind === 'white' || z.kind === 'red' || z.kind === 'diamond' || z.kind === 'mech';
  const s = big ? 1.9 : 1;
  const skin = z.charm ? '#e87ab8' : z.freezeT > 0 ? '#7ab8e8' : (ALIEN && ALIEN_Z[z.kind]?.color) || ZOMBIES[z.kind].color;
  const bob = Math.sin(z.x * 6) * 1.5;                // 走路颠簸
  const h = 14 * s, bw = 16 * s;
  // 腿
  R(c, x - 6 * s, base - 8 * s + bob, 5 * s, 8 * s, '#3a3a3a');
  R(c, x + 1 * s, base - 8 * s - bob, 5 * s, 8 * s, '#333');
  // 身子
  R(c, x - bw / 2, base - 8 * s - h, bw, h, skin);
  // 前伸双臂（朝左，对着家）
  R(c, x - bw / 2 - 8 * s, base - 8 * s - h + 3, 8 * s, 3.5 * s, skin);
  R(c, x - bw / 2 - 8 * s, base - 8 * s - h + 8, 8 * s, 3.5 * s, skin);
  // 头
  const hy = base - 8 * s - h - 9 * s;
  if (z.bean) {                                    // 掉豆的最强僵尸：头顶金星标记
    O(c, x, hy - 6 * s, 5 * s, '#ffd700');
    c.fillStyle = '#a07000'; c.font = `${7 * s}px sans-serif`; c.textAlign = 'center';
    c.fillText('豆', x, hy - 3 * s);
  }
  R(c, x - 6 * s, hy, 12 * s, 9 * s, skin);
  // 眼睛（一大一小更呆）
  R(c, x - 4.5 * s, hy + 2.5 * s, 3 * s, 3 * s, '#fff');
  R(c, x + 1 * s, hy + 3 * s, 2.5 * s, 2.5 * s, '#fff');
  R(c, x - 3.8 * s, hy + 3.3 * s, 1.6 * s, 1.6 * s, z.charm ? '#3a8ae8' : z.kind === 'red' ? '#f00' : '#222');
  R(c, x + 1.8 * s, hy + 3.8 * s, 1.4 * s, 1.4 * s, z.charm ? '#3a8ae8' : z.kind === 'red' ? '#f00' : '#222');
  // 嘴
  R(c, x - 2 * s, hy + 7 * s, 4 * s, 1 * s, '#222');
  // 装备
  const top = hy;
  if (z.kind === 'cone') TRI(c, x - 6 * s, top, x + 6 * s, top, x, top - 9 * s, '#e8823a');           // 路障
  if (z.kind === 'bucket') { R(c, x - 6 * s, top - 7 * s, 12 * s, 7 * s, '#9a9a9a'); R(c, x - 6 * s, top - 7 * s, 12 * s, 2 * s, '#7a7a7a'); } // 铁桶
  if (z.kind === 'ladder' && !z.usedLadder) {         // 背着木梯
    R(c, x + 7 * s, top - 4 * s, 2 * s, 26 * s, '#b89a5a'); R(c, x + 12 * s, top - 4 * s, 2 * s, 26 * s, '#b89a5a');
    for (const dy of [0, 7, 14, 21]) R(c, x + 7 * s, top - 4 * s + dy * s, 7 * s, 1.5 * s, '#b89a5a');
  }
  if (z.kind === 'digger') R(c, x - 9 * s, top - 3 * s, 5 * s, 3 * s, '#8a6a3a');                       // 矿工镐把
  if (z.kind === 'sunzombie') {                          // 阳光僵尸：发白+头顶小太阳
    O(c, x + 7 * s, top - 4 * s, 3.5 * s, '#ffd700');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      O(c, x + 7 * s + Math.cos(a) * 5.5 * s, top - 4 * s + Math.sin(a) * 5.5 * s, 1.2 * s, '#ffd700');
    }
  }
  if (z.kind === 'diamond') {                          // 蓝钻甲：蓝头盔+钻石剑
    R(c, x - 6 * s, top - 3 * s, 12 * s, 4 * s, '#5a8af8');
    R(c, x - bw / 2 - 14 * s, base - 8 * s - h + 4, 10 * s, 2.5 * s, '#7ad8f8');
    TRI(c, x - bw / 2 - 16 * s, base - 8 * s - h + 4, x - bw / 2 - 14 * s, base - 8 * s - h + 2, x - bw / 2 - 14 * s, base - 8 * s - h + 8, '#7ad8f8');
  }
  if (z.kind === 'yeti') { O(c, x - 4 * s, top + 1 * s, 2 * s, '#fff'); O(c, x + 4 * s, top + 1 * s, 2 * s, '#fff'); } // 雪人毛
  if (z.kind === 'balloon') {                          // 头顶气球+线
    c.strokeStyle = '#8a4a6a'; c.beginPath(); c.moveTo(x, top); c.lineTo(x, top - 14 * s); c.stroke();
    O(c, x, top - 20 * s, 7 * s, '#c85a8a'); O(c, x - 2 * s, top - 23 * s, 2 * s, '#e89ab8');
  }
  if (z.kind === 'mech') {                             // 机甲：驾驶舱罩+天线+紫光
    c.strokeStyle = '#888'; c.lineWidth = 2;
    c.beginPath(); c.arc(x, top, 8 * s, Math.PI, 0); c.stroke(); c.lineWidth = 1;
    R(c, x - 1 * s, top - 12 * s, 2 * s, 4 * s, '#888'); O(c, x, top - 13 * s, 2 * s, '#c84af8');
    R(c, x - 5 * s, top + 4 * s, 3 * s, 3 * s, '#c84af8');
  }
  if (z.kind === 'bike') {                             // 自行车：两个轮子+车架
    O(c, x - 8, base - 4, 6, 'transparent');
    c.strokeStyle = '#333'; c.lineWidth = 3;
    c.beginPath(); c.arc(x - 10, base - 4, 6, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(x + 12, base - 4, 6, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(x - 10, base - 4); c.lineTo(x + 2, base - 12); c.lineTo(x + 12, base - 4); c.stroke(); c.lineWidth = 1;
  }
  // 状态条：冰冻=冰壳、减速=蓝条、中毒=绿条
  if (z.freezeT > 0) { c.strokeStyle = '#9adcf8'; c.lineWidth = 2; c.strokeRect(x - bw / 2 - 1, base - 8 * s - h - 9 * s - 1, bw + 2, h + 10 * s + 2); c.lineWidth = 1; }
  if (z.slowT > 0) R(c, x - 10, base - 8 * s - h - 9 * s - 6, 20, 3, '#9adcf8');
  if (z.poisonT > 0) R(c, x - 10, base - 8 * s - h - 9 * s - 10, 20, 3, '#3a9a2a');
  // 血条
  const full = ZOMBIES[z.kind].hp;
  R(c, x - 12, base - 8 * s - h - 9 * s - 4, 24, 2, '#000');
  R(c, x - 12, base - 8 * s - h - 9 * s - 4, 24 * Math.max(0, z.hp / full), 2, '#5ec84a');
}

export function drawZombie(c: C, z: Zombie, x: number, base: number): void {
  if (z.kind === 'ufo') {                       // 外星飞碟：3格宽碟身 + 中间顶的屏障舱
    const w = 3 * 26;
    O(c, x, base - 44, 14, '#8ab8ff');          // 顶部屏障舱
    c.fillStyle = '#4a5a8a';
    c.beginPath(); c.ellipse(x, base - 30, w / 2, 16, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2a3a6a';
    c.beginPath(); c.ellipse(x, base - 24, w / 2 + 4, 10, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffd700';
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(x + i * 22, base - 26, 4, 0, Math.PI * 2); c.fill(); }
    const full = ZOMBIES.ufo.hp;
    R(c, x - 30, base - 60, 60, 3, '#000');
    R(c, x - 30, base - 60, 60 * Math.max(0, z.hp / full), 3, '#5ec84a');
    return;
  }
  if (z.state === 'dig') {                             // 矿工在地下：只露个安全帽尖
    O(c, x, base - 4, 4, '#8a6a3a');
    R(c, x - 5, base - 6, 10, 3, '#6a4a26');
    return;
  }
  zBody(c, x, base, z);
}
