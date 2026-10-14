/** 掉落物拾取 — 地上的东西滚一帧、被吸进背包；DIY 手册捡到直接学方法（不进包） */

import * as THREE from 'three';
import { DAY } from '../config';
import { DropSink, dropShardNear } from '../entities/drops';
import { ItemDrop } from '../entities/ItemDrop';
import { Inventory } from '../player/Inventory';
import { PlayerBody } from '../player/Physics';
import { Hud } from '../ui/Hud';
import { RecipeBook } from '../ui/RecipeBook';
import { BLOCKS, DIY_MANUAL, MANG_SHARD, STAR_SHARD } from '../world/Block';
import { DIY_GOLD_MANUAL } from '../world/GoldenItems';
import { World } from '../world/World';

export interface PickupDeps {
  world: World;
  scene: THREE.Scene;
  inventory: Inventory;
  hud: Hud;
  book: RecipeBook;
  /** 当前掉落物列表（会被整体替换，所以用 getter） */
  drops: () => ItemDrop[];
}

export class Pickup {
  constructor(private d: PickupDeps) {}

  /** 掉落物归宿（每次现取，列表可能被换掉） */
  private get sink(): DropSink {
    return { scene: this.d.scene, drops: this.d.drops() };
  }

  /** 掉落物滚一帧 + 吸进背包：返回还活着的掉落物 */
  update(dt: number, body: PlayerBody): ItemDrop[] {
    const { drops, world, inventory, hud, scene, book } = this.d;
    const papers: string[] = [];
    let goldenPaper = false;
    for (const d of drops()) {
      if (d.update(dt, world, body)) {
        if (d.itemId === DIY_MANUAL) {
          for (let i = 0; i < d.count; i++) papers.push(book.learn().text);
          hud.showMessage(d.count > 1
            ? `捡到 ${d.count} 本DIY手册，学会 ${d.count} 个方法！`
            : '捡到 DIY手册，学会新方法！');
        } else if (d.itemId === DIY_GOLD_MANUAL) {
          const learned = book.learnGolden();
          papers.push(learned.text);
          goldenPaper = true;
          hud.showMessage(learned.isNew ? '捡到金色 DIY 手册，学会黄金配方！' : '捡到金色 DIY 手册，复习了一条黄金配方！');
        } else {
          inventory.add(d.itemId, d.count);
          hud.showMessage(`+${d.count} ${BLOCKS[d.itemId].cn}`);
        }
      }
      if (d.dead) scene.remove(d.mesh);
    }
    const unlocks = book.checkCollectionUnlocks(inventory);
    if (unlocks.length) {
      papers.push(...unlocks);
      goldenPaper = true;
      hud.showMessage('收集条件达成！获得新的金色 DIY 手册');
    }
    if (papers.length) book.showPaper(papers.join('\n'), goldenPaper);
    return drops().filter((d) => !d.dead);
  }

  /** 睡醒福利：星星碎片和芒星碎片各半概率，只掉一颗（自己熬夜到天亮没有这个福利） */
  dropStarShard(sx: number, sy: number, sz: number): void {
    const itemId = Math.random() < DAY.MANG_CHANCE ? MANG_SHARD : STAR_SHARD;
    if (dropShardNear(this.d.world, this.sink, itemId, sx, sy, sz)) {
      this.d.hud.showMessage(`睡着的时候，天上掉了一颗${BLOCKS[itemId].cn}下来！`, 3);
    }
  }
}
