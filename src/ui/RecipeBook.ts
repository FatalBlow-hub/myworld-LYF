/** 制作方法手册 — 捡到 DIY 手册就弹出一张白纸写着一个配方，15 秒后收起；
 *  点白纸（或按 7）打开收集册：所有学过的方法列成一页，滚轮上下翻看 */

import { GOLDEN, MANUAL } from '../config';
import { Inventory } from '../player/Inventory';
import { TUTORIALS } from '../world/Recipes';
import {
  ALL_GOLD_DYES, DIY_GOLD_CHEM_DECOMP, DIY_GOLD_CRAFT_TABLE, DIY_GOLD_DYE_TABLE,
  GOLDEN_RANDOM_MANUALS, GOLDEN_TASK_MANUALS,
} from '../world/GoldenItems';

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
  private listEl: HTMLDivElement;
  private titleEl: HTMLParagraphElement;
  visible = false;

  constructor() {
    this.bookEl = document.createElement('div');
    this.bookEl.className = 'inv-overlay';
    this.bookEl.style.display = 'none';

    const win = document.createElement('div');
    win.className = 'inv-window book-window';
    this.bookEl.appendChild(win);

    this.titleEl = document.createElement('p');
    this.titleEl.className = 'inv-sub';
    win.appendChild(this.titleEl);

    this.listEl = document.createElement('div');
    this.listEl.className = 'book-list';
    win.appendChild(this.listEl);

    const hint = document.createElement('div');
    hint.className = 'inv-hint';
    hint.textContent = '滚轮翻看 · 7 / 9 / ESC 关闭 · 点空白处也能关';
    win.appendChild(hint);

    // 点面板外的空白处也能关门（手机上没有 ESC 键）
    this.bookEl.addEventListener('mousedown', (e) => { if (e.target === this.bookEl) this.close(); });
    document.body.appendChild(this.bookEl);
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

  /** 打开收集册：把学会的方法一条条列出来 */
  open(): void {
    this.hidePaper();
    const goldenTotal = GOLDEN_RANDOM_MANUALS.length + Object.keys(GOLDEN_TASK_MANUALS).length;
    this.titleEl.textContent = `制作方法 · 普通 ${this.learned.size}/${TUTORIALS.length} · 金色 ${this.goldenLearned.size + this.goldenTasks.size}/${goldenTotal}`;
    this.listEl.innerHTML = '';
    const addRow = (label: string, text: string, learned: boolean) => {
      const row = document.createElement('div');
      row.className = 'book-item';
      row.textContent = learned ? `${label}. ${text}` : `${label}. ？？？（还没学会）`;
      if (!learned) row.style.opacity = '0.4';
      this.listEl.appendChild(row);
    };
    if (this.learned.size + this.goldenLearned.size + this.goldenTasks.size === 0) {
      const empty = document.createElement('div');
      empty.className = 'book-empty';
      empty.textContent = '还没学会制作方法，去捡 DIY 手册吧';
      this.listEl.appendChild(empty);
    }
    TUTORIALS.forEach((tutorial, i) => addRow(`${i + 1}`, tutorial.text, this.learned.has(i)));
    GOLDEN_RANDOM_MANUALS.forEach((text, i) => addRow(`金色 ${i + 1}`, text, this.goldenLearned.has(i)));
    Object.entries(GOLDEN_TASK_MANUALS).forEach(([id, text], i) =>
      addRow(`任务 ${i + 1}`, text, this.goldenTasks.has(Number(id))),
    );
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
