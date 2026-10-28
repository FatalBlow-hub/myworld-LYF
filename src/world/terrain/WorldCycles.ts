/** 世界循环计时 — 让作物按时生长、水按时往下流 */

import { CROP, WATER_FLOW } from '../../config';
import { World } from '../World';

export class WorldCycles {
  private cropTimer = CROP.GROW_EVERY;
  private waterTimer = WATER_FLOW.EVERY;

  update(dt: number, world: World): void {
    this.cropTimer -= dt;
    if (this.cropTimer <= 0) {
      this.cropTimer += CROP.GROW_EVERY;
      world.growCrops();
      world.growSaplings(); // 果树苗和庄稼一个节奏
    }
    this.waterTimer -= dt;
    if (this.waterTimer <= 0) {
      this.waterTimer += WATER_FLOW.EVERY;
      world.flowWater();
    }
  }
}
