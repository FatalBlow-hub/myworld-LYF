/** 制作方法手册 — 捡到 DIY 手册就弹出一张白纸写着一个配方，15 秒后收起；
 *  点白纸（或按 7）打开收集册：上面一排分类 Tab，下面配方卡片网格——
 *  卡片上画物品图标、名字、材料小图标；季节配方贴雪花/南瓜小标记；
 *  材料凑齐了卡片角落亮绿色对勾；点卡片下面看完整说明 */

import { GOLDEN, MANUAL } from '../config';
import { Atlas } from '../render/Textures';
import { Inventory } from '../player/Inventory';
import { Tutorial, TUTORIALS } from '../world/Tutorials';
import { BLOCKS, PUMPKIN, SNOWFLAKE } from '../world/Block';
import { TutorialCat } from '../world/manualCats';
import {
  ALL_GOLD_DYES, DIY_GOLD_CHEM_DECOMP, DIY_GOLD_CRAFT_TABLE, DIY_GOLD_DYE_TABLE,
  GOLDEN_RANDOM_MANUALS, GOLDEN_TASK_MANUALS,
} from '../world/GoldenItems';

const TABS: { key: 'all' | TutorialCat; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'equip', label: '装备' },
  { key: 'build', label: '建筑方块' },
  { key: 'small', label: '小物件' },
  { key: 'food', label: '食物' },
  { key: 'misc', label: '其他' },
];

export class RecipeBook {
  /** 已学会的方法下标（对应 TUTORIALS） */
  private learned = new Set<number>();
  private goldenLearned = new Set<number>();
  private goldenTasks = new Set<number>();
  private goldenWaterUses = 0;
  /** 飘在屏幕上的白纸，15 秒自动消失 */
  private paper: HTMLDivElement | null = null;
  private paperTimeout = 0;
  /** 收集册弹窗 */
  private bookEl: HTMLDivElement;
  private tabsEl: HTMLDivElement;
  private listEl: HTMLDivElement;
  private detailEl: HTMLDivElement;
  private titleEl: HTMLParagraphElement;
  private tab: 'all' | TutorialCat = 'all';
  private inv: Inventory | null = null;
  visible = false;

  constructor(private atlas: Atlas) {
    this.bookEl = document.createElement('div');
    this.bookEl.className = 'inv-overlay';
    this.bookEl.style.display = 'none';

    const win = document.createElement('div');
    win.className = 'inv-window book-window';
    this.bookEl.appendChild(win);

    this.titleEl = document.createElement('p');
    this.titleEl.className = 'inv-sub';
    win.appendChild(this.titleEl);

    this.tabsEl = document.createElement('div');
    this.tabsEl.className = 'book-tabs';
    win.appendChild(this.tabsEl);

    this.listEl = document.createElement('div');
    this.listEl.className = 'book-cards';
    win.appendChild(this.listEl);

    this.detailEl = document.createElement('div');
    this.detailEl.className = 'book-detail';
    win.appendChild(this.detailEl);

    const hint = document.createElement('div');
    hint.className = 'inv-hint';
    hint.textContent = '点卡片看完整说明 · 7 / 9 / ESC 关闭 · 点空白处也能关';
    win.appendChild(hint);

    // 点面板外的空白处也能关门（手机上没有 ESC 键）
    this.bookEl.addEventListener('mousedown', (e) => { if (e.target === this.bookEl) this.close(); });
    document.body.appendChild(this.bookEl);
  }

  /** 进游戏后把背包挂进来：卡片上的"材料够不够"对勾要查背包 */
  bindInventory(inv: Inventory): void {
    this.inv = inv;
  }

  /** 还有没有没学会的方法（学全了就不该再掉手册） */
  hasMore(): boolean {
    return !this.hasAllNormal() || !this.hasAllRandomGolden();
  }

  hasAllNormal(): boolean {
    return this.learned.size >= TUTORIALS.length;
  }

  hasAllRandomGolden(): boolean {
    return this.goldenLearned.size >= GOLDEN_RANDOM_MANUALS.length;
  }

  /** 捡到普通手册：优先学没学过的方法；全学会了就随机温习一条 */
  learn(): { text: string; isNew: boolean } {
    const unknown = TUTORIALS.map((_, i) => i).filter((i) => !this.learned.has(i));
    const pool = unknown.length > 0 ? unknown : TUTORIALS.map((_, i) => i);
    const id = pool[Math.floor(Math.random() * pool.length)];
    const isNew = !this.learned.has(id);
    this.learned.add(id);
    return { text: TUTORIALS[id].text, isNew };
  }

