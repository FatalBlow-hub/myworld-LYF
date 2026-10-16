/** 渲染器 — 封装 Three.js 的场景、相机、灯光，外面只管调 render() */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BLOOM, CHUNK, QUALITY_ADAPT, SHADOW, SKY, VIEW_DISTANCE } from '../config';
import { QualityMonitor } from './Quality';

export class Renderer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  /** 全渲染层共享动画时钟（秒，按 3600 取模防 float32 精度抖动） */
  readonly clock = { value: 0 };
  readonly quality: QualityMonitor;
  /** 画布本体：指针锁定（鼠标视角）要挂在这上面 */
  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private outputPass: OutputPass | null = null;
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
  private lastDaylight = 1;
  private sunCellX = NaN;
  private sunCellY = NaN;
  private sunCellZ = NaN;

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
    this.renderer.shadowMap.enabled = preset.shadows;
    // three r186 已移除 PCFSoftShadowMap（内部自动回退成 PCF 并打 warning），直接用 PCFShadowMap
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);

    // 一个环境光打底 + 一个太阳光，方块才有立体感
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x668866, 1.1);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff4d6, 1.2);
    this.sun.position.set(...SHADOW.SUN_OFFSET);
    this.sun.castShadow = preset.shadows;
    if (preset.shadowMapSize > 0) {
      this.sun.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
    }
    const cam = this.sun.shadow.camera;
    cam.left = -SHADOW.EXTENT;
    cam.right = SHADOW.EXTENT;
    cam.top = SHADOW.EXTENT;
    cam.bottom = -SHADOW.EXTENT;
    cam.near = SHADOW.NEAR;
    cam.far = SHADOW.FAR;
    cam.updateProjectionMatrix();
    this.sun.shadow.bias = SHADOW.BIAS;
    this.sun.shadow.normalBias = SHADOW.NORMAL_BIAS;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.setDaylight(1);
    this.syncBloomComposer();

    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
      this.composer?.setSize(innerWidth, innerHeight);
    });
  }

  /** 按当前档位的 bloom 开关创建或销毁后处理链（WebGL2 MSAA samples=4 防丢抗锯齿，OutputPass 保 sRGB） */
  private syncBloomComposer(): void {
    const preset = this.quality.preset;
    if (preset.bloom) {
      if (this.composer) return;
      const pr = this.renderer.getPixelRatio();
      const rt = new THREE.WebGLRenderTarget(innerWidth * pr, innerHeight * pr, {
        type: THREE.HalfFloatType,
        samples: BLOOM.SAMPLES,
      });
      this.composer = new EffectComposer(this.renderer, rt);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(innerWidth * pr, innerHeight * pr),
        BLOOM.STRENGTH,
        BLOOM.RADIUS,
        BLOOM.THRESHOLD,
      );
      this.composer.addPass(this.bloomPass);
      this.outputPass = new OutputPass();
      this.composer.addPass(this.outputPass);
      this.composer.setSize(innerWidth, innerHeight);
    } else if (this.composer) {
      this.bloomPass?.dispose();
      this.outputPass?.dispose();
      this.composer.dispose();
      this.bloomPass = null;
      this.outputPass = null;
      this.composer = null;
    }
  }

  /** 昼夜亮度：1 = 大白天，0 = 深夜。灯变暗、天空与地平线雾按三段颜色平滑插值，夜间自动关闭阴影省 GPU */
  setDaylight(k: number): void {
    this.lastDaylight = k;
    this.hemi.intensity = 0.3 + 0.8 * k;
    this.sun.intensity = 0.1 + 1.1 * k;
    this.sun.castShadow = this.quality.preset.shadows && k >= SHADOW.NIGHT_THRESHOLD;
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

  /** 相机摆到玩家眼睛位置；天空球同步跟随，太阳与 target 按整格坐标跟随以保持固定倾角并防阴影边缘抖动 */
  updateCamera(x: number, y: number, z: number, yaw: number, pitch: number, roll = 0): void {
    this.camera.position.set(x, y, z);
    this.skyMesh.position.set(x, y, z);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotateY(yaw);
    this.camera.rotateX(pitch);
    this.camera.rotateZ(roll);

    const cx = Math.floor(x);
    const cy = Math.floor(y);
    const cz = Math.floor(z);
    if (cx !== this.sunCellX || cy !== this.sunCellY || cz !== this.sunCellZ) {
      this.sunCellX = cx;
      this.sunCellY = cy;
      this.sunCellZ = cz;
      const [ox, oy, oz] = SHADOW.SUN_OFFSET;
      this.sun.position.set(cx + ox, cy + oy, cz + oz);
      this.sun.target.position.set(cx, cy, cz);
      this.sun.target.updateMatrixWorld();
    }
  }

  /** 自适应降档后同步更新像素比、阴影开关/贴图尺寸与泛光后处理链 */
  private applyQualityPreset(): void {
    const preset = this.quality.preset;
    const pr = Math.min(devicePixelRatio, preset.pixelRatioMax);
    this.renderer.setPixelRatio(pr);
    this.renderer.shadowMap.enabled = preset.shadows;
    this.sun.castShadow = preset.shadows && this.lastDaylight >= SHADOW.NIGHT_THRESHOLD;
    if (preset.shadows && preset.shadowMapSize > 0) {
      if (this.sun.shadow.mapSize.x !== preset.shadowMapSize) {
        this.sun.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
        this.sun.shadow.map?.dispose();
        this.sun.shadow.map = null;
      }
    } else if (this.sun.shadow.map) {
      this.sun.shadow.map.dispose();
      this.sun.shadow.map = null;
    }
    this.syncBloomComposer();
    this.composer?.setPixelRatio(pr);
  }

  render(): void {
    const now = performance.now();
    this.clock.value = (now * 0.001) % QUALITY_ADAPT.CLOCK_MOD_SECONDS;
    if (this.quality.recordFrame(now)) {
      this.applyQualityPreset();
    }
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
