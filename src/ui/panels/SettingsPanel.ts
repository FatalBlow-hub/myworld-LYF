/** 设置面板 — 电脑按 B、手机点「设」打开。
 *  现在管三件事：① 得到 DIY 手册怎么提示（大卡片带秒数 / 一行字 / 不提示）
 *               ② 游戏提示语显不显示
 *               ③ 自定义按键（只有电脑有这区；改键存账号，换电脑也在）
 *  设置存 localStorage + 服务器（Settings.ts），换存档不换机器就不用重设 */

import { Action } from '../../config';
import { GameSettings, ManualNotify, getSettings, setSettings } from '../account/Settings';
import {
  ACTION_LABEL, bindKey, bindingLabel, getKeymap, isLocked, keyLabel, resetKeys, unbindKey,
} from '../account/Keymap';
import { isMobile } from '../touch/Platform';

/** 按键分组：平铺时按用途分开摆，方向/手上动作/功能各一块 */
const KEY_GROUPS: { name: string; actions: Action[] }[] = [
  {
    name: '🚶 方向控制',
    actions: ['forward', 'back', 'strafeLeft', 'strafeRight', 'turnLeft', 'turnRight', 'lookUp', 'lookDown', 'jump', 'descend'],
  },
  {
    name: '✋ 手上动作',
    actions: ['mine', 'place', 'door', 'eat', 'split', 'prevSlot', 'nextSlot', 'inventory'],
  },
  {
    name: '⚙️ 功能控制',
    actions: ['save', 'respawn', 'book', 'settings', 'pause', 'quit', 'hall', 'board', 'mail', 'give', 'chat', 'toggleHunger', 'toggleZombieSpawn'],
  },
];

export class SettingsPanel {
  readonly el: HTMLDivElement;
  private secondsLabel!: HTMLSpanElement;
  private slider!: HTMLInputElement;
  /** 按键区：各组的格子容器 + 提示文字（撞键/禁用键的反馈写这） + 正在等新键的那一格 */
  private keyGrids: { actions: Action[]; grid: HTMLElement }[] = [];
  private keyMsg: HTMLElement | null = null;
  private capturing: { a: Action; slot: 0 | 1; btn: HTMLButtonElement } | null = null;