  learnGolden(): { text: string; isNew: boolean } {
    const unknown = GOLDEN_RANDOM_MANUALS.map((_, i) => i).filter((i) => !this.goldenLearned.has(i));
    const pool = unknown.length > 0 ? unknown : GOLDEN_RANDOM_MANUALS.map((_, i) => i);
    const id = pool[Math.floor(Math.random() * pool.length)];
    const isNew = !this.goldenLearned.has(id);
    this.goldenLearned.add(id);
    return { text: GOLDEN_RANDOM_MANUALS[id], isNew };
  }

  unlockTask(id: number): string | null {
    const text = GOLDEN_TASK_MANUALS[id];
    if (!text || this.goldenTasks.has(id)) return null;
    this.goldenTasks.add(id);
    return text;
  }

  recordWaterUse(): string | null {
    this.goldenWaterUses = Math.min(GOLDEN.WATER_USES_FOR_MANUAL, this.goldenWaterUses + 1);
    return this.goldenWaterUses >= GOLDEN.WATER_USES_FOR_MANUAL
      ? this.unlockTask(DIY_GOLD_CHEM_DECOMP)
      : null;
  }

  checkCollectionUnlocks(inv: Inventory): string[] {
    const texts: string[] = [];
    if (this.hasAllNormal() && this.hasAllRandomGolden()) {
      const text = this.unlockTask(DIY_GOLD_CRAFT_TABLE);
      if (text) texts.push(text);
    }
    if (ALL_GOLD_DYES.every((id) => inv.countOf(id) > 0)) {
      const text = this.unlockTask(DIY_GOLD_DYE_TABLE);
      if (text) texts.push(text);
    }
    return texts;
  }

