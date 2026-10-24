/** 背包 — 格子制：快捷栏 9 格 + 储物 27 格 + 装备 4 格 + 合成 2×2，鼠标捏着东西搬来搬去 */

import { BLACK_PICK, SKATES, STACK_MAX } from '../config';
import { BLACK_PICKAXE, LIQUID_FILL, ROLLER_SKATES, Slots, Stack, SWORD_OF, WAISTBAG_CAPACITY, WAISTBAG_SLOT, isWaistbag, liquidCapOf } from '../world/Block';

/** 一格最多叠几个：液体容器装的是"格数"（瓶 1 格、桶 3 格）；轮滑鞋/黑色木镐/剑独占一格，耐久另外记录 */
export function stackMaxFor(id: number): number {
  if (id in LIQUID_FILL) return liquidCapOf(LIQUID_FILL[id].bucket);
  if (id === ROLLER_SKATES || id === BLACK_PICKAXE || id in SWORD_OF || isWaistbag(id)) return 1;
  return STACK_MAX;
}
import { CraftMatch } from '../world/Recipes';
import { GameMode } from './Health';

export type { Slots, Stack };

function newStack(id: number, count: number, durability?: number): Stack {
  // 轮滑鞋按摔倒次数记耐久；黑色木镐按挖掉的方块数记耐久（挖满 30 个就没了）；剑按还能砍几刀记
  if (id === ROLLER_SKATES) return { id, count, durability: durability ?? SKATES.MAX_FALLS };
  if (id === BLACK_PICKAXE) return { id, count, durability: durability ?? BLACK_PICK.USES };
  const sword = SWORD_OF[id];
  if (sword) return { id, count, durability: durability ?? sword.uses };
  return { id, count };
}

export class Inventory {
  readonly hotbar: Slots = Array(9).fill(null);   // 快捷栏（手上拿的）
  readonly storage: Slots = Array(27).fill(null); // 储物格 3×9
  readonly armor: Slots = Array(4).fill(null);    // 装备栏：头盔、腰包、护腿、靴子
  readonly waistbag: Slots = Array(10).fill(null); // 腰包最多 10 格，容量由装备的腰包决定
  readonly craftIn: Slots = Array(4).fill(null);  // 合成 2×2（背包面板里那个小的）
  readonly craftBig: Slots = Array(9).fill(null); // 工作台 3×3（对着工作台按 M）
  /** 鼠标上"捏着"的一摞东西 */
  held: Stack | null = null;

  constructor(public mode: GameMode) {}

  get infinite(): boolean {
    return this.mode === 'creative';
  }

  get waistbagCapacity(): number {
    return WAISTBAG_CAPACITY[this.armor[WAISTBAG_SLOT]?.id ?? 0] ?? 0;
  }

  /** 捡东西进包：先往同类的堆上叠，再塞空格；快捷栏优先 */
  add(id: number, n = 1, durability?: number): void {
    n = this.mergeInto(this.hotbar, id, n);
    n = this.mergeInto(this.storage, id, n);
    n = this.fillEmpty(this.hotbar, id, n, durability);
    n = this.fillEmpty(this.storage, id, n, durability);
    if (this.waistbagCapacity && !isWaistbag(id)) {
      n = this.mergeInto(this.waistbag, id, n, this.waistbagCapacity);
      this.fillEmpty(this.waistbag, id, n, durability, this.waistbagCapacity);
    }
  }

  /** 背包还能再装几个这种东西：空格 + 同类没堆满的格子，加起来算 */
  roomFor(id: number): number {
    let room = 0;
    const groups = [this.hotbar, this.storage];
    if (this.waistbagCapacity && !isWaistbag(id)) groups.push(this.waistbag.slice(0, this.waistbagCapacity));
    for (const slots of groups) {
      for (const s of slots) {
        if (!s) room += stackMaxFor(id);
        else if (!(id in LIQUID_FILL) && s.id === id && s.count < stackMaxFor(id)) room += stackMaxFor(id) - s.count;
      }
    }
    return room;
  }

  /** 背包还装得下这么多吗：同类没满的堆 + 空格加起来够不够 */
  hasRoom(id: number, n = 1): boolean {
    return this.roomFor(id) >= n;
  }

  private mergeInto(slots: Slots, id: number, n: number, limit = slots.length): number {
    if (id in LIQUID_FILL || isWaistbag(id)) return n;
    for (let i = 0; i < limit && n > 0; i++) {
      const s = slots[i];
      if (s && s.id === id && s.count < stackMaxFor(id)) {
        const move = Math.min(stackMaxFor(id) - s.count, n);
        s.count += move;
        n -= move;
      }
    }
    return n;
  }

  private fillEmpty(slots: Slots, id: number, n: number, durability?: number, limit = slots.length): number {
    for (let i = 0; i < limit && n > 0; i++) {
      if (!slots[i]) {
        const move = Math.min(stackMaxFor(id), n);
        slots[i] = newStack(id, move, durability);
        n -= move;
      }
    }
    return n;
  }