  constructor() {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed', inset: '0', display: 'none', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.45)', zIndex: '60',
    } as Partial<CSSStyleDeclaration>);

    // 电脑版宽卡片（按键要平铺开）；手机照旧竖排窄卡片
    const wide = !isMobile();
    const card = document.createElement('div');
    Object.assign(card.style, {
      width: wide ? 'min(96vw, 880px)' : 'min(92vw, 420px)',
      display: 'flex', flexDirection: 'column', gap: '12px',
      padding: '16px', borderRadius: '14px', background: 'var(--panel-bg, #23283a)', color: 'var(--text, #f2f4f8)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.45)', fontFamily: 'inherit', fontSize: '14px',
      maxHeight: '88vh', overflowY: 'auto',
    } as Partial<CSSStyleDeclaration>);

    const title = document.createElement('div');
    Object.assign(title.style, { fontSize: '17px', fontWeight: '700' });
    title.textContent = '⚙️ 设置';

    // —— 手册提示方式：三个单选 ——
    const manualTitle = document.createElement('div');
    manualTitle.textContent = '得到 DIY 手册时：';
    const opts: { v: ManualNotify; label: string }[] = [
      { v: 'paper', label: '弹大卡片' },
      { v: 'text', label: '只显示一行字' },
      { v: 'off', label: '完全不显示' },
    ];
    const radioRow = document.createElement('div');
    // 宽卡片里选项横着排，给下面的按键区省高度；手机窄卡片照旧竖排
    Object.assign(radioRow.style, {
      display: 'flex', flexDirection: wide ? 'row' : 'column', flexWrap: 'wrap', gap: '6px 18px',
    });
    const radios: HTMLInputElement[] = [];
    for (const o of opts) {
      const lab = document.createElement('label');
      Object.assign(lab.style, { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' });
      const r = document.createElement('input');
      r.type = 'radio'; r.name = 'manualNotify'; r.value = o.v;
      r.addEventListener('change', () => { if (r.checked) this.apply({ manual: o.v }); });
      radios.push(r);
      lab.append(r, document.createTextNode(o.label));
      radioRow.appendChild(lab);
      if (o.v === 'paper') {
        // 大卡片底下跟一条拖动条：停几秒，1~15 秒，一格一秒
        const row = document.createElement('div');
        Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '14px' });
        this.slider = document.createElement('input');
        this.slider.type = 'range'; this.slider.min = '1'; this.slider.max = '15'; this.slider.step = '1';
        Object.assign(this.slider.style, { flex: '1', accentColor: '#8ec07c' });
        this.secondsLabel = document.createElement('span');
        this.slider.addEventListener('input', () => {
          this.secondsLabel.textContent = `停 ${this.slider.value} 秒`;
        });
        this.slider.addEventListener('change', () => {
          this.apply({ paperSeconds: Number(this.slider.value) });
        });
        row.append(this.slider, this.secondsLabel);
        radioRow.appendChild(row);
      }
    }

    // —— 提示语开关 ——
    const tipsLab = document.createElement('label');
    Object.assign(tipsLab.style, { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' });
    const tipsBox = document.createElement('input');
    tipsBox.type = 'checkbox';
    tipsBox.addEventListener('change', () => this.apply({ tips: tipsBox.checked }));
    tipsLab.append(tipsBox, document.createTextNode('显示游戏里的提示语（比如"背包满了"）'));

    // —— 自定义按键：只有电脑有键盘 ——
    const keySection = isMobile() ? null : this.buildKeySection();

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关 闭';
    Object.assign(closeBtn.style, {
      alignSelf: 'center', padding: '8px 26px', borderRadius: '8px', border: 'none',
      background: '#8ec07c', color: '#1d2021', fontWeight: '700', cursor: 'pointer', fontSize: '14px',
    } as Partial<CSSStyleDeclaration>);
    closeBtn.addEventListener('click', () => this.close());

    // 偏好单独一行横条（宽卡片里 radioRow 已是横排）；按键区占满整行宽度
    const prefs = document.createElement('div');
    Object.assign(prefs.style, { display: 'flex', flexDirection: 'column', gap: '8px' });
    prefs.append(manualTitle, radioRow, tipsLab);
    card.append(title, prefs);
    if (keySection) card.appendChild(keySection);
    card.appendChild(closeBtn);
    this.el.appendChild(card);
    // 存一下单选按钮，open 时把存着的值回填进界面
    this.radios = radios;
    this.tipsBox = tipsBox;
    // 点遮罩空白处也能关
    this.el.addEventListener('mousedown', (e) => { if (e.target === this.el) this.close(); });
    document.body.appendChild(this.el);
  }

  private radios: HTMLInputElement[];
  private tipsBox: HTMLInputElement;

  get visible(): boolean { return this.el.style.display !== 'none'; }

  /** 每次打开都把最新设置刷进控件（别处改过也不会错位） */
  open(): void {
    const s = getSettings();
    for (const r of this.radios) r.checked = r.value === s.manual;
    this.slider.value = String(s.paperSeconds);
    this.secondsLabel.textContent = `停 ${s.paperSeconds} 秒`;
    this.tipsBox.checked = s.tips;
    this.refreshKeyGrids();
    this.el.style.display = 'flex';
  }

  close(): void {
    this.stopCapture();
    this.el.style.display = 'none';
  }
  toggle(): void { this.visible ? this.close() : this.open(); }

  private apply(patch: Partial<GameSettings>): void {
    setSettings(patch);
  }

  /* ---------------- 自定义按键区 ---------------- */

  private buildKeySection(): HTMLElement {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, { display: 'flex', flexDirection: 'column', gap: '10px' });

    const head = document.createElement('div');
    head.textContent = '按键设置：点一下键位格，再按想换的新键（按 ESC 取消）';
    Object.assign(head.style, { fontSize: '12px', opacity: '0.75' });

    this.keyMsg = document.createElement('div');
    Object.assign(this.keyMsg.style, { fontSize: '12px', color: '#fb4934', minHeight: '14px' });
    wrap.append(head, this.keyMsg);

    // 三组分开平铺：组标题 + 格子阵，横向铺满
    for (const g of KEY_GROUPS) {
      const sec = document.createElement('div');
      Object.assign(sec.style, { display: 'flex', flexDirection: 'column', gap: '6px' });
      const h = document.createElement('div');
      h.textContent = g.name;
      Object.assign(h.style, { fontSize: '13px', fontWeight: '700', opacity: '0.9' });
      const grid = document.createElement('div');
      Object.assign(grid.style, {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))', gap: '6px',
      });
      sec.append(h, grid);
      wrap.appendChild(sec);
      this.keyGrids.push({ actions: g.actions, grid });
    }
    this.refreshKeyGrids();

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '恢复默认按键';
    Object.assign(resetBtn.style, {
      alignSelf: 'flex-start', padding: '4px 12px', borderRadius: '6px', fontSize: '12px',
      border: 'none', background: '#504945', color: '#f2f4f8', cursor: 'pointer',
    } as Partial<CSSStyleDeclaration>);
    resetBtn.addEventListener('click', () => {
      resetKeys();
      this.sayKey('');
      this.refreshKeyGrids();
    });
    wrap.appendChild(resetBtn);
    return wrap;
  }

  /** 按键格子重画：open 时和每回改完都刷一遍 */
  private refreshKeyGrids(): void {
    const map = getKeymap();
    for (const { actions, grid } of this.keyGrids) {
      grid.textContent = '';
      for (const a of actions) grid.appendChild(this.keyTile(a, map[a]));
    }
  }

  /** 一格按键小卡：上面动作名，下面主键/副键格（副键有了才给摘掉的小 ×） */
  private keyTile(a: Action, codes: readonly string[]): HTMLElement {
    const tile = document.createElement('div');
    Object.assign(tile.style, {
      display: 'flex', flexDirection: 'column', gap: '4px',
      padding: '6px 8px', borderRadius: '8px', border: '1px solid #3c3836', background: '#2a2827',
    });
    const name = document.createElement('div');
    name.textContent = ACTION_LABEL[a];
    Object.assign(name.style, { fontSize: '12px', opacity: '0.85' });
    tile.appendChild(name);

    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, { display: 'flex', alignItems: 'center', gap: '4px' });
    if (isLocked(a)) {
      // ESC 解锁鼠标是浏览器定死的，不给换
      const fixed = document.createElement('span');
      fixed.textContent = `${bindingLabel(a)}（定死）`;
      Object.assign(fixed.style, { fontSize: '12px', opacity: '0.6' });
      btnRow.appendChild(fixed);
    } else {
      for (const slot of [0, 1] as const) btnRow.appendChild(this.slotButton(a, slot, codes[slot]));
      if (codes[1]) {
        const del = document.createElement('button');
        del.textContent = '×';
        del.title = '摘掉副键';
        Object.assign(del.style, {
          padding: '0 5px', border: 'none', borderRadius: '4px', fontSize: '12px',
          background: '#504945', color: '#f2f4f8', cursor: 'pointer',
        } as Partial<CSSStyleDeclaration>);
        del.addEventListener('click', () => { unbindKey(a, 1); this.refreshKeyGrids(); });
        btnRow.appendChild(del);
      }
    }
    tile.appendChild(btnRow);
    return tile;
  }

  /** 一格键位按钮：显示了当前键 / 「＋」，点了就等下一个按键 */
  private slotButton(a: Action, slot: 0 | 1, code: string | undefined): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = code ? keyLabel(code) : '＋';
    btn.title = slot === 0 ? '主键' : '副键';
    Object.assign(btn.style, {
      minWidth: '40px', padding: '2px 8px', borderRadius: '6px', fontSize: '12px',
      border: '1px solid #504945', background: '#32302f', color: '#f2f4f8', cursor: 'pointer',
    } as Partial<CSSStyleDeclaration>);
    btn.addEventListener('click', () => this.startCapture(a, slot, btn));
    return btn;
  }

  /** 进入「等新键」状态：capture 阶段拦下，游戏那边的按键监听够不着 */
  private startCapture(a: Action, slot: 0 | 1, btn: HTMLButtonElement): void {
    this.stopCapture();
    this.capturing = { a, slot, btn };
    btn.textContent = '按新键…';
    btn.style.background = '#8ec07c';
    btn.style.color = '#1d2021';
    addEventListener('keydown', this.onCaptureKey, true);
  }

  private stopCapture(): void {
    if (this.capturing) {
      this.capturing.btn.style.background = '#32302f';
      this.capturing.btn.style.color = '#f2f4f8';
      this.capturing = null;
      this.refreshKeyGrids();
    }
    removeEventListener('keydown', this.onCaptureKey, true);
  }

  private onCaptureKey = (e: KeyboardEvent): void => {
    if (!this.capturing) return;
    e.preventDefault();
    e.stopPropagation();
    const { a, slot } = this.capturing;
    this.capturing = null;
    removeEventListener('keydown', this.onCaptureKey, true);
    if (e.code === 'Escape') { this.refreshKeyGrids(); return; } // ESC = 取消，不是改键
    const r = bindKey(a, slot, e.code);
    if (r === 'banned') this.sayKey(`「${keyLabel(e.code)}」浏览器/系统要用，换一个吧`);
    else if (typeof r === 'object') this.sayKey(`「${keyLabel(e.code)}」已经给「${ACTION_LABEL[r.conflict]}」用啦`);
    else this.sayKey('');
    this.refreshKeyGrids();
  };

  private sayKey(msg: string): void {
    if (this.keyMsg) this.keyMsg.textContent = msg;
  }
}
