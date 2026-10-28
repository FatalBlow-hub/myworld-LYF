/** 背包面板 — 按 9 打开：装备栏+3D 小人 / 2×2 合成（含拆解）/ 3×9 储物 / 快捷栏；对着工作台按 M 变成 3×3 大合成台。鼠标左键拿放，键盘 4/6 选格子、K 分一个 */

import { ALL_ITEMS, BLOCKS, LIQUID_FILL, ROLLER_SKATES, WAISTBAG_SLOT, isWaistbag } from '../../world/blocks/Block';
import { CraftMatch, matchCraft } from '../../world/recipes/Recipes';
import { Atlas } from '../../render/textures/Textures';
import { Inventory, Slots, stackMaxFor } from '../../player/Inventory';
import { Controller } from '../../player/motion/Controller';
import { SKATES, STACK_MAX, WAISTBAG } from '../../config';
import { CHARACTER_NAMES, CharacterKind } from '../../entities/creatures/Character';
import { CharacterPreview } from './CharacterPreview';
import { createHeldEl, bindSlot, renderStack } from '../hud/slots';
import { isMobile } from '../touch/Platform';

const ARMOR_NAMES = ['头盔', '腰包', '护腿', '靴子'];

/** 面板要用的人物信息：现在是谁、点一下换成谁（存档由外面负责写） */
export interface AvatarHost {
  kind(): CharacterKind;
  swap(): void;
}

export class Panel {
  private el: HTMLDivElement;
  private win: HTMLDivElement;
  private heldEl: HTMLDivElement;
  private resultEl: HTMLDivElement | null = null;
  private resultBadge: HTMLDivElement | null = null;
  /** 每个格子元素对应背包里哪组格子的哪一格 */
  private slotRefs: { el: HTMLDivElement; slots: Slots; i: number }[] = [];
  /** 键盘选中框停在第几格（储物 27 + 快捷栏 9 连成一条，共 36 格） */
  private sel = 0;
  /** 工作台模式：合成格是 3×3 的 craftBig 而不是背包里的 2×2
   *  benchMode：'none' = 背包 2×2；'table' = 普通/星空/黄金工作台（只能做道具配方）；
   *  'food' = 美食工作台（只能做美食配方） */
  private bigMode = false;
  private benchMode: 'none' | 'table' | 'food' = 'none';
  /** 装备栏旁边那个 3D 小人（懒建 WebGL 上下文，面板关了停渲染） */
  private preview = new CharacterPreview();
  visible = false;

