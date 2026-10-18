/** 人物皮肤（SkinTextures） — Canvas 手绘 64×64 的 MC 标准皮肤：史蒂夫 / 艾力克斯 / 海晶 / 末影 / 血月史蒂夫 / 白衣使者 / 科技 / 蓝色水晶盔甲 / 嘉宾犬人 / 彩色史蒂夫 / 万圣节鬼版 / 万圣节南瓜头版十二套
 *
 *  贴图布局就是官方 64×64 皮肤布局（头 8×8×8、身体 8×12×4、手臂腿 4×12×4），
 *  每一块区域画哪个面写在 SKIN_LAYOUT 里，实体模型按同一份布局取 UV，两边不会画歪。
 *  配色照着参考图取：史蒂夫 = 深棕头发 + 青色短袖 + 蓝紫裤子；艾力克斯 = 橙发 + 绿上衣 + 棕裤子。
 */

import * as THREE from 'three';
import type { CharacterKind } from '../entities/Character';

/** 皮肤贴图边长（MC 标准 64×64；贴图上的 1 像素 = 模型上的 1 像素） */
export const SKIN_SIZE = 64;

/** 方块的六个面 */
export type Face = 'top' | 'bottom' | 'right' | 'front' | 'left' | 'back';

/** 一块皮肤区域：[左, 上, 宽, 高]，以贴图左上角为原点 */
export type Rect = [number, number, number, number];

/** 一个部位六个面各自的贴图区域 */
export type FaceRects = Record<Face, Rect>;

/** 头：8×8×8，正好占贴图左上角 32×16 */
export const HEAD_RECTS: FaceRects = {
  top: [8, 0, 8, 8], bottom: [16, 0, 8, 8],
  right: [0, 8, 8, 8], front: [8, 8, 8, 8], left: [16, 8, 8, 8], back: [24, 8, 8, 8],
};

/** 身体：8×12×4 */
export const TORSO_RECTS: FaceRects = {
  top: [20, 16, 8, 4], bottom: [28, 16, 8, 4],
  right: [16, 20, 4, 12], front: [20, 20, 8, 12], left: [28, 20, 4, 12], back: [32, 20, 8, 12],
};

/** 右臂：4×12×4（贴图右上区） */
export const ARM_RIGHT_RECTS: FaceRects = {
  top: [44, 16, 4, 4], bottom: [48, 16, 4, 4],
  right: [40, 20, 4, 12], front: [44, 20, 4, 12], left: [48, 20, 4, 12], back: [52, 20, 4, 12],
};

/** 右腿：4×12×4（贴图左上区） */
export const LEG_RIGHT_RECTS: FaceRects = {
  top: [4, 16, 4, 4], bottom: [8, 16, 4, 4],
  right: [0, 20, 4, 12], front: [4, 20, 4, 12], left: [8, 20, 4, 12], back: [12, 20, 4, 12],
};

/** 左臂：4×12×4（贴图右下区） */
export const ARM_LEFT_RECTS: FaceRects = {
  top: [44, 48, 4, 4], bottom: [48, 48, 4, 4],
  right: [40, 52, 4, 12], front: [44, 52, 4, 12], left: [48, 52, 4, 12], back: [52, 52, 4, 12],
};

/** 左腿：4×12×4（贴图左下区） */
export const LEG_LEFT_RECTS: FaceRects = {
  top: [20, 48, 4, 4], bottom: [24, 48, 4, 4],
  right: [16, 52, 4, 12], front: [20, 52, 4, 12], left: [24, 52, 4, 12], back: [28, 52, 4, 12],
};

/** 一套人物的配色 */
/** 彩虹光谱（彩色史蒂夫用）：红→橙→黄→绿→青→蓝→紫，一行一色铺满整件 */
const RAINBOW_ROWS = ['#e83a2e', '#f08a1a', '#f5d030', '#58c840', '#30c0c0', '#2a7ae0', '#7a3ae0'];

/** 把一个矩形从上往下铺成彩虹渐变色带（每行一个颜色，高度不够就挤一挤） */
function rainbowFill(p: SkinPainter, r: Rect): void {
  for (let row = 0; row < r[3]; row++) {
    p.band(r, row, 1, RAINBOW_ROWS[Math.floor(row * RAINBOW_ROWS.length / r[3])]);
  }
}

