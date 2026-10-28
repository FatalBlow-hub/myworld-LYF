/** 大厅留言板 / 信箱 — 同一套面板两种模式：
 *  board = 公开评论（谁都能看，登录才能发）；mail = 收到的私信（只有自己能看到）
 *
 *  内容一律用 textContent 插进 DOM，不拼 HTML，别人写什么都不会变成代码。
 */

type Mode = 'board' | 'mail';

const TITLE: Record<Mode, string> = { board: '📝 大厅留言板', mail: '📬 我的信箱' };
const EMPTY: Record<Mode, string> = { board: '还没有人留言，来当第一个吧', mail: '信箱是空的' };
const PLACEHOLDER: Record<Mode, string> = { board: '说点什么吧（最多 80 字）', mail: '写点什么吧（最多 80 字）' };

export class BoardPanel {
  readonly el: HTMLDivElement;
  private mode: Mode = 'board';
  private titleEl: HTMLDivElement;
  private listEl: HTMLDivElement;
  private toEl: HTMLInputElement;
  private inputEl: HTMLInputElement;
  private statusEl: HTMLDivElement;
  private busy = false;

  constructor() {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed', inset: '0', display: 'none', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.45)', zIndex: '60',
    } as Partial<CSSStyleDeclaration>);

    const card = document.createElement('div');
    Object.assign(card.style, {
      width: 'min(92vw, 460px)', maxHeight: '76vh', display: 'flex', flexDirection: 'column', gap: '10px',
      padding: '16px', borderRadius: '14px', background: 'var(--panel-bg, #23283a)', color: 'var(--text, #f2f4f8)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.45)', fontFamily: 'inherit',
    } as Partial<CSSStyleDeclaration>);

    this.titleEl = document.createElement('div');
    Object.assign(this.titleEl.style, { fontSize: '17px', fontWeight: '700' });

    this.listEl = document.createElement('div');
    Object.assign(this.listEl.style, {
      flex: '1', minHeight: '160px', overflowY: 'auto', fontSize: '14px', lineHeight: '1.6',
      background: 'rgba(0,0,0,0.22)', borderRadius: '10px', padding: '10px', whiteSpace: 'pre-wrap',
    } as Partial<CSSStyleDeclaration>);

    this.toEl = document.createElement('input');
    this.toEl.placeholder = '收信人（玩家名字）';
    this.toEl.maxLength = 16;
    Object.assign(this.toEl.style, { display: 'none', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.25)', color: 'inherit' } as Partial<CSSStyleDeclaration>);

    this.inputEl = document.createElement('input');
    this.inputEl.maxLength = 80;
    Object.assign(this.inputEl.style, { padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.25)', color: 'inherit' } as Partial<CSSStyleDeclaration>);
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); void this.send(); }
      e.stopPropagation(); // 别让输入框里的按键跑到游戏快捷键上
    });

    this.statusEl = document.createElement('div');
    Object.assign(this.statusEl.style, { fontSize: '13px', opacity: '0.8', minHeight: '18px' });

    const row = document.createElement('div');
    Object.assign(row.style, { display: 'flex', gap: '8px' } as Partial<CSSStyleDeclaration>);
    const sendBtn = document.createElement('button');
    sendBtn.textContent = '发送';
    Object.assign(sendBtn.style, { padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#3d7bd6', color: '#fff', cursor: 'pointer' } as Partial<CSSStyleDeclaration>);
    sendBtn.onclick = () => void this.send();
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    Object.assign(closeBtn.style, { padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.25)', background: 'transparent', color: 'inherit', cursor: 'pointer' } as Partial<CSSStyleDeclaration>);
    closeBtn.onclick = () => this.close();
    row.appendChild(this.inputEl);
    row.appendChild(sendBtn);
    row.appendChild(closeBtn);

    card.appendChild(this.titleEl);
    card.appendChild(this.listEl);
    card.appendChild(this.toEl);
    card.appendChild(row);
    card.appendChild(this.statusEl);
    this.el.appendChild(card);
    // 点面板外面的黑边也关掉
    this.el.addEventListener('click', (e) => { if (e.target === this.el) this.close(); });
    document.body.appendChild(this.el);
  }

  get visible(): boolean {
    return this.el.style.display !== 'none';
  }

  /** 打开某个模式（board 留言板 / mail 信箱） */
  open(mode: Mode): void {
    this.mode = mode;
    this.el.style.display = 'flex';
    this.titleEl.textContent = TITLE[mode];
    this.listEl.textContent = '正在加载…';
    this.statusEl.textContent = '';
    this.toEl.style.display = mode === 'mail' ? 'block' : 'none';
    this.inputEl.placeholder = PLACEHOLDER[mode];
    this.inputEl.value = '';
    void this.refresh();
  }

  close(): void {
    this.el.style.display = 'none';
    this.busy = false;
  }

  /** 同一个键再按一次就关，按另一个键就切模式 */
  toggle(mode: Mode): void {
    if (this.visible && this.mode === mode) this.close();
    else this.open(mode);
  }

  private status(text: string): void {
    this.statusEl.textContent = text;
  }

  /** 拉列表：没登录就提示去登录，连不上服务器也提示一下 */
  private async refresh(): Promise<void> {
    try {
      const r = await fetch(this.mode === 'board' ? '/api/board' : '/api/mail');
      if (r.status === 401) {
        this.listEl.textContent = '登录之后才能看哦（现在这档是本地存档，没有账号）';
        return;
      }
      const data = await r.json().catch(() => ({}));
      const items: { name?: string; from?: string; content: string; at: number }[] =
        this.mode === 'board' ? (data.posts ?? []) : (data.mails ?? []);
      if (!Array.isArray(items) || items.length === 0) {
        this.listEl.textContent = EMPTY[this.mode];
        return;
      }
      this.listEl.textContent = '';
      for (const it of items) {
        const line = document.createElement('div');
        Object.assign(line.style, { marginBottom: '6px' } as Partial<CSSStyleDeclaration>);
        const who = this.mode === 'board' ? (it.name ?? '?') : `${it.from ?? '?'} → 我`;
        const when = new Date((it.at ?? 0) * 1000);
        const stamp = `${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')} ${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
        const head = document.createElement('span');
        head.textContent = `${who} ${stamp}`;
        Object.assign(head.style, { opacity: '0.65', fontSize: '12px', marginRight: '6px' } as Partial<CSSStyleDeclaration>);
        const body = document.createElement('span');
        body.textContent = it.content;
        line.appendChild(head);
        line.appendChild(body);
        this.listEl.appendChild(line);
      }
    } catch {
      this.listEl.textContent = '连不上服务器，等会儿再试试';
    }
  }

  private async send(): Promise<void> {
    if (this.busy) return;
    const content = this.inputEl.value.trim();
    if (!content) { this.status('先说点什么吧'); return; }
    if (this.mode === 'mail' && !this.toEl.value.trim()) { this.status('要写给谁呀'); return; }
    this.busy = true;
    this.status('发送中…');
    try {
      const body = this.mode === 'board' ? { content } : { to: this.toEl.value.trim(), content };
      const r = await fetch(this.mode === 'board' ? '/api/board' : '/api/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { this.status(data.error ?? '发送失败'); return; }
      this.inputEl.value = '';
      this.status('发出去了！');
      await this.refresh();
    } catch {
      this.status('连不上服务器');
    } finally {
      this.busy = false;
    }
  }
}