  constructor(private inv: Inventory, private atlas: Atlas, private avatar?: AvatarHost) {
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

  /** 按模式重摆面板内容（普通背包 / 工作台 3×3） */
  private buildContent(): void {
    const win = this.win;
    win.innerHTML = '';
    this.slotRefs = [];
    this.resultEl = null;
    this.resultBadge = null;

    if (this.bigMode) {
      const title = document.createElement('p');
      title.className = 'inv-sub';
      title.textContent = this.benchMode === 'food' ? '美食工作台 · 只能做美食' : '工作台 · 3×3 大合成';
      win.appendChild(title);
      const craft = document.createElement('div');
      craft.className = 'craft-area';
      const grid = document.createElement('div');
      grid.className = 'craft-grid';
      grid.style.gridTemplateColumns = 'repeat(3, 44px)';
      this.inv.craftBig.forEach((_, i) => grid.appendChild(this.makeSlot(this.inv.craftBig, i)));
      craft.appendChild(grid);
      const arrow = document.createElement('span');
      arrow.className = 'craft-arrow';
      arrow.textContent = '➜';
      craft.appendChild(arrow);
      this.resultEl = this.makeResultSlot();
      craft.appendChild(this.resultEl);
      win.appendChild(craft);
    } else if (this.inv.infinite) {
      this.buildCreative(win);
    } else {
      this.buildSurvival(win);
    }

    // 储物格 3×9 + 快捷栏 9
    win.appendChild(this.buildGrid(this.inv.storage, 9, 'storage'));
    win.appendChild(this.buildGrid(this.inv.hotbar, 9, 'hotbar'));

    const hint = document.createElement('div');
    hint.className = 'inv-hint';
    const touch = isMobile();
    hint.textContent = this.bigMode
      ? touch
        ? '轻点拿/放整摞 · 长按放1个/拿半摞 · 数量要按配方放正好 · 点空白关闭'
        : '左键拿/放 · 右键放1个/拿半摞 · 数量要按配方放正好 · K分1个 · 9/ESC或点空白关闭'
      : touch
        ? '轻点拿/放整摞 · 长按放1个/拿半摞 · 数量要按配方放正好 · 点空白关闭'
        : '左键拿/放 · 右键放1个/拿半摞 · 数量要按配方放正好 · K分1个 · 9/ESC或点空白关闭';
    win.appendChild(hint);
    // 手机没有 K 键：补一个「分 1 个」按钮，作用同 splitBtn（创造模式东西无限，用不着分）
    if (touch && !this.inv.infinite) {
      const btn = document.createElement('button');
      btn.className = 'split-one';
      btn.textContent = '分 1 个';
      btn.title = '手上捏着东西：放 1 个回格子；空手：白框那摞分 1 个出来';
      btn.onclick = () => this.splitBtn();
      win.appendChild(btn);
    }
  }

  /** 生存模式：装备栏 + 小人 + 2×2 合成 */
  private buildSurvival(win: HTMLDivElement): void {
    const top = document.createElement('div');
    top.className = 'inv-top';

    const left = document.createElement('div');
    left.className = 'inv-left';
    const armorCol = document.createElement('div');
    armorCol.className = 'armor-col';
    this.inv.armor.forEach((_, i) => {
      const fits = i === WAISTBAG_SLOT ? isWaistbag : i === 3 ? (id: number) => id === ROLLER_SKATES : undefined;
      const s = this.makeSlot(this.inv.armor, i, fits);
      s.title = i === WAISTBAG_SLOT ? '腰包（穿上后增加储物格）' : i === 3 ? '靴子（只能放轮滑鞋）' : ARMOR_NAMES[i];
      armorCol.appendChild(s);
    });
    left.appendChild(armorCol);
    left.appendChild(this.buildAvatar());
    top.appendChild(left);

    const craft = document.createElement('div');
    craft.className = 'craft-area';
    const grid = document.createElement('div');
    grid.className = 'craft-grid';
    for (let i = 0; i < 4; i++) grid.appendChild(this.makeSlot(this.inv.craftIn, i));
    craft.appendChild(grid);
    const arrow = document.createElement('span');
    arrow.className = 'craft-arrow';
    arrow.textContent = '➜';
    craft.appendChild(arrow);
    this.resultEl = this.makeResultSlot();
    craft.appendChild(this.resultEl);
    top.appendChild(craft);

    win.appendChild(top);
    const capacity = this.inv.waistbagCapacity;
    if (capacity > 0) {
      const title = document.createElement('p');
      title.className = 'inv-sub';
      title.textContent = `腰包储物格 · ${capacity} 格`;
      win.appendChild(title);
      win.appendChild(this.buildGrid(this.inv.waistbag, WAISTBAG.GRID_COLUMNS, 'waistbag', capacity));
    }
  }

  /** 创造模式：所有东西随便拿（点一下手里就多一摞） */
  private buildCreative(win: HTMLDivElement): void {
    const title = document.createElement('p');
    title.className = 'inv-sub';
    title.textContent = '创造模式 · 所有东西随便拿';
    win.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'inv-grid creative'; // 东西太多装不下，给个滚动条别挤出屏幕
    grid.style.gridTemplateColumns = 'repeat(8, 44px)';
    ALL_ITEMS.forEach((id) => {
      const cell = document.createElement('div');
      cell.className = 'slotbox';
      cell.title = BLOCKS[id].cn;
      const img = document.createElement('img');
      img.src = this.atlas.iconFor(id);
      cell.appendChild(img);
      const take = (n: number) => {
        // 创造模式拿到的轮滑鞋也只有一双，耐久是 3 次
        this.inv.held = id === ROLLER_SKATES
          ? { id, count: 1, durability: SKATES.MAX_FALLS }
          : { id, count: n };
        this.refresh();
      };
      bindSlot(cell, () => take(stackMaxFor(id)), () => take(1)); // 右键/长按只拿 1 个
      grid.appendChild(cell);
    });
    // 创造模式的物品栏里也放一个 3D 小人，跟生存模式的背包一样能看到自己
    const row = document.createElement('div');
    row.className = 'inv-top';
    row.appendChild(this.buildAvatar());
    row.appendChild(grid);
    win.appendChild(row);
  }

  /** 装备栏旁边的小人：3D 预览 + 下面一行「人物：谁」，点一下换另一个人 */
  private buildAvatar(): HTMLDivElement {
    const col = document.createElement('div');
    col.className = 'avatar-col';
    col.appendChild(this.preview.element);
    if (this.avatar) {
      this.preview.setKind(this.avatar.kind());
      const btn = document.createElement('button');
      btn.className = 'avatar-swap';
      const label = () => `人物：${CHARACTER_NAMES[this.avatar!.kind()]}`;
      btn.textContent = label();
      btn.title = '点一下换成另一个人物';
      btn.onclick = () => {
        this.avatar!.swap();
        this.preview.setKind(this.avatar!.kind());
        btn.textContent = label();
      };
      col.appendChild(btn);
      this.preview.start();
    }
    return col;
  }

  private buildGrid(slots: Slots, cols: number, cls: string, limit = slots.length): HTMLDivElement {
    const grid = document.createElement('div');
    grid.className = `inv-grid ${cls}`;
    grid.style.gridTemplateColumns = `repeat(${cols}, 44px)`;
    for (let i = 0; i < Math.min(slots.length, limit); i++) grid.appendChild(this.makeSlot(slots, i));
    return grid;
  }

  private makeSlot(slots: Slots, i: number, fits?: (id: number) => boolean): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'slotbox';
    const ref = { el, slots, i };
    // 点过哪格白框就停哪格：手机没有键盘选格，「分 1 个」按钮靠白框知道目标
    const markSel = () => {
      const idx = this.selRefs().indexOf(ref);
      if (idx >= 0) this.sel = idx;
    };
    bindSlot(el, () => {
      markSel();
      this.inv.click(slots, i, STACK_MAX, fits);
      this.refresh();
    }, () => {
      markSel();
      this.inv.clickOne(slots, i, STACK_MAX, fits);
      this.refresh();
    });
    this.slotRefs.push(ref);
    return el;
  }

