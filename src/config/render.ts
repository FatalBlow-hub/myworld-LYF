/** 全局配置 — 渲染画质：画质档位/AO/水面风摆/天空阴影 Bloom（2026-10-29 从 config.ts 拆出） */

/** 渲染质量 — 三档预设与自动降档参数 */
export type QualityTier = 'high' | 'medium' | 'low';


export interface QualityPreset {
  pixelRatioMax: number;
  antialias: boolean;
  viewDistance: number;
  shadows: boolean;
  shadowMapSize: number;
  bloom: boolean;
  ao: boolean;
  waterWave: boolean;
  windSway: boolean;
}


export const QUALITY_PRESETS: Record<QualityTier, QualityPreset> = {
  high: {
    pixelRatioMax: 2,
    antialias: true,
    viewDistance: 4,
    shadows: true,
    shadowMapSize: 2048,
    bloom: true,
    ao: true,
    waterWave: true,
    windSway: true,
  },
  medium: {
    pixelRatioMax: 1.5,
    antialias: true,
    viewDistance: 4,
    shadows: true,
    shadowMapSize: 1024,
    bloom: false,
    ao: true,
    waterWave: true,
    windSway: true,
  },
  low: {
    pixelRatioMax: 1,
    antialias: false,
    viewDistance: 3,
    shadows: false,
    shadowMapSize: 0,
    bloom: false,
    ao: true,
    waterWave: true,
    windSway: true,
  },
};


export const QUALITY_ADAPT = {
  WINDOW_FRAMES: 90,        // 帧时间滑窗大小（帧数）
  DOWNGRADE_MS: 35,         // 滑窗平均帧耗超过此阈值（< 28 FPS）触发降档
  MAX_FRAME_MS: 250,        // 单帧耗时夹紧上限，防止切后台回来瞬间误降档
  CLOCK_MOD_SECONDS: 3600,  // 共享渲染时钟取模周期（秒），防 float32 精度抖动
};


/** 逐顶点 AO 曲线：occ 0~3 对应的亮度系数 */
export const AO_CURVE = [1.0, 0.82, 0.65, 0.5] as const;


/** 面方向明暗：顶面最亮、底面最暗、侧面分两档增强立体感 */
export const FACE_SHADE = {
  TOP: 1.0,
  SIDE_Z: 0.86,
  SIDE_X: 0.76,
  BOTTOM: 0.6,
} as const;


/** 水面波浪与波光参数（只作用于 aEffect > 0 的暴露液面顶点） */
export const WATER_FX = {
  WAVE1_FREQ_X: 1.8, WAVE1_FREQ_Z: 1.3, WAVE1_SPEED: 2.2, WAVE1_AMP: 0.018,
  WAVE2_FREQ_X: 2.9, WAVE2_FREQ_Z: 2.4, WAVE2_SPEED: 3.1, WAVE2_AMP: 0.012,
  NORMAL_STRENGTH: 3.2, UV_SCALE: 3.5,
  UV1_SPEED_X: 0.65, UV1_SPEED_Z: 0.45, UV2_SPEED_X: -0.5, UV2_SPEED_Z: 0.7,
  SHIMMER_STRENGTH: 0.16, SPEC_POWER: 48.0, SPEC_STRENGTH: 0.55,
  FRESNEL_POWER: 3.0, FRESNEL_STRENGTH: 0.18,
  SUN_DIR: [0.4264, 0.8528, 0.2558] as const,
} as const;


/** 花草庄稼随机化与风摆参数（只作用于 aEffect > 0 的 cross 顶边顶点） */
export const WIND_FX = {
  SWAY_AMP: 0.055, SWAY_SPEED: 2.4, PHASE_X: 1.7, PHASE_Z: 2.3,
  OFFSET_MAX: 0.1, HALF_SPAN: 0.38, HEIGHT_MIN: 0.82, HEIGHT_MAX: 1.0,
} as const;


/** 竹子的表现参数：竹叶探出格子外面才像一丛（MC 的竹叶模型也是超格的） */
export const BAMBOO_FX = {
  LEAF_SPAN: 0.62,        // 梢头大丛竹叶的半宽（1 格 = 0.5，0.62 即探出格子）
  SMALL_LEAF_SPAN: 0.46,  // 顶下一节小丛竹叶的半宽
} as const;


/** 天空渐变球与地平线雾（三段昼夜色 + 雾距系数） */
export const SKY = {
  RADIUS: 150, W_SEG: 32, H_SEG: 16, FOG_NEAR: 0.65, FOG_FAR: 1.1,
  DAY: { zenith: 0x3b86e0, horizon: 0x9bd7f2 },
  DUSK: { zenith: 0x383268, horizon: 0xf08a4b },
  NIGHT: { zenith: 0x060918, horizon: 0x101836 },
  CURVE: 0.6, SUN_GLOW: 0.22, SUN_POWER: 16.0,
} as const;


/** 跟随式平行光软阴影参数（正交范围、近远裁切面、抗摩尔纹偏移、夜晚关闭阈值） */
export const SHADOW = {
  EXTENT: 44, NEAR: 10, FAR: 160,
  BIAS: -0.0005, NORMAL_BIAS: 0.03,
  NIGHT_THRESHOLD: 0.15, SUN_OFFSET: [50, 100, 30] as const,
} as const;


/** HIGH 档轻量泛光后处理参数（阈值避开白天雪地/白羊毛，发光材质用 HDR 倍率触发） */
export const BLOOM = {
  THRESHOLD: 0.88, STRENGTH: 0.35, RADIUS: 0.3,
  SAMPLES: 4, GLOW_COLOR: [1.35, 1.35, 1.45] as const,
} as const;