interface Palette {
  hair: string; hairDark: string; hairLight: string;
  skin: string; skinDark: string;
  shirt: string; shirtDark: string; shirtLight: string;
  pants: string; pantsDark: string; pantsLight: string;
  shoe: string; shoeDark: string;
  /** 眼睛：白眼球 + 瞳色（史蒂夫靛蓝、艾力克斯墨绿） */
  pupil: string;
  /** 眉毛（比头发再深一点） */
  brow: string;
  /** 嘴 */
  mouth: string;
  /** 短袖占手臂最上面几行（0 = 无袖） */
  sleeveRows: number;
  /** 鞋子占腿最下面几行 */
  shoeRows: number;
  /** 长发：头发会盖到后背和肩膀上（艾力克斯） */
  longHair: boolean;
  /** 彩虹渐变：上衣按 4 行一段从 shirtDark → shirt → shirtLight → 青绿换色（彩色史蒂夫） */
  rainbow?: boolean;
  /** 鬼脸：脸下半部整块黑，只有一对发亮的眼睛（万圣节鬼版） */
  ghostFace?: boolean;
  /** 南瓜脸：黑洞眼睛 + 锯齿大嘴（万圣节南瓜头版） */
  pumpkinFace?: boolean;
  /** 头顶两只方耳朵（嘉宾犬人） */
  ears?: boolean;
}

