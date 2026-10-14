/** 掉落辅助 — 把睡醒奖励碎片放到附近的地面上 */

import * as THREE from 'three';
import { CHUNK, DAY } from '../config';
import { ItemDrop } from '../entities/ItemDrop';
import { World } from '../world/World';

/** 把一颗碎片扔到 (sx,sy,sz) 附近的地面上，扔到返回 true */
export function dropShardNear(world: World, scene: THREE.Scene, drops: ItemDrop[], itemId: number, sx: number, sy: number, sz: number): boolean {
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(sx + (Math.random() * 2 - 1) * DAY.STAR_RANGE);
    const z = Math.floor(sz + (Math.random() * 2 - 1) * DAY.STAR_RANGE);
    // 从上往下找第一格实心方块，碎片落在它顶上
    const top = Math.min(CHUNK.HEIGHT - 2, Math.floor(sy) + 15);
    for (let y = top; y > 0; y--) {
      if (world.isSolidAt(x, y, z)) {
        const drop = new ItemDrop(itemId, 1, x + 0.5, y + 1, z + 0.5);
        scene.add(drop.mesh);
        drops.push(drop);
        return true;
      }
    }
  }
  return false;
}
