/** 渲染器 — 封装 Three.js 的场景、相机、灯光，外面只管调 render() */

import * as THREE from 'three';
import { CHUNK, QUALITY_ADAPT, SKY, VIEW_DISTANCE } from '../config';
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
  /** 反面渲染的天空渐变球：每帧跟随相机，按昼夜三段颜色平滑插值 */
  private skyMesh: THREE.Mesh;
  private skyUniforms = {
    uZenithColor: { value: new THREE.Color(SKY.DAY.zenith) },
    uHorizonColor: { value: new THREE.Color(SKY.DAY.horizon) },
    uSunDir: { value: new THREE.Vector3(50, 100, 30).normalize() },
  };
  private dayZenith = new THREE.Color(SKY.DAY.zenith);
  private dayHorizon = new THREE.Color(SKY.DAY.horizon);
  private duskZenith = new THREE.Color(SKY.DUSK.zenith);
  private duskHorizon = new THREE.Color(SKY.DUSK.horizon);
  private nightZenith = new THREE.Color(SKY.NIGHT.zenith);
  private nightHorizon = new THREE.Color(SKY.NIGHT.horizon);

  constructor(container: HTMLElement) {
    this.quality = new QualityMonitor();
    const preset = this.quality.preset;

    // 线性雾与视距绑定，雾色严格对齐天空球地平线色，无缝遮住远处未生成区块切面
    const viewSpan = VIEW_DISTANCE * CHUNK.SIZE;
    this.scene.fog = new THREE.Fog(SKY.DAY.horizon, viewSpan * SKY.FOG_NEAR, viewSpan * SKY.FOG_FAR);

    const skyGeo = new THREE.SphereGeometry(SKY.RADIUS, SKY.W_SEG, SKY.H_SEG);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
      fragmentShader: `uniform vec3 uZenithColor;
uniform vec3 uHorizonColor;
uniform vec3 uSunDir;
varying vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  float h = pow(clamp(dir.y, 0.0, 1.0), ${SKY.CURVE.toFixed(2)});
  vec3 col = mix(uHorizonColor, uZenithColor, h);
  float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
  float sunGlow = pow(sunDot, ${SKY.SUN_POWER.toFixed(1)}) * ${SKY.SUN_GLOW.toFixed(2)} * clamp(uSunDir.y + 0.3, 0.0, 1.0);
  col += uHorizonColor * sunGlow;
  gl_FragColor = vec4(col, 1.0);
}`,
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.skyMesh.frustumCulled = false;
    this.skyMesh.renderOrder = -1000;
    this.scene.add(this.skyMesh);

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
    this.setDaylight(1);

    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
  }

  /** 昼夜亮度：1 = 大白天，0 = 深夜。灯变暗、天空与地平线雾按三段颜色平滑插值 */
  setDaylight(k: number): void {
    this.hemi.intensity = 0.3 + 0.8 * k;
    this.sun.intensity = 0.1 + 1.1 * k;
    const duskW = Math.sin(Math.max(0, Math.min(1, k)) * Math.PI);
    this.skyUniforms.uZenithColor.value
      .copy(this.nightZenith)
      .lerp(this.dayZenith, k)
      .lerp(this.duskZenith, duskW * 0.75);
    this.skyUniforms.uHorizonColor.value
      .copy(this.nightHorizon)
      .lerp(this.dayHorizon, k)
      .lerp(this.duskHorizon, duskW * 0.85);
    this.skyUniforms.uSunDir.value.set(50, -30 + 130 * k, 30).normalize();
    (this.scene.fog as THREE.Fog).color.copy(this.skyUniforms.uHorizonColor.value);
  }

  /** 相机摆到玩家眼睛位置，朝玩家看的方向；天空球同步跟随防远坐标穿出球外 */
  updateCamera(x: number, y: number, z: number, yaw: number, pitch: number, roll = 0): void {
    this.camera.position.set(x, y, z);
    this.skyMesh.position.set(x, y, z);
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