const PALETTES: Record<CharacterKind, Palette> = {
  // 史蒂夫：深棕短发、青色短袖、蓝紫裤子、灰鞋；靛蓝眼睛、深棕嘴唇
  steve: {
    hair: '#4a3320', hairDark: '#2e2012', hairLight: '#5e4429',
    skin: '#c69c7b', skinDark: '#ae8460',
    shirt: '#00a8a8', shirtDark: '#007c7c', shirtLight: '#1fc4c2',
    pants: '#3f3a9e', pantsDark: '#2d2974', pantsLight: '#514bb6',
    shoe: '#5c5c57', shoeDark: '#3c3c38',
    pupil: '#362a7e', brow: '#2e2012', mouth: '#6b3a26',
    sleeveRows: 4, shoeRows: 2, longHair: false,
  },
  // 艾力克斯：橙色长发、绿上衣（下摆深绿）、棕裤子、深灰鞋；墨绿眼睛、粉色嘴唇
  alex: {
    hair: '#d9852c', hairDark: '#a8590f', hairLight: '#f0a03a',
    skin: '#e3bd95', skinDark: '#c9a378',
    shirt: '#5f9350', shirtDark: '#2e4d25', shirtLight: '#74a85f',
    pants: '#5f3a1e', pantsDark: '#3f2510', pantsLight: '#75482a',
    shoe: '#4a4a46', shoeDark: '#303030',
    pupil: '#2f6b2f', brow: '#a8590f', mouth: '#e59c95',
    sleeveRows: 4, shoeRows: 2, longHair: true,
  },
  // 海晶史蒂夫：海晶灯般的青蓝色身体，深蓝裤子，眼睛发亮的浅青色
  prismarine: {
    hair: '#1f6f73', hairDark: '#124a4e', hairLight: '#3aa3a3',
    skin: '#3aa6a6', skinDark: '#23787a',
    shirt: '#2c9c9a', shirtDark: '#1b6b6a', shirtLight: '#66d6c8',
    pants: '#1b4f6e', pantsDark: '#12364c', pantsLight: '#2f80ab',
    shoe: '#2a4a5a', shoeDark: '#1a2f3a',
    pupil: '#8ff5ff', brow: '#124a4e', mouth: '#1a4a50',
    sleeveRows: 4, shoeRows: 2, longHair: false,
  },
  // 末影史蒂夫：黑色身体带紫色纹路，紫色发光的眼睛
  ender: {
    hair: '#1a1a1f', hairDark: '#0c0c10', hairLight: '#2c2c36',
    skin: '#25232b', skinDark: '#16151b',
    shirt: '#1e1b24', shirtDark: '#100e14', shirtLight: '#6a2fa0',
    pants: '#1b1a22', pantsDark: '#0e0d12', pantsLight: '#5b2a8a',
    shoe: '#141318', shoeDark: '#0a090c',
    pupil: '#c77dff', brow: '#0c0c10', mouth: '#4b1f6b',
    sleeveRows: 4, shoeRows: 2, longHair: false,
  },
  // 血月史蒂夫：血红身体带黑色斑纹，红光的眼睛
  bloodmoon: {
    hair: '#5e1010', hairDark: '#2e0505', hairLight: '#8a2020',
    skin: '#8a1616', skinDark: '#5c0a0a',
    shirt: '#771414', shirtDark: '#3a0707', shirtLight: '#b03030',
    pants: '#5c1212', pantsDark: '#300707', pantsLight: '#8a2424',
    shoe: '#1a0a0a', shoeDark: '#0d0404',
    pupil: '#ff5c5c', brow: '#2e0505', mouth: '#1a0a0a',
    sleeveRows: 4, shoeRows: 2, longHair: false,
  },
  // 白衣使者：白色长袍，冷灰色带淡青的点缀，眼睛是淡青色
  white: {
    hair: '#eef2f4', hairDark: '#b8c2c8', hairLight: '#ffffff',
    skin: '#f2f5f6', skinDark: '#c8d2d6',
    shirt: '#e8eef1', shirtDark: '#a8b8c0', shirtLight: '#ffffff',
    pants: '#dfe7ea', pantsDark: '#9fb0b8', pantsLight: '#f5fbfd',
    shoe: '#c2ccd0', shoeDark: '#8a969c',
    pupil: '#bfe8ea', brow: '#b8c2c8', mouth: '#9fb0b8',
    sleeveRows: 10, shoeRows: 2, longHair: false,
  },
  // 科技史蒂夫：深灰黑身体，蓝紫发光的电路纹路
  tech: {
    hair: '#1c1c26', hairDark: '#0e0e14', hairLight: '#2e2e40',
    skin: '#23232f', skinDark: '#14141c',
    shirt: '#26262f', shirtDark: '#141420', shirtLight: '#35c8e8',
    pants: '#22222b', pantsDark: '#101018', pantsLight: '#8a5ae8',
    shoe: '#1a1a22', shoeDark: '#0c0c12',
    pupil: '#6ff0ff', brow: '#14141c', mouth: '#7a4fe8',
    sleeveRows: 4, shoeRows: 2, longHair: false,
  },
  // 蓝色水晶盔甲史蒂夫：亮青色，像水晶盔甲
  crystal: {
    hair: '#1a8a96', hairDark: '#0d4a52', hairLight: '#40c4d0',
    skin: '#2abcc8', skinDark: '#177a84',
    shirt: '#24b0bc', shirtDark: '#12646c', shirtLight: '#7ff0f8',
    pants: '#1e96a4', pantsDark: '#0e505a', pantsLight: '#5adce8',
    shoe: '#166070', shoeDark: '#0c3a44',
    pupil: '#dffcff', brow: '#0d4a52', mouth: '#0e505a',
    sleeveRows: 4, shoeRows: 2, longHair: false,
  },
  // 嘉宾犬人：深灰身体、橙色点缀（脸下半和袖口是橙色，像狗鼻子和爪子）
  dog: {
    hair: '#5a5a5a', hairDark: '#2e2e2e', hairLight: '#7a7a7a',
    skin: '#666b73', skinDark: '#464a52',
    shirt: '#3a3d44', shirtDark: '#24262c', shirtLight: '#f08a1a',
    pants: '#33353b', pantsDark: '#1d1f24', pantsLight: '#55595f',
    shoe: '#2a2c30', shoeDark: '#181a1e',
    pupil: '#f5f5f5', brow: '#2e2e2e', mouth: '#f08a1a',
    sleeveRows: 4, shoeRows: 2, longHair: false, ears: true,
  },
  // 彩色史蒂夫：身体按彩虹排色（红→橙→黄→青绿→蓝紫），鞋子紫、眼睛白
  rainbow: {
    hair: '#e83a2e', hairDark: '#a01810', hairLight: '#ff6a5a',
    skin: '#f0a848', skinDark: '#c87028',
    shirt: '#f5d030', shirtDark: '#30c090', shirtLight: '#f5f048',
    pants: '#2a7ae0', pantsDark: '#184a8a', pantsLight: '#7a3ae0',
    shoe: '#6a28c8', shoeDark: '#3a1080',
    pupil: '#f5f5f5', brow: '#a01810', mouth: '#30c090',
    sleeveRows: 4, shoeRows: 2, longHair: false, rainbow: true,
  },
  // 史蒂夫鬼版·万圣节：全身白色布袍，脸是一块黑布只剩红光眼
  ghost: {
    hair: '#f4f6f7', hairDark: '#c0c8cc', hairLight: '#ffffff',
    skin: '#e9edf0', skinDark: '#b8c0c5',
    shirt: '#e4eaed', shirtDark: '#9aa5ac', shirtLight: '#ffffff',
    pants: '#dfe6e9', pantsDark: '#8f9aa0', pantsLight: '#f5f9fb',
    shoe: '#1a1a1e', shoeDark: '#0d0d10',
    pupil: '#ff3b30', brow: '#c0c8cc', mouth: '#8f9aa0',
    sleeveRows: 6, shoeRows: 2, longHair: false, ghostFace: true,
  },
  // 史蒂夫南瓜头版·万圣节：南瓜头 + 深蓝上衣 + 紫裤子，手臂也是南瓜色
  pumpkin: {
    hair: '#f08a1a', hairDark: '#b35e08', hairLight: '#ffb040',
    skin: '#f08a1a', skinDark: '#b35e08',
    shirt: '#1e3a5f', shirtDark: '#122544', shirtLight: '#3a5a8a',
    pants: '#6a3ae0', pantsDark: '#3d1f8a', pantsLight: '#8a5af0',
    shoe: '#4a4a44', shoeDark: '#2c2c28',
    pupil: '#1a0a00', brow: '#b35e08', mouth: '#1a0a00',
    sleeveRows: 4, shoeRows: 2, longHair: false, pumpkinFace: true,
  },
};

