/** 世界 — 区块 + 方块朝向 + 箱子/熔炉内容 + 按碰撞盒的碰撞查询 */

import { CHUNK, SMELT_TIME, WATER_FLOW } from '../config';
import { AIR, CROP_NEXT, SAPLING_MATURE, SAPLING_NEXT, SOUL_FURNACE, STONE, WATER, Slots } from './Block';
import { solidBoxes } from './Shapes';
import { tryGrowTree } from './Trees';
import { SMELT } from './Recipes';
import { Chunk } from './Chunk';
import { generateChunk } from './TerrainGen';

export interface FurnaceState {
  /** [0]=放进来的料，[1]=烧好的成品 */
  slots: Slots;
  progress: number;
  soul: boolean;
}

export class World {
  private chunks = new Map<string, Chunk>();
  /** 方块朝向（楼梯/熔炉/箱子/告示牌用），key = "x,y,z" */
  private meta = new Map<string, number>();
  /** 每个箱子的存货，key = "x,y,z" */
  readonly chests = new Map<string, Slots>();
  /** 每个熔炉的烧制状态 */
  readonly furnaces = new Map<string, FurnaceState>();
  /** 内容变过、等待重建网格的区块 key */
  readonly dirtyChunks = new Set<string>();
  /** 悬空的水：下面是空气，排队等着往下流（key = "x,y,z"） */
  private wetQueue = new Set<string>();
  /** 是否自动用噪声生成新区块地形（大厅等固定场景关闭） */
  terrainGen = true;
  /** 方块改动钩子：同屏访岛时挂上去收集本地改动广播给对端；平时为 null 零开销 */
  onBlockChange: ((wx: number, wy: number, wz: number, id: number) => void) | null = null;

  /** 清空重置整个世界：区块、朝向表、箱子、熔炉、脏区块、流水队列全清 */
  clear(): void {
    this.chunks.clear();
    this.meta.clear();
    this.chests.clear();
    this.furnaces.clear();
    this.dirtyChunks.clear();
    this.wetQueue.clear();
    this.terrainGen = true;
  }

  reset(): void {
    this.clear();
  }

  static key(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  static posKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(World.key(cx, cz));
  }

  /** 拿到区块，没有就现场生成一块 */
  ensureChunk(cx: number, cz: number): Chunk {
    const key = World.key(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(cx, cz);
      if (this.terrainGen) {
        generateChunk(chunk);
      }
      this.chunks.set(key, chunk);
      this.dirtyChunks.add(key);
      if (this.terrainGen) {
        this.seedWater(chunk); // 刚生成的区块：悬空的水登记进流水队列
      }
    }
    return chunk;
  }

  /** 把这个区块里"下面是空气"的水登记进流水队列（会自己往下漏） */
  private seedWater(chunk: Chunk): void {
    const bx = chunk.cx * CHUNK.SIZE;
    const bz = chunk.cz * CHUNK.SIZE;
    for (let lx = 0; lx < CHUNK.SIZE; lx++) {
      for (let y = 1; y < CHUNK.HEIGHT; y++) {
        for (let lz = 0; lz < CHUNK.SIZE; lz++) {
          if (chunk.get(lx, y, lz) === WATER && chunk.get(lx, y - 1, lz) === AIR) {
            this.wetQueue.add(World.posKey(bx + lx, y, bz + lz));
          }
        }
      }
    }
  }

  getBlock(wx: number, wy: number, wz: number): number {
    if (wy < 0) return this.terrainGen ? STONE : AIR; // 岛底基岩；大厅下方是虚空
    if (wy >= CHUNK.HEIGHT) return AIR;
    const cx = Math.floor(wx / CHUNK.SIZE);
    const cz = Math.floor(wz / CHUNK.SIZE);
    const chunk = this.chunks.get(World.key(cx, cz));
    if (!chunk) return AIR;
    return chunk.get(wx - cx * CHUNK.SIZE, wy, wz - cz * CHUNK.SIZE);
  }

