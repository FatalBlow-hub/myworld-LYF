/** 区块 — 一块 16×64×16 的方块柱子，是世界的最小存储单位 */

import { CHUNK } from '../config';
import { AIR } from './Block';

export class Chunk {
  readonly cx: number;
  readonly cz: number;
  /** 一格两个字节，存方块 ID（果树树叶/树苗等新方块 ID 已超过 255，一字节存不下） */
  readonly data = new Uint16Array(CHUNK.SIZE * CHUNK.HEIGHT * CHUNK.SIZE);
  /** 内容变过 → 需要重新生成网格 */
  dirty = true;

  constructor(cx: number, cz: number) {
    this.cx = cx;
    this.cz = cz;
  }

  static index(x: number, y: number, z: number): number {
    return (y * CHUNK.SIZE + z) * CHUNK.SIZE + x;
  }

  get(x: number, y: number, z: number): number {
    if (y < 0 || y >= CHUNK.HEIGHT) return AIR;
    return this.data[Chunk.index(x, y, z)];
  }

  set(x: number, y: number, z: number, id: number): void {
    if (y < 0 || y >= CHUNK.HEIGHT) return;
    this.data[Chunk.index(x, y, z)] = id;
    this.dirty = true;
  }
}
