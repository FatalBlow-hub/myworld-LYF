/** 容器面板 — 对着箱子/熔炉按 M 打开；上面是容器格子，下面是自己的背包，鼠标搬东西 */

import { Slots } from '../world/Block';
import { SMELT_TIME, STACK_MAX } from '../config';
import { FurnaceState } from '../world/World';
import { sellPriceOf } from '../world/Shop';
import { Atlas } from '../render/Textures';
import { Inventory } from '../player/Inventory';
import { createHeldEl, bindSlot, renderStack } from './slots';
import { isMobile } from './Platform';

export class ContainerPanel {
  private el: HTMLDivElement;
  private win: HTMLDivElement;
  private heldEl: HTMLDivElement;
  private slotRefs: { el: HTMLDivElement; slots: Slots; i: number }[] = [];
  private flameEl: HTMLDivElement | null = null;
  private furnace: FurnaceState | null = null;
  /** 收购箱模式：收购格 + 只收什么 + 卖了多少钱的回调；null = 普通箱子/熔炉模式 */
  private sellBox: { slots: Slots; onSell: (coins: number) => void } | null = null;
  visible = false;

  constructor(private inv: Inventory, private atlas: Atlas) {
    this.el = document.createElement('div');
    this.el.className = 'inv-overlay';
    this.el.style.display = 'none';
    this.win = document.createElement('div');
    this.win.className = 'inv-window';
    this.el.appendChild(this.win);
    this.heldEl = createHeldEl(this.el);
    // 点面板外的空白处也能关门（手机上没有 ESC 键）
    this.el.addEventListener('mousedown', (e) => { if (e.target === this.el) this.close(); });
    document.body.appendChild(this.el);
  }

  /** 打开箱子 */
  openChest(slots: Slots, soul: boolean): void {
    this.furnace = null;
    this.sellBox = null;
    this.rebuild(soul ? '灵魂蓝箱子' : '箱子');
    this.win.appendChild(this.buildGrid(slots, 9, 'storage'));
    this.win.appendChild(this.buildGrid(this.inv.storage, 9, 'storage'));
    this.win.appendChild(this.buildGrid(this.inv.hotbar, 9, 'hotbar'));
    this.finishOpen();
  }

  /** 打开收购箱：上面一排收购格，只能放价目表里的东西，放进去立刻折算成岛币 */
  openBuyBox(slots: Slots, onSell: (coins: number) => void): void {
    this.furnace = null;
    this.sellBox = { slots, onSell };
    this.rebuild('收购箱 · 把要卖的东西放上来，自动换成岛币');
    this.win.appendChild(this.buildGrid(slots, 9, 'storage'));
    this.win.appendChild(this.buildGrid(this.inv.storage, 9, 'storage'));
    this.win.appendChild(this.buildGrid(this.inv.hotbar, 9, 'hotbar'));
    this.finishOpen();
  }

  /** 把收购格里的东西按价目表换成岛币；不满一份的零头退回背包 */
  private drainSellBox(): void {
    const box = this.sellBox;
    if (!box) return;
    let coins = 0;
    for (let i = 0; i < box.slots.length; i++) {
      const s = box.slots[i];
      if (!s) continue;
      const price = sellPriceOf(s.id);
      if (!price) { this.inv.add(s.id, s.count, s.durability); box.slots[i] = null; continue; }
      const batches = Math.floor(s.count / price.per);
      const rest = s.count - batches * price.per;
      if (rest > 0) this.inv.add(s.id, rest);
      box.slots[i] = null;
      coins += batches * price.coins;
    }
    if (coins > 0) box.onSell(Math.round(coins * 100) / 100);
  }

