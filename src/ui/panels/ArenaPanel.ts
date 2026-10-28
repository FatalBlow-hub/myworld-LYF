/** 红焰大赛面板 — 对着大厅的红焰大赛箱按 M 打开
 *
 *  两张玩法卡：极限季节挑战（本版可用，分冰天雪地 / 星空的世界）与全年 CS 大赛（占位）。
 *  报名是两段确认：点一次只是上膛，5 秒内再点一次才真扣岛币进图，免得误触。 */

import { ARENA, CS } from '../../config';
import { PISTOL } from '../../world/blocks/Block';
import { Atlas } from '../../render/textures/Textures';
import { arenaOpen } from '../../world/maps/ArenaMaps';
import { fmtCoins } from '../../world/economy/Shop';
import { isMobile } from '../touch/Platform';

type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';
type Kind = 'snow' | 'void';
type CsMode = '1v1' | '3v3';

const SEASON_CN: Record<SeasonName, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };

/** CS 大赛两种模式（本地 + AI 对手，全年开放） */
const CS_MODES: { mode: CsMode; name: string; desc: string }[] = [
  { mode: '1v1', name: '1V1 模式', desc: '你和 1 个对手，先赢 3 局' },
  { mode: '3v3', name: '3V3 模式', desc: '你 + 2 名队友 对 3 名对手' },
];

/** 两种极限图的展示信息 */
const MODES: { kind: Kind; name: string; icon: number; open: string; desc: string }[] = [
  { kind: 'snow', name: '冰天雪地挑战', icon: 324, open: '春季 / 冬季', desc: '全雪地地图，遵循普通岛屿规则' },
  { kind: 'void', name: '星空的世界挑战', icon: 323, open: '夏季 / 秋季', desc: '全虚空地形，掉下去不判死、直接传回台面' },
];

export class ArenaPanel {
  private el: HTMLDivElement;
  private win: HTMLDivElement;
  /** 已经点过一次的按钮（等二次确认；极限图记 kind、CS 记 mode） */
  private pending: string | null = null;
  private pendingAt = 0;
  private tick: number | undefined;
  visible = false;

  constructor(
    private atlas: Atlas,
    private coins: () => number,
    private season: () => SeasonName,
    /** 报名极限季节挑战（kind = 雪原 / 虚空） */
    private onStart: (kind: Kind) => void,
    /** 报名 CS 大赛（mode = 1v1 / 3v3，本地 + AI 对手） */
    private onCs: (mode: CsMode) => void,
    /** 打开联机房间面板（建房 / 加入，和真人打） */
    private onOnline: () => void,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'inv-overlay';
    this.el.style.display = 'none';
    this.win = document.createElement('div');
    this.win.className = 'inv-window';
    this.el.appendChild(this.win);
    this.el.addEventListener('mousedown', (e) => { if (e.target === this.el) this.close(); });
    document.body.appendChild(this.el);
  }

  open(): void {
    this.pending = null;
    this.render();
    this.visible = true;
    this.el.style.display = 'flex';
    if (this.tick === undefined) this.tick = window.setInterval(() => this.expire(), 250);
  }

  close(): void {
    this.visible = false;
    this.pending = null;
    this.el.style.display = 'none';
    if (this.tick !== undefined) { window.clearInterval(this.tick); this.tick = undefined; }
  }

  /** 二次确认窗口超时就复位按钮（不整块重画，免得闪） */
  private expire(): void {
    if (!this.visible || !this.pending) return;
    if (Date.now() - this.pendingAt < ARENA.CONFIRM_SECONDS * 1000) return;
    this.pending = null;
    this.render();
  }

