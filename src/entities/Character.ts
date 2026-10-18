/** 人物模型（Character） — 史蒂夫 / 艾力克斯的 3D 方块小人
 *
 *  头 + 身体 + 双臂 + 双腿，六个方块按 64×64 皮肤贴图逐面贴（正面是脸、背面是头发），
 *  尺寸照着玩家身高 1.8 格定（皮肤上 1 像素 = 0.05625 格），和僵尸一样高。
 *  背包里的小人预览、访岛时见到的岛主都用这个模型，改一处两边一起变。
 */

import * as THREE from 'three';
import { PLAYER } from '../config';
import {
  ARM_LEFT_RECTS, ARM_RIGHT_RECTS, FaceRects, HEAD_RECTS,
  LEG_LEFT_RECTS, LEG_RIGHT_RECTS, SKIN_SIZE, TORSO_RECTS, characterSkin,
} from '../render/SkinTextures';

/** 人物形象：史蒂夫、艾力克斯（默认送的），海晶/末影/血月史蒂夫、白衣使者（售卖机买的皮肤） */
export type CharacterKind = 'steve' | 'alex' | 'prismarine' | 'ender' | 'bloodmoon' | 'white' | 'tech' | 'crystal' | 'dog' | 'rainbow' | 'ghost' | 'pumpkin';

/** 所有人物，按背包里「人物」按钮循环切换的顺序排 */
export const CHARACTER_KINDS: readonly CharacterKind[] = ['steve', 'alex', 'prismarine', 'ender', 'bloodmoon', 'white', 'tech', 'crystal', 'dog', 'rainbow', 'ghost', 'pumpkin'];

export const isCharacterKind = (v: unknown): v is CharacterKind =>
  typeof v === 'string' && (CHARACTER_KINDS as readonly string[]).includes(v);

/** 人物中文名（提示文案用） */
export const CHARACTER_NAMES: Record<CharacterKind, string> = {
  steve: '史蒂夫',
  alex: '艾力克斯',
  prismarine: '海晶史蒂夫',
  ender: '末影史蒂夫',
  bloodmoon: '血月史蒂夫',
  white: '白衣使者',
  tech: '科技史蒂夫',
  crystal: '蓝色水晶盔甲史蒂夫',
  dog: '嘉宾犬人',
  rainbow: '彩色史蒂夫',
  ghost: '史蒂夫鬼版·万圣节',
  pumpkin: '史蒂夫南瓜头版·万圣节',
};

/** 皮肤上 1 像素 = 多少格：模型 32 像素高，正好等于玩家身高 */
const PX = PLAYER.HEIGHT / 32;

/** 按账号名固定挑一个默认人物：同一个名字每次进来都是同一个样子 */
export function pickCharacter(name: string): CharacterKind {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 2 === 0 ? 'steve' : 'alex';
}

/** 人物模型：位置/朝向由外面摆，内部只负责站立动画 */
export interface CharacterModel {
  readonly group: THREE.Group;
  /** 每帧调用：呼吸、摆臂、脑袋东张西望 */
  update(dt: number): void;
  /** 转身面向世界坐标 (x, z)（访岛见面时看着访客） */
  faceTo(x: number, z: number): void;
  /** 不再用时释放几何体与材质 */
  dispose(): void;
}

/** 按皮肤布局给方块贴面：每个顶点从自己的坐标推出该采样皮肤上的哪一点 */
function skinBox(w: number, h: number, d: number, rects: FaceRects): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = geo.attributes.uv;
  const hw = w / 2, hh = h / 2, hd = d / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const nx = nor.getX(i), ny = nor.getY(i), nz = nor.getZ(i);
    // u/v 是「这个面上的 0~1 坐标」，方向按从外面看过去的视觉方向定，贴图才不会镜像
    let face: keyof FaceRects;
    let u: number, v: number;
    if (ny > 0.5) { face = 'top'; u = (x + hw) / w; v = (z + hd) / d; }
    else if (ny < -0.5) { face = 'bottom'; u = (x + hw) / w; v = (hd - z) / d; }
    else if (nx > 0.5) { face = 'right'; u = (hd - z) / d; v = (y + hh) / h; }
    else if (nx < -0.5) { face = 'left'; u = (z + hd) / d; v = (y + hh) / h; }
    else if (nz > 0.5) { face = 'back'; u = (x + hw) / w; v = (y + hh) / h; }
    else { face = 'front'; u = (hw - x) / w; v = (y + hh) / h; }
    const [rx, ry, rw, rh] = rects[face];
    uv.setXY(i, (rx + u * rw) / SKIN_SIZE, 1 - (ry + (1 - v) * rh) / SKIN_SIZE);
  }
  uv.needsUpdate = true;
  return geo;
}

/** 头顶名字牌：一块贴了名字的透明小牌子（自带背光，夜里也看得清） */
function makeNameTag(name: string): { sprite: THREE.Sprite; dispose: () => void } {
  const font = 'bold 20px "Microsoft YaHei", "PingFang SC", sans-serif';
  const canvas = document.createElement('canvas');
  const measure = canvas.getContext('2d')!;
  measure.font = font;
  const textW = Math.ceil(measure.measureText(name).width);
  canvas.width = textW + 16;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(name, canvas.width / 2, canvas.height / 2 + 1);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const h = 0.26;
  sprite.scale.set((h * canvas.width) / canvas.height, h, 1);
  sprite.position.y = 32 * PX + 0.32;
  return {
    sprite,
    dispose: () => { tex.dispose(); sprite.material.dispose(); },
  };
}

