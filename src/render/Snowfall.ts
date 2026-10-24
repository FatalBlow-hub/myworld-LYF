/** 冬季降雪 — 玩家周围飘一层小雪花（纯粒子，不写世界数据）
 *  只在「冬季 + 站在雪地上」时由 Game 打开，离岛/换季自动关掉。
 *
 *  蓝雪花：每颗白色小点重生时有 BLUE_CHANCE 概率变成一朵大的六角蓝雪花
 * （Sprite，一眼就能认出来），落地时通过 onFlakeLand 变成一个雪花物品。
 *
 *  用法:
 *   snow.setActive(true, body.x, body.y, body.z);
 *   snow.update(dt, body.x, body.y, body.z);
 */

import * as THREE from 'three';
import { SNOWFALL } from '../config';

/** Game 传进来的钩子：蓝雪花要落地和变物品，得知道地形和掉落物怎么生成 */
export interface SnowfallHooks {
  /** 从这格往下找第一个非空气方块：返回它的顶面高度和能不能停（水/花草不算落脚地），下面全是空气返回 null */
  landingAt?: (wx: number, wz: number, fromY: number) => { y: number; solid: boolean } | null;
  /** 蓝雪花落地：在这格生成一朵雪花物品掉落物 */
  onFlakeLand?: (x: number, y: number, z: number) => void;
}

interface BlueFlake {
  sprite: THREE.Sprite;
}

/** 画一朵六角像素蓝雪花（16×16）：中心亮白、六条蓝色主枝、枝上挂浅色小杈 */
function makeBlueFlakeTexture(): THREE.CanvasTexture {
  const S = 16;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const c = canvas.getContext('2d')!;
  const cx = 8, cy = 8;
  const px = (x: number, y: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(x, y, 1, 1);
  };
  const ARM = '#8fd4ff', BRANCH = '#cfeaff', CORE = '#ffffff';
  // 六条主枝方向（60° 间隔，斜枝用 0.55 斜率在方格上逼近六角形）
  const dirs: [number, number][] = [[0, -1], [0, 1], [1, -0.55], [1, 0.55], [-1, -0.55], [-1, 0.55]];
  for (const [dx, dy] of dirs) {
    for (let t = 1; t <= 6; t++) {
      const x = Math.round(cx + dx * t);
      const y = Math.round(cy + dy * t);
      px(x, y, ARM);
      // 枝中段各挂一对小杈（沿垂直方向错开一格）
      if (t === 3 || t === 4) {
        px(Math.round(x - dy), Math.round(y + dx), BRANCH);
        px(Math.round(x + dy), Math.round(y - dx), BRANCH);
      }
      // 根部粗一点更像雪花
      if (t <= 2 && dx !== 0) px(x, Math.round(y + Math.sign(dy)), ARM);
    }
  }
  px(cx, cy, CORE); px(cx - 1, cy, CORE); px(cx + 1, cy, CORE); px(cx, cy - 1, CORE); px(cx, cy + 1, CORE);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter; // 像素感
  return tex;
}

export class Snowfall {
  readonly object: THREE.Points;
  private pos: Float32Array;
  private attr: THREE.BufferAttribute;
  private active = false;
  private readonly scene: THREE.Scene;
  private readonly hooks: SnowfallHooks;
  private blues: BlueFlake[] = [];
  private blueMat: THREE.SpriteMaterial;

