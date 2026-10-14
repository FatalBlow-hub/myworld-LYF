/** 液体桶 — 同种液体最多三格，保留空桶数量并阻止混装 */

import { BUCKET_WATER_MAX, STACK_MAX } from '../config';
import { BLOCKS, BUCKET, FILLED_ID, GLASS_BUCKET, Stack, SWAMP_FILL, WATER, WATER_BUCKET, isSwamp } from '../world/Block';
import { World } from '../world/World';
import { Inventory } from '../player/Inventory';
import { BlockHit, scoopWater } from './BlockPicker';

export function scoopBucket(world: World, inventory: Inventory, slot: number, hit: BlockHit, message: (text: string) => void): void {
  const held = inventory.hotbar[slot]!;
  const liquid = world.getBlock(hit.x, hit.y, hit.z);
  const empty = held.id === BUCKET || held.id === GLASS_BUCKET;
  const current = held.id === WATER_BUCKET ? WATER : SWAMP_FILL[held.id]?.liquid;
  // 清水只有铁桶能盛
  const filled = liquid === WATER && held.id === BUCKET ? WATER_BUCKET : FILLED_ID[`${held.id}:${liquid}`];
  if (liquid !== WATER && !isSwamp(liquid)) return;
  if ((!empty && current !== liquid) || (empty && !filled)) {
    message('不能混装：请换一个空桶，清水使用铁桶');
    return;
  }
  // 空桶变对应泽液桶；同种泽液桶再灌一格（最多 3）
  if (!empty && held.count >= BUCKET_WATER_MAX) {
    message(`桶装满了（${BUCKET_WATER_MAX}/${BUCKET_WATER_MAX}），按 L 倒出`);
    return;
  }
  if (empty && held.count > 1) {
    const others = [...inventory.hotbar, ...inventory.storage].filter((s) => s !== held);
    const room = others.reduce((n, s) => n + (!s ? held.count : s.id === held.id ? Math.max(0, STACK_MAX - s.count) : 0), 0);
    if (room < held.count - 1) { message('背包满了，先腾一格放剩下的空桶'); return; }
  }
  if (!scoopWater(world, hit)) return;
  if (empty) {
    const rest: Stack = { ...held, count: held.count - 1 };
    inventory.hotbar[slot] = { id: filled, count: 1 };
    if (rest.count) inventory.add(rest.id, rest.count);
  } else held.count++;
  message(`盛了一格${BLOCKS[liquid].cn}（${inventory.hotbar[slot]!.count}/${BUCKET_WATER_MAX}）`);
}
