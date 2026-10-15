/** 渲染质量 — 启动期探测显卡定初档，运行期按帧时间滑窗自适应降档（只降不升） */

import { QUALITY_ADAPT, QUALITY_PRESETS, QualityPreset, QualityTier } from '../config';

const LOW_GPU_RE = /SwiftShader|llvmpipe|Software|Microsoft Basic Render/i;
const MEDIUM_GPU_RE = /Intel.*HD|UHD Graphics|Mali-|Adreno \(TM\) [1-5]/i;

const TIER_ORDER: readonly QualityTier[] = ['high', 'medium', 'low'];

/** 用临时 canvas 读取显卡渲染器字符串并判定初始画质档位，任何异常或缺失均兜底返回 high */
export function detectQualityTier(): QualityTier {
  try {
    if (typeof document === 'undefined') return 'high';
    const canvas = document.createElement('canvas');
    const gl = (
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    ) as WebGLRenderingContext | null;
    if (!gl) return 'high';
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '')
      : String(gl.getParameter(gl.RENDERER) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    if (!rendererStr) return 'high';
    if (LOW_GPU_RE.test(rendererStr)) return 'low';
    if (MEDIUM_GPU_RE.test(rendererStr)) return 'medium';
    return 'high';
  } catch {
    return 'high';
  }
}

/** 质量状态机：管理当前档位与 90 帧滑窗自适应降档（只降不升、单次降一档后重算滑窗） */
export class QualityMonitor {
  private currentTier: QualityTier;
  private readonly samples = new Float32Array(QUALITY_ADAPT.WINDOW_FRAMES);
  private index = 0;
  private count = 0;
  private sumMs = 0;
  private lastTimeMs = 0;

  constructor(initialTier: QualityTier = detectQualityTier()) {
    this.currentTier = initialTier;
    console.log(`[画质] 档位 ${this.currentTier}`);
  }

  get tier(): QualityTier {
    return this.currentTier;
  }

  get preset(): QualityPreset {
    return QUALITY_PRESETS[this.currentTier];
  }

  /** 每帧调用：记录帧耗并在滑窗均值超阈值时降一档；返回新档位（未降档返回 null） */
  recordFrame(nowMs: number): QualityTier | null {
    if (this.lastTimeMs <= 0) {
      this.lastTimeMs = nowMs;
      return null;
    }
    const rawDt = nowMs - this.lastTimeMs;
    this.lastTimeMs = nowMs;
    if (rawDt <= 0 || this.currentTier === 'low') return null;

    const dt = Math.min(rawDt, QUALITY_ADAPT.MAX_FRAME_MS);
    const cap = this.samples.length;
    if (this.count < cap) {
      this.samples[this.count++] = dt;
      this.sumMs += dt;
    } else {
      this.sumMs += dt - this.samples[this.index];
      this.samples[this.index] = dt;
      this.index = (this.index + 1) % cap;
    }

    if (this.count < cap) return null;
    const avgMs = this.sumMs / cap;
    if (avgMs <= QUALITY_ADAPT.DOWNGRADE_MS) return null;

    const curIdx = TIER_ORDER.indexOf(this.currentTier);
    if (curIdx < 0 || curIdx >= TIER_ORDER.length - 1) return null;

    this.currentTier = TIER_ORDER[curIdx + 1];
    this.index = 0;
    this.count = 0;
    this.sumMs = 0;
    return this.currentTier;
  }
}