  constructor(scene: THREE.Scene, hooks: SnowfallHooks = {}) {
    this.scene = scene;
    this.hooks = hooks;
    const count = SNOWFALL.PARTICLES;
    this.pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) this.scatter(i, 0, 0, 0);
    const geo = new THREE.BufferGeometry();
    this.attr = new THREE.BufferAttribute(this.pos, 3);
    geo.setAttribute('position', this.attr);
    const mat = new THREE.PointsMaterial({
      color: SNOWFALL.COLOR,
      size: SNOWFALL.SIZE,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.object = new THREE.Points(geo, mat);
    this.object.frustumCulled = false; // 粒子一直跟着玩家，别被视锥体误裁
    this.object.visible = false;
    scene.add(this.object);
    this.blueMat = new THREE.SpriteMaterial({ map: makeBlueFlakeTexture(), transparent: true, depthWrite: false });
  }

  /** 开/关降雪：打开时把雪花直接铺到玩家周围，不用等它们慢慢落下来 */
  setActive(on: boolean, x = 0, y = 0, z = 0): void {
    if (on === this.active) return;
    this.active = on;
    this.object.visible = on;
    if (!on) { this.clearBlues(); return; } // 雪停了蓝雪花也当场化掉
    for (let i = 0; i < SNOWFALL.PARTICLES; i++) this.scatter(i, x, y, z);
    this.attr.needsUpdate = true;
  }

  /** 每帧：雪花往下飘、横向微飘；落到脚下或飘出范围就回玩家头顶重生；
   *  白点重生时掷 BLUE_CHANCE，中了就长出一朵蓝雪花从那儿飘落 */
  update(dt: number, x: number, y: number, z: number): void {
    if (!this.active) return;
    const half = SNOWFALL.AREA / 2;
    for (let i = 0; i < SNOWFALL.PARTICLES; i++) {
      const j = i * 3;
      this.pos[j + 1] -= SNOWFALL.FALL_SPEED * dt;
      this.pos[j] += SNOWFALL.DRIFT * dt;
      if (this.pos[j + 1] < y - SNOWFALL.BELOW
        || Math.abs(this.pos[j] - x) > half
        || Math.abs(this.pos[j + 2] - z) > half) {
        // 这颗白点要重生了：0.5% 概率由一朵蓝雪花接班，从它消失的位置飘落
        if (Math.random() < SNOWFALL.BLUE_CHANCE) {
          this.spawnBlue(this.pos[j], Math.min(this.pos[j + 1], y + SNOWFALL.HEIGHT), this.pos[j + 2]);
        }
        this.scatter(i, x, y, z);
      }
    }
    this.attr.needsUpdate = true;
    this.updateBlues(dt, x, y, z);
  }

  /** 随机放到玩家周围的一处（头顶到脚下之间） */
  private scatter(i: number, x: number, y: number, z: number): void {
    const j = i * 3;
    this.pos[j] = x + (Math.random() - 0.5) * SNOWFALL.AREA;
    this.pos[j + 1] = y - SNOWFALL.BELOW + Math.random() * (SNOWFALL.HEIGHT + SNOWFALL.BELOW);
    this.pos[j + 2] = z + (Math.random() - 0.5) * SNOWFALL.AREA;
  }

  /** 飘一朵蓝雪花：池子满了或没接钩子就放弃（这朵白点还是普通重生） */
  private spawnBlue(x: number, y: number, z: number): void {
    if (!this.hooks.landingAt || !this.hooks.onFlakeLand) return;
    if (this.blues.length >= SNOWFALL.BLUE_MAX) return;
    const sprite = new THREE.Sprite(this.blueMat);
    sprite.scale.set(SNOWFALL.BLUE_SIZE, SNOWFALL.BLUE_SIZE, 1);
    sprite.position.set(x, y, z);
    this.scene.add(sprite);
    this.blues.push({ sprite });
  }

  /** 蓝雪花下落：落地→变雪花物品；落到水/花草上→化掉消失 */
  private updateBlues(dt: number, x: number, y: number, z: number): void {
    for (let i = this.blues.length - 1; i >= 0; i--) {
      const b = this.blues[i];
      const p = b.sprite.position;
      p.y -= SNOWFALL.BLUE_SPEED * dt;
      p.x += SNOWFALL.DRIFT * dt * 0.5; // 比白点飘得慢，显眼
      const land = this.hooks.landingAt!(p.x, p.z, p.y);
      if (land !== null && p.y <= land.y) {
        // 实心地面就留下雪花物品；落到水/花草上直接化掉不留东西
        if (land.solid) this.hooks.onFlakeLand!(p.x, land.y, p.z);
        this.despawnBlue(i);
      } else if (Math.abs(p.x - x) > SNOWFALL.AREA || Math.abs(p.z - z) > SNOWFALL.AREA || p.y < y - SNOWFALL.BELOW - 4) {
        this.despawnBlue(i); // 飘太远/掉到地底下就悄悄收掉
      }
    }
  }

  private despawnBlue(i: number): void {
    const b = this.blues[i];
    this.scene.remove(b.sprite);
    this.blues.splice(i, 1);
  }

  private clearBlues(): void {
    for (const b of this.blues) this.scene.remove(b.sprite);
    this.blues = [];
  }
}
