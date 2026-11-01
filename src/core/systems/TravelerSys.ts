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
import { monthInSeason, type GameDate, type Season } from '../loops/Calendar';

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
  /** 游戏内日期（旅者每季只出现头几天，要按日子判定） */
  date: () => GameDate;
  controller: Controller;
}

export class TravelerSystem {
  /** 对话面板（Game 的 PanelStack 登记） */
  readonly panel: TravelerPanel;
  private traveler: Traveler | null = null;

  constructor(atlas: Atlas, private ctx: TravelerCtx) {
    this.panel = new TravelerPanel(atlas, () => this.ctx.coins(), (offer) => this.unlockFromTraveler(offer));
  }

  /** 每帧：旅者只在「自己的岛 + 对应季节 + 每季第二个月的头 3 天」出现（2026-11-01 设定：
   *  春=4月、夏=7月、秋=10月、冬=1月，各 1~3 日），过完就走；
   *  出现位置在玩家周围 8~12 格（不贴重生点、不贴脸），换季/换场景/过期即时收人 */
  tick(dt: number): void {
    const d = this.ctx.date();
    const inWindow = this.ctx.sceneMode() === 'island'
      && monthInSeason(d) === 1
      && d.day <= SEASON_FOOD.TRAVELER_DAYS;
    const want = inWindow ? this.ctx.season() : null;
    if (this.traveler && this.traveler.season !== want) this.hide();
    const body = this.ctx.body();
    if (!this.traveler && want && body) {
      const spot = this.pickSpot(body);
      this.traveler = new Traveler(want, spot.x, this.groundAt(spot.x, spot.z, spot.y + 3), spot.z);
      this.ctx.scene.add(this.traveler.group);
    }
    this.traveler?.update(dt, this.ctx.body()?.x ?? 0, this.ctx.body()?.z ?? 0);
  }

  /** 玩家周围 8~12 格的环带里挑一个有实地的点；8 个方位都落空（四面全是海）就退回复活点旁 */
  private pickSpot(body: PlayerBody): { x: number; y: number; z: number } {
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      const d = 8 + Math.random() * 4;
      const x = body.x + Math.cos(ang) * d, z = body.z + Math.sin(ang) * d;
      const y = this.solidGround(x, z, body.y + 6);
      if (y !== null) return { x, y, z };
    }
    const s = this.ctx.spawn();
    return { x: s.x + 2.5, y: s.y, z: s.z + 0.5 };
  }

  /** 从 fromY 往下扫到第一个实心方块，返回它上面那格的 y；全是空气/水就返回 null（落不了脚） */
  private solidGround(x: number, z: number, fromY: number): number | null {
    const bx = Math.floor(x), bz = Math.floor(z);
    for (let y = Math.min(CHUNK.HEIGHT - 1, Math.floor(fromY)); y >= 0; y--) {
      if (isSolid(this.ctx.world().getBlock(bx, y, bz))) return y + 1;
    }
    return null;
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
