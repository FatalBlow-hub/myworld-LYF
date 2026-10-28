/** CS 本地大赛系统 — CsMatch 状态机与 CS 商店面板的托管、每帧推进、开枪点亮视野（2026-10-29 从 Game.ts 抽出） */

import { CS } from '../../config';
import { World } from '../../world/World';
import { CsMatch, CsMode } from '../scenes/CsMatch';
import { CsOnline } from '../scenes/CsOnline';
import { CsGood, CsShopPanel } from '../../ui/panels/CsShopPanel';
import { Controller } from '../../player/motion/Controller';
import { PlayerBody } from '../../player/motion/Physics';
import { Hud } from '../../ui/hud/Hud';
import { Inventory } from '../../player/Inventory';
import type { Atlas } from '../../render/textures/Textures';

interface CsLocalCtx {
  scene: import('three').Scene;
  world: () => World;
  inventory: () => Inventory | null;
  hud: () => Hud | null;
  controller: Controller;
  slot: () => number;
  /** 中弹结算（Game 侧负责提示/阵亡定点/重生） */
  hurtPlayer: (dmg: number) => void;
  /** 整套比赛结束（Game 侧发奖回大厅） */
  onEnd: (won: boolean) => void;
  revivePlayer: () => void;
  online: () => CsOnline | null;
  isOnline: () => boolean;
}

export class CsLocalSystem {
  readonly shopPanel: CsShopPanel;
  private csMatch: CsMatch;
  private csLightT = 0;
  /** CS 阵亡后钉住的落脚点 */
  private downXValue = 0;
  private downZValue = 0;

  constructor(atlas: Atlas, private ctx: CsLocalCtx) {
    this.shopPanel = new CsShopPanel(atlas, () => this.csMatch?.cs ?? 0, (good) => this.buyCsGood(good));
    this.csMatch = new CsMatch(ctx.scene, ctx.world(), () => this.ctx.inventory()!, ctx.hud, {
      hurtPlayer: (dmg) => this.ctx.hurtPlayer(dmg),
      muzzle: () => { this.csLightT = CS.MUZZLE_LIGHT; },
      onEnd: (won) => this.ctx.onEnd(won),
      openStore: (open) => { if (open) this.shopPanel?.open(); else this.shopPanel?.close(); },
      revivePlayer: () => this.ctx.revivePlayer(),
    });
  }

  /** 本地比赛状态机（enterCs 里 begin / clearScene 里 abort 用） */
  get match(): CsMatch { return this.csMatch; }
  get matchActive(): boolean { return this.csMatch?.active ?? false; }
  get localDown(): boolean { return this.csMatch?.playerDown ?? false; }
  get downX(): number { return this.downXValue; }
  get downZ(): number { return this.downZValue; }
  /** 开枪点亮视野的余时（Game 的 setDaylight 用） */
  get lightT(): number { return this.csLightT; }

  beginMatch(mode: CsMode): void { this.csMatch.begin(mode); }
  abort(): void { this.csMatch?.abort(); }
  markDown(x: number, z: number): void { this.downXValue = x; this.downZValue = z; }
  /** 开枪瞬间点亮视野（CsMatch 的 muzzle 回调） */
  markMuzzle(): void { this.csLightT = CS.MUZZLE_LIGHT; }
  closeShop(): void { this.shopPanel?.close(); }

  /** CS 商店买了东西：扣 CS 币由 CsMatch 管，这里只负责刷新面板 */
  private buyCsGood(good: CsGood): void {
    this.csMatch?.buy(good);
    this.shopPanel?.refresh();
    this.ctx.hud()?.refreshHotbar(this.ctx.inventory()!, this.ctx.slot());
  }

  /** CS 大赛每帧：推进赛事、开枪时点亮视野（联机与本地共用输入与地图，只是推进对象不同） */
  tick(dt: number, body: PlayerBody): void {
    this.csLightT = Math.max(0, this.csLightT - dt);
    const hud = this.ctx.hud()!;
    if (this.ctx.isOnline()) {
      const online = this.ctx.online()!;
      online.update(dt, body);
      if (this.ctx.controller.take('mine') && online.fire(body, this.ctx.slot())) hud.setProgress(0);
      if (this.ctx.controller.take('door')) hud.showMessage('联机对战暂时没有 CS 商店（只有本地版有）', 1.5);
    } else {
      this.csMatch.update(dt, body);
      if (this.ctx.controller.take('mine') && this.csMatch.fire(body, this.ctx.slot())) hud.setProgress(0);
      if (this.ctx.controller.take('door')) this.csMatch.toggleStore();
    }
    // 比赛里禁止挖/放/捡方块：把这两个键吃掉（沙漠图的掩体是死的）
    if (this.ctx.controller.take('place')) hud.showMessage('CS 大赛里不能放方块', 1);
  }
}
