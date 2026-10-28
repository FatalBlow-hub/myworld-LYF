/** 联机送礼系统 — 同屏访岛的送礼物/收礼物/误伤结算（2026-10-29 从 Game.ts 抽出） */

import { PVP } from '../../config';
import { BLOCKS } from '../../world/blocks/Block';
import { GiveGift } from '../../ui/panels/GivePanel';
import { NetClient } from '../../net/Client';
import { Health } from '../../player/stats/Health';
import { hurtPlayer } from '../../player/stats/damage';
import { Hud } from '../../ui/hud/Hud';
import { Inventory } from '../../player/Inventory';
import { VisitSync } from '../scenes/VisitSync';

interface GiftsCtx {
  hud: () => Hud | null;
  inventory: () => Inventory | null;
  slot: () => number;
  coins: () => number;
  addCoins: (n: number) => void;
  net: () => NetClient | null;
  visitSync: () => VisitSync;
  health: () => Health | null;
  /** 被误伤打死后的重生（Game 侧按场景处理） */
  onDeath: () => void;
  saveNow: () => void;
}

export class GiftsSystem {
  constructor(private ctx: GiftsCtx) {}

  /** 收到「visit.hit」：误伤开启时被对方打中，扣血 + 飘提示（死了走重生） */
  onPeerHit(from: string): void {
    const health = this.ctx.health();
    if (!health) return;
    const r = hurtPlayer(health, PVP.DAMAGE);
    if (r.hurt) this.ctx.hud()?.showMessage(`${from} 打了你一下！`, 0.8);
    if (r.died) { this.ctx.onDeath(); this.ctx.hud()?.showMessage('被打了，回重生点了', 2); }
  }

  /** 收到「visit.give」：对面送的岛币进账、送的物品进背包，随后马上落盘 */
  onPeerGive(from: string, gift: GiveGift): void {
    const hud = this.ctx.hud();
    if (gift.coins && gift.coins > 0) {
      this.ctx.addCoins(gift.coins);
      hud?.showMessage(`🎁 ${from} 送了你 ${gift.coins} 岛币！`, 3);
    } else if (gift.itemId && gift.count && gift.count > 0) {
      this.ctx.inventory()?.add(gift.itemId, gift.count);
      hud?.showMessage(`🎁 ${from} 送了你 ${gift.count} 个${BLOCKS[gift.itemId]?.cn ?? '物品'}！`, 3);
    } else {
      return;
    }
    hud?.refreshHotbar(this.ctx.inventory()!, this.ctx.slot());
    this.ctx.saveNow();
  }

  /** 送礼物给同屏的对面：先扣自己的再发消息，发不出去就把东西还回来 */
  doGive(gift: GiveGift): boolean {
    const hud = this.ctx.hud();
    if (!this.ctx.visitSync().active) { hud?.showMessage('没人在你身边，没人能收', 2); return false; }
    const inv = this.ctx.inventory()!;
    let sent = false;
    if (gift.coins && gift.coins > 0) {
      const n = Math.min(Math.floor(gift.coins), this.ctx.coins());
      if (n <= 0) { hud?.showMessage('岛币不够', 1.5); return false; }
      sent = this.ctx.net()?.sendVisitGive({ coins: n }) ?? false;
      if (sent) { this.ctx.addCoins(-n); hud?.showMessage(`送出 ${n} 岛币`, 1.5); }
    } else if (gift.itemId && gift.count && gift.count > 0) {
      const n = Math.min(Math.floor(gift.count), inv.countOf(gift.itemId));
      if (n <= 0) { hud?.showMessage('没有这个物品了', 1.5); return false; }
      sent = this.ctx.net()?.sendVisitGive({ itemId: gift.itemId, count: n }) ?? false;
      if (sent) { inv.take(gift.itemId, n); hud?.showMessage(`送出 ${n} 个${BLOCKS[gift.itemId]?.cn ?? '物品'}`, 1.5); }
    } else {
      return false;
    }
    if (!sent) { hud?.showMessage('礼物没送出去，连接断了，东西还在你包里', 2.5); return false; }
    hud?.refreshHotbar(inv, this.ctx.slot());
    this.ctx.saveNow();
    return true;
  }
}