  private render(): void {
    this.win.innerHTML = '';
    const season = this.season();
    const title = document.createElement('p');
    title.className = 'inv-sub';
    title.textContent = `🔥 红焰大赛箱 · 余额 ${fmtCoins(this.coins())} 岛币 · 当前${SEASON_CN[season]}季`;
    this.win.appendChild(title);

    const head = document.createElement('p');
    head.className = 'inv-sub';
    head.style.cssText = 'text-align:left;color:#ffd24a;';
    head.textContent = `极限季节挑战（报名 ${ARENA.FEE} 岛币，撑满 ${ARENA.SECONDS} 秒得 ${ARENA.REWARD} 岛币）`;
    this.win.appendChild(head);

    for (const m of MODES) this.win.appendChild(this.makeModeRow(m, season));

    const csHead = document.createElement('p');
    csHead.className = 'inv-sub';
    csHead.style.cssText = 'text-align:left;color:#8fe8ff;margin-top:10px;';
    csHead.textContent = `全年 CS 大赛（报名 ${CS.FEE} 岛币，五局三胜，整套打赢得 ${CS.REWARD} 岛币）`;
    this.win.appendChild(csHead);
    for (const c of CS_MODES) this.win.appendChild(this.makeCsRow(c));

    const onlineBtn = document.createElement('button');
    onlineBtn.textContent = '联机对战（建房 / 加入房间）';
    onlineBtn.style.cssText = 'margin-top:6px;padding:6px 10px;font-size:13px;cursor:pointer;border-radius:6px;'
      + 'border:1px solid #888;background:#2f5f8a;color:#fff;';
    onlineBtn.addEventListener('click', () => { this.close(); this.onOnline(); });
    this.win.appendChild(onlineBtn);

    const hint = document.createElement('div');
    hint.className = 'inv-hint';
    hint.textContent = isMobile() ? '点报名进图 · 点空白关闭' : '点报名进图 · 9/ESC 或点空白关闭';
    this.win.appendChild(hint);
  }

  private makeModeRow(m: { kind: Kind; name: string; icon: number; open: string; desc: string }, season: SeasonName): HTMLDivElement {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:6px 2px;text-align:left;';

    const img = document.createElement('img');
    img.src = this.atlas.iconFor(m.icon);
    img.style.cssText = 'width:32px;height:32px;image-rendering:pixelated;';
    row.appendChild(img);

    const text = document.createElement('div');
    text.style.cssText = 'flex:1;font-size:13px;line-height:1.5;';
    const opened = arenaOpen(m.kind, season);
    text.innerHTML = `<b>${m.name}</b><br><span style="color:#bbb">${m.desc} · 开放季节 ${m.open}</span>`;
    row.appendChild(text);

    const btn = document.createElement('button');
    btn.style.cssText = 'padding:6px 10px;font-size:13px;border-radius:6px;border:1px solid #888;color:#fff;';
    const poor = this.coins() < ARENA.FEE;
    if (!opened) {
      btn.textContent = `本季不开放`;
      btn.style.background = '#5a5a5a';
      btn.style.cursor = 'default';
    } else if (poor) {
      btn.textContent = `还差 ${fmtCoins(ARENA.FEE - this.coins())} 岛币`;
      btn.style.background = '#5a5a5a';
      btn.style.cursor = 'default';
    } else if (this.pending === `extreme:${m.kind}`) {
      btn.textContent = `再点一次确认（扣 ${ARENA.FEE} 岛币）`;
      btn.style.background = '#b03a2e';
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', () => { this.pending = null; this.close(); this.onStart(m.kind); });
    } else {
      btn.textContent = `${ARENA.FEE} 岛币 报名`;
      btn.style.background = '#3e8a46';
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', () => { this.pending = `extreme:${m.kind}`; this.pendingAt = Date.now(); this.render(); });
    }
    row.appendChild(btn);
    return row;
  }

  /** CS 大赛一行：全年开放，报名两段确认 */
  private makeCsRow(c: { mode: CsMode; name: string; desc: string }): HTMLDivElement {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:6px 2px;text-align:left;';

    const img = document.createElement('img');
    img.src = this.atlas.iconFor(PISTOL);
    img.style.cssText = 'width:32px;height:32px;image-rendering:pixelated;';
    row.appendChild(img);

    const text = document.createElement('div');
    text.style.cssText = 'flex:1;font-size:13px;line-height:1.5;';
    text.innerHTML = `<b>${c.name}</b><br><span style="color:#bbb">${c.desc} · 开赛送手枪 + 32 发子弹</span>`;
    row.appendChild(text);

    const btn = document.createElement('button');
    btn.style.cssText = 'padding:6px 10px;font-size:13px;border-radius:6px;border:1px solid #888;color:#fff;';
    const poor = this.coins() < CS.FEE;
    if (poor) {
      btn.textContent = `还差 ${CS.FEE - this.coins()} 岛币`;
      btn.style.background = '#5a5a5a';
      btn.style.cursor = 'default';
    } else if (this.pending === `cs:${c.mode}`) {
      btn.textContent = `再点一次确认（扣 ${CS.FEE} 岛币）`;
      btn.style.background = '#b03a2e';
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', () => { this.pending = null; this.close(); this.onCs(c.mode); });
    } else {
      btn.textContent = `${CS.FEE} 岛币 报名`;
      btn.style.background = '#2f5f8a';
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', () => { this.pending = `cs:${c.mode}`; this.pendingAt = Date.now(); this.render(); });
    }
    row.appendChild(btn);
    return row;
  }
}