/** 画皮肤用的画笔：整张贴图 + 确定性随机（每次生成的样子一样） */
class SkinPainter {
  private seed = 1;
  constructor(private ctx: CanvasRenderingContext2D) {}

  /** 确定性伪随机（0~1），避免每次开游戏皮肤噪点都不一样 */
  private rnd(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 0xffffffff;
  }

  /** 铺底色 + 撒深浅噪点，做出手绘皮肤的颗粒感 */
  fill(r: Rect, base: string, lights: string[], darks: string[], ratio = 0.3): void {
    const [x, y, w, h] = r;
    this.ctx.fillStyle = base;
    this.ctx.fillRect(x, y, w, h);
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const roll = this.rnd();
        if (roll > ratio) continue;
        const light = this.rnd() < 0.5;
        const pool = light ? lights : darks;
        if (!pool.length) continue;
        this.ctx.fillStyle = pool[Math.floor(this.rnd() * pool.length)];
        this.ctx.fillRect(x + dx, y + dy, 1, 1);
      }
    }
  }

  /** 单色块（不打噪点） */
  plain(r: Rect, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(r[0], r[1], r[2], r[3]);
  }

  /** 在区域里点一个像素 */
  dot(x: number, y: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, 1, 1);
  }

  /** 在区域里横向铺一条像素带（相对区域左上角） */
  band(r: Rect, fromRow: number, rows: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(r[0], r[1] + fromRow, r[2], rows);
  }
}

/** 头发：整块铺满，侧面/背面往下多盖几行 */
function paintHair(p: SkinPainter, r: Rect, c: Palette, coverRows: number): void {
  p.fill(r, c.hair, [c.hairLight], [c.hairDark], 0.35);
  if (coverRows > 0) p.band(r, 0, coverRows, c.hair);
}

/** 画一张 8×8 的脸：3 行刘海 + 眉毛 + 眼睛 + 嘴（行列都从 0 起）
 *  参考图里的五官就是这么排的：刘海压到眉毛上沿，眼睛占 1 行（外白内瞳），嘴在眼睛下面两行的正中间。
 *  不要在这里加「鼻子阴影」——那会和嘴连成一块，看着像长了胡子。 */
function paintFace(p: SkinPainter, r: Rect, c: Palette, fringe: number): void {
  const [x, y] = r;
  p.plain(r, c.skin);                               // 脸不撒噪点：固定种子会让每个皮肤同位置长"痣"
  if (c.rainbow) rainbowFill(p, [x, y, 8, fringe]);   // 彩虹皮：刘海也渐变
  else p.band(r, 0, fringe, c.hair);                  // 刘海
  p.dot(x + 0, y + fringe, c.hair);                   // 两鬓的头发压到眉毛那一行
  p.dot(x + 7, y + fringe, c.hair);

  // 鬼脸：刘海下面整块黑布，只有一对发光红眼（万圣节鬼版）
  if (c.ghostFace) {
    p.plain([x, y + 2, 8, 6], '#0d0d10');
    for (const dx of [1, 2, 5, 6]) p.dot(x + dx, y + 4, c.pupil);
    return;
  }
  // 南瓜脸：黑洞眼睛 + 锯齿大嘴（万圣节南瓜头版）
  if (c.pumpkinFace) {
    for (const dx of [1, 2, 5, 6]) p.dot(x + dx, y + 2, c.pupil);
    for (const dx of [2, 5]) p.dot(x + dx, y + 3, c.pupil);   // 三角眼下角
    for (const dx of [1, 2, 3, 4, 5, 6]) p.dot(x + dx, y + 5, c.mouth);
    for (const dx of [2, 4, 6]) p.dot(x + dx, y + 6, c.mouth); // 锯齿下沿
    return;
  }

  const browY = y + fringe;
  const eyeY = browY + 1;
  for (const dx of [1, 2, 5, 6]) p.dot(x + dx, browY, c.brow);   // 眉毛：眼睛正上方各两像素
  p.dot(x + 1, eyeY, '#ffffff');                      // 眼睛：外白内瞳（和参考图一致）
  p.dot(x + 2, eyeY, c.pupil);
  p.dot(x + 5, eyeY, c.pupil);
  p.dot(x + 6, eyeY, '#ffffff');
  p.dot(x + 3, eyeY + 2, c.mouth);                    // 嘴：眼睛下面两行、正中两像素
  p.dot(x + 4, eyeY + 2, c.mouth);
}

