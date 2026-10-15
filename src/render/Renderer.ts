/** 渲染器 — 封装 Three.js 的场景、相机、灯光，外面只管调 render() */

import * as THREE from 'three';
import { QUALITY_ADAPT } from '../config';
import { QualityMonitor } from './Quality';

export class Renderer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  /** 全渲染层共享动画时钟（秒，按 3600 取模防 float32 精度抖动） */
  readonly clock = { value: 0 };
  readonly quality: QualityMonitor;
  private renderer: THREE.WebGLRenderer;
  private hemi: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  /** 白天/黑夜的天空颜色，按昼夜亮度在两个颜色之间渐变 */
  private daySky = new THREE.Color(0x87ceeb);
  private nightSky = new THREE.Color(0x0b1026);

  constructor(container: HTMLElement) {
    this.quality = new QualityMonitor();
    const preset = this.quality.preset;

    this.scene.background = this.daySky.clone(); // 天空蓝
    this.scene.fog = new THREE.Fog(0x87ceeb, 40, 90);  // 远处起雾，盖住没生成的区块

    this.camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 200);

    this.renderer = new THREE.WebGLRenderer({ antialias: preset.antialias });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, preset.pixelRatioMax));
    this.renderer.setSize(innerWidth, innerHeight);
    container.appendChild(this.renderer.domElement);

    // 一个环境光打底 + 一个太阳光，方块才有立体感
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x668866, 1.1);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff4d6, 1.2);
    this.sun.position.set(50, 100, 30);
    this.scene.add(this.sun);

    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
  }

  /** 昼夜亮度：1 = 大白天，0 = 深夜。灯变暗、天空变黑 */
  setDaylight(k: number): void {
    this.hemi.intensity = 0.3 + 0.8 * k;
    this.sun.intensity = 0.1 + 1.1 * k;
    const sky = this.nightSky.clone().lerp(this.daySky, k);
    (this.scene.background as THREE.Color).copy(sky);
    (this.scene.fog as THREE.Fog).color.copy(sky);
  }

  /** 相机摆到玩家眼睛位置，朝玩家看的方向 */
  updateCamera(x: number, y: number, z: number, yaw: number, pitch: number, roll = 0): void {
    this.camera.position.set(x, y, z);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotateY(yaw);
    this.camera.rotateX(pitch);
    this.camera.rotateZ(roll);
  }

  render(): void {
    const now = performance.now();
    this.clock.value = (now * 0.001) % QUALITY_ADAPT.CLOCK_MOD_SECONDS;
    if (this.quality.recordFrame(now)) {
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.quality.preset.pixelRatioMax));
    }
    this.renderer.render(this.scene, this.camera);
  }
}
