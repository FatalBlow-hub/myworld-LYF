/** HUD — 准星、挖掘进度、血条、氧气、快捷栏（显示背包里真实的东西）、提示消息 */

import { HEALTH, HUNGER, ISLAND_TYPES, IslandType } from '../../config';
import { BLOCKS } from '../../world/blocks/Block';
import { fmtCoins } from '../../world/economy/Shop';
import { Atlas } from '../../render/textures/Textures';
import { Inventory } from '../../player/Inventory';
import { NetStatus } from '../../net/Protocol';
import { isTipsOn } from '../account/Settings';

export class Hud {
  private root = document.getElementById('hud')!;
  private heartsEl = document.getElementById('hearts')!;
  private oxygenEl = document.getElementById('oxygen')!;
  private hungerEl: HTMLElement;
  private coinsEl: HTMLElement;
  private netEl: HTMLElement;
  private visitEl: HTMLElement;
  private dateEl: HTMLElement;
  private arenaEl: HTMLElement | null = null;
  private csStateEl: HTMLElement | null = null;
  private netStatus: NetStatus = 'disconnected';
  private onlineList: string[] = [];
  private hotbarEl = document.getElementById('hotbar')!;
  private messageEl = document.getElementById('message')!;
  private pausedEl = document.getElementById('paused')!;
  private minebarEl = document.getElementById('minebar')!;
  private minefillEl = document.getElementById('minefill')!;
  private slotEls: HTMLElement[] = [];
  private lastHotbarSig = '';
  private lastHungerSig = '';
  private msgTimer = 0;

  /** 直接点快捷栏格子选中它（手机上比用 ◀▶ 一格格挪快得多）；由 Game 接线 */
  onSlotPick: ((index: number) => void) | null = null;

