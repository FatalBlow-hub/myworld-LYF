/** CS 商店 — 比赛准备阶段开的临时商店，用 CS 币买，买了的东西赛后全部清除
 *
 *  七样货：玻璃锥 / 弹药 / 闪光弹 / 手雷 / 步枪 / 毒药瓶 / AK47。
 *  CS 币不够的按钮灰掉；它跟岛币商店是两套钱，不通用。 */

import { CS } from '../../config';
import { Atlas } from '../../render/textures/Textures';
import { AK47, AMMO, BLOCKS, FLASHBANG, GLASS_CONE, GRENADE, RIFLE, TOXIC_BOTTLE } from '../../world/blocks/Block';
import { isMobile } from '../touch/Platform';

export type CsGood = 'cone' | 'ammo' | 'flash' | 'grenade' | 'rifle' | 'toxic' | 'ak';

const GOODS: { kind: CsGood; id: number; price: number; note: string }[] = [
  { kind: 'cone',    id: GLASS_CONE,    price: CS.PRICES.CONE,    note: '近战 ×1.5' },
  { kind: 'ammo',    id: AMMO,          price: CS.PRICES.AMMO,    note: `+${CS.AMMO_PER_PACK} 发` },
  { kind: 'flash',   id: FLASHBANG,     price: CS.PRICES.FLASH,   note: '晃瞎 4 秒' },
  { kind: 'grenade', id: GRENADE,       price: CS.PRICES.GRENADE, note: '范围 20 伤' },
  { kind: 'rifle',   id: RIFLE,         price: CS.PRICES.RIFLE,   note: '25 伤 / 1.5 秒' },
  { kind: 'toxic',   id: TOXIC_BOTTLE,  price: CS.PRICES.TOXIC,   note: '命中 4 伤' },
  { kind: 'ak',      id: AK47,          price: CS.PRICES.AK,      note: '20 伤 / 0.5 秒' },
];

export class CsShopPanel {
  private el: HTMLDivElement;
  private win: HTMLDivElement;
  visible = false;

  constructor(
    private atlas: Atlas,
    private cs: () => number,
    private onBuy: (kind: CsGood) => void,
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
    this.render();
    this.visible = true;
    this.el.style.display = 'flex';
  }

  /** 买完刷新（余额与按钮状态一起更新） */
  refresh(): void {
    if (this.visible) this.render();
  }

  close(): void {
    this.visible = false;
    this.el.style.display = 'none';
  }

  private render(): void {
    this.win.innerHTML = '';
    const t = document.createElement('p');
    t.className = 'inv-sub';
    t.textContent = `CS 商店 · ${this.cs()} CS 币`;
    this.win.appendChild(t);

    for (const g of GOODS) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:4px 2px;';

      const img = document.createElement('img');
      img.src = this.atlas.iconFor(g.id);
      img.style.cssText = 'width:32px;height:32px;image-rendering:pixelated;';
      row.appendChild(img);

      const name = document.createElement('span');
      name.style.cssText = 'flex:1;text-align:left;font-size:14px;';
      name.textContent = `${BLOCKS[g.id].cn}（${g.note}）`;
      row.appendChild(name);

      const btn = document.createElement('button');
      btn.style.cssText = 'padding:6px 10px;font-size:13px;border-radius:6px;border:1px solid #888;color:#fff;';
      if (this.cs() < g.price) {
        btn.textContent = `还差 ${g.price - this.cs()} CS`;
        btn.style.background = '#5a5a5a';
        btn.style.cursor = 'default';
      } else {
        btn.textContent = `${g.price} CS 购买`;
        btn.style.background = '#3e8a46';
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', () => this.onBuy(g.kind));
      }
      row.appendChild(btn);
      this.win.appendChild(row);
    }

    const hint = document.createElement('div');
    hint.className = 'inv-hint';
    hint.textContent = isMobile()
      ? 'CS 币只在比赛里用，赛后清空 · 点空白关闭'
      : 'CS 币只在比赛里用，赛后清空 · ESC 或点空白关闭';
    this.win.appendChild(hint);
  }
}