/** 画一条手臂：最上面 sleeveRows 行是袖子，其余是皮肤，手心是皮肤 */
function paintArm(p: SkinPainter, r: FaceRects, c: Palette): void {
  const side = (rect: Rect) => {
    // 彩虹皮肤：整条手臂从上到下彩虹渐变（皮肤区域也是彩虹，不铺肉色）
    if (c.rainbow) { rainbowFill(p, rect); return; }
    p.fill(rect, c.skin, [], [c.skinDark], 0.2);
    if (c.sleeveRows > 0) {
      p.fill([rect[0], rect[1], rect[2], c.sleeveRows], c.shirt, [c.shirtLight], [c.shirtDark], 0.3);
      p.band(rect, c.sleeveRows - 1, 1, c.shirtDark); // 袖口压一道深色
    }
  };
  side(r.front); side(r.back); side(r.left); side(r.right);
  if (c.rainbow) {
    p.plain(r.top, RAINBOW_ROWS[0]);
    p.plain(r.bottom, RAINBOW_ROWS[RAINBOW_ROWS.length - 1]);
  } else {
    p.fill(r.top, c.shirt, [c.shirtLight], [c.shirtDark], 0.3);
    p.fill(r.bottom, c.skin, [], [c.skinDark], 0.2);
  }
}

/** 画一条腿：裤腿 + 最下面 shoeRows 行是鞋 */
function paintLeg(p: SkinPainter, r: FaceRects, c: Palette): void {
  const side = (rect: Rect) => {
    // 彩虹皮肤：裤腿部分彩虹渐变，最底下照样穿鞋
    if (c.rainbow) {
      const legH = rect[3] - c.shoeRows;
      rainbowFill(p, [rect[0], rect[1], rect[2], legH]);
      if (c.shoeRows > 0) p.fill([rect[0], rect[1] + legH, rect[2], c.shoeRows], c.shoe, [], [c.shoeDark], 0.3);
      return;
    }
    p.fill(rect, c.pants, [c.pantsLight], [c.pantsDark], 0.3);
    if (c.shoeRows > 0) {
      p.fill([rect[0], rect[1] + rect[3] - c.shoeRows, rect[2], c.shoeRows], c.shoe, [], [c.shoeDark], 0.3);
    }
  };
  side(r.front); side(r.back); side(r.left); side(r.right);
  if (c.rainbow) {
    p.plain(r.top, RAINBOW_ROWS[0]);
    p.fill(r.bottom, c.shoe, [], [c.shoeDark], 0.3);
    return;
  }
  p.fill(r.top, c.pants, [c.pantsLight], [c.pantsDark], 0.3);
  p.fill(r.bottom, c.shoe, [], [c.shoeDark], 0.3);
}