  /** 弹一张白纸出来，黑字写着刚学会的方法；点它 = 打开收集册 */
  showPaper(text: string, golden = false): void {
    this.hidePaper();
    const el = document.createElement('div');
    el.className = 'paper';
    const head = document.createElement('div');
    head.className = 'paper-head';
    head.textContent = golden ? '金色 DIY 手册' : 'DIY 手册';
    const body = document.createElement('div');
    body.className = 'paper-body';
    body.textContent = text;
    const foot = document.createElement('div');
    foot.className = 'paper-foot';
    foot.textContent = '点击查看制作方法';
    el.append(head, body, foot);
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.open();
    });
    document.body.appendChild(el);
    this.paper = el;
    this.paperTimeout = window.setTimeout(() => this.hidePaper(), MANUAL.PAPER_SECONDS * 1000);
  }

  private hidePaper(): void {
    if (this.paperTimeout) {
      clearTimeout(this.paperTimeout);
      this.paperTimeout = 0;
    }
    this.paper?.remove();
    this.paper = null;
  }

  /** 一张配方卡片：图标 + 名字 + 材料小图标 + 角标；没学会的就打个问号 */
  private makeCard(t: Tutorial | { text: string }, learned: boolean, golden = false): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'book-card' + (golden ? ' golden' : '') + (learned ? '' : ' unknown');
    const meta = t as Tutorial;

    const iconWrap = document.createElement('div');
    iconWrap.className = 'book-card-icon';
    if (learned && meta.icon != null) {
      const img = document.createElement('img');
      img.src = this.atlas.iconFor(meta.icon);
      img.alt = '';
      iconWrap.appendChild(img);
    } else if (!learned) {
      iconWrap.textContent = '？';
    }
    card.appendChild(iconWrap);

    const nameEl = document.createElement('div');
    nameEl.className = 'book-card-name';
    nameEl.textContent = learned
      ? (meta.icon != null ? BLOCKS[meta.icon].cn : meta.text.slice(0, 6))
      : '？？？';
    card.appendChild(nameEl);

    if (learned && meta.needs?.length) {
      const mats = document.createElement('div');
      mats.className = 'book-card-mats';
      for (const [id, n] of meta.needs) {
        const mat = document.createElement('div');
        mat.className = 'book-mat';
        const img = document.createElement('img');
        img.src = this.atlas.iconFor(id);
        img.alt = BLOCKS[id]?.cn ?? '';
        img.title = `${BLOCKS[id]?.cn ?? ''}×${n}`;
        mat.appendChild(img);
        if (n > 1) {
          const cnt = document.createElement('span');
          cnt.textContent = String(n);
          mat.appendChild(cnt);
        }
        mats.appendChild(mat);
      }
      card.appendChild(mats);
    }

    if (learned && meta.fest) {
      const badge = document.createElement('img');
      badge.className = 'book-badge fest';
      badge.src = this.atlas.iconFor(meta.fest === 'snow' ? SNOWFLAKE : PUMPKIN);
      badge.title = meta.fest === 'snow' ? '冬季配方' : '秋季配方';
      card.appendChild(badge);
    }
    if (learned && meta.needs?.length && this.inv) {
      const ready = meta.needs.every(([id, n]) => this.inv!.countOf(id) >= n);
      if (ready) {
        const ok = document.createElement('div');
        ok.className = 'book-badge ok';
        ok.textContent = '✓';
        ok.title = '材料够了，可以直接做';
        card.appendChild(ok);
      }
    }
    card.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.detailEl.textContent = learned ? t.text : '？？？（还没学会，去捡 DIY 手册吧）';
    });
    return card;
  }

  /** 打开收集册：分类 Tab + 配方卡片网格 */
  open(): void {
    this.hidePaper();
    const goldenTotal = GOLDEN_RANDOM_MANUALS.length + Object.keys(GOLDEN_TASK_MANUALS).length;
    this.titleEl.textContent = `制作方法 · 普通 ${this.learned.size}/${TUTORIALS.length} · 金色 ${this.goldenLearned.size + this.goldenTasks.size}/${goldenTotal}`;

    // 分类 Tab：点哪页看哪页，全部页啥都有
    this.tabsEl.innerHTML = '';
    for (const t of TABS) {
      const btn = document.createElement('button');
      btn.className = 'book-tab' + (this.tab === t.key ? ' on' : '');
      btn.textContent = t.label;
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.tab = t.key;
        this.open();
      });
      this.tabsEl.appendChild(btn);
    }

    this.listEl.innerHTML = '';
    this.detailEl.textContent = '';
    const inTab = (t: Tutorial) => this.tab === 'all' || (t.cat ?? 'misc') === this.tab;
    const showAll = this.tab === 'all';
    TUTORIALS.forEach((tutorial, i) => {
      if (!inTab(tutorial)) return;
      this.listEl.appendChild(this.makeCard(tutorial, this.learned.has(i)));
    });
    // 金色方法只在「全部」和「其他」页出现，省得金色散得到处都是
    if (showAll || this.tab === 'misc') {
      GOLDEN_RANDOM_MANUALS.forEach((text, i) => {
        this.listEl.appendChild(this.makeCard({ text }, this.goldenLearned.has(i), true));
      });
      Object.entries(GOLDEN_TASK_MANUALS).forEach(([id, text]) => {
        this.listEl.appendChild(this.makeCard({ text }, this.goldenTasks.has(Number(id)), true));
      });
    }
    if (!this.listEl.children.length) {
      const empty = document.createElement('div');
      empty.className = 'book-empty';
      empty.textContent = '这一页还没有方法，去捡 DIY 手册吧';
      this.listEl.appendChild(empty);
    }
    this.listEl.scrollTop = 0;
    this.visible = true;
    this.bookEl.style.display = 'flex';
  }

  close(): void {
    this.visible = false;
    this.bookEl.style.display = 'none';
  }

  /** 存档用：学会了哪些方法 */
  learnedIds(): number[] {
    return [...this.learned];
  }

  /** 读档用：把以前学会的方法放回来 */
  importLearned(ids: number[] | undefined): void {
    this.learned = new Set((ids ?? []).filter((i) => Number.isInteger(i) && i >= 0 && i < TUTORIALS.length));
  }

  goldenLearnedIds(): number[] { return [...this.goldenLearned]; }
  goldenTaskIds(): number[] { return [...this.goldenTasks]; }
  goldenWaterUseCount(): number { return this.goldenWaterUses; }

  importGoldenState(learned: number[] | undefined, tasks: number[] | undefined, waterUses: number | undefined): void {
    this.goldenLearned = new Set((learned ?? []).filter((i) => Number.isInteger(i) && i >= 0 && i < GOLDEN_RANDOM_MANUALS.length));
    this.goldenTasks = new Set((tasks ?? []).filter((id) => Number.isInteger(id) && id in GOLDEN_TASK_MANUALS));
    this.goldenWaterUses = Number.isFinite(waterUses)
      ? Math.max(0, Math.min(GOLDEN.WATER_USES_FOR_MANUAL, Math.floor(waterUses!)))
      : 0;
  }
}
