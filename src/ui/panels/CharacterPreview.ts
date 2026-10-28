/** 背包里的小人预览（CharacterPreview） — 一块独立的小画布，慢速转圈展示当前人物的 3D 模型
 *
 *  为什么单独开一个 WebGL 画布：主渲染器整帧都在画世界，把小人塞进主场景会跟着相机跑；
 *  这里只用一块 76×132 的小画布 + 一盏环境光 + 一盏方向光，面板关掉就停掉渲染循环。
 */

import * as THREE from 'three';
import { CharacterKind, CharacterModel, createCharacter } from '../../entities/creatures/Character';

const W = 76;      // 画布宽（CSS 像素）
const H = 132;     // 画布高
const SPIN = 0.5;  // 每秒转多少弧度（约 13 秒转一圈，正面背面都能看清）
/** 起始朝向：先露正脸（稍微偏一点，和参考图一样的斜视角），再慢慢转过去看背面 */
const START_YAW = Math.PI + 0.6;

export class CharacterPreview {
  readonly element: HTMLCanvasElement;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 20);
  private renderer: THREE.WebGLRenderer | null = null;
  private failed = false;
  private model: CharacterModel | null = null;
  private kind: CharacterKind | null = null;
  private raf = 0;
  private last = 0;
  private spin = 0;

  constructor() {
    this.element = document.createElement('canvas');
    this.element.className = 'player-preview';
    this.camera.position.set(0.85, 1.25, 3.7);         // 稍微偏一点、高一点：和参考图一样的斜视角
    this.camera.lookAt(0, 0.9, 0);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x5a6a80, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(2.5, 4, 4);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fc4ff, 0.45);   // 背后补一点冷光，勾出轮廓
    rim.position.set(-3, 2, -4);
    this.scene.add(rim);
  }

  /** 换个人物（同一个不重复建） */
  setKind(kind: CharacterKind): void {
    if (this.kind === kind) return;
    this.kind = kind;
    if (this.model) {
      this.scene.remove(this.model.group);
      this.model.dispose();
    }
    this.model = createCharacter(kind);
    this.scene.add(this.model.group);
  }

  /** 面板打开时开始转 */
  start(): void {
    if (this.raf) return;
    if (!this.renderer && !this.failed) this.createRenderer();
    if (!this.renderer) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  /** 面板关掉就停 */
  stop(): void {
    if (!this.raf) return;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private createRenderer(): void {
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.element, alpha: true, antialias: true });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      this.renderer.setSize(W, H);
    } catch {
      // 老设备开不出第二个 WebGL 上下文就安静地不显示，别把背包面板整个搞崩
      this.failed = true;
      this.renderer = null;
      this.element.style.display = 'none';
    }
  }

  private loop = (now: number): void => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.spin += dt;
    this.model?.update(dt);
    if (this.model) this.model.group.rotation.y = START_YAW + this.spin * SPIN;
    this.renderer?.render(this.scene, this.camera);
  };
}
