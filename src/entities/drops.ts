/** 掉落物生成 — 全游戏唯一入口：任何"往地上扔东西"都走这里，不再各处 new + add + push */

import * as THREE from 'three';
import { CHUNK, DAY } from '../config';
import { ItemDrop } from './ItemDrop';
import { World } from '../world/World';

/** 掉落物归宿：场景 + 当前掉落物列表 */
export interface DropSink {
  scene: THREE.Scene;
  /** 用数组本体即可；列表会被整体替换的调用方在调用时现取 */
  drops: ItemDrop[];
}

/**
 * 生成并登记一个掉落物
 * @returns 新掉落物（调用方可以继续设置 age 等字段）
 */
export function spawnDrop(sink: DropSink, itemId: number, count: number, x: number, y: number, z: number): ItemDrop {
  const drop = new ItemDrop(itemId, count, x, y, z);
  sink.scene.add(drop.mesh);
  sink.drops.push(drop);
  return drop;
}

/** 把一颗碎片扔到 (sx,sy,sz) 附近的地面上，扔到返回 true */
export function dropShardNear(world: World, sink: DropSink, itemId: number, sx: number, sy: number, sz: number): boolean {
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(sx + (Math.random() * 2 - 1) * DAY.STAR_RANGE);
    const z = Math.floor(sz + (Math.random() * 2 - 1) * DAY.STAR_RANGE);
    // 从上往下找第一格实心方块，碎片落在它顶上
    const top = Math.min(CHUNK.HEIGHT - 2, Math.floor(sy) + 15);
    for (let y = top; y > 0; y--) {
      if (world.isSolidAt(x, y, z)) {
        spawnDrop(sink, itemId, 1, x + 0.5, y + 1, z + 0.5);
        return true;
      }
    }
  }
  return false;
}
