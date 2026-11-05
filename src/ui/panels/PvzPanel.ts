/** 植物大战僵尸·面板 — 选关/卡片点选/格子种植/助力卡/输赢结算（PanelStack 登记成员）
 *
 *  打开方式：电脑开机后的游戏菜单点「植物大战僵尸」。
 *  助力卡：每波来前 1 秒抽一张，显示在屏幕底右——点卡再点草坪任意一格激活，一次性。 */

import { PvzSim } from './pvz/engine';
import { LEVELS, VENOM_FROM, VENOM_COL } from './pvz/data';
import { drawPvz, cellAt, cardAt, boostAt, sunAt, PVZ_W, PVZ_H } from './pvz/draw';

export interface PvzDeps {
  /** 已通关的最高关数（存档持久化） */
  progress: () => number;
  /** 过了一关：回写进度（Game 里 saveNow + 提示解锁；boss 关 Game 另发通关奖励） */
  onWin: (levelIdx: number, unlockName: string | null) => void;
  toast: (text: string) => void;
}

type Stage = 'levels' | 'play' | 'win' | 'lose';
const PER_ROW = 7; // 选关每行按钮数（19 关排 3 行）

export class PvzPanel {
  visible = false;

  private el: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sim: PvzSim | null = null;
  private stage: Stage = 'levels';
  private sel = -1;          // 卡片栏选中的植物卡
  private boostSel = -1;     // 选中的助力卡
  private lvlIdx = -1;
  private resultT = 0;

  constructor(private d: PvzDeps) {
    this.el = document.createElement('div');
    this.el.className = 'tnt-overlay';
    this.canvas = document.createElement('canvas');
    this.canvas.width = PVZ_W; this.canvas.height = PVZ_H;
    this.el.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.el.addEventListener('click', (e) => this.onClick(e));
    document.body.appendChild(this.el);
  }

  isOpen(): boolean { return this.visible; }

  open(): void {
    this.visible = true;
    this.stage = 'levels';
    this.sim = null;
    this.sel = -1;
    this.boostSel = -1;
    this.el.style.display = 'flex';
    this.draw();
  }

  close(): void {
    this.visible = false;
    this.sim = null;
    this.el.style.display = 'none';
  }

  /** 可玩的关卡：已通关数+1 关（没通关只能打第 1 关） */
  private playable(i: number): boolean { return i <= this.d.progress(); }

  private startLevel(i: number): void {
    this.lvlIdx = i;
    this.sim = new PvzSim(LEVELS[i], this.d.progress(), i >= VENOM_FROM ? VENOM_COL : -1); // 19关起第5列是毒液地块
    this.stage = 'play';
    this.sel = -1;
    this.boostSel = -1;
  }

  private onClick(e: MouseEvent): void {
    const r = this.canvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (PVZ_W / r.width);
    const my = (e.clientY - r.top) * (PVZ_H / r.height);
    if (this.stage === 'levels') {
      for (let i = 0; i < LEVELS.length; i++) {
        const x = 80 + (i % PER_ROW) * 66, y = 104 + Math.floor(i / PER_ROW) * 56;
        if (mx >= x && mx <= x + 52 && my >= y && my <= y + 42 && this.playable(i)) { this.startLevel(i); return; }
      }
      return;
    }
    if (this.stage === 'win' || this.stage === 'lose') {
      if (this.resultT <= 0) { this.stage = 'levels'; this.sim = null; this.draw(); }
      return;
    }
    const sim = this.sim!;
    const sun = sunAt(sim, mx, my);
    if (sun) { sim.collectSun(sun); return; }
    const bi = boostAt(sim, mx, my);
    if (bi >= 0) { this.boostSel = this.boostSel === bi ? -1 : bi; this.sel = -1; return; }
    const ci = cardAt(sim, mx, my);
    if (ci >= 0) { this.sel = this.sel === ci ? -1 : ci; this.boostSel = -1; return; }
    const cell = cellAt(mx, my);
    if (cell && this.boostSel >= 0) { sim.useCard(this.boostSel); this.boostSel = -1; return; }
    if (cell && this.sel >= 0) {
      const err = sim.plant(sim.cards[this.sel], cell.row, cell.col);
      if (err) this.d.toast(err);
      else this.sel = -1;
      return;
    }
    this.sel = -1;
    this.boostSel = -1;
  }

  update(dt: number): void {
    if (!this.visible) return;
    if (this.stage === 'win' || this.stage === 'lose') {
      this.resultT -= dt;
      if (this.resultT <= -3) { this.stage = 'levels'; this.sim = null; }
      this.draw();
      return;
    }
    if (this.stage !== 'play' || !this.sim) return;
    this.sim.update(dt);
    if (this.sim.result === 'win') {
      this.stage = 'win'; this.resultT = 2;
      this.d.onWin(this.lvlIdx, unlockName(this.lvlIdx));
    } else if (this.sim.result === 'lose') {
      this.stage = 'lose'; this.resultT = 2;
    }
    this.draw();
  }

