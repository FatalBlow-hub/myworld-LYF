/** 容器面板 — 对着箱子/熔炉按 M 打开；上面是容器格子，下面是自己的背包，鼠标搬东西 */

import { Slots } from '../world/Block';
import { SMELT_TIME } from '../config';
import { FurnaceState } from '../world/World';
import { Atlas } from '../render/Textures';
import { Inventory } from '../player/Inventory';
import { createHeldEl, bindSlot, renderStack } from './slots';

export class ContainerPanel {
  private el: HTMLDivElement;
  private win: HTMLDivElement;
  private heldEl: HTMLDivElement;
  private slotRefs: { el: HTMLDivElement; slots: Slots; i: number }[] = [];
  private flameEl: HTMLDivElement | null = null;
  private furnace: FurnaceState | null = null;
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
    this.rebuild(soul ? '灵魂蓝箱子' : '箱子');
    this.win.appendChild(this.buildGrid(slots, 9, 'storage'));
    this.win.appendChild(this.buildGrid(this.inv.storage, 9, 'storage'));
    this.win.appendChild(this.buildGrid(this.inv.hotbar, 9, 'hotbar'));
    this.finishOpen();
  }

  /** 打开熔炉：上面放料 → 烧 → 右边出成品 */
  openFurnace(f: FurnaceState): void {
    this.furnace = f;
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
    hint.textContent = 'ontouchstart' in window
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
    bindSlot(el, () => {
      this.inv.click(slots, i);
      this.refresh();
    }, () => {
      this.inv.clickOne(slots, i);
      this.refresh();
    });
    this.slotRefs.push({ el, slots, i });
    return el;
  }

  close(): void {
    this.visible = false;
    this.furnace = null;
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