  /** 改方块：标脏所在区块，跨边界的邻居区块也一起标脏 */
  setBlock(wx: number, wy: number, wz: number, id: number): void {
    if (wy < 0 || wy >= CHUNK.HEIGHT) return;
    const cx = Math.floor(wx / CHUNK.SIZE);
    const cz = Math.floor(wz / CHUNK.SIZE);
    const lx = wx - cx * CHUNK.SIZE;
    const lz = wz - cz * CHUNK.SIZE;
    const chunk = this.ensureChunk(cx, cz);
    chunk.set(lx, wy, lz, id);
    this.dirtyChunks.add(World.key(cx, cz));

    // 水登记：变成水且下面是空气 → 排队往下流；挖空了且头顶是水 → 那格水也排队
    if (id === WATER && this.getBlock(wx, wy - 1, wz) === AIR) {
      this.wetQueue.add(World.posKey(wx, wy, wz));
    }
    if (id === AIR && this.getBlock(wx, wy + 1, wz) === WATER) {
      this.wetQueue.add(World.posKey(wx, wy + 1, wz));
    }

    // 方块被换掉 → 朝向和容器内容清掉
    const pk = World.posKey(wx, wy, wz);
    this.meta.delete(pk);
    this.chests.delete(pk);
    this.furnaces.delete(pk);

    if (lx === 0) this.markDirty(cx - 1, cz);
    if (lx === CHUNK.SIZE - 1) this.markDirty(cx + 1, cz);
    if (lz === 0) this.markDirty(cx, cz - 1);
    if (lz === CHUNK.SIZE - 1) this.markDirty(cx, cz + 1);

    this.onBlockChange?.(wx, wy, wz, id);
  }

  /** 把世界里所有指定方块清掉（换成空气）：入冬清蘑菇用；返回清掉几格 */
  clearBlocks(ids: readonly number[]): number {
    const set = new Set(ids);
    let count = 0;
    for (const [key, chunk] of this.chunks) {
      let touched = false;
      for (let i = 0; i < chunk.data.length; i++) {
        if (!set.has(chunk.data[i])) continue;
        chunk.data[i] = AIR;
        touched = true;
        count++;
      }
      if (touched) this.dirtyChunks.add(key);
    }
    return count;
  }

  /** 把所有已生成的区块标脏：全局换贴图（比如秋天树叶变色）后要整片重建网格 */
  markAllDirty(): void {
    for (const key of this.chunks.keys()) this.dirtyChunks.add(key);
  }

  private markDirty(cx: number, cz: number): void {
    if (this.chunks.has(World.key(cx, cz))) {
      this.dirtyChunks.add(World.key(cx, cz));
    }
  }

  /** 物理查询：这个世界坐标的格子是不是实心 */
  isSolidAt(wx: number, wy: number, wz: number): boolean {
    return solidBoxes(this.getBlock(wx, wy, wz), this.getMeta(wx, wy, wz)).length > 0;
  }

  getMeta(wx: number, wy: number, wz: number): number {
    return this.meta.get(World.posKey(wx, wy, wz)) ?? 0;
  }

  setMeta(wx: number, wy: number, wz: number, m: number): void {
    this.meta.set(World.posKey(wx, wy, wz), m);
  }

  /** 盒子和实心方块（含异形碰撞盒）撞不撞 */
  hitsBox(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): boolean {
    for (let bx = Math.floor(x0); bx <= Math.floor(x1); bx++) {
      for (let by = Math.floor(y0); by <= Math.floor(y1); by++) {
        for (let bz = Math.floor(z0); bz <= Math.floor(z1); bz++) {
          const id = this.getBlock(bx, by, bz);
          const boxes = solidBoxes(id, this.getMeta(bx, by, bz));
          for (const b of boxes) {
            if (x0 < bx + b[3] && x1 > bx + b[0] &&
                y0 < by + b[4] && y1 > by + b[1] &&
                z0 < bz + b[5] && z1 > bz + b[2]) return true;
          }
        }
      }
    }
    return false;
  }

  /** 拿到（或新建）某个位置的箱子 */
  chestAt(x: number, y: number, z: number): Slots {
    const pk = World.posKey(x, y, z);
    let s = this.chests.get(pk);
    if (!s) {
      s = Array<null>(27).fill(null);
      this.chests.set(pk, s);
    }
    return s;
  }

  /** 拿到（或新建）某个位置的熔炉状态 */
  furnaceAt(x: number, y: number, z: number): FurnaceState {
    const pk = World.posKey(x, y, z);
    let f = this.furnaces.get(pk);
    if (!f) {
      f = { slots: [null, null], progress: 0, soul: this.getBlock(x, y, z) === SOUL_FURNACE };
      this.furnaces.set(pk, f);
    }
    return f;
  }

  /** 存档：每个区块里和自动生成地形不一样的格子（玩家挖的/放的） */
  exportDiffs(): Record<string, [number, number][]> {
    const diffs: Record<string, [number, number][]> = {};
    for (const [key, chunk] of this.chunks) {
      const fresh = new Chunk(chunk.cx, chunk.cz);
      generateChunk(fresh);
      const list: [number, number][] = [];
      for (let i = 0; i < chunk.data.length; i++) {
        if (chunk.data[i] !== fresh.data[i]) list.push([i, chunk.data[i]]);
      }
      if (list.length > 0) diffs[key] = list;
    }
    return diffs;
  }

