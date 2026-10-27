/** 柳条陷阱伪装选择 — 手持陷阱按 L 弹出来，挑一种伪装后立刻放下
 *
 *  五个选项的图标直接用原版方块的贴图，放下去以后外观和真方块完全一致。 */

import { BLOCKS } from '../world/Block';
import { TRAP_FORMS } from '../world/blocks.newgear';
import { Atlas } from '../render/Textures';
import { isMobile } from './Platform';

export class TrapPanel {
  private el: HTMLDivElement;
  private win: HTMLDivElement;
  visible = false;

  constructor(private atlas: Atlas, private onPick: (blockId: number) => void, private onCancel: () => void = () => {}) {
    this.el = document.createElement('div');
    this.el.className = 'inv-overlay';
    this.el.style.display = 'none';
    this.win = document.createElement('div');
    this.win.className = 'inv-window';
    this.el.appendChild(this.win);
    this.el.addEventListener('mousedown', (e) => {
      if (e.target === this.el) { this.close(); this.onCancel(); }
    });
    document.body.appendChild(this.el);
  }

  open(): void {
    this.win.innerHTML = '';
    const title = document.createElement('p');
    title.className = 'inv-sub';
    title.textContent = '柳条陷阱伪装成什么？';
    this.win.appendChild(title);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:12px;justify-content:center;padding:8px 0;';
    for (const form of TRAP_FORMS) {
      const btn = document.createElement('button');
      btn.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;'
        + 'padding:6px 8px;border-radius:8px;border:1px solid #888;background:#2f2f36;color:#fff;cursor:pointer;';
      const img = document.createElement('img');
      img.src = this.atlas.iconFor(form.id);
      img.style.cssText = 'width:36px;height:36px;image-rendering:pixelated;';
      btn.appendChild(img);
      const label = document.createElement('span');
      label.style.fontSize = '12px';
      label.textContent = form.cn;
      btn.appendChild(label);
      btn.addEventListener('click', () => { this.close(); this.onPick(form.id); });
      row.appendChild(btn);
    }
    this.win.appendChild(row);

    const hint = document.createElement('div');
    hint.className = 'inv-hint';
    hint.textContent = isMobile() ? '点方块选伪装 · 点空白取消' : '点方块选伪装 · ESC 或点空白取消';
    this.win.appendChild(hint);
    this.visible = true;
    this.el.style.display = 'flex';
  }

  close(): void {
    this.visible = false;
    this.el.style.display = 'none';
  }
}

/** 给外部确认一下伪装名（提示文案用） */
export const trapFormName = (id: number): string => TRAP_FORMS.find((f) => f.id === id)?.cn ?? BLOCKS[id].cn;
