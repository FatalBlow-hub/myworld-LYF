/** 液体容器 — 同种液体最多装满（铁桶/玻璃桶 3 格、玻璃瓶 1 格），保留空容器数量并阻止混装 */

import { STACK_MAX } from '../config';
import { BLOCKS, FILLED_ID, LIQUID_FILL, Stack, isLiquid, liquidCapOf } from '../world/Block';
import { World } from '../world/World';
import { Inventory } from '../player/Inventory';
import { BlockHit, scoopWater } from './BlockPicker';

export function scoopBucket(world: World, inventory: Inventory, slot: number, hit: BlockHit, message: (text: string) => void): void {
  const held = inventory.hotbar[slot]!;
  const liquid = world.getBlock(hit.x, hit.y, hit.z);
  if (!isLiquid(liquid)) return;
  const empty = !(held.id in LIQUID_FILL);
  const emptyId = empty ? held.id : LIQUID_FILL[held.id].bucket; // 倒空之后容器本来的样子
  const cap = liquidCapOf(emptyId);
  const filled = FILLED_ID[`${emptyId}:${liquid}`];
  if ((!empty && LIQUID_FILL[held.id].liquid !== liquid) || (empty && !filled)) {
    message('不能混装：请换一个空容器，清水只有铁桶和玻璃瓶能装');
    return;
  }
  // 空容器变对应装满版；同种容器再灌一格（最多装满）
  if (!empty && held.count >= cap) {
    message(`装满了（${cap}/${cap}），按 L 倒出`);
    return;
  }
  if (empty && held.count > 1) {
    const others = [...inventory.hotbar, ...inventory.storage].filter((s) => s !== held);
    const room = others.reduce((n, s) => n + (!s ? held.count : s.id === held.id ? Math.max(0, STACK_MAX - s.count) : 0), 0);
    if (room < held.count - 1) { message('背包满了，先腾一格放剩下的空容器'); return; }
  }
  if (!scoopWater(world, hit)) return;
  if (empty) {
    const rest: Stack = { ...held, count: held.count - 1 };
    inventory.hotbar[slot] = { id: filled, count: 1 };
    if (rest.count) inventory.add(rest.id, rest.count);
  } else held.count++;
  message(`盛了一格${BLOCKS[liquid].cn}（${inventory.hotbar[slot]!.count}/${cap}）`);
}
