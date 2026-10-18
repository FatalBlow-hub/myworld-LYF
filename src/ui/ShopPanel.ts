/** 售卖机面板 — 对着售卖机按 M 打开：一行一个商品（图标+名字+价格+购买按钮），顶上显示余额 */

import { skinHeadIcon } from '../render/SkinTextures';
import { Atlas } from '../render/Textures';
import { BLOCKS } from '../world/Block';
import { ShopGood, fmtCoins } from '../world/Shop';
import { isMobile } from './Platform';

export class ShopPanel {
  private el: HTMLDivElement;
  private win: HTMLDivElement;
  visible = false;

  /** onBuy 负责扣钱发货（钱不够也在里面提示）；coins 只读当前余额用来显示 */
  constructor(private atlas: Atlas, private coins: () => number, private onBuy: (good: ShopGood) => void) {
    this.el = document.createElement('div');
    this.el.className = 'inv-overlay';
    this.el.style.display = 'none';
    this.win = document.createElement('div');
    this.win.className = 'inv-window';
    this.el.appendChild(this.win);
    this.el.addEventListener('mousedown', (e) => { if (e.target === this.el) this.close(); });
    document.body.appendChild(this.el);
  }

  /** 打开一台售卖机：title = 机器名字，goods = 货架 */
  open(title: string, goods: ShopGood[]): void {
    this.win.innerHTML = '';
    const t = document.createElement('p');
    t.className = 'inv-sub';
    t.textContent = `${title} · 余额 ${fmtCoins(this.coins())} 岛币`;
    this.win.appendChild(t);

    if (goods.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'inv-sub';
      empty.textContent = '还没进货，下次再来看看吧';
      this.win.appendChild(empty);
    }
    for (const g of goods) this.win.appendChild(this.makeRow(g));

    const hint = document.createElement('div');
    hint.className = 'inv-hint';
    hint.textContent = isMobile() ? '点购买拿货 · 点空白关闭' : '点购买拿货 · 9/ESC 或点空白关闭';
    this.win.appendChild(hint);
    this.visible = true;
    this.el.style.display = 'flex';
  }

  private makeRow(g: ShopGood): HTMLDivElement {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:4px 2px;';

    const img = document.createElement('img');
    img.src = g.unlock ? skinHeadIcon(g.unlock) : this.atlas.iconFor(g.id!);
    img.style.cssText = 'width:32px;height:32px;image-rendering:pixelated;';
    row.appendChild(img);

    const name = document.createElement('span');
    name.style.cssText = 'flex:1;text-align:left;font-size:14px;';
    name.textContent = (g.label ?? BLOCKS[g.id!].cn) + (g.note ? `（${g.note}）` : '');
    row.appendChild(name);

    const btn = document.createElement('button');
    btn.textContent = `${fmtCoins(g.price)} 岛币 购买`;
    btn.style.cssText = 'padding:6px 10px;font-size:13px;cursor:pointer;border-radius:6px;border:1px solid #888;background:#3e8a46;color:#fff;';
    btn.addEventListener('click', () => this.onBuy(g));
    row.appendChild(btn);
    return row;
  }

  /** 买完刷新余额那一行（不重建整个面板，免得闪） */
  refreshCoins(): void {
    const t = this.win.querySelector('.inv-sub');
    if (t) t.textContent = t.textContent?.replace(/余额 .*$/, `余额 ${fmtCoins(this.coins())} 岛币`) ?? '';
  }

  close(): void {
    this.visible = false;
    this.el.style.display = 'none';
  }
}
