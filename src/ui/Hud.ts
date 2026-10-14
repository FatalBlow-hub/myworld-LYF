/** HUD — 准星、挖掘进度、血条、氧气、快捷栏（显示背包里真实的东西）、提示消息 */

import { HEALTH, HUNGER, ISLAND_TYPES, IslandType } from '../config';
import { BLOCKS } from '../world/Block';
import { Atlas } from '../render/Textures';
import { Inventory } from '../player/Inventory';

export class Hud {
  private root = document.getElementById('hud')!;
  private heartsEl = document.getElementById('hearts')!;
  private oxygenEl = document.getElementById('oxygen')!;
  private hungerEl: HTMLElement;
  private hotbarEl = document.getElementById('hotbar')!;
  private messageEl = document.getElementById('message')!;
  private pausedEl = document.getElementById('paused')!;
  private minebarEl = document.getElementById('minebar')!;
  private minefillEl = document.getElementById('minefill')!;
  private slotEls: HTMLElement[] = [];
  private lastHotbarSig = '';
  private lastHungerSig = '';
  private msgTimer = 0;

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

  showMessage(text: string, seconds = 2.5): void {
    this.messageEl.textContent = text;
    this.msgTimer = seconds;
  }

  /** 开局专属岛屿欢迎提示 */
  showIslandGreeting(islandType: IslandType): void {
    this.showMessage(`你来到了${ISLAND_TYPES[islandType].cn}！`);
  }

  setPaused(paused: boolean): void {
    this.pausedEl.style.display = paused ? 'flex' : 'none';
  }
}
