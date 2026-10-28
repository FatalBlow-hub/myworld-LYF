/** 访岛聊天 — 按 0 /「聊」打开输入框：左下角挂着最近几条聊天记录，回车或点「发」发出去 */

const MAX_LOG = 6;      // 面板上最多留几条消息
const MAX_LEN = 60;     // 单条消息最长（服务器那边也会再截一次）

export interface ChatPanelDeps {
  /** 对面玩家的名字（标题显示"和 XX 聊天"） */
  peerName: () => string | null;
  /** 发送：返回 true 表示发出去了（会把消息也挂进本地记录） */
  onSend: (text: string) => boolean;
}

export class ChatPanel {
  private el: HTMLDivElement;
  private logEl: HTMLDivElement;
  private inputRowEl: HTMLDivElement;
  private input: HTMLInputElement;
  visible = false;

  constructor(private d: ChatPanelDeps) {
    // 整个面板贴左下角：常驻只露最近几条消息，打开时才露出输入框
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed', left: '10px', bottom: '10px', zIndex: '30',
      display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '60vw',
      pointerEvents: 'none', // 平时不挡操作；输入框那行单独开回 pointerEvents
      fontFamily: 'inherit',
    });

    this.logEl = document.createElement('div');
    Object.assign(this.logEl.style, {
      display: 'flex', flexDirection: 'column', gap: '2px',
      fontSize: '13px', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)',
    });
    this.el.appendChild(this.logEl);

    this.inputRowEl = document.createElement('div');
    Object.assign(this.inputRowEl.style, { display: 'none', gap: '6px', pointerEvents: 'auto' });
    this.input = document.createElement('input');
    this.input.maxLength = MAX_LEN;
    this.input.placeholder = '说点什么…';
    Object.assign(this.input.style, {
      flex: '1', minWidth: '160px', fontSize: '14px', padding: '6px 8px',
      borderRadius: '6px', border: '2px solid rgba(0,0,0,0.35)', fontFamily: 'inherit',
    });
    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') this.send();
      if (e.key === 'Escape') this.close();
    });
    const sendBtn = document.createElement('button');
    sendBtn.textContent = '发';
    Object.assign(sendBtn.style, {
      fontSize: '14px', padding: '6px 14px', cursor: 'pointer', color: '#fff',
      background: '#4a7c3a', border: '2px solid rgba(0,0,0,0.35)', borderRadius: '6px', fontFamily: 'inherit',
    });
    sendBtn.addEventListener('click', () => this.send());
    this.inputRowEl.appendChild(this.input);
    this.inputRowEl.appendChild(sendBtn);
    this.el.appendChild(this.inputRowEl);
    document.body.appendChild(this.el);
  }

  /** 打开输入框（同时把对面名字塞进占位提示） */
  open(): void {
    this.visible = true;
    this.input.placeholder = `对 ${this.d.peerName() ?? '对方'} 说…`;
    this.inputRowEl.style.display = 'flex';
    this.input.focus();
  }

  close(): void {
    this.visible = false;
    this.inputRowEl.style.display = 'none';
    this.input.blur();
  }

  /** 往记录里加一条消息（自己发的和收到的都走这）；超长截断防刷屏 */
  push(name: string, text: string): void {
    const line = document.createElement('div');
    line.textContent = `${name}: ${text}`;
    line.style.background = 'rgba(0,0,0,0.45)';
    line.style.padding = '2px 8px';
    line.style.borderRadius = '4px';
    this.logEl.appendChild(line);
    while (this.logEl.children.length > MAX_LOG) this.logEl.firstChild?.remove();
  }

  private send(): void {
    const text = this.input.value.trim().slice(0, MAX_LEN);
    if (!text) { this.close(); return; }
    if (this.d.onSend(text)) this.push('我', text);
    this.input.value = '';
    this.input.focus(); // 连着聊：发完不关门，Esc 或点空白才收
  }
}
