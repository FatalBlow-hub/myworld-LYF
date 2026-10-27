/** 柳絮孢子 — 春天在柳树旁飘的小白绒球
 *
 *  每颗独立记年龄与漂移相位：随风水平慢慢晃、持续往下落，碰到实心方块只沿一个轴滑开
 *  （不穿进方块），活满 FLUFF.LIFE 秒自动消散；玩家走到跟前直接收进背包，背包满就留在原地。
 *  怪物不参与判定，所以"怪物不能拾取"天然成立；粒子也不进流体逻辑，水流冲不走。 */

import * as THREE from 'three';
import { FLUFF } from '../config';

/** 一颗柳絮 */
interface Mote {
  sprite: THREE.Sprite;
  x: number; y: number; z: number;
  vx: number; vz: number;   // 基础漂移速度（格/秒）
  phase: number;            // 左右摇摆的相位
  age: number;
}

export interface FluffHooks {
  /** 玩家捡到一颗：返回 false = 背包满了，粒子留在原地 */
  collect(): boolean;
  /** 这格是不是实心（挡路用） */
  solidAt(x: number, y: number, z: number): boolean;
}

const texCache: { canvas?: THREE.Texture } = {};

/** 画一颗毛茸茸的白绒球（只画一次，所有 sprite 共用） */
function fluffTexture(): THREE.Texture {
  if (texCache.canvas) return texCache.canvas;
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(8, 8, 1, 8, 8, 8);
  g.addColorStop(0, 'rgba(255,255,245,1)');
  g.addColorStop(0.55, 'rgba(250,246,220,0.75)');
  g.addColorStop(1, 'rgba(245,240,210,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 16);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  texCache.canvas = tex;
  return tex;
}

export class Fluff {
  private motes: Mote[] = [];
  private material: THREE.SpriteMaterial;
  private active = false;
  private spawnT = 0;
  /** 背包满了只提示一次，免得每秒刷屏 */
  private warned = false;

  constructor(private scene: THREE.Scene, private hooks: FluffHooks, private warn: (text: string) => void = () => {}) {
    this.material = new THREE.SpriteMaterial({ map: fluffTexture(), transparent: true, depthWrite: false });
  }

  /** 春季 + 站在柳树旁才开；关掉时已有的慢慢飘完（不清场，避免突然消失） */
  setActive(on: boolean): void {
    this.active = on;
    if (!on) this.spawnT = 0;
  }

  /** 每帧：老化 + 漂移 + 绕方块 + 玩家拾取 */
  update(dt: number, px: number, py: number, pz: number): void {
    if (this.active) {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.motes.length < FLUFF.MAX) {
        this.spawnT = FLUFF.SPAWN_EVERY;
        this.spawn(px, py, pz);
      }
    }
    const cy = py + 0.9;
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      m.age += dt;
      if (m.age >= FLUFF.LIFE) { this.remove(i); continue; }
      this.drift(m, dt);
      m.sprite.position.set(m.x, m.y, m.z);
      const dx = m.x - px, dy = m.y - cy, dz = m.z - pz;
      if (dx * dx + dy * dy + dz * dz < FLUFF.PICK_DIST * FLUFF.PICK_DIST) {
        if (this.hooks.collect()) { this.remove(i); this.warned = false; }
        else if (!this.warned) { this.warned = true; this.warn('背包满了，柳絮孢子先飘着'); }
      }
    }
  }

  /** 在玩家周围随机高度飘出一颗（柳树冠大概就在人头顶那几层） */
  private spawn(px: number, py: number, pz: number): void {
    const ang = Math.random() * Math.PI * 2;
    const dist = 2 + Math.random() * FLUFF.NEAR;
    const x = px + Math.cos(ang) * dist;
    const z = pz + Math.sin(ang) * dist;
    const y = py + 2 + Math.random() * 4;
    const sprite = new THREE.Sprite(this.material.clone());
    sprite.position.set(x, y, z);
    sprite.scale.set(0.28, 0.28, 0.28);
    this.scene.add(sprite);
    this.motes.push({
      sprite, x, y, z,
      vx: (Math.random() - 0.5) * FLUFF.DRIFT,
      vz: (Math.random() - 0.5) * FLUFF.DRIFT,
      phase: Math.random() * Math.PI * 2,
      age: 0,
    });
  }

  /** 推进一格：先按"水平 + 下落"算目标点，撞到实心就只走一个轴，两轴都堵就反弹 */
  private drift(m: Mote, dt: number): void {
    m.phase += dt * 0.9;
    const sway = Math.sin(m.phase) * FLUFF.DRIFT * 0.6;
    const sx = m.vx + sway;
    const sz = m.vz + Math.cos(m.phase * 0.7) * FLUFF.DRIFT * 0.4;
    const ny = Math.max(1, m.y - FLUFF.FALL * dt);
    const nx = m.x + sx * dt;
    const nz = m.z + sz * dt;
    const solid = (x: number, z: number) => this.hooks.solidAt(Math.floor(x), Math.floor(ny), Math.floor(z));
    if (!solid(nx, nz)) { m.x = nx; m.z = nz; m.y = ny; return; }
    if (!solid(nx, m.z)) { m.x = nx; m.y = ny; return; }   // 只沿 x 滑过去
    if (!solid(m.x, nz)) { m.z = nz; m.y = ny; return; }   // 只沿 z 滑过去
    m.vx = -m.vx; m.vz = -m.vz;                             // 前后都堵：掉头
  }

  private remove(i: number): void {
    const m = this.motes[i];
    this.scene.remove(m.sprite);
    (m.sprite.material as THREE.SpriteMaterial).dispose();
    this.motes.splice(i, 1);
  }

  /** 换场景/读档时清干净 */
  clear(): void {
    while (this.motes.length) this.remove(this.motes.length - 1);
    this.active = false;
    this.spawnT = 0;
    this.warned = false;
  }
}
