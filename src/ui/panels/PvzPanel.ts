/** 植物大战僵尸·面板 — 选关/卡片点选/格子种植/助力卡/输赢结算（PanelStack 登记成员）
 *
 *  打开方式：电脑开机后的游戏菜单点「植物大战僵尸」。
 *  助力卡：每波来前 1 秒抽一张，显示在屏幕底右——点卡再点草坪任意一格激活，一次性。 */

import { PvzSim } from './pvz/engine';
import { LEVELS, VENOM_FROM, VENOM_COL, PLANTS, unlockedCards, alienCards, wildCards, ALIEN_FROM, WILD_FROM, WILD_ORANGE_FROM, PlantKind } from './pvz/data';
import { drawPvz, cellAt, cardAt, boostAt, sunAt, beanAt, PVZ_W, PVZ_H } from './pvz/draw';

export interface PvzDeps {
  /** 已通关的最高关数（存档持久化） */
  progress: () => number;
  alienProgress: () => number;
  wildProgress: () => number;
  bossDone: () => boolean;
  /** 过了一关：回写进度（Game 里 saveNow + 提示解锁；boss 关 Game 另发通关奖励） */
  onWin: (levelIdx: number, unlockName: string | null) => void;
  toast: (text: string) => void;
}

type Stage = 'levels' | 'pick' | 'play' | 'win' | 'lose';
const PER_ROW = 5;      // 选关每行按钮数（竖屏 400 宽放 5 个）
/** 三个游戏的关卡下标段 + 栏目标签 */
const GAME_TABS: { key: 'main' | 'alien' | 'wild'; cn: string; match: (lv: (typeof LEVELS)[0]) => boolean }[] = [
  { key: 'main', cn: '原版冒险', match: (lv) => !lv.alien && !lv.wild },
  { key: 'alien', cn: '外星来客', match: (lv) => !!lv.alien },
  { key: 'wild', cn: '狂野世界', match: (lv) => !!lv.wild },
];
const PICK_COLS = 4;    // 竖屏选卡每行卡片数（400 宽放 4 张）
const PICK_MAX = 10;    // 最多带 10 张卡上场

export class PvzPanel {
  visible = false;

  private el: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sim: PvzSim | null = null;
  private stage: Stage = 'levels';
  private sel = -1;          // 卡片栏选中的植物卡
  private boostSel = -1;     // 选中的助力卡
  private beanMode = false;  // 点了能量豆按钮，下一株点的植物放大招
  private lvlIdx = -1;
  private resultT = 0;
  private picked: PlantKind[] = [];    // 选卡阶段挑好的植物
  private unlockList: PlantKind[] = []; // 已解锁的全部植物

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
  private gameTab: 'main' | 'alien' | 'wild' = 'main'; // 选关分栏：原版/外星来客/狂野世界
  /** 这关可玩吗：主线按主线进度；外星/狂野要先打穿主线BOSS再各自爬 */
  private playable(i: number): boolean {
    const lv = LEVELS[i];
    if (lv.alien) return i - ALIEN_FROM <= this.d.alienProgress();
    if (lv.wild) return i - WILD_FROM <= this.d.wildProgress();
    return i <= this.d.progress();
  }

  private startLevel(i: number): void {
    this.lvlIdx = i;
    // 像 PVZ 一样先进选卡界面：已解锁的卡摆出来，最多挑 10 张（默认带上前 10 张）
    const lv = LEVELS[i];
    this.unlockList = lv.alien ? alienCards(ALIEN_FROM - 1 + this.d.alienProgress())
      : lv.wild ? wildCards(WILD_FROM - 1 + this.d.wildProgress())
      : unlockedCards(this.d.progress());
    this.picked = this.unlockList.slice(0, PICK_MAX);
    this.stage = 'pick';
  }

  private confirmPick(): void {
    if (!this.picked.length) { this.d.toast('至少选 1 张卡'); return; }
    const i = this.lvlIdx;
    // 原版 19 关起第5列毒液地块；外星版第5关（下标30）起第5列紫色太空地板
    // 毒液/紫色地板列：原版19关起、外星第5关（下标35）起；狂野没有毒液列（它用橙色列）
    const lv2 = LEVELS[i];
    const tileCol = !lv2.wild && i >= VENOM_FROM && (!lv2.alien || i >= ALIEN_FROM + 4) ? VENOM_COL : -1;
    this.sim = new PvzSim(LEVELS[i], this.d.progress(), tileCol, this.picked);
    this.sim.wildOrange = i >= WILD_ORANGE_FROM; // 狂野菇解锁关起第5列橙色
    this.stage = 'play';
    this.sel = -1;
    this.boostSel = -1;
  }