  /** 快捷栏 9 个空格子开局，装什么显示什么；hideCount=创造模式不显示数量 */
  constructor(private showHealth: boolean, private atlas: Atlas, private hideCount = false) {
    this.root.style.display = 'block';
    let hungerEl = document.getElementById('hunger');
    if (!hungerEl) {
      hungerEl = document.createElement('div');
      hungerEl.id = 'hunger';
      hungerEl.style.fontSize = '18px';
      hungerEl.style.letterSpacing = '2px';
      this.heartsEl.insertAdjacentElement('afterend', hungerEl);
    }
    this.hungerEl = hungerEl;
    // 岛币余额：跟在饥饿条下面一行（🪙 图标 + 数字，最多两位小数）
    let coinsEl = document.getElementById('coins');
    if (!coinsEl) {
      coinsEl = document.createElement('div');
      coinsEl.id = 'coins';
      coinsEl.style.fontSize = '15px';
      coinsEl.style.textShadow = '1px 1px 2px var(--hud-shadow)';
      this.hungerEl.insertAdjacentElement('afterend', coinsEl);
    }
    this.coinsEl = coinsEl;
    let netEl = document.getElementById('net-status');
    if (!netEl) {
      netEl = document.createElement('div');
      netEl.id = 'net-status';
      netEl.style.position = 'absolute';
      netEl.style.top = '12px';
      netEl.style.left = '14px';
      netEl.style.fontSize = '14px';
      netEl.style.textShadow = '1px 1px 2px var(--hud-shadow)';
      this.root.appendChild(netEl);
    }
    this.netEl = netEl;
    // 「正在参观谁的岛」常驻标签：串门时一直挂在网上状态下面，免得忘了自己在别人家
    let visitEl = document.getElementById('visit-owner');
    if (!visitEl) {
      visitEl = document.createElement('div');
      visitEl.id = 'visit-owner';
      visitEl.style.position = 'absolute';
      visitEl.style.top = '32px';
      visitEl.style.left = '14px';
      visitEl.style.fontSize = '14px';
      visitEl.style.color = '#ffe08a';
      visitEl.style.textShadow = '1px 1px 2px var(--hud-shadow)';
      this.root.appendChild(visitEl);
    }
    this.visitEl = visitEl;
    // 日期 + 季节：常驻左上角（跨天、睡醒、读档时刷新）
    let dateEl = document.getElementById('game-date');
    if (!dateEl) {
      dateEl = document.createElement('div');
      dateEl.id = 'game-date';
      dateEl.style.position = 'absolute';
      dateEl.style.top = '52px';
      dateEl.style.left = '14px';
      dateEl.style.fontSize = '14px';
      dateEl.style.textShadow = '1px 1px 2px var(--hud-shadow)';
      this.root.appendChild(dateEl);
    }
    this.dateEl = dateEl;
    this.renderNetStatus();
    if (!showHealth) {
      this.heartsEl.textContent = '';
      this.oxygenEl.textContent = '';
      this.hungerEl.innerHTML = '';
    }
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      const label = document.createElement('span');
      slot.appendChild(label);
      const count = document.createElement('b');
      count.className = 'count';
      slot.appendChild(count);
      // 直接点这一格就选中它（配合 CSS 给 .slot 打开 pointer-events，#hud 默认是 none）
      slot.addEventListener('click', () => this.onSlotPick?.(i));
      this.hotbarEl.appendChild(slot);
      this.slotEls.push(slot);
    }
  }

  selectSlot(index: number): void {
    this.slotEls.forEach((el, i) => el.classList.toggle('active', i === index));
  }

  /** 刷新快捷栏图标：背包变了才重画（用签名比对省性能） */
  refreshHotbar(inv: Inventory, selected: number): void {
    const sig = inv.hotbar.map((s) => (s ? `${s.id}:${s.count}` : '_')).join(',') + `|${selected}`;
    if (sig === this.lastHotbarSig) return;
    this.lastHotbarSig = sig;
    inv.hotbar.forEach((s, i) => {
      const el = this.slotEls[i];
      const label = el.querySelector('span')!;
      const count = el.querySelector('.count') as HTMLElement;
      const oldImg = el.querySelector('img');
      if (oldImg) oldImg.remove();
      if (s) {
        const img = document.createElement('img');
        img.src = this.atlas.iconFor(s.id);
        img.className = 'slot-icon';
        el.prepend(img);
        label.textContent = BLOCKS[s.id].cn;
        count.textContent = !this.hideCount && s.count > 1 ? String(s.count) : '';
      } else {
        label.textContent = '';
        count.textContent = '';
      }
      el.classList.toggle('active', i === selected);
    });
  }

  /** 挖掘进度 0~1，0 隐藏进度条 */
  setProgress(p: number): void {
    if (p <= 0) {
      this.minebarEl.style.display = 'none';
      return;
    }
    this.minebarEl.style.display = 'block';
    this.minefillEl.style.width = `${Math.min(100, p * 100)}%`;
  }

  update(dt: number, hp: number, oxygen: number, hunger = HUNGER.MAX): void {
    if (this.showHealth) {
      const full = Math.ceil(hp / 2);
      this.heartsEl.textContent = '♥'.repeat(full) + '♡'.repeat(HEALTH.MAX_HP / 2 - full);
      const fullHunger = Math.max(0, Math.min(HUNGER.MAX, Math.ceil(hunger)));
      const hungerSig = String(fullHunger);
      if (hungerSig !== this.lastHungerSig) {
        this.lastHungerSig = hungerSig;
        this.hungerEl.innerHTML =
          '🍗'.repeat(fullHunger) +
          `<span style="opacity:0.3;filter:grayscale(1)">${'🍗'.repeat(HUNGER.MAX - fullHunger)}</span>`;
      }
      if (oxygen < HEALTH.OXYGEN_MAX) {
        const bubbles = Math.ceil((oxygen / HEALTH.OXYGEN_MAX) * 10);
        this.oxygenEl.textContent = '●'.repeat(bubbles) + '○'.repeat(10 - bubbles);
      } else {
        this.oxygenEl.textContent = '';
      }
    }
    if (this.msgTimer > 0) {
      this.msgTimer -= dt;
      if (this.msgTimer <= 0) this.messageEl.textContent = '';
    }
  }

  /** 刷新岛币余额显示（🪙 图标 + 数字） */
  setCoins(n: number): void {
    this.coinsEl.textContent = `🪙 ${fmtCoins(n)} 岛币`;
  }

  /** 刷新左上角的日期 + 季节（跨天、睡醒、读档时调） */
  setDate(text: string): void {
    this.dateEl.textContent = text;
  }

  /** CS 大赛状态条：第几局 / 比分 / CS 币 / 当前阶段（传 null 收起） */
  setCsState(text: string | null): void {
    if (!this.csStateEl) {
      const el = document.createElement('div');
      el.id = 'cs-state';
      el.style.cssText = 'position:absolute;top:10px;left:50%;transform:translateX(-50%);'
        + 'font-size:16px;font-weight:bold;color:#8fe8ff;text-shadow:1px 1px 3px #000;display:none;';
      this.root.appendChild(el);
      this.csStateEl = el;
    }
    if (text === null) { this.csStateEl.style.display = 'none'; return; }
    this.csStateEl.style.display = 'block';
    this.csStateEl.textContent = text;
  }

  /** 竞技场倒计时：传秒数显示在顶部正中，传 null 收起（大厅/岛上不显示） */
  setArenaTimer(sec: number | null): void {
    if (!this.arenaEl) {
      const el = document.createElement('div');
      el.id = 'arena-timer';
      el.style.cssText = 'position:absolute;top:10px;left:50%;transform:translateX(-50%);'
        + 'font-size:20px;font-weight:bold;color:#ffd24a;text-shadow:1px 1px 3px #000;display:none;';
      this.root.appendChild(el);
      this.arenaEl = el;
    }
    if (sec === null) { this.arenaEl.style.display = 'none'; return; }
    this.arenaEl.style.display = 'block';
    this.arenaEl.textContent = `⏳ ${sec} 秒`;
  }

  /** force=必须显示（玩家自己选的手册提示这种），普通提示语会被设置里的开关拦掉 */
  showMessage(text: string, seconds = 2.5, force = false): void {
    if (!force && !isTipsOn()) return;
    this.messageEl.textContent = text;
    this.msgTimer = seconds;
  }

  /** 开局专属岛屿欢迎提示 */
  showIslandGreeting(islandType: IslandType): void {
    this.showMessage(`你来到了${ISLAND_TYPES[islandType].cn}！`);
  }

  /** 进出大厅场景提示 */
  showHallSwitch(inHall: boolean, islandType: IslandType): void {
    this.showMessage(inHall ? '来到大厅' : `回到自己的岛（${ISLAND_TYPES[islandType].cn}）`);
  }

  setPaused(paused: boolean): void {
    this.pausedEl.style.display = paused ? 'flex' : 'none';
  }

  /** 串门时挂上「参观 XX 的岛」常驻标签；回大厅/回自己岛传 null 摘掉 */
  setVisitOwner(name: string | null): void {
    this.setVisitLabel(name ? `🏝 参观 ${name} 的岛 · 按 H 回大厅` : '');
  }

  /** 串门标签自定义文案：岛主迎客（🏠 XX 在你家做客）、快照降级（本人走了）等场景用 */
  setVisitLabel(text: string): void {
    this.visitEl.textContent = text;
  }

  /** 更新联机连接状态与在线名单（固定位置状态灯：绿=已连接、黄=重连中、红=已断开） */
  setNetState(status: NetStatus, online?: string[]): void {
    this.netStatus = status;
    if (online) this.onlineList = online;
    this.renderNetStatus();
  }

  private renderNetStatus(): void {
    if (this.netStatus === 'connected') {
      const count = this.onlineList.length;
      const suffix = count > 0 ? ` (${count}人在线)` : '';
      this.netEl.textContent = `联机 ●${suffix}`;
      this.netEl.style.color = '#66bb6a';
      this.netEl.title = count > 0 ? `在线：${this.onlineList.join('、')}` : '已连接';
    } else if (this.netStatus === 'reconnecting') {
      this.netEl.textContent = '联机 ○ 重连中…';
      this.netEl.style.color = '#ffd54a';
      this.netEl.title = '正在尝试重连服务器…';
    } else {
      this.netEl.textContent = '联机 ● 已断开';
      this.netEl.style.color = '#ef5350';
      this.netEl.title = '未连接服务器';
    }
  }
}
