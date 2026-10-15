/** 水面与风摆材质 — 基于 MeshLambertMaterial + onBeforeCompile 注入液面波浪波光与花草风摆 */

import * as THREE from 'three';
import { WATER_FX, WIND_FX } from '../config';

/** 创建半透明水/玻璃/冰共用材质：仅对 aEffect > 0 的暴露液面顶点施加波浪位移与波光高光 */
export function createWaterMaterial(
  texture: THREE.Texture,
  clock: { value: number },
): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    vertexColors: true,
  });
  mat.customProgramCacheKey = () => 'voxel-water-v1';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = clock;
    shader.vertexShader =
      `attribute float aEffect;\nuniform float uTime;\nvarying float vEffect;\nvarying vec3 vWorldPos;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vEffect = aEffect;
vec3 worldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
if (aEffect > 0.0) {
  float w1 = sin(worldPos.x * ${WATER_FX.WAVE1_FREQ_X.toFixed(4)} + worldPos.z * ${WATER_FX.WAVE1_FREQ_Z.toFixed(4)} + uTime * ${WATER_FX.WAVE1_SPEED.toFixed(4)}) * ${WATER_FX.WAVE1_AMP.toFixed(4)};
  float w2 = sin(worldPos.x * ${WATER_FX.WAVE2_FREQ_X.toFixed(4)} - worldPos.z * ${WATER_FX.WAVE2_FREQ_Z.toFixed(4)} + uTime * ${WATER_FX.WAVE2_SPEED.toFixed(4)}) * ${WATER_FX.WAVE2_AMP.toFixed(4)};
  float dy = (w1 + w2) * aEffect;
  transformed.y += dy;
  worldPos.y += dy;
}
vWorldPos = worldPos;`,
      );

    shader.fragmentShader =
      `uniform float uTime;\nvarying float vEffect;\nvarying vec3 vWorldPos;\n` +
      shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `if (vEffect > 0.0) {
  float p1 = vWorldPos.x * ${WATER_FX.WAVE1_FREQ_X.toFixed(4)} + vWorldPos.z * ${WATER_FX.WAVE1_FREQ_Z.toFixed(4)} + uTime * ${WATER_FX.WAVE1_SPEED.toFixed(4)};
  float p2 = vWorldPos.x * ${WATER_FX.WAVE2_FREQ_X.toFixed(4)} - vWorldPos.z * ${WATER_FX.WAVE2_FREQ_Z.toFixed(4)} + uTime * ${WATER_FX.WAVE2_SPEED.toFixed(4)};
  float c1 = cos(p1) * ${WATER_FX.WAVE1_AMP.toFixed(4)};
  float c2 = cos(p2) * ${WATER_FX.WAVE2_AMP.toFixed(4)};
  float dhdx = c1 * ${WATER_FX.WAVE1_FREQ_X.toFixed(4)} + c2 * ${WATER_FX.WAVE2_FREQ_X.toFixed(4)};
  float dhdz = c1 * ${WATER_FX.WAVE1_FREQ_Z.toFixed(4)} - c2 * ${WATER_FX.WAVE2_FREQ_Z.toFixed(4)};
  vec3 waveN = normalize(vec3(-dhdx * ${WATER_FX.NORMAL_STRENGTH.toFixed(4)}, 1.0, -dhdz * ${WATER_FX.NORMAL_STRENGTH.toFixed(4)}));
  vec2 uv1 = vWorldPos.xz * ${WATER_FX.UV_SCALE.toFixed(4)} + vec2(uTime * ${WATER_FX.UV1_SPEED_X.toFixed(4)}, uTime * ${WATER_FX.UV1_SPEED_Z.toFixed(4)});
  vec2 uv2 = vWorldPos.xz * ${(WATER_FX.UV_SCALE * 1.37).toFixed(4)} + vec2(uTime * ${WATER_FX.UV2_SPEED_X.toFixed(4)}, uTime * ${WATER_FX.UV2_SPEED_Z.toFixed(4)});
  float s1 = sin(uv1.x) * sin(uv1.y);
  float s2 = sin(uv2.x + 1.1) * sin(uv2.y - 0.7);
  float shimmer = smoothstep(0.25, 0.85, (s1 + s2) * 0.5) * ${WATER_FX.SHIMMER_STRENGTH.toFixed(4)};
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  vec3 sunDir = normalize(vec3(${WATER_FX.SUN_DIR[0].toFixed(4)}, ${WATER_FX.SUN_DIR[1].toFixed(4)}, ${WATER_FX.SUN_DIR[2].toFixed(4)}));
  vec3 halfDir = normalize(sunDir + viewDir);
  float spec = pow(max(dot(waveN, halfDir), 0.0), ${WATER_FX.SPEC_POWER.toFixed(1)}) * ${WATER_FX.SPEC_STRENGTH.toFixed(4)};
  float fresnel = pow(1.0 - max(dot(waveN, viewDir), 0.0), ${WATER_FX.FRESNEL_POWER.toFixed(1)}) * ${WATER_FX.FRESNEL_STRENGTH.toFixed(4)};
  outgoingLight += vec3(shimmer + spec + fresnel * 0.75, shimmer + spec + fresnel * 0.9, shimmer * 1.1 + spec + fresnel) * vEffect;
  diffuseColor.a = clamp(diffuseColor.a + (spec * 0.35 + fresnel * 0.25) * vEffect, 0.0, 1.0);
}
#include <opaque_fragment>`,
      );
  };
  return mat;
}

/** 为不透明材质注入花草风摆：仅 aEffect > 0 的植物顶边顶点摆动，实心方块与根部恒静止 */
export function attachWindSway(
  mat: THREE.MeshLambertMaterial,
  clock: { value: number },
): void {
  mat.customProgramCacheKey = () => 'voxel-opaque-sway-v1';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = clock;
    shader.vertexShader =
      `attribute float aEffect;\nuniform float uTime;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
if (aEffect > 0.0) {
  vec2 cell = floor(transformed.xz);
  float phase = cell.x * ${WIND_FX.PHASE_X.toFixed(4)} + cell.y * ${WIND_FX.PHASE_Z.toFixed(4)};
  transformed.x += sin(uTime * ${WIND_FX.SWAY_SPEED.toFixed(4)} + phase) * ${WIND_FX.SWAY_AMP.toFixed(4)} * aEffect;
  transformed.z += cos(uTime * ${(WIND_FX.SWAY_SPEED * 0.83).toFixed(4)} + phase * 1.37) * ${(WIND_FX.SWAY_AMP * 0.75).toFixed(4)} * aEffect;
}`,
      );
  };
}
