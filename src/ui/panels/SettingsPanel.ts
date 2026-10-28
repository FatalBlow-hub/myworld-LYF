/** 设置面板 — 电脑按 B、手机点「设」打开。
 *  现在管两件事：① 得到 DIY 手册怎么提示（大卡片带秒数 / 一行字 / 不提示）
 *               ② 游戏提示语显不显示
 *  设置存 localStorage（Settings.ts），换存档不换机器就不用重设 */

import { GameSettings, ManualNotify, getSettings, setSettings } from '../account/Settings';

export class SettingsPanel {
  readonly el: HTMLDivElement;
  private secondsLabel!: HTMLSpanElement;
  private slider!: HTMLInputElement;

  constructor() {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed', inset: '0', display: 'none', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.45)', zIndex: '60',
    } as Partial<CSSStyleDeclaration>);

    const card = document.createElement('div');
    Object.assign(card.style, {
      width: 'min(92vw, 420px)', display: 'flex', flexDirection: 'column', gap: '12px',
      padding: '16px', borderRadius: '14px', background: 'var(--panel-bg, #23283a)', color: 'var(--text, #f2f4f8)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.45)', fontFamily: 'inherit', fontSize: '14px',
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
    Object.assign(radioRow.style, { display: 'flex', flexDirection: 'column', gap: '6px' });
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
        Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '24px' });
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

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关 闭';
    Object.assign(closeBtn.style, {
      alignSelf: 'center', padding: '8px 26px', borderRadius: '8px', border: 'none',
      background: '#8ec07c', color: '#1d2021', fontWeight: '700', cursor: 'pointer', fontSize: '14px',
    } as Partial<CSSStyleDeclaration>);
    closeBtn.addEventListener('click', () => this.close());

    card.append(title, manualTitle, radioRow, tipsLab, closeBtn);
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
    this.el.style.display = 'flex';
  }

  close(): void { this.el.style.display = 'none'; }
  toggle(): void { this.visible ? this.close() : this.open(); }

  private apply(patch: Partial<GameSettings>): void {
    setSettings(patch);
  }
}