  private draw(): void {
    const c = this.ctx;
    if (this.stage === 'levels') {
      c.fillStyle = '#101c2a'; c.fillRect(0, 0, PVZ_W, PVZ_H);
      c.fillStyle = '#ffe97a'; c.font = 'bold 26px sans-serif'; c.textAlign = 'center';
      c.fillText('植物大战僵尸 · 选关', PVZ_W / 2, 56);
      c.font = '14px sans-serif'; c.fillStyle = '#cfeaff';
      c.fillText(`已通关 ${Math.min(this.d.progress(), LEVELS.length)} / ${LEVELS.length} 关`, PVZ_W / 2, 82);
      for (let i = 0; i < LEVELS.length; i++) {
        const x = 80 + (i % PER_ROW) * 66, y = 104 + Math.floor(i / PER_ROW) * 56;
        const ok = this.playable(i);
        const lv = LEVELS[i];
        c.fillStyle = ok ? (lv.boss ? '#8a2a2a' : lv.special ? '#8a6a2a' : '#2a6a9a') : '#333';
        c.fillRect(x, y, 52, 42);
        c.fillStyle = ok ? '#fff' : '#777'; c.font = 'bold 14px sans-serif';
        c.fillText(lv.boss ? 'BOSS' : lv.special ? '★' : `${i + 1}`, x + 26, y + 24);
        if (lv.unlock[0]) { c.font = '9px sans-serif'; c.fillText('🎁', x + 26, y + 37); }
      }
      c.font = '12px sans-serif'; c.fillStyle = '#8ab';
      c.fillText('灰色是还没解锁的关 · ★是特殊关 · 点按钮开打 · ESC/再按 M 退出', PVZ_W / 2, 290);
      c.fillText('点天上掉下来的阳光收钱，点卡片再点格子种植物', PVZ_W / 2, 312);
      c.fillText('每波僵尸来前会抽到助力卡：点卡再点草坪任意一格使用', PVZ_W / 2, 334);
      return;
    }
    if (!this.sim) return;
    drawPvz(c, this.sim, this.sel, this.boostSel, this.lvlIdx + 1);
    if (this.stage === 'win' || this.stage === 'lose') {
      c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(0, 0, PVZ_W, PVZ_H);
      c.font = 'bold 34px sans-serif'; c.textAlign = 'center';
      if (this.stage === 'win') {
        c.fillStyle = '#ffe97a';
        c.fillText(`第 ${this.lvlIdx + 1} 关通过！`, PVZ_W / 2, 180);
        c.font = '18px sans-serif';
        const name = unlockName(this.lvlIdx);
        c.fillText(name ? `解锁新植物：${name}` : LEVELS[this.lvlIdx].boss ? '获得 55 岛币 + 无尽方块！' : '冒险模式全部通关！', PVZ_W / 2, 220);
      } else {
        c.fillStyle = '#e85a4a';
        c.fillText('僵尸进屋了！', PVZ_W / 2, 180);
        c.font = '16px sans-serif'; c.fillStyle = '#fff';
        c.fillText('点画面回选关，再来一次', PVZ_W / 2, 216);
      }
    }
  }

  /** 测试钩子：面板/战局状态（自动化验收用） */
  debugState() {
    const s = this.sim;
    return {
      stage: this.stage, lvl: this.lvlIdx, sun: s?.sun ?? 0, wave: s?.wave ?? 0,
      plants: s?.plants.length ?? 0, zombies: s?.zombies.filter((z) => !z.dead).length ?? 0,
      kills: s?.kills ?? 0, result: s?.result ?? null, sel: this.sel,
      pendingCards: s?.pendingCards ?? [], balls: s?.balls.length ?? 0,
      progress: this.d.progress(),
    };
  }
  /** 测试钩子：直接开打第 i 关 / 种植物 / 收阳光 / 送阳光 / 塞助力卡 */
  debugStart(i: number): void { this.startLevel(i); }
  debugPlant(kind: string, row: number, col: number): string | null { return this.sim?.plant(kind as never, row, col) ?? 'no sim'; }
  debugSun(n: number): void { if (this.sim) this.sim.sun += n; }
  debugSkip(s: number): void { if (this.sim) { this.sim.update(s); } }
  debugCard(kind: string): void { this.sim?.pendingCards.push(kind as never); }
  debugUseCard(i: number): void { this.sim?.useCard(i); }
}

import { PLANTS } from './pvz/data';
/** 本关通关解锁的植物名（没有返回 null） */
function unlockName(lvlIdx: number): string | null {
  const ks = LEVELS[lvlIdx]?.unlock;
  return ks && ks.length ? ks.map((k) => PLANTS[k].cn).join('、') : null;
}
