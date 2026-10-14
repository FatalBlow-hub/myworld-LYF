/** 沼泽地形 — 圆形的毒水塘：半径 8 分四层，从外到内越来越凶
 *  外圈 2 格 = 淡沼泽液 → 再 2 格 = 沼泽液 → 再 2 格 = 幻泽液 →
 *  中心 2 格半径的小圆切成一半：一半是岸，另一半再对半开 = 深泽液 + 溺泽液 */

import { SEA_LEVEL, SWAMP, WORLD_SEED } from '../config';
import {
  SWAMP_DEEP, SWAMP_DROWN, SWAMP_LIGHT, SWAMP_MID, SWAMP_PHANTOM,
} from './Block';
import type { Biome } from './TerrainGen';

type TerrainSample = (x: number, z: number) => { height: number; biome: Biome };
const centers = new Map<string, { x: number; z: number } | null>();

/** 沼泽自己的伪随机（和地形噪声分开，互不影响） */
function shash(x: number, z: number): number {
  let h = (x * 374761393 + z * 668265263 + WORLD_SEED * 413) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** 这块地皮（CELL×CELL 格）有没有沼泽中心、中心在哪；没有返回 null */
function centerOf(cx: number, cz: number): { x: number; z: number } | null {
  if (shash(cx * 31 + 7, cz * 31 + 13) >= SWAMP.CHANCE) return null;
  // 中心在地皮内部随机挑，离边留 RADIUS+1 免得贴地皮缝（反正查找会扫周围一圈）
  const pad = SWAMP.RADIUS + 1;
  return {
    x: cx * SWAMP.CELL + pad + Math.floor(shash(cx * 17 + 3, cz * 17 + 9) * (SWAMP.CELL - pad * 2)),
    z: cz * SWAMP.CELL + pad + Math.floor(shash(cx * 23 + 11, cz * 23 + 5) * (SWAMP.CELL - pad * 2)),
  };
}

/** 这一格是什么泽液（0 = 不是沼泽）。只对草地上、高出海面的地方长沼泽 */
export function swampAt(wx: number, wz: number, h: number, biome: Biome, sample?: TerrainSample): number {
  if (biome !== 'grass' || h <= SEA_LEVEL + 1) return 0;
  const cx = Math.floor(wx / SWAMP.CELL);
  const cz = Math.floor(wz / SWAMP.CELL);
  const R = SWAMP.RADIUS;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const key = `${cx + dx},${cz + dz}`;
      let c = centers.get(key);
      if (c === undefined) {
        c = centerOf(cx + dx, cz + dz);
        if (c && sample) {
          const level = sample(c.x, c.z).height;
          for (let x = -R; x <= R && c; x++) for (let z = -R; z <= R && c; z++) {
            if (Math.hypot(x + 0.5, z + 0.5) > R) continue;
            const ground = sample(c.x + x, c.z + z);
            if (ground.biome !== 'grass' || ground.height !== level || level <= SEA_LEVEL + 1) c = null;
          }
        }
        if (sample) centers.set(key, c);
      }
      if (!c) continue;
      const d = Math.hypot(wx + 0.5 - c.x, wz + 0.5 - c.z);
      if (d > R) continue;
      // 四层同心环，每圈 2 格宽（2+2+2+2 = 8）
      const ring = R / 4;
      if (d > ring * 3) return SWAMP_LIGHT;
      if (d > ring * 2) return SWAMP_MID;
      if (d > ring) return SWAMP_PHANTOM;
      // 中心小圆：上半圆是岸（返回 0 留地面），下半圆西半边深泽液、东半边溺泽液
      if (wz < c.z) return 0;
      return wx < c.x ? SWAMP_DEEP : SWAMP_DROWN;
    }
  }
  return 0;
}