  /** 读档：把改过的格子盖回自动生成的地形上（不走 setBlock，免得清掉箱子） */
  applyDiffs(diffs: Record<string, [number, number][]>): void {
    for (const [key, list] of Object.entries(diffs)) {
      const [cx, cz] = key.split(',').map(Number);
      const chunk = this.ensureChunk(cx, cz);
      for (const [i, id] of list) chunk.data[i] = id;
      this.dirtyChunks.add(key);
      this.seedWater(chunk); // 读档后的改动可能让水悬空了（比如挖穿湖底）
    }
  }

  /** 存档：方块朝向表 */
  exportMeta(): Record<string, number> {
    return Object.fromEntries(this.meta);
  }

  applyMeta(meta: Record<string, number>): void {
    for (const [k, v] of Object.entries(meta)) this.meta.set(k, v);
  }

  /** 水稻半天长一级：扫所有已生成的区块，在长的稻谷往前挪一格（黄大苗不在表里，熟了就停） */
  growCrops(): void {
    for (const [key, chunk] of this.chunks) {
      let touched = false;
      for (let i = 0; i < chunk.data.length; i++) {
        const next = CROP_NEXT[chunk.data[i]];
        if (next !== undefined) {
          chunk.data[i] = next;
          touched = true;
        }
      }
      if (touched) this.dirtyChunks.add(key);
    }
  }

  /** 果树苗跟庄稼一个节奏长：小苗→幼树→半成熟树；
   *  半成熟树四周空位够就原地长成整棵大树，不够就停在那儿等（果树不能贴太近种） */
  growSaplings(): void {
    for (const [key, chunk] of this.chunks) {
      let touched = false;
      for (let i = 0; i < chunk.data.length; i++) {
        const id = chunk.data[i];
        const next = SAPLING_NEXT[id];
        if (next !== undefined) {
          chunk.data[i] = next;
          touched = true;
          continue;
        }
        const sp = SAPLING_MATURE[id];
        if (sp) {
          const lx = i % CHUNK.SIZE;
          const lz = Math.floor(i / CHUNK.SIZE) % CHUNK.SIZE;
          const y = Math.floor(i / (CHUNK.SIZE * CHUNK.SIZE));
          // 走 setBlock 建树：树冠能跨过区块边，长成的树也会同步给同屏访客
          tryGrowTree(this, chunk.cx * CHUNK.SIZE + lx, y, chunk.cz * CHUNK.SIZE + lz, sp);
        }
      }
      if (touched) this.dirtyChunks.add(key);
    }
  }

  /** 悬空的水往下流：70% 概率源头留着、下面多一格水（水变多）；30% 整格挪下去 */
  flowWater(): void {
    // 先复制一份再处理：流出来的新水要等下一轮才继续流，瀑布是一格一格长出来的
    for (const key of [...this.wetQueue]) {
      this.wetQueue.delete(key);
      const [x, y, z] = key.split(',').map(Number);
      // 状态可能已经变了（被人填上或流走了），不再悬空就跳过
      if (this.getBlock(x, y, z) !== WATER || this.getBlock(x, y - 1, z) !== AIR) continue;
      if (Math.random() < WATER_FLOW.GROW) {
        this.setBlock(x, y - 1, z, WATER); // 直接下流：下面多一格水，源头还在
      } else {
        this.setBlock(x, y, z, AIR);       // 整体下流：上面的水挪到下面
        this.setBlock(x, y - 1, z, WATER);
      }
      // 新水如果还悬着，setBlock 会顺手把它登记回队列，下一轮接着流
    }
  }

  /** 熔炉每帧烧：料能烧就烧，烧完进成品格 */
  updateFurnaces(dt: number): void {
    for (const f of this.furnaces.values()) {
      const input = f.slots[0];
      const out = input ? SMELT[input.id] : undefined;
      if (input && out !== undefined && (!f.slots[1] || (f.slots[1].id === out && f.slots[1].count < 64))) {
        f.progress += dt;
        if (f.progress >= SMELT_TIME) {
          f.progress = 0;
          input.count--;
          if (input.count <= 0) f.slots[0] = null;
          f.slots[1] = f.slots[1] ? { id: out, count: f.slots[1].count + 1 } : { id: out, count: 1 };
        }
      } else {
        f.progress = 0;
      }
    }
  }
}
