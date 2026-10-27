/** 绳索 — 2 木棍合成 1 根；拿着对准动物按 M 拴住/放开
 *
 *  纯数据、无逻辑：拴动物行为见 core/Survival.useAnimalRope + entities/Animal.leashed。 */

import type { BlockDef } from './blocks.data';

/** 绳索（道具类配方就能做，不需要美食工作台） */
export const ROPE = 393;

export const ROPE_BLOCKS: Record<number, BlockDef> = {
  [ROPE]: { cn: '绳索', tex: { top: 'rope', side: 'rope' }, solid: false, seeThrough: true, hardness: 0, item: true },
};