  /** 鼠标左键点格子：空手→拿起整摞；捏着→放下/同类合并/不同交换；max 是这格最多放几个；fits 限制这格只收什么 */
  click(slots: Slots, i: number, max = STACK_MAX, fits?: (id: number) => boolean): void {
    const cur = slots[i];
    const h = this.held;
    if (!h) {
      if (cur) {
        slots[i] = null;
        this.held = cur;
      }
      return;
    }
    if (fits && !fits(h.id)) return; // 这格只收指定的东西（比如靴子格只收轮滑鞋）
    const filled = h.id in LIQUID_FILL;
    if (filled && h.count > max) return;
    if (filled && cur?.id === h.id) {
      slots[i] = h; this.held = cur;
      return;
    }
    const lim = (id: number) => Math.min(max, stackMaxFor(id));
    if (!cur) {
      const move = Math.min(lim(h.id), h.count);
      slots[i] = { ...h, count: move };
      h.count -= move;
      if (h.count <= 0) this.held = null;
      return;
    }
    if (cur.id === h.id) {
      const move = Math.min(lim(cur.id) - cur.count, h.count);
      cur.count += move;
      h.count -= move;
      if (h.count <= 0) this.held = null;
      return;
    }
    // 不同类：交换；格子装不下整摞时，装不下的先塞回背包
    const keep = Math.min(lim(h.id), h.count);
    if (h.count > keep) this.add(h.id, h.count - keep);
    slots[i] = { ...h, count: keep };
    this.held = cur;
  }

  /** 右键/长按：手上捏着 → 只放 1 个进格子；空手 → 拿起半摞（凑配方数量用） */
  clickOne(slots: Slots, i: number, max = STACK_MAX, fits?: (id: number) => boolean): void {
    const cur = slots[i];
    const h = this.held;
    if (!h) {
      if (!cur) return;
      if (cur.count <= 1 || cur.id in LIQUID_FILL) {
        slots[i] = null;
        this.held = cur;
        return;
      }
      const half = Math.ceil(cur.count / 2);
      this.held = { ...cur, count: half };
      cur.count -= half;
      return;
    }
    // 液体容器的 count 是液位不是数量，不能拆，按整个处理
    if (h.id in LIQUID_FILL) { this.click(slots, i, max, fits); return; }
    if (fits && !fits(h.id)) return;
    if (!cur) {
      slots[i] = { ...h, count: 1 };
      h.count--;
    } else if (cur.id === h.id && cur.count < Math.min(max, stackMaxFor(h.id))) {
      cur.count++;
      h.count--;
    } else {
      return; // 格子是别的东西或满了：右键不交换，免得误操作
    }
    if (h.count <= 0) this.held = null;
  }

  /** 点合成结果：材料从合成格里扣掉（背包 2×2 或工作台 3×3），产物到鼠标上；拆解的产物直接进背包 */
  craft(match: CraftMatch, from: Slots): boolean {
    if (match.consume.some(([id, n]) => n <= 0 || from.reduce((sum, s) => sum + (s?.id === id ? s.count : 0), 0) < n)) return false;
    if (from.some((s) => s && s.id in LIQUID_FILL) && from.filter(Boolean).length !== 1) return false;
    if (match.uncraft) {
      const check = new Inventory(this.mode);
      for (const key of ['hotbar', 'storage'] as const) {
        this[key].forEach((s, i) => { check[key][i] = s ? { ...s } : null; });
        if (from === this[key]) for (const [id, n] of match.consume) check.removeFrom(check[key], id, n);
      }
      for (const [id, n] of match.gives) {
        if (!check.hasRoom(id, n)) return false;
        check.add(id, n);
      }
      for (const [id, n] of match.consume) this.removeFrom(from, id, n);
      for (const [id, n] of match.gives) this.add(id, n);
      return true;
    }
    const out = match.gives[0];
    if (this.held && (this.held.id !== out[0] || this.held.count + out[1] > stackMaxFor(out[0]))) {
      return false; // 手上捏着别的东西，没法拿成品
    }
    for (const [id, n] of match.consume) this.removeFrom(from, id, n);
    this.held = this.held
      ? { ...this.held, count: this.held.count + out[1] }
      : newStack(out[0], out[1]);
    return true;
  }

  /** 从一组格子里扣掉 n 个某种东西（合成/拆解用） */
  removeFrom(slots: Slots, id: number, n: number): void {
    for (let i = 0; i < slots.length && n > 0; i++) {
      const s = slots[i];
      if (s && s.id === id) {
        const take = Math.min(s.count, n);
        s.count -= take;
        n -= take;
        if (s.count <= 0) slots[i] = null;
      }
    }
  }

  /** 背包里某种东西一共有几个（快捷栏、储物区和已装备腰包） */
  countOf(id: number): number {
    let n = 0;
    const bag = this.waistbagCapacity ? this.waistbag.slice(0, this.waistbagCapacity) : [];
    for (const s of [...this.hotbar, ...this.storage, ...bag]) if (s?.id === id) n += s.count;
    return n;
  }

  /** 从背包里扣掉 n 个某种东西（快捷栏优先）；调用前先 countOf 确认够数 */
  take(id: number, n: number): void {
    const groups = [this.hotbar, this.storage];
    if (this.waistbagCapacity) groups.push(this.waistbag);
    for (const slots of groups) {
      const have = Math.min(n, slots.reduce((sum, stack) => sum + (stack?.id === id ? stack.count : 0), 0));
      this.removeFrom(slots, id, have);
      n -= have;
      if (n <= 0) return;
    }
  }

  /** 从背包（快捷栏优先）拿走 1 个列表里任意一种东西，返回拿走的 id；一个都没有返回 null */
  takeAny(ids: number[]): number | null {
    const groups = [this.hotbar, this.storage];
    if (this.waistbagCapacity) groups.push(this.waistbag);
    for (const slots of groups) {
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        if (s && ids.includes(s.id)) {
          const taken = s.id;
          s.count--;
          if (s.count <= 0) slots[i] = null;
          return taken;
        }
      }
    }
    return null;
  }

  /** 关面板时手上还捏着东西 → 塞回包里 */
  returnHeld(): void {
    if (this.held) {
      this.add(this.held.id, this.held.count, this.held.durability);
      this.held = null;
    }
  }
}