/** 一个站着的小人 */
class BlockCharacter implements CharacterModel {
  readonly group = new THREE.Group();
  private readonly sway = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly armRight = new THREE.Group();
  private readonly armLeft = new THREE.Group();
  private readonly parts: THREE.BufferGeometry[] = [];
  private readonly material: THREE.MeshLambertMaterial;
  private tag: { sprite: THREE.Sprite; dispose: () => void } | null = null;
  private t = Math.random() * 6;

  constructor(kind: CharacterKind, name?: string) {
    this.material = new THREE.MeshLambertMaterial({ map: characterSkin(kind) });

    // 身体：中心挂在腰上，顶面 24 像素处就是脖子，两条手臂从肩膀往下挂
    this.body.position.y = 18 * PX;
    this.body.add(this.mesh(8 * PX, 12 * PX, 4 * PX, TORSO_RECTS));
    this.head.position.y = 6 * PX;              // 相对身体中心：18 + 6 = 24 像素（脖子）
    this.head.add(this.mesh(8 * PX, 8 * PX, 8 * PX, HEAD_RECTS, 4 * PX));
    this.body.add(this.head);
    this.armRight.position.set(6 * PX, 6 * PX, 0);   // 肩关节
    this.armRight.add(this.mesh(4 * PX, 12 * PX, 4 * PX, ARM_RIGHT_RECTS, -6 * PX));
    this.armRight.rotation.z = 0.06;                 // 手臂稍微外撇，别插进身体
    this.body.add(this.armRight);
    this.armLeft.position.set(-6 * PX, 6 * PX, 0);
    this.armLeft.add(this.mesh(4 * PX, 12 * PX, 4 * PX, ARM_LEFT_RECTS, -6 * PX));
    this.armLeft.rotation.z = -0.06;
    this.body.add(this.armLeft);
    this.sway.add(this.body);

    // 两条腿：从胯（12 像素）垂到地面
    for (const [x, rects] of [[2 * PX, LEG_RIGHT_RECTS], [-2 * PX, LEG_LEFT_RECTS]] as const) {
      const leg = new THREE.Group();
      leg.position.set(x, 12 * PX, 0);
      leg.add(this.mesh(4 * PX, 12 * PX, 4 * PX, rects, -6 * PX));
      this.sway.add(leg);
    }
    this.group.add(this.sway);

    if (name) {
      this.tag = makeNameTag(name);
      this.group.add(this.tag.sprite);
    }
  }

  /** 造一块身体部件：mesh 的局部 y 用中心高度 */
  private mesh(w: number, h: number, d: number, rects: FaceRects, y = 0): THREE.Mesh {
    const geo = skinBox(w, h, d, rects);
    this.parts.push(geo);
    const m = new THREE.Mesh(geo, this.material);
    m.position.y = y;
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  update(dt: number): void {
    this.t += dt;
    const t = this.t;
    this.sway.position.y = Math.sin(t * 1.5) * 0.012;          // 呼吸：整个人轻轻起伏
    this.armRight.rotation.x = Math.sin(t * 1.5) * 0.05;       // 手臂前后微摆
    this.armLeft.rotation.x = -Math.sin(t * 1.5) * 0.05;
    this.head.rotation.y = Math.sin(t * 0.55) * 0.32;          // 脑袋慢慢左右看
    this.head.rotation.x = Math.sin(t * 0.9) * 0.05;
  }

  faceTo(x: number, z: number): void {
    const dx = x - this.group.position.x;
    const dz = z - this.group.position.z;
    if (Math.abs(dx) < 1e-4 && Math.abs(dz) < 1e-4) return;
    this.group.rotation.y = Math.atan2(-dx, -dz);              // 模型正面朝 -z
  }

  dispose(): void {
    for (const g of this.parts) g.dispose();
    this.material.dispose();
    this.tag?.dispose();
  }
}

/** 造一个小人；name 传了就给他头顶加个名字牌 */
export function createCharacter(kind: CharacterKind, name?: string): CharacterModel {
  return new BlockCharacter(kind, name);
}

/** 访岛见面用的小人：进岛时立在岛主重生点旁，站那儿一直看着访客，离开时收掉 */
export class VisitAvatar {
  private model: CharacterModel | null = null;

  /**
   * 在 (x, z) 附近立起岛主的小人，返回他实际站的位置（访客要转身对着他）。
   * freeSpot 由外面注入（Survival.freeSpot），撞墙时换个格子站，避免卡在方块里。
   */
  place(opts: {
    scene: THREE.Scene;
    kind: CharacterKind;
    name: string;
    at: { x: number; y: number; z: number };
    freeSpot: (x: number, y: number, z: number) => { x: number; y: number; z: number };
    lookAt: { x: number; z: number };
  }): { x: number; z: number } {
    const spot = opts.freeSpot(opts.at.x, opts.at.y, opts.at.z);
    this.model = createCharacter(opts.kind, opts.name);
    this.model.group.position.set(spot.x, spot.y, spot.z);
    this.model.faceTo(opts.lookAt.x, opts.lookAt.z);
    opts.scene.add(this.model.group);
    return { x: spot.x, z: spot.z };
  }

  /** 每帧：站立动画 + 一直转身看着访客（朋友见面就该看着你） */
  update(dt: number, px: number, pz: number): void {
    if (!this.model) return;
    this.model.update(dt);
    this.model.faceTo(px, pz);
  }

  /** 收掉：从场景里移除并释放几何体/材质 */
  clear(scene: THREE.Scene): void {
    if (!this.model) return;
    scene.remove(this.model.group);
    this.model.dispose();
    this.model = null;
  }
}
