/** 旅者系统 — 四季旅者 NPC 的出现/对话/配方解锁（2026-10-29 从 Game.ts 抽出） */

import type { Scene } from 'three';
import { SEASON_FOOD } from '../../config';
import { Traveler, TRAVELERS } from '../../entities/creatures/Traveler';
import { TravelerOffer, TravelerPanel } from '../../ui/panels/TravelerPanel';
import { Controller } from '../../player/motion/Controller';
import { PlayerBody } from '../../player/motion/Physics';
import { World } from '../../world/World';
import { Hud } from '../../ui/hud/Hud';
import { Inventory } from '../../player/Inventory';
import { isSolid, BLOCKS, BEAD_FIREWORK, CHUNK_ROLL, HARVEST_PLATTER, POUCH_CALAMUS, SHIELD_CALAMUS, XMAS_COOKIE } from '../../world/blocks/Block';
import { CHUNK } from '../../config';
import type { Atlas } from '../../render/textures/Textures';
import type { Season } from '../loops/Calendar';

/** 手册只用到这两下：查关键词学没学过 / 按关键词学 */
interface BookLike {
  hasMatching: (keyword: string) => boolean;
  learnMatching: (keyword: string) => number;
}

type SceneMode = 'island' | 'hall' | 'visit' | 'void' | 'arena' | 'cs';

interface TravelerCtx {
  scene: Scene;
  world: () => World;
  book: BookLike;
  coins: () => number;
  addCoins: (n: number) => void;
  inventory: () => Inventory | null;
  hud: () => Hud | null;
  spawn: () => { x: number; y: number; z: number };
  body: () => PlayerBody | null;
  sceneMode: () => SceneMode;
  season: () => Season;
  controller: Controller;
}

export class TravelerSystem {
  /** 对话面板（Game 的 PanelStack 登记） */
  readonly panel: TravelerPanel;
  private traveler: Traveler | null = null;

  constructor(atlas: Atlas, private ctx: TravelerCtx) {
    this.panel = new TravelerPanel(atlas, () => this.ctx.coins(), (offer) => this.unlockFromTraveler(offer));
  }

  /** 每帧：旅者只在「自己的岛 + 对应季节」出现，换季/换场景即时换人 */
  tick(dt: number): void {
    const want = this.ctx.sceneMode() === 'island' ? this.ctx.season() : null;
    if (this.traveler && this.traveler.season !== want) this.hide();
    if (!this.traveler && want && this.ctx.body()) {
      const s = this.ctx.spawn();
      const x = s.x + 2.5, z = s.z + 0.5;
      this.traveler = new Traveler(want, x, this.groundAt(x, z, s.y + 3), z);
      this.ctx.scene.add(this.traveler.group);
    }
    this.traveler?.update(dt, this.ctx.body()?.x ?? 0, this.ctx.body()?.z ?? 0);
  }

  hide(): void {
    if (!this.traveler) return;
    this.ctx.scene.remove(this.traveler.group);
    this.traveler.dispose();
    this.traveler = null;
  }

  /** 站在旅者旁边按 M 对话（Game 的 tick 里先把 door 键吃掉，免得同时触发方块的"使用"） */
  tryTalk(): void {
    if (!this.traveler || this.ctx.sceneMode() !== 'island' || !this.ctx.controller.isDown('door')) return;
    const t = this.traveler.group.position;
    const b = this.ctx.body();
    if (!b) return;
    if (Math.hypot(b.x - t.x, b.z - t.z) < SEASON_FOOD.TALK_DIST && this.ctx.controller.take('door')) {
      this.talkToTraveler();
    }
  }

  /** 从 (fromY) 往下找第一个实心方块，返回它上面那格的 y（放 NPC 用） */
  private groundAt(x: number, z: number, fromY: number): number {
    const bx = Math.floor(x), bz = Math.floor(z);
    for (let y = Math.min(CHUNK.HEIGHT - 1, Math.floor(fromY)); y >= 0; y--) {
      if (isSolid(this.ctx.world().getBlock(bx, y, bz))) return y + 1;
    }
    return fromY;
  }

  /** 跟旅者说话：按当季列出可解锁的配方 */
  private talkToTraveler(): void {
    const season = this.traveler?.season;
    if (!season) return;
    const info = TRAVELERS[season];
    this.panel?.open(info.name, info.greet, this.offers(season));
  }

  /** 当季旅者能解锁的东西（收费的那几本要岛币） */
  private offers(season: 'spring' | 'summer' | 'autumn' | 'winter'): TravelerOffer[] {
    const cost = SEASON_FOOD.UNLOCK_COST;
    const list: { id: number; keyword: string; cost: number }[] = [];
    if (season === 'spring') list.push({ id: CHUNK_ROLL, keyword: '春卷', cost: 0 });
    if (season === 'summer') list.push({ id: POUCH_CALAMUS, keyword: '菖蒲香囊', cost: 0 },
      { id: SHIELD_CALAMUS, keyword: '菖蒲护盾', cost });
    if (season === 'autumn') list.push({ id: HARVEST_PLATTER, keyword: '丰收拼盘', cost: 0 });
    if (season === 'winter') list.push({ id: XMAS_COOKIE, keyword: '圣诞甜饼', cost: 0 },
      { id: BEAD_FIREWORK, keyword: '彩珠礼花', cost });
    return list.map((o) => ({ ...o, done: this.ctx.book.hasMatching(o.keyword) }));
  }

  /** 旅者解锁：免费直接学，收费的先扣岛币 */
  private unlockFromTraveler(offer: TravelerOffer): void {
    const hud = this.ctx.hud();
    if (offer.done) return;
    if (offer.cost > 0 && !this.ctx.inventory()?.infinite) {
      if (this.ctx.coins() < offer.cost) { hud?.showMessage(`岛币不够，要 ${offer.cost} 个`, 2); return; }
      this.ctx.addCoins(-offer.cost);
    }
    const n = this.ctx.book.learnMatching(offer.keyword);
    hud?.showMessage(n > 0 ? `学会了${BLOCKS[offer.id].cn}的做法！` : `${BLOCKS[offer.id].cn}的做法早就学会了`, 3);
    const season = this.traveler?.season;
    if (season) {
      const info = TRAVELERS[season];
      this.panel?.refresh(info.name, info.greet, this.offers(season));
    }
  }
}