  /** 打开熔炉：上面放料 → 烧 → 右边出成品 */
  openFurnace(f: FurnaceState): void {
    this.furnace = f;
    this.sellBox = null;
    this.rebuild(f.soul ? '灵魂火熔炉' : '熔炉');

    const row = document.createElement('div');
    row.className = 'craft-area';
    row.appendChild(this.makeSlot(f.slots, 0)); // 进料格

    const mid = document.createElement('div');
    mid.className = 'furnace-mid';
    mid.textContent = '🔥';
    this.flameEl = document.createElement('div');
    this.flameEl.className = 'flame-bar';
    this.flameEl.appendChild(document.createElement('div'));
    mid.appendChild(this.flameEl);
    row.appendChild(mid);

    row.appendChild(this.makeSlot(f.slots, 1)); // 成品格
    this.win.appendChild(row);

    this.win.appendChild(this.buildGrid(this.inv.storage, 9, 'storage'));
    this.win.appendChild(this.buildGrid(this.inv.hotbar, 9, 'hotbar'));
    this.finishOpen();
  }

  private rebuild(title: string): void {
    this.win.innerHTML = '';
    this.slotRefs = [];
    const t = document.createElement('p');
    t.className = 'inv-sub';
    t.textContent = title;
    this.win.appendChild(t);
  }

  private finishOpen(): void {
    const hint = document.createElement('div');
    hint.className = 'inv-hint';
    hint.textContent = isMobile()
      ? '轻点拿/放整摞 · 长按放1个/拿半摞 · 点空白关闭'
      : '左键拿/放 · 右键放1个/拿半摞 · 9/ESC 或点空白关闭';
    this.win.appendChild(hint);
    this.visible = true;
    this.el.style.display = 'flex';
    this.refresh();
  }

  private buildGrid(slots: Slots, cols: number, cls: string): HTMLDivElement {
    const grid = document.createElement('div');
    grid.className = `inv-grid ${cls}`;
    grid.style.gridTemplateColumns = `repeat(${cols}, 44px)`;
    slots.forEach((_, i) => grid.appendChild(this.makeSlot(slots, i)));
    return grid;
  }

  private makeSlot(slots: Slots, i: number): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'slotbox';
    // 收购格只收价目表里的东西；点完立刻结算成岛币
    const isSell = this.sellBox?.slots === slots;
    const fits = isSell ? (id: number) => sellPriceOf(id) !== null : undefined;
    bindSlot(el, () => {
      this.inv.click(slots, i, STACK_MAX, fits);
      if (isSell) this.drainSellBox();
      this.refresh();
    }, () => {
      this.inv.clickOne(slots, i, STACK_MAX, fits);
      if (isSell) this.drainSellBox();
      this.refresh();
    });
    this.slotRefs.push({ el, slots, i });
    return el;
  }

  close(): void {
    this.visible = false;
    this.furnace = null;
    // 收购格里有剩的（正常不会剩，放下就结算了）也退回背包，不吞东西
    if (this.sellBox) {
      for (let i = 0; i < this.sellBox.slots.length; i++) {
        const s = this.sellBox.slots[i];
        if (s) { this.inv.add(s.id, s.count, s.durability); this.sellBox.slots[i] = null; }
      }
      this.sellBox = null;
    }
    this.inv.returnHeld();
    this.el.style.display = 'none';
    this.heldEl.style.display = 'none';
  }

  /** 刷新格子 + 熔炉火焰进度条（创造模式不画数量） */
  refresh(): void {
    const hide = this.inv.infinite;
    this.slotRefs.forEach(({ el, slots, i }) => renderStack(el, slots[i], this.atlas, hide));
    if (this.heldEl) {
      renderStack(this.heldEl, this.inv.held, this.atlas, hide);
      this.heldEl.style.display = this.inv.held ? 'block' : 'none';
    }
    if (this.furnace && this.flameEl) {
      const fill = this.flameEl.firstElementChild as HTMLElement;
      fill.style.height = `${(this.furnace.progress / SMELT_TIME) * 100}%`;
      fill.style.background = this.furnace.soul ? '#4fd8ff' : '#ff8c42'; // 灵魂蓝火
    }
  }
}
