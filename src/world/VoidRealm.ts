/** 灵魂虚空地图 — 一座孤悬虚空中的 9×9 灵魂蓝木板平台（高 1 格）+ 平台边的回程传送门
 *
 *  平台中心在 (0,0)，方块占 x,z ∈ [-4,4]，高度在 VOID_REALM.PLATFORM_Y；
 *  平台边上立一座已点燃的灵魂蓝传送门，走进去就回本岛。
 *  脚下和四周全是虚空，掉下去按"掉出世界"处理（复活回本岛床/复活点）。 */

import { VOID_REALM } from '../config';
import { SOUL_PLANKS, SOUL_PORTAL } from './Block';
import type { World } from './World';

/** 玩家在虚空平台上的出生点（站在平台正中，面朝回程门） */
export const VOID_SPAWN = { x: 0.5, y: VOID_REALM.PLATFORM_Y + 1.0, z: -2.5, yaw: 0 };

/** 回程传送门在平台上的位置：内腔 2×3，立在 x=3 这条平台边上，面朝平台中心 */
const GATE = { X: 3, Z0: -1, Y0: VOID_REALM.PLATFORM_Y + 1, W: 2, H: 3 };

/** 生成灵魂虚空世界：纯虚空 + 9×9 灵魂蓝平台 + 一座现成的回程传送门 */
export function buildVoidRealm(world: World): void {
  world.terrainGen = false; // 关掉地形生成：没生成的区块全是空气=虚空，y<0 也是虚空
  const half = Math.floor(VOID_REALM.PLATFORM / 2); // 9 → ±4

  // 9×9×1 灵魂蓝木板平台
  for (let x = -half; x <= half; x++) {
    for (let z = -half; z <= half; z++) {
      world.setBlock(x, VOID_REALM.PLATFORM_Y, z, SOUL_PLANKS);
    }
  }

  // 平台边上的回程门：灵魂蓝木板框 + 内腔预填传送门方块（进去=回家）
  const { X, Z0, Y0, W, H } = GATE;
  for (let yy = Y0; yy < Y0 + H; yy++) {
    world.setBlock(X, yy, Z0 - 1, SOUL_PLANKS);     // 左柱
    world.setBlock(X, yy, Z0 + W, SOUL_PLANKS);     // 右柱
  }
  for (let z = Z0 - 1; z <= Z0 + W; z++) {
    world.setBlock(X, Y0 - 1, z, SOUL_PLANKS);      // 底行（就是平台面，踩进去不绊脚）
    world.setBlock(X, Y0 + H, z, SOUL_PLANKS);      // 顶行
  }
  for (let yy = Y0; yy < Y0 + H; yy++) {
    for (let z = Z0; z < Z0 + W; z++) {
      world.setBlock(X, yy, z, SOUL_PORTAL);        // 内腔：走进去就传送回家
    }
  }
}

/** 虚空平台上一格随机落点（刷幽灵鬼用），返回平台面上一格的中心 */
export function voidPlatformSpot(): { x: number; y: number; z: number } {
  const half = Math.floor(VOID_REALM.PLATFORM / 2);
  return {
    x: -half + Math.floor(Math.random() * VOID_REALM.PLATFORM) + 0.5,
    y: VOID_REALM.PLATFORM_Y + 1,
    z: -half + Math.floor(Math.random() * VOID_REALM.PLATFORM) + 0.5,
  };
}
