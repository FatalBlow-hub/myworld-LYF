/** 岛主访客审批与权限面板（VisitMenu） — 包含两个界面：①收到访岛申请的提醒（同意/拒绝）②同意后的访客挖掘权限设置（三选一 + 水果例外 + 确认），分别注册进 PanelStack */

import { VisitPerm, VisitPermMode } from '../config';

export interface VisitMenuCallbacks {
  /** 岛主最终决定：accept=false 为拒绝，accept=true 时附带配置好的挖掘权限 */
  onReply(visitorName: string, accept: boolean, perm?: VisitPerm): void;
}

export class VisitMenu {
  private reqEl: HTMLDivElement;
  private reqSubEl: HTMLParagraphElement;
  private permEl: HTMLDivElement;
  private permSubEl: HTMLParagraphElement;
  private fruitLabelEl: HTMLLabelElement;
  private fruitCheckEl: HTMLInputElement;
  private fruitDescEl: HTMLSpanElement;
  private modeRadios: Record<VisitPermMode, HTMLInputElement>;
  private visitor = '';
  private selectedMode: VisitPermMode = 'list';
  private reqHandled = false;
  private permHandled = false;

  requestVisible = false;
  permVisible = false;

  constructor(private cb: VisitMenuCallbacks) {
    const makeBtn = (label: string, bg: string, onClick: () => void): HTMLButtonElement => {
      const btn = document.createElement('button');
      btn.textContent = label;
      Object.assign(btn.style, {
        width: '100%', fontSize: '16px', padding: '10px 18px', cursor: 'pointer',
        color: '#fff', background: bg, border: '2px solid rgba(0,0,0,0.35)', borderRadius: '6px', fontFamily: 'inherit',
      });
      btn.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); onClick(); });
      return btn;
    };

    // ① 收到访岛申请提醒面板
    this.reqEl = document.createElement('div');
    this.reqEl.className = 'inv-overlay';
    this.reqEl.style.display = 'none';
    this.reqEl.addEventListener('mousedown', (e) => { if (e.target === this.reqEl) this.closeRequest(); });

    const reqWin = document.createElement('div');
    reqWin.className = 'inv-window';
    Object.assign(reqWin.style, { minWidth: '320px', alignItems: 'center', padding: '20px 24px', gap: '8px' });
    this.reqEl.appendChild(reqWin);

    const reqTitle = document.createElement('p');
    reqTitle.className = 'inv-sub';
    Object.assign(reqTitle.style, { fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' });
    reqTitle.textContent = '好友上岛申请';
    reqWin.appendChild(reqTitle);

    this.reqSubEl = document.createElement('p');
    this.reqSubEl.className = 'inv-sub';
    Object.assign(this.reqSubEl.style, { color: '#333', marginBottom: '8px', textAlign: 'center' });
    reqWin.appendChild(this.reqSubEl);

    reqWin.appendChild(makeBtn('同意（进入权限设置）', '#4a7c3a', () => {
      this.reqHandled = true;
      const v = this.visitor;
      this.closeRequest();
      this.openPerm(v);
    }));
    reqWin.appendChild(makeBtn('拒绝', '#b03a2e', () => this.closeRequest()));
    document.body.appendChild(this.reqEl);

    // ② 同意后的挖掘权限设置面板
    this.permEl = document.createElement('div');
    this.permEl.className = 'inv-overlay';
    this.permEl.style.display = 'none';
    this.permEl.addEventListener('mousedown', (e) => { if (e.target === this.permEl) this.closePerm(); });

    const permWin = document.createElement('div');
    permWin.className = 'inv-window';
    Object.assign(permWin.style, { minWidth: '340px', alignItems: 'stretch', padding: '20px 24px', gap: '10px' });
    this.permEl.appendChild(permWin);

    const permTitle = document.createElement('p');
    permTitle.className = 'inv-sub';
    Object.assign(permTitle.style, { fontSize: '18px', fontWeight: 'bold', textAlign: 'center', marginBottom: '2px' });
    permTitle.textContent = '设置访客挖掘权限';
    permWin.appendChild(permTitle);

    this.permSubEl = document.createElement('p');
    this.permSubEl.className = 'inv-sub';
    Object.assign(this.permSubEl.style, { color: '#555', textAlign: 'center', marginBottom: '4px' });
    permWin.appendChild(this.permSubEl);

    const modes: { mode: VisitPermMode; text: string }[] = [
      { mode: 'none', text: '什么都不能挖（none）' },
      { mode: 'all', text: '全部都能挖（all）' },
      { mode: 'list', text: '只能挖指定清单（树叶/南瓜/西瓜/小麦/胡萝卜/本岛水果）' },
    ];
    const radioMap = {} as Record<VisitPermMode, HTMLInputElement>;
    for (const item of modes) {
      const lbl = document.createElement('label');
      Object.assign(lbl.style, { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#222', cursor: 'pointer' });
      const r = document.createElement('input');
      r.type = 'radio'; r.name = 'visit-perm-mode'; r.value = item.mode;
      r.addEventListener('change', () => { if (r.checked) { this.selectedMode = item.mode; this.syncFruitState(); } });
      radioMap[item.mode] = r;
      const span = document.createElement('span');
      span.textContent = item.text;
      lbl.appendChild(r); lbl.appendChild(span);
      permWin.appendChild(lbl);
    }
    this.modeRadios = radioMap;

    this.fruitLabelEl = document.createElement('label');
    Object.assign(this.fruitLabelEl.style, {
      display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#222',
      cursor: 'pointer', padding: '6px 8px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px',
    });
    this.fruitCheckEl = document.createElement('input');
    this.fruitCheckEl.type = 'checkbox';
    this.fruitCheckEl.addEventListener('change', () => this.syncFruitState());
    this.fruitDescEl = document.createElement('span');
    this.fruitLabelEl.appendChild(this.fruitCheckEl);
    this.fruitLabelEl.appendChild(this.fruitDescEl);
    permWin.appendChild(this.fruitLabelEl);

    permWin.appendChild(makeBtn('确认放行', '#4a7c3a', () => {
      this.permHandled = true;
      const perm: VisitPerm = { mode: this.selectedMode, fruitException: this.fruitCheckEl.checked };
      const v = this.visitor;
      this.closePerm();
      this.cb.onReply(v, true, perm);
    }));
    permWin.appendChild(makeBtn('取消（拒绝）', '#757575', () => this.closePerm()));
    document.body.appendChild(this.permEl);
  }

  private syncFruitState(): void {
    const isList = this.selectedMode === 'list';
    this.fruitCheckEl.disabled = isList;
    this.fruitLabelEl.style.opacity = isList ? '0.5' : '1';
    if (isList) {
      this.fruitDescEl.textContent = '水果例外开关（指定清单模式下不生效）';
    } else if (this.selectedMode === 'none') {
      this.fruitDescEl.textContent = '水果例外开关（开启后：只有水果不能挖）';
    } else {
      this.fruitDescEl.textContent = '水果例外开关（开启后：只有水果能挖）';
    }
  }

  openRequest(fromName: string): void {
    if (this.requestVisible || this.permVisible) {
      if (this.visitor && this.visitor !== fromName) this.cb.onReply(this.visitor, false);
      this.permVisible = false; this.permEl.style.display = 'none';
    }
    this.visitor = fromName;
    this.reqHandled = false;
    this.reqSubEl.textContent = `玩家「${fromName}」想要访问你的岛屿，是否同意？`;
    this.requestVisible = true;
    this.reqEl.style.display = 'flex';
  }

  closeRequest(): void {
    if (!this.requestVisible) return;
    this.requestVisible = false;
    this.reqEl.style.display = 'none';
    if (!this.reqHandled && this.visitor) {
      this.cb.onReply(this.visitor, false);
    }
  }

  openPerm(fromName: string): void {
    this.visitor = fromName;
    this.permHandled = false;
    this.selectedMode = 'list';
    this.modeRadios.list.checked = true;
    this.fruitCheckEl.checked = false;
    this.permSubEl.textContent = `为访客「${fromName}」配置本岛挖掘权限：`;
    this.syncFruitState();
    this.permVisible = true;
    this.permEl.style.display = 'flex';
  }

  closePerm(): void {
    if (!this.permVisible) return;
    this.permVisible = false;
    this.permEl.style.display = 'none';
    if (!this.permHandled && this.visitor) {
      this.cb.onReply(this.visitor, false);
    }
  }
}
