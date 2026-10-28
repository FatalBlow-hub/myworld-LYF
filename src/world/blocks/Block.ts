/** 方块注册表 — 物品格子类型（Stack/Slots）+ 方块谓词。
 *  属性数据与 ID 常量都在 `blocks.data.ts`，这里原样转发，外部 import 路径不变。 */

import { BLOCKS, CHEST, DOOR_CLOSED, DOOR_OPEN, FURNACE, SOUL_CHEST, SOUL_FURNACE } from './data';

/** 数据全在 blocks.data.ts：加新方块改那边就行 */
export * from './data';

/** 背包/容器里一格：一摞东西（物品或方块） */
export interface Stack {
  id: number;
  count: number;
  /** 装备耐久（轮滑鞋剩余摔倒次数）；没这个值的普通物品不用写 */
  durability?: number;
}
export type Slots = (Stack | null)[];

export function isSolid(id: number): boolean {
  return BLOCKS[id]?.solid ?? false;
}

/** 挨着它的面要不要画出来（空气/水/玻璃/异形方块都算"透"） */
export function isSeeThrough(id: number): boolean {
  return BLOCKS[id]?.seeThrough ?? true;
}

export function isDoor(id: number): boolean {
  return id === DOOR_CLOSED || id === DOOR_OPEN;
}

/** 开门 ↔ 关门互换 */
export function toggleDoor(id: number): number {
  if (id === DOOR_CLOSED) return DOOR_OPEN;
  if (id === DOOR_OPEN) return DOOR_CLOSED;
  return id;
}

/** 挖这个方块会掉什么 */
export function dropOf(id: number): number {
  return BLOCKS[id]?.drop ?? id;
}

export function isChest(id: number): boolean {
  return id === CHEST || id === SOUL_CHEST;
}

export function isFurnace(id: number): boolean {
  return id === FURNACE || id === SOUL_FURNACE;
}

export function soulFire(id: number): boolean {
  return id === SOUL_FURNACE;
}

/** 植物（草/花）：能穿过去、能被方块顶替、打掉后原地可以再放方块 */
export function isPlant(id: number): boolean {
  return BLOCKS[id]?.shape === 'cross';
}