  /** 当前用的合成格：普通背包 2×2 / 工作台 3×3 */
  private craftGrid(): Slots {
    return this.bigMode ? this.inv.craftBig : this.inv.craftIn;
  }

  /** 合成结果格：能合成/拆解就显示产物，点一下拿走 */
  private makeResultSlot(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'slotbox result';
    this.resultBadge = document.createElement('div');
    this.resultBadge.className = 'uncraft-badge';
    el.appendChild(this.resultBadge);
    const takeResult = () => {
      const m = this.currentMatch();
      if (m) {
        this.inv.craft(m, this.craftGrid());
        this.refresh();
      }
    };
    bindSlot(el, takeResult, takeResult); // 右键/长按点结果格也是合成
    return el;
  }

  private currentMatch(): CraftMatch | null {
    const counts = new Map<number, number>();
    this.craftGrid().forEach((s) => {
      if (s) counts.set(s.id, (counts.get(s.id) ?? 0) + s.count);
    });
    if (counts.size === 0) return null;
    if (this.craftGrid().some((s) => s && s.id in LIQUID_FILL) && this.craftGrid().filter(Boolean).length !== 1) return null;
    return matchCraft(counts, this.craftGrid(), this.benchMode === 'food' ? 'food' : 'none');
  }

  open(): void {
    this.bigMode = false;
    this.benchMode = 'none';
    this.buildContent();
    this.visible = true;
    this.sel = 0;
    this.el.style.display = 'flex';
    this.refresh();
  }

  /** 对着工作台按 M：打开 3×3 大合成台 */
  openTable(): void {
    this.bigMode = true;
    this.benchMode = 'table';
    this.buildContent();
    this.visible = true;
    this.sel = 0;
    this.el.style.display = 'flex';
    this.refresh();
  }

  /** 对着美食工作台按 M：打开 3×3 美食台（只认 bench:'food' 的配方） */
  openFoodTable(): void {
    this.bigMode = true;
    this.benchMode = 'food';
    this.buildContent();
    this.visible = true;
    this.sel = 0;
    this.el.style.display = 'flex';
    this.refresh();
  }

  close(): void {
    this.visible = false;
    this.preview.stop();
    this.inv.returnHeld();
    this.el.style.display = 'none';
    this.heldEl.style.display = 'none';
  }

