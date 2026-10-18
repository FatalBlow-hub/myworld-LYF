/** 送礼物面板 — 访岛同屏时按 C /「给」打开：送岛币（输数字）或送背包里的物品（点一下送 1 个/全送） */

import { BLOCKS } from '../world/Block';
import { Inventory } from '../player/Inventory';

export interface GiveGift {
  coins?: number;
  itemId?: number;
  count?: number;
}

export interface GivePanelDeps {
  /** 当前岛币余额（显示用） */
  coins: () => number;
  /** 当前背包（列可送的物品） */
  inventory: () => Inventory;
  /** 对面玩家的名字（标题显示"送给 XX"） */
  peerName: () => string | null;
  /** 真正执行赠送：扣自己的、发消息给对面；成功返回 true 让面板刷新列表 */
  onGive: (gift: GiveGift) => boolean;
}

export class GivePanel {
  private el: HTMLDivElement;
  private titleEl: HTMLParagraphElement;
  private coinsLabelEl: HTMLSpanElement;
  private coinsInput: HTMLInputElement;
  private listEl: HTMLDivElement;
  visible = false;

  constructor(private d: GivePanelDeps) {
    this.el = document.createElement('div');
    this.el.className = 'inv-overlay';
    this.el.style.display = 'none';
    this.el.addEventListener('mousedown', (e) => { if (e.target === this.el) this.close(); });

    const win = document.createElement('div');
    win.className = 'inv-window';
    Object.assign(win.style, { minWidth: '300px', maxWidth: '340px', alignItems: 'stretch', padding: '16px 20px', gap: '8px' });
    this.el.appendChild(win);

    this.titleEl = document.createElement('p');
    this.titleEl.className = 'inv-sub';
    Object.assign(this.titleEl.style, { fontSize: '17px', fontWeight: 'bold' });
    win.appendChild(this.titleEl);

    // —— 送岛币：输入框 + 按钮 ——
    const coinRow = document.createElement('div');
    Object.assign(coinRow.style, { display: 'flex', alignItems: 'center', gap: '8px' });
    this.coinsLabelEl = document.createElement('span');
    this.coinsLabelEl.className = 'inv-sub';
    this.coinsInput = document.createElement('input');
    this.coinsInput.type = 'number';
    this.coinsInput.min = '1';
    this.coinsInput.placeholder = '几个币';
    Object.assign(this.coinsInput.style, { width: '70px', fontSize: '15px', padding: '4px 6px' });
    coinRow.appendChild(this.coinsLabelEl);
    coinRow.appendChild(this.coinsInput);
    coinRow.appendChild(this.makeBtn('送', '#4a7c3a', () => {
      const n = Math.floor(Number(this.coinsInput.value));
      if (!Number.isFinite(n) || n <= 0) return;
      if (this.d.onGive({ coins: n })) { this.coinsInput.value = ''; this.refresh(); }
    }));
    win.appendChild(coinRow);

    // —— 送物品：把背包里有的东西列出来 ——
    this.listEl = document.createElement('div');
    Object.assign(this.listEl.style, { maxHeight: '40vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' });
    win.appendChild(this.listEl);

    win.appendChild(this.makeBtn('关闭', '#888', () => this.close()));
    document.body.appendChild(this.el);
  }

  private makeBtn(label: string, bg: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    Object.assign(btn.style, {
      fontSize: '14px', padding: '6px 12px', cursor: 'pointer',
      color: '#fff', background: bg, border: '2px solid rgba(0,0,0,0.35)', borderRadius: '6px', fontFamily: 'inherit',
    });
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); onClick(); });
    return btn;
  }

  /** 打开面板并列出当前可送的东西 */
  open(): void {
    this.visible = true;
    this.el.style.display = 'flex';
    this.refresh();
  }

  close(): void {
    this.visible = false;
    this.el.style.display = 'none';
  }

  /** 刷新岛币余额和物品列表（送完一次后数量会变） */
  private refresh(): void {
    this.titleEl.textContent = `送礼物给 ${this.d.peerName() ?? '对方'}`;
    this.coinsLabelEl.textContent = `岛币（有 ${this.d.coins()}）`;
    this.listEl.textContent = '';
    const inv = this.d.inventory();
    const seen = new Map<number, number>(); // 同种物品合并计数，列表别拉太长
    // 腰包只列已解锁的格子，跟 countOf/take 的口径一致
    const bag = inv.waistbagCapacity ? inv.waistbag.slice(0, inv.waistbagCapacity) : [];
    for (const slots of [inv.hotbar, inv.storage, ...[bag]]) {
      for (const s of slots) {
        if (s && s.count > 0) seen.set(s.id, (seen.get(s.id) ?? 0) + s.count);
      }
    }
    if (!seen.size) {
      const empty = document.createElement('p');
      empty.className = 'inv-sub';
      empty.textContent = '背包空空的，没有东西可送';
      this.listEl.appendChild(empty);
      return;
    }
    for (const [id, count] of seen) {
      const row = document.createElement('div');
      Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '6px' });
      const name = document.createElement('span');
      name.className = 'inv-sub';
      name.style.flex = '1';
      name.textContent = `${BLOCKS[id]?.cn ?? `物品${id}`} ×${count}`;
      row.appendChild(name);
      row.appendChild(this.makeBtn('送1个', '#4a7c3a', () => { if (this.d.onGive({ itemId: id, count: 1 })) this.refresh(); }));
      if (count > 1) row.appendChild(this.makeBtn('全送', '#b0702a', () => { if (this.d.onGive({ itemId: id, count })) this.refresh(); }));
      this.listEl.appendChild(row);
    }
  }
}
