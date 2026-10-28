/** 旅者对话面板 — 只在自己岛上、对应季节出现，聊一次就能解锁当季配方手册
 *
 *  免费的解锁直接学；标了收费的（菖蒲护盾、彩珠礼花）要花 3 岛币，钱不够按钮灰掉。 */

import { SEASON_FOOD } from '../../config';
import { Atlas } from '../../render/textures/Textures';
import { BLOCKS } from '../../world/blocks/Block';
import { fmtCoins } from '../../world/economy/Shop';
import { isMobile } from '../touch/Platform';

export interface TravelerOffer {
  /** 解锁物对应的方块/物品 ID（显示图标用） */
  id: number;
  /** 解锁的关键词（在手册条目里匹配） */
  keyword: string;
  /** 收费多少岛币（0 = 免费） */
  cost: number;
  /** 已经解锁过了 */
  done: boolean;
}

export class TravelerPanel {
  private el: HTMLDivElement;
  private win: HTMLDivElement;
  visible = false;

  constructor(
    private atlas: Atlas,
    private coins: () => number,
    private onUnlock: (offer: TravelerOffer) => void,
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

  open(title: string, greeting: string, offers: TravelerOffer[]): void {
    this.win.innerHTML = '';
    const t = document.createElement('p');
    t.className = 'inv-sub';
    t.textContent = `${title} · 余额 ${fmtCoins(this.coins())} 岛币`;
    this.win.appendChild(t);

    const say = document.createElement('p');
    say.style.cssText = 'font-size:14px;text-align:left;line-height:1.6;margin:6px 0;color:#e8e8d0;';
    say.textContent = greeting;
    this.win.appendChild(say);

    for (const o of offers) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:5px 2px;';
      const img = document.createElement('img');
      img.src = this.atlas.iconFor(o.id);
      img.style.cssText = 'width:32px;height:32px;image-rendering:pixelated;';
      row.appendChild(img);

      const name = document.createElement('span');
      name.style.cssText = 'flex:1;text-align:left;font-size:14px;';
      name.textContent = BLOCKS[o.id].cn;
      row.appendChild(name);

      const btn = document.createElement('button');
      btn.style.cssText = 'padding:6px 10px;font-size:13px;border-radius:6px;border:1px solid #888;color:#fff;';
      const poor = this.coins() < o.cost;
      if (o.done) {
        btn.textContent = '已学会';
        btn.style.background = '#4a4a4a';
        btn.style.cursor = 'default';
      } else if (poor) {
        btn.textContent = `还差 ${fmtCoins(o.cost - this.coins())} 岛币`;
        btn.style.background = '#5a5a5a';
        btn.style.cursor = 'default';
      } else {
        btn.textContent = o.cost > 0 ? `${fmtCoins(o.cost)} 岛币 解锁` : '免费解锁';
        btn.style.background = o.cost > 0 ? '#a8641e' : '#3e8a46';
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', () => this.onUnlock(o));
      }
      row.appendChild(btn);
      this.win.appendChild(row);
    }

    const hint = document.createElement('div');
    hint.className = 'inv-hint';
    hint.textContent = isMobile() ? '点解锁学配方 · 点空白关闭' : `点解锁学配方 · ${SEASON_FOOD.UNLOCK_COST} 岛币那几本要付钱 · 点空白关闭`;
    this.win.appendChild(hint);
    this.visible = true;
    this.el.style.display = 'flex';
  }

  /** 解锁后重画（余额与按钮状态一起更新） */
  refresh(title: string, greeting: string, offers: TravelerOffer[]): void {
    if (this.visible) this.open(title, greeting, offers);
  }

  close(): void {
    this.visible = false;
    this.el.style.display = 'none';
  }
}