  /** 键盘能选的格子：储物 27 + 快捷栏 9，按画面顺序连成一条 */
  private selRefs(): { el: HTMLDivElement; slots: Slots; i: number }[] {
    return this.slotRefs.filter((r) => r.slots === this.inv.storage || r.slots === this.inv.hotbar);
  }

  /** 4/6 移动选中框，到头绕回另一头 */
  /** 面板开着时的键盘操作（9 / ESC 关门由 PanelStack 统一处理） */
  handleKeys(controller: Controller, tryMagic: (s: { id: number; count: number } | null) => boolean): void {
    if (controller.take('prevSlot')) this.moveSel(-1);
    if (controller.take('nextSlot')) this.moveSel(1);
    if (controller.take('split')) this.splitSel();
    // 背包里也能用隐藏配方：白框停在 64 生肉上按 M 照样变铁粒
    if (controller.take('door') && tryMagic(this.selStack())) this.refresh();
  }

  moveSel(dir: number): void {
    const n = this.inv.storage.length + this.inv.hotbar.length;
    this.sel = (this.sel + dir + n) % n;
    this.refresh();
  }

  /** 键盘白框现在指着的那摞（储物栏/快捷栏），空格返回 null */
  selStack(): { id: number; count: number } | null {
    const r = this.selRefs()[this.sel];
    return r ? r.slots[r.i] : null;
  }

  /** 手机「分 1 个」按钮：手上捏着 → 优先放回白框那格，不行就找第一个能放的格子；空手 → 白框那摞分 1 个（同键盘 K） */
  splitBtn(): void {
    const h = this.inv.held;
    if (!h) return this.splitSel();
    if (h.id in LIQUID_FILL) return; // 液体容器整个走，不拆
    const refs = this.selRefs();
    const order = [refs[this.sel], ...refs.filter((r) => r !== refs[this.sel])];
    for (const r of order) {
      const t = r.slots[r.i];
      if (t && (t.id !== h.id || t.count >= stackMaxFor(h.id))) continue;
      if (t) t.count++;
      else r.slots[r.i] = { ...h, count: 1 };
      h.count--;
      if (h.count <= 0) this.inv.held = null;
      this.refresh();
      return;
    }
  }

  /** K：从选中这摞分 1 个出去 —— 先试右边，再左边，都不行就找背包里第一个能放的格子 */
  splitSel(): void {
    const refs = this.selRefs();
    const from = refs[this.sel];
    const s = from.slots[from.i];
    if (!s || s.id in LIQUID_FILL) return;
    // 格子能接 = 空的，或者是同类且没堆满
    const canTake = (slots: Slots, j: number) => {
      const t = slots[j];
      return !t || (t.id === s.id && t.count < stackMaxFor(s.id));
    };
    const put = (slots: Slots, j: number): boolean => {
      if (!canTake(slots, j)) return false;
      const t = slots[j];
      if (t) t.count++;
      else slots[j] = { ...s, count: 1 };
      s.count--;
      if (s.count <= 0) from.slots[from.i] = null;
      this.refresh();
      return true;
    };
    // 旁边 = 同一行的右一格、左一格（行尾不算有右边）
    if (from.i % 9 !== 8 && put(from.slots, from.i + 1)) return;
    if (from.i % 9 !== 0 && put(from.slots, from.i - 1)) return;
    // 旁边都占了 → 整个背包从头找第一个能放的格子（跳过自己这格）
    for (const r of refs) {
      if (r !== from && put(r.slots, r.i)) return;
    }
  }

  /** 把所有格子的图标和数量刷新一遍，顺便画上键盘选中框（创造模式不画数量） */
  refresh(): void {
    const hide = this.inv.infinite;
    this.slotRefs.forEach(({ el, slots, i }) => renderStack(el, slots[i], this.atlas, hide));
    this.selRefs().forEach((r, idx) => r.el.classList.toggle('sel', idx === this.sel));
    if (this.resultEl) {
      const m = this.currentMatch();
      // 拆解显示第一个产物 + ↩ 角标；合成显示成品
      renderStack(this.resultEl, m ? { id: m.gives[0][0], count: m.uncraft ? 0 : m.gives[0][1] } : null, this.atlas, hide);
      this.resultBadge!.textContent = m?.uncraft ? '↩' : '';
    }
    if (this.inv.held) {
      renderStack(this.heldEl, this.inv.held, this.atlas, hide);
      this.heldEl.style.display = 'block';
    } else {
      this.heldEl.style.display = 'none';
    }
  }
}
