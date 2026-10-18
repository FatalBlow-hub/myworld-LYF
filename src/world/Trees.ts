/** 树的造型与生长 — 六种果树的方块布局（含椰子棕榈）+ 树苗长大的空间检查。
 *
 *  地形生成（往 chunk.data 里直接写）和树苗长大（走 world.setBlock）共用同一份布局，
 *  两边的树长得一模一样，不用维护两套画法。 */

import { PALM } from '../config';
import { AIR, COCONUT, PALM_LEAVES, PALM_WOOD, WOOD, isPlant } from './Block';
import type { TreeSpecies } from './blocks.trees';
import type { World } from './World';

/** 一个待放的方块：相对树苗那格的偏移 + 方块 ID */
export interface TreeBlock { x: number; y: number; z: number; id: number }

/** 一棵树的全部方块（相对树苗格）。rand 决定椰子树高矮和挂几个椰子 */
export function treeBlocks(sp: TreeSpecies, rand: () => number): TreeBlock[] {
  return sp.palm ? palmBlocks(sp, rand) : fruitBlocks(sp);
}

/** 普通果树：一格木干 + 顶上按曼哈顿距离收出来的一坨树叶（参数在物种表里） */
function fruitBlocks(sp: TreeSpecies): TreeBlock[] {
  const out: TreeBlock[] = [];
  const top = sp.trunk;
  for (let y = 0; y < top; y++) out.push({ x: 0, y, z: 0, id: WOOD });
  const R = Math.min(sp.canopyR, 3); // 树冠横向最多伸 3 格，再大就没边了
  for (let dy = sp.dyMin; dy <= sp.dyMax; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      for (let dz = -R; dz <= R; dz++) {
        const r = Math.abs(dx) + Math.abs(dz) + Math.abs(dy);
        if (r <= sp.canopyR && !(dx === 0 && dz === 0 && dy < 1)) {
          out.push({ x: dx, y: top + dy, z: dz, id: sp.leaf });
        }
      }
    }
  }
  return out;
}

/** 椰子树：浅色高木干 + 顶上四瓣大叶 + 叶下挂 3~4 个椰子（和沙滩上野生的一个造型） */
function palmBlocks(sp: TreeSpecies, rand: () => number): TreeBlock[] {
  const h = PALM.HEIGHT_MIN + Math.floor(rand() * (PALM.HEIGHT_MAX - PALM.HEIGHT_MIN + 1));
  const top = h;
  const out: TreeBlock[] = [];
  for (let y = 0; y < top; y++) out.push({ x: 0, y, z: 0, id: PALM_WOOD });
  out.push({ x: 0, y: top, z: 0, id: PALM_LEAVES });
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    out.push({ x: dx, y: top, z: dz, id: PALM_LEAVES });
    out.push({ x: dx * 2, y: top, z: dz * 2, id: PALM_LEAVES });
    out.push({ x: dx * 2, y: top - 1, z: dz * 2, id: PALM_LEAVES });
  }
  const n = PALM.COCONUT_MIN + Math.floor(rand() * (PALM.COCONUT_MAX - PALM.COCONUT_MIN + 1));
  const spots = [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const;
  for (let i = 0; i < Math.min(n, spots.length); i++) {
    out.push({ x: spots[i][0], y: top - 1, z: spots[i][1], id: COCONUT });
  }
  return out;
}

/** 这棵树摆不摆得下：每个要占的格子都得是空气或能顶替的花草；占不了就返回 false（树苗停止生长） */
export function treeFits(world: World, x: number, y: number, z: number, blocks: TreeBlock[]): boolean {
  for (const b of blocks) {
    const cur = world.getBlock(x + b.x, y + b.y, z + b.z);
    if (cur !== AIR && !isPlant(cur)) return false;
  }
  return true;
}

/** 半成熟树苗试着长成大树：位置够就把整棵树放下去，不够就原地等着（下一轮再试） */
export function tryGrowTree(world: World, x: number, y: number, z: number, sp: TreeSpecies): boolean {
  const blocks = treeBlocks(sp, Math.random);
  if (!treeFits(world, x, y, z, blocks)) return false;
  for (const b of blocks) world.setBlock(x + b.x, y + b.y, z + b.z, b.id);
  return true;
}