  /** 选卡界面的格子位置 */
  private pickCell(i: number): { x: number; y: number } {
    return { x: 8 + (i % PICK_COLS) * 97, y: 100 + Math.floor(i / PICK_COLS) * 52 };
  }

  private onClick(e: MouseEvent): void {
    const r = this.canvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (PVZ_W / r.width);
    const my = (e.clientY - r.top) * (PVZ_H / r.height);
    if (this.stage === 'levels') {
      for (let g = 0; g < GAME_TABS.length; g++) { // 点栏目切换游戏
        const bx = 18 + g * 124;
        if (mx >= bx && mx <= bx + 116 && my >= 58 && my <= 84) {
          this.gameTab = GAME_TABS[g].key; this.draw(); return;
        }
      }
      const list = LEVELS.map((lv, i) => i).filter((i) => GAME_TABS.find((t) => t.key === this.gameTab)!.match(LEVELS[i]));
      for (let j = 0; j < list.length; j++) {
        const i = list[j];
        const x = 35 + (j % PER_ROW) * 66, y = 104 + Math.floor(j / PER_ROW) * 56;
        if (mx >= x && mx <= x + 52 && my >= y && my <= y + 42 && this.playable(i)) { this.startLevel(i); this.draw(); return; }
      }
      return;
    }
    if (this.stage === 'pick') {
      // 返回按钮
      if (mx >= 30 && mx <= 100 && my >= 20 && my <= 50) { this.stage = 'levels'; this.draw(); return; }
      // 开战按钮
      if (mx >= PVZ_W / 2 - 80 && mx <= PVZ_W / 2 + 80 && my >= 560 && my <= 598) { this.confirmPick(); return; }
      for (let i = 0; i < this.unlockList.length; i++) {
        const { x, y } = this.pickCell(i);
        if (mx >= x && mx <= x + 91 && my >= y && my <= y + 46) {
          const k = this.unlockList[i], at = this.picked.indexOf(k);
          if (at >= 0) this.picked.splice(at, 1);
          else if (this.picked.length < PICK_MAX) this.picked.push(k);
          else this.d.toast(`最多带 ${PICK_MAX} 张卡`);
          this.draw();
          return;
        }
      }
      return;
    }
    if (this.stage === 'win' || this.stage === 'lose') {
      if (this.resultT <= 0) { this.stage = 'levels'; this.sim = null; this.draw(); }
      return;
    }
    const sim = this.sim!;
    if (beanAt(mx, my)) { this.beanMode = !this.beanMode; this.sel = -1; this.boostSel = -1; this.d.toast(this.beanMode ? '点一株植物放大招' : '取消放大招'); return; }
    const sun = sunAt(sim, mx, my);
    if (sun) { sim.collectSun(sun); return; }
    const bi = boostAt(sim, mx, my);
    if (bi >= 0) { this.boostSel = this.boostSel === bi ? -1 : bi; this.sel = -1; return; }
    const ci = cardAt(sim, mx, my);
    if (ci >= 0) { this.sel = this.sel === ci ? -1 : ci; this.boostSel = -1; return; }
    const cell = cellAt(mx, my);
    if (cell && this.beanMode) {
      const err = sim.useBean(cell.row, cell.col);
      if (err) this.d.toast(err);
      this.beanMode = false;
      return;
    }
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
      c.fillStyle = '#ffe97a'; c.font = 'bold 24px sans-serif'; c.textAlign = 'center';
      c.fillText('植物大战僵尸 · 选关', PVZ_W / 2, 40);
      for (let g = 0; g < GAME_TABS.length; g++) { // 三个游戏分栏
        const bx = 18 + g * 124, on = this.gameTab === GAME_TABS[g].key;
        c.fillStyle = on ? '#2a6a9a' : '#1a3a4a';
        c.fillRect(bx, 58, 116, 26);
        c.strokeStyle = on ? '#ffd700' : '#345'; c.strokeRect(bx, 58, 116, 26);
        c.fillStyle = '#ffe97a'; c.font = '13px sans-serif';
        c.fillText(GAME_TABS[g].cn, bx + 58, 76);
      }
      const list = LEVELS.map((lv, i) => i).filter((i) => GAME_TABS.find((t) => t.key === this.gameTab)!.match(LEVELS[i]));
      for (let j = 0; j < list.length; j++) {
        const i = list[j];
        const x = 35 + (j % PER_ROW) * 66, y = 104 + Math.floor(j / PER_ROW) * 56;
        const ok = this.playable(i);
        const lv = LEVELS[i];
        c.fillStyle = ok ? (lv.boss ? '#8a2a2a' : lv.special ? '#8a6a2a' : '#2a6a9a') : '#333';
        c.fillRect(x, y, 52, 42);
        c.fillStyle = ok ? '#fff' : '#777'; c.font = 'bold 14px sans-serif';
        const no = this.gameTab === 'main' ? i + 1 : this.gameTab === 'alien' ? i - ALIEN_FROM + 1 : i - WILD_FROM + 1;
        c.fillText(lv.boss ? 'BOSS' : lv.special ? '★' : `${no}`, x + 26, y + 24);
        if (lv.unlock[0]) { c.font = '9px sans-serif'; c.fillText('🎁', x + 26, y + 37); }
      }
      c.font = '12px sans-serif'; c.fillStyle = '#8ab';
      c.fillText('灰色是还没解锁的关 · ★是特殊关 · 点按钮开打 · ESC/再按 M 退出', PVZ_W / 2, 540);
      c.fillText('点天上掉下来的阳光收钱，点卡片再点格子种植物', PVZ_W / 2, 566);
      c.fillText('每波僵尸来前会抽到助力卡：点卡再点草坪任意一格使用', PVZ_W / 2, 592);
      return;
    }
    if (this.stage === 'pick') {
      c.fillStyle = '#101c2a'; c.fillRect(0, 0, PVZ_W, PVZ_H);
      c.fillStyle = '#ffe97a'; c.font = 'bold 24px sans-serif'; c.textAlign = 'center';
      c.fillText(`第 ${this.lvlIdx + 1} 关 · 选植物`, PVZ_W / 2, 50);
      c.font = '13px sans-serif'; c.fillStyle = '#cfeaff';
      c.fillText(`点亮卡片 = 带上场，最多 ${PICK_MAX} 张（已选 ${this.picked.length}/${PICK_MAX}）`, PVZ_W / 2, 76);
      c.fillStyle = '#2a6a9a'; c.fillRect(30, 20, 70, 30);
      c.fillStyle = '#fff'; c.font = '13px sans-serif'; c.fillText('←返回', 65, 40);
      this.unlockList.forEach((k, i) => {
        const { x, y } = this.pickCell(i);
        const at = this.picked.indexOf(k), on = at >= 0;
        c.fillStyle = on ? '#3a7a3a' : '#1a2a3a';
        c.fillRect(x, y, 91, 46);
        c.strokeStyle = on ? '#ffd700' : '#345';
        c.lineWidth = on ? 3 : 1; c.strokeRect(x, y, 91, 46); c.lineWidth = 1;
        c.fillStyle = PLANTS[k].color; c.fillRect(x + 4, y + 4, 13, 13);
        c.fillStyle = '#fff'; c.font = 'bold 10px sans-serif'; c.textAlign = 'left';
        c.fillText(PLANTS[k].cn, x + 20, y + 14);
        c.fillStyle = '#ffd76a'; c.font = '9px sans-serif';
        c.fillText(`${PLANTS[k].cost} 阳光`, x + 5, y + 38);
        if (on) { c.fillStyle = '#ffd700'; c.font = 'bold 12px sans-serif'; c.textAlign = 'right'; c.fillText(`${at + 1}`, x + 87, y + 14); }
      });
      const canGo = this.picked.length > 0;
      c.fillStyle = canGo ? '#4a9a3a' : '#444';
      c.fillRect(PVZ_W / 2 - 80, 560, 160, 38);
      c.fillStyle = '#fff'; c.font = 'bold 17px sans-serif'; c.textAlign = 'center';
      c.fillText('开始战斗', PVZ_W / 2, 584);
      return;
    }
    if (!this.sim) return;
    drawPvz(c, this.sim, this.sel, this.boostSel, this.lvlIdx + 1, this.beanMode);
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
  debugStart(i: number): void { this.startLevel(i); this.confirmPick(); }
  debugPlant(kind: string, row: number, col: number): string | null { return this.sim?.plant(kind as never, row, col) ?? 'no sim'; }
  debugSun(n: number): void { if (this.sim) this.sim.sun += n; }
  debugSkip(s: number): void { if (this.sim) { this.sim.update(s); } }
  debugCard(kind: string): void { this.sim?.pendingCards.push(kind as never); }
  debugUseCard(i: number): void { this.sim?.useCard(i); }
}

/** 本关通关解锁的植物名（没有返回 null） */
function unlockName(lvlIdx: number): string | null {
  const ks = LEVELS[lvlIdx]?.unlock;
  return ks && ks.length ? ks.map((k) => PLANTS[k].cn).join('、') : null;
}
