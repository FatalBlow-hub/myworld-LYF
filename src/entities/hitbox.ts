/** 射线命中 — 几何工具，动物/僵尸/坦克共用（不依赖任何具体活物类型） */

/** 能被射线打中的东西：只要有坐标，宽高可自带（老鼠比人矮） */
export interface RayTarget {
  x: number;
  y: number;
  z: number;
  w?: number;
  h?: number;
}

/**
 * 射线打盒子：从一堆目标里找最近被打中的那个（AABB 的 slab 相交测试）
 * @param w/h 默认宽高；目标自带 w/h 时用它自己的
 * @returns 最近命中与距离，都没打中返回 null
 */
export function rayHitBox<T extends RayTarget>(
  list: T[],
  w: number, h: number,
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  maxDist: number,
): { target: T; dist: number } | null {
  let best: { target: T; dist: number } | null = null;
  for (const a of list) {
    const ew = a.w ?? w;
    const eh = a.h ?? h;
    const min = [a.x - ew / 2, a.y, a.z - ew / 2];
    const max = [a.x + ew / 2, a.y + eh, a.z + ew / 2];
    const o = [ox, oy, oz], d = [dx, dy, dz];
    let t0 = 0, t1 = maxDist, ok = true;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-9) {
        if (o[i] < min[i] || o[i] > max[i]) { ok = false; break; }
      } else {
        let ta = (min[i] - o[i]) / d[i];
        let tb = (max[i] - o[i]) / d[i];
        if (ta > tb) [ta, tb] = [tb, ta];
        t0 = Math.max(t0, ta);
        t1 = Math.min(t1, tb);
        if (t0 > t1) { ok = false; break; }
      }
    }
    if (ok && (!best || t0 < best.dist)) best = { target: a, dist: t0 };
  }
  return best;
}
