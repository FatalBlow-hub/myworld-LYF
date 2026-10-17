/** 人物皮肤（SkinTextures） — Canvas 手绘 64×64 的 MC 标准皮肤：史蒂夫 / 艾力克斯两套
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
  p.fill(r, c.skin, [], [c.skinDark], 0.18);
  p.band(r, 0, fringe, c.hair);                       // 刘海
  p.dot(x + 0, y + fringe, c.hair);                   // 两鬓的头发压到眉毛那一行
  p.dot(x + 7, y + fringe, c.hair);
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
    p.fill(rect, c.skin, [], [c.skinDark], 0.2);
    if (c.sleeveRows > 0) {
      p.fill([rect[0], rect[1], rect[2], c.sleeveRows], c.shirt, [c.shirtLight], [c.shirtDark], 0.3);
      p.band(rect, c.sleeveRows - 1, 1, c.shirtDark); // 袖口压一道深色
    }
  };
  side(r.front); side(r.back); side(r.left); side(r.right);
  p.fill(r.top, c.shirt, [c.shirtLight], [c.shirtDark], 0.3);
  p.fill(r.bottom, c.skin, [], [c.skinDark], 0.2);
}

/** 画一条腿：裤腿 + 最下面 shoeRows 行是鞋 */
function paintLeg(p: SkinPainter, r: FaceRects, c: Palette): void {
  const side = (rect: Rect) => {
    p.fill(rect, c.pants, [c.pantsLight], [c.pantsDark], 0.3);
    if (c.shoeRows > 0) {
      p.fill([rect[0], rect[1] + rect[3] - c.shoeRows, rect[2], c.shoeRows], c.shoe, [], [c.shoeDark], 0.3);
    }
  };
  side(r.front); side(r.back); side(r.left); side(r.right);
  p.fill(r.top, c.pants, [c.pantsLight], [c.pantsDark], 0.3);
  p.fill(r.bottom, c.shoe, [], [c.shoeDark], 0.3);
}

/** 画身体：脖子一圈露皮肤，其余是上衣；艾力克斯的长发再盖住后背上方几行 */
function paintTorso(p: SkinPainter, r: FaceRects, c: Palette): void {
  const side = (rect: Rect) => {
    p.fill(rect, c.shirt, [c.shirtLight], [c.shirtDark], 0.28);
    p.band(rect, 0, 1, c.skin);                       // 领口露脖子
    p.band(rect, 1, 1, c.shirtDark);                  // 领口压一道深色
  };
  side(r.front); side(r.back); side(r.left); side(r.right);
  p.fill(r.top, c.skin, [], [c.skinDark], 0.2);       // 顶面就是脖子
  p.fill(r.bottom, c.shirtDark, [], [], 0);
  // 上衣下摆一圈深色（艾力克斯的绿上衣有这个深绿边）
  const hem = (rect: Rect) => p.band(rect, rect[3] - 2, 2, c.shirtDark);
  hem(r.front); hem(r.back); hem(r.left); hem(r.right);
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
  p.fill(HEAD_RECTS.top, c.hair, [c.hairLight], [c.hairDark], 0.35);
  p.fill(HEAD_RECTS.bottom, c.skinDark, [], [], 0);
  paintHair(p, HEAD_RECTS.back, c, 0);
  for (const side of [HEAD_RECTS.left, HEAD_RECTS.right]) {
    p.fill(side, c.skin, [], [c.skinDark], 0.18);
    paintHair(p, [side[0], side[1], side[2], 6], c, 0);   // 两鬓头发压到脸颊上方（参考图里侧面基本是头发）
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
