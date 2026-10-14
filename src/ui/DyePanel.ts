/** 染色台面板 — 对着染色台按 M 打开。
 *  普通染色台：收走 1 张地毯，点颜色就变成那种地毯（7 种基础色）；没地毯不让开。
 *  星空染色台：色板多出灰/天鹅黄/淡草绿/星空色，还能把颜料两两融合出新颜料；
 *  没带地毯也能开门融合。不选颜色直接关掉会退还地毯 */

import { BLOCKS, CARPET_IDS, CARPET_EXTRA, CARPET_STAR, COLOR_CSS } from '../world/Block';
import { FUSIONS } from '../world/Recipes';
import { Inventory } from '../player/Inventory';

/** 每种染色台能染的地毯颜色：普通台只有基础 7 色，星空台全部颜色（含会发光的星空毯） */
const NORMAL_SWATCHES = [...CARPET_IDS];
const STAR_SWATCHES = [...CARPET_IDS, ...CARPET_EXTRA, CARPET_STAR];

export class DyePanel {
  private el: HTMLDivElement;
  private title: HTMLParagraphElement;
  private grid: HTMLDivElement;
  private fuseBox: HTMLDivElement;
  private hint: HTMLDivElement;
  /** 开门时收走的那张地毯；没选颜色就关掉会还回去 */
  private takenId: number | null = null;
  /** 融合按钮们：每次融合后要重新检查材料够不够 */
  private fuseRows: { row: HTMLDivElement; needs: [number, number][] }[] = [];
  visible = false;

  constructor(private inv: Inventory, private onMsg: (t: string) => void) {
    this.el = document.createElement('div');
    this.el.className = 'inv-overlay';
    this.el.style.display = 'none';
    // 点面板外的空白处也能关门（手机上没有 ESC 键）
    this.el.addEventListener('mousedown', (e) => { if (e.target === this.el) this.close(); });

    const win = document.createElement('div');
    win.className = 'inv-window';
    this.el.appendChild(win);

    this.title = document.createElement('p');
    this.title.className = 'inv-sub';
    win.appendChild(this.title);

    this.grid = document.createElement('div');
    this.grid.className = 'inv-grid';
    win.appendChild(this.grid);

    // 融合区：只有星空染色台显示
    this.fuseBox = document.createElement('div');
    this.fuseBox.style.display = 'none';
    this.fuseBox.style.flexWrap = 'wrap';
    this.fuseBox.style.gap = '6px';
    this.fuseBox.style.marginTop = '10px';
    win.appendChild(this.fuseBox);

    this.hint = document.createElement('div');
    this.hint.className = 'inv-hint';
    win.appendChild(this.hint);

    document.body.appendChild(this.el);
  }

  /** takenId = 开门前已经从背包里收走的那张地毯（null = 没带毯子，只能融合）；star = 星空染色台 */
  open(takenId: number | null, star: boolean, gold = false): void {
    this.takenId = takenId;
    this.visible = true;
    this.title.textContent = gold
      ? '黄金地毯染色台 · 点颜色染地毯，点配方融合颜料'
      : star
        ? '星空染色台 · 点颜色染地毯，点配方融合颜料'
        : '染色台 · 点一个颜色，地毯就变成它';
    this.hint.textContent = takenId === null
      ? '没带地毯：点颜色没用，但能融合颜料 · 9 或 ESC 关门'
      : '点颜色 = 染它 · 9 或 ESC 不染色并退还地毯';
    this.buildSwatches(star ? STAR_SWATCHES : NORMAL_SWATCHES);
    this.buildFusions(star);
    this.el.style.display = 'flex';
  }

  /** 摆色板：一个色块一个地毯颜色 */
  private buildSwatches(ids: number[]): void {
    this.grid.innerHTML = '';
    this.grid.style.gridTemplateColumns = `repeat(${ids.length}, 44px)`;
    for (const id of ids) {
      const b = document.createElement('div');
      b.className = 'slotbox dye-swatch';
      b.style.background = COLOR_CSS[id];
      b.title = `染成${BLOCKS[id].cn}`;
      const label = document.createElement('b');
      label.className = 'swatch-name';
      label.textContent = BLOCKS[id].cn.replace('地毯', ''); // 色块上写颜色名（红/星空…）
      b.appendChild(label);
      b.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.pick(id);
      });
      this.grid.appendChild(b);
    }
  }

  /** 摆融合配方：每行 = 材料色块们 → 成品色块×n，材料不够的变淡点不了 */
  private buildFusions(star: boolean): void {
    this.fuseRows = [];
    this.fuseBox.innerHTML = '';
    this.fuseBox.style.display = star ? 'flex' : 'none';
    if (!star) return;
    for (const f of FUSIONS) {
      const row = document.createElement('div');
      row.className = 'slotbox';
      row.style.width = 'auto';
      row.style.padding = '3px 6px';
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '3px';
      row.style.cursor = 'pointer';
      const dot = (id: number) => {
        const d = document.createElement('span');
        d.style.display = 'inline-block';
        d.style.width = '14px';
        d.style.height = '14px';
        d.style.background = COLOR_CSS[id];
        d.style.border = '1px solid #222';
        d.title = BLOCKS[id].cn;
        return d;
      };
      f.needs.forEach(([id], i) => {
        if (i > 0) row.appendChild(document.createTextNode('+'));
        row.appendChild(dot(id));
      });
      row.appendChild(document.createTextNode('→'));
      row.appendChild(dot(f.out));
      const n = document.createElement('b');
      n.style.fontSize = '12px';
      n.textContent = `×${f.outCount}`;
      row.appendChild(n);
      row.title = f.needs.map(([id]) => BLOCKS[id].cn).join('+') + ` → ${BLOCKS[f.out].cn}×${f.outCount}`;
      row.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.fuse(f.needs, f.out, f.outCount);
      });
      this.fuseBox.appendChild(row);
      this.fuseRows.push({ row, needs: f.needs });
    }
    this.refreshFusions();
  }

  /** 材料够不够：够 → 点亮，不够 → 变淡 */
  private refreshFusions(): void {
    for (const { row, needs } of this.fuseRows) {
      const ok = needs.every(([id, n]) => this.inv.countOf(id) >= n);
      row.style.opacity = ok ? '1' : '0.35';
      row.style.pointerEvents = ok ? 'auto' : 'none';
    }
  }

  /** 融合：扣材料给成品（材料不够不会触发，按钮本来就是灰的） */
  private fuse(needs: [number, number][], out: number, outCount: number): void {
    if (!needs.every(([id, n]) => this.inv.countOf(id) >= n)) return;
    for (const [id, n] of needs) this.inv.take(id, n);
    this.inv.add(out, outCount);
    this.onMsg(`融合出 ${BLOCKS[out].cn}×${outCount}！`);
    this.refreshFusions();
  }

  /** 选了个颜色：地毯变成那个颜色进背包 */
  private pick(id: number): void {
    if (this.takenId === null) { this.onMsg('背包里没有地毯，先带一张来'); return; }
    this.inv.add(id, 1);
    this.takenId = null;
    this.close();
  }

  close(): void {
    if (this.takenId !== null) {
      this.inv.add(this.takenId, 1); // 没选颜色 → 地毯还回来
      this.takenId = null;
    }
    this.visible = false;
    this.el.style.display = 'none';
  }
}
