/** 掉落物拾取 — 地上的东西滚一帧、被吸进背包；DIY 手册捡到直接学方法（不进包） */

import * as THREE from 'three';
import { DAY, PICKUP } from '../../config';
import { DropSink, dropShardNear } from '../../entities/objects/drops';
import { ItemDrop } from '../../entities/objects/ItemDrop';
import { Inventory } from '../../player/Inventory';
import { PlayerBody } from '../../player/motion/Physics';
import { Hud } from '../../ui/hud/Hud';
import { RecipeBook } from '../../ui/panels/RecipeBook';
import { BLOCKS, DIY_MANUAL, MANG_SHARD, STAR_SHARD } from '../../world/blocks/Block';
import { DIY_GOLD_MANUAL } from '../../world/recipes/GoldenItems';
import { World } from '../../world/World';

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
          const room = inventory.roomFor(d.itemId);
          if (room <= 0) {
            // 一格都塞不下：弹开，东西留在地上（背包满时不硬捡）
            if (d.refuseT <= 0) hud.showMessage(`背包满了，${BLOCKS[d.itemId].cn}捡不起来！`);
            d.repel(body, PICKUP.REFUSE_SECONDS);
          } else {
            const take = Math.min(room, d.count);
            inventory.add(d.itemId, take);
            hud.showMessage(`+${take} ${BLOCKS[d.itemId].cn}`);
            d.count -= take;
            if (d.count > 0) {
              // 只装得下一部分：剩下的弹回地上
              hud.showMessage(`背包快满了，剩下 ${d.count} 个${BLOCKS[d.itemId].cn}捡不起来`);
              d.repel(body, PICKUP.REFUSE_SECONDS);
            }
          }
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

  /**
   * 小战士打死的怪掉的战利品：手册直接学会，其它直接进背包；背包装不下的交给 onOverflow 掉在地上。
   * 返回给 HUD 的一句文案（没东西可捡返回空串）。
   */
  gainAll(loot: [number, number][], onOverflow: (id: number, rest: number) => void): string {
    const { inventory, book } = this.d;
    const got: string[] = [];
    const spilled: string[] = [];
    const papers: string[] = [];
    let goldenPaper = false;
    for (const [id, n] of loot) {
      if (id === DIY_MANUAL) {
        for (let i = 0; i < n; i++) papers.push(book.learn().text);
        got.push(`${BLOCKS[id].cn}×${n}`);
        continue;
      }
      if (id === DIY_GOLD_MANUAL) {
        for (let i = 0; i < n; i++) papers.push(book.learnGolden().text);
        goldenPaper = true;
        got.push(`${BLOCKS[id].cn}×${n}`);
        continue;
      }
      const take = Math.min(inventory.roomFor(id), n);
      if (take > 0) { inventory.add(id, take); got.push(`${BLOCKS[id].cn}×${take}`); }
      if (take < n) { onOverflow(id, n - take); spilled.push(`${BLOCKS[id].cn}×${n - take}`); }
    }
    if (papers.length) book.showPaper(papers.join('\n'), goldenPaper);
    if (!got.length && !spilled.length) return '';
    return spilled.length
      ? `小战士捡到 ${got.length ? got.join('、') : '一点东西'}（背包满了，${spilled.join('、')}掉在地上）`
      : `小战士捡到 ${got.join('、')}`;
  }

  /** 睡醒福利：星星碎片和芒星碎片各半概率，只掉一颗（自己熬夜到天亮没有这个福利） */
  dropStarShard(sx: number, sy: number, sz: number): void {
    const itemId = Math.random() < DAY.MANG_CHANCE ? MANG_SHARD : STAR_SHARD;
    if (dropShardNear(this.d.world, this.sink, itemId, sx, sy, sz)) {
      this.d.hud.showMessage(`睡着的时候，天上掉了一颗${BLOCKS[itemId].cn}下来！`, 3);
    }
  }
}