/** 画身体：脖子一圈露皮肤，其余是上衣；艾力克斯的长发再盖住后背上方几行 */
function paintTorso(p: SkinPainter, r: FaceRects, c: Palette): void {
  const side = (rect: Rect) => {
    // 彩虹皮肤：整件上衣从上到下彩虹渐变，领口照样露脖子
    if (c.rainbow) {
      rainbowFill(p, rect);
      p.band(rect, 0, 1, c.skin);
      return;
    }
    p.fill(rect, c.shirt, [c.shirtLight], [c.shirtDark], 0.28);
    p.band(rect, 0, 1, c.skin);                       // 领口露脖子
    p.band(rect, 1, 1, c.shirtDark);                  // 领口压一道深色
  };
  side(r.front); side(r.back); side(r.left); side(r.right);
  p.fill(r.top, c.skin, [], [c.skinDark], 0.2);       // 顶面就是脖子
  p.fill(r.bottom, c.rainbow ? RAINBOW_ROWS[RAINBOW_ROWS.length - 1] : c.shirtDark, [], [], 0);
  // 上衣下摆一圈深色（艾力克斯的绿上衣有这个深绿边；彩虹皮渐变到底，不压边）
  if (!c.rainbow) {
    const hem = (rect: Rect) => p.band(rect, rect[3] - 2, 2, c.shirtDark);
    hem(r.front); hem(r.back); hem(r.left); hem(r.right);
  }
  if (c.longHair) {
    p.fill([r.back[0], r.back[1], r.back[2], 4], c.hair, [c.hairLight], [c.hairDark], 0.3);
    p.band(r.back, 4, 1, c.hairDark);
    p.fill([r.left[0], r.left[1], r.left[2], 1], c.hair, [], [c.hairDark], 0.3);
    p.fill([r.right[0], r.right[1], r.right[2], 1], c.hair, [], [c.hairDark], 0.3);
  }
}

/** 把一整套皮肤画进 64×64 画布 */
function paintSkin(kind: CharacterKind): HTMLCanvasElement {
  const c = PALETTES[kind];
  const canvas = document.createElement('canvas');
  canvas.width = SKIN_SIZE;
  canvas.height = SKIN_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const p = new SkinPainter(ctx);

  // —— 头 ——
  if (c.rainbow) rainbowFill(p, HEAD_RECTS.top);           // 彩虹皮：头发整头渐变
  else p.fill(HEAD_RECTS.top, c.hair, [c.hairLight], [c.hairDark], 0.35);
  if (c.ears) {
    // 犬人：头顶两只方耳朵
    p.plain([HEAD_RECTS.top[0], HEAD_RECTS.top[1], 2, 2], c.hairDark);
    p.plain([HEAD_RECTS.top[0] + 6, HEAD_RECTS.top[1], 2, 2], c.hairDark);
  }
  p.fill(HEAD_RECTS.bottom, c.skinDark, [], [], 0);
  if (c.rainbow) rainbowFill(p, HEAD_RECTS.back);
  else paintHair(p, HEAD_RECTS.back, c, 0);
  for (const side of [HEAD_RECTS.left, HEAD_RECTS.right]) {
    p.fill(side, c.skin, [], [c.skinDark], 0.18);
    if (c.rainbow) rainbowFill(p, [side[0], side[1], side[2], 6]);   // 彩虹鬓角
    else paintHair(p, [side[0], side[1], side[2], 6], c, 0);   // 两鬓头发压到脸颊上方（参考图里侧面基本是头发）
  }
  paintFace(p, HEAD_RECTS.front, c, 3);                    // 刘海占最上面 3 行

  // —— 身体 / 手臂 / 腿 ——
  paintTorso(p, TORSO_RECTS, c);
  paintArm(p, ARM_RIGHT_RECTS, c);
  paintArm(p, ARM_LEFT_RECTS, c);
  paintLeg(p, LEG_RIGHT_RECTS, c);
  paintLeg(p, LEG_LEFT_RECTS, c);
  return canvas;
}

/** 缓存：一套皮肤只画一次 */
const cache = new Map<CharacterKind, THREE.CanvasTexture>();

/** 取某个人物的皮肤贴图（首次调用时手绘生成） */
export function characterSkin(kind: CharacterKind): THREE.CanvasTexture {
  let tex = cache.get(kind);
  if (!tex) {
    tex = new THREE.CanvasTexture(paintSkin(kind));
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    cache.set(kind, tex);
  }
  return tex;
}

/** 售卖机货架用的小头像：把皮肤正面的脑袋（8×8）放大 4 倍，转成 data URL 给 <img> 用 */
const iconCache = new Map<CharacterKind, string>();
export function skinHeadIcon(kind: CharacterKind): string {
  let url = iconCache.get(kind);
  if (!url) {
    const src = characterSkin(kind).image as HTMLCanvasElement;
    const out = document.createElement('canvas');
    out.width = out.height = 8 * 4;
    const ctx = out.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const [x, y, w, h] = HEAD_RECTS.front;
    ctx.drawImage(src, x, y, w, h, 0, 0, out.width, out.height);
    url = out.toDataURL();
    iconCache.set(kind, url);
  }
  return url;
}
