/** 大厅队首选择面板（HallMenu） — 排到队首时弹出：可选「随机去陌生岛屿（消耗 2 铁锭）」或「去好友的岛」，注册进 PanelStack */

import { HALL } from '../config';

export interface HallMenuCallbacks {
  /** 点击「随机去陌生岛屿」 */
  onRandom(): void;
  /** 点击「去好友的岛」 */
  onFriend(): void;
  /** 用户主动关闭面板（未发起匹配时通知服务端让出队首） */
  onCancel?(): void;
}

export class HallMenu {
  private el: HTMLDivElement;
  private subEl: HTMLParagraphElement;
  private queueEl: HTMLElement;
  private acted = false;
  visible = false;

  constructor(private cb: HallMenuCallbacks) {
    let queueEl = document.getElementById('hall-queue');
    if (!queueEl) {
      queueEl = document.createElement('div');
      queueEl.id = 'hall-queue';
      Object.assign(queueEl.style, {
        position: 'absolute', top: '34px', left: '14px', fontSize: '14px',
        color: '#ffd54a', textShadow: '1px 1px 2px var(--hud-shadow)', display: 'none',
      });
      (document.getElementById('hud') ?? document.body).appendChild(queueEl);
    }
    this.queueEl = queueEl;

    this.el = document.createElement('div');
    this.el.className = 'inv-overlay';
    this.el.style.display = 'none';
    this.el.addEventListener('mousedown', (e) => { if (e.target === this.el) this.close(); });

    const win = document.createElement('div');
    win.className = 'inv-window';
    Object.assign(win.style, { minWidth: '320px', alignItems: 'center', padding: '20px 24px' });
    this.el.appendChild(win);

    const title = document.createElement('p');
    title.className = 'inv-sub';
    Object.assign(title.style, { fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' });
    title.textContent = '轮到你啦！（队首）';
    win.appendChild(title);

    this.subEl = document.createElement('p');
    this.subEl.className = 'inv-sub';
    Object.assign(this.subEl.style, { color: '#555', marginBottom: '10px' });
    this.subEl.textContent = '请选择你要前往的目的地：';
    win.appendChild(this.subEl);

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

    win.appendChild(makeBtn(`随机去陌生岛屿（消耗 ${HALL.RANDOM_IRON_COST} 铁锭）`, '#4a7c3a', () => {
      this.acted = true; this.close(); this.cb.onRandom();
    }));
    win.appendChild(makeBtn('去好友的岛', '#546e7a', () => this.cb.onFriend()));
    win.appendChild(makeBtn('暂不出发（关闭）', '#757575', () => this.close()));

    const hint = document.createElement('div');
    hint.className = 'inv-hint';
    hint.textContent = '按 9 / ESC 或点空白处关闭';
    win.appendChild(hint);
    document.body.appendChild(this.el);
  }

  open(): void {
    this.acted = false;
    this.visible = true;
    this.el.style.display = 'flex';
  }

  close(): void {
    if (!this.visible) return;
    const wasActed = this.acted;
    this.visible = false;
    this.el.style.display = 'none';
    if (!wasActed) {
      this.cb.onCancel?.();
    }
  }

  /** 更新大厅排队 HUD 提示（离开大厅时隐藏） */
  setQueueState(inHall: boolean, queue: string[], pos: number): void {
    if (!inHall) {
      this.queueEl.style.display = 'none';
      return;
    }
    this.queueEl.style.display = 'block';
    const names = queue.length > 0 ? queue.join(' → ') : '暂无';
    if (pos === 1) {
      this.queueEl.textContent = `队列：你排第 1 位（队首） [${names}]`;
    } else if (pos > 1) {
      this.queueEl.textContent = `队列：你排第 ${pos} 位（排队中） [${names}]`;
    } else {
      this.queueEl.textContent = `队列：未入队 [${names}]`;
    }
  }
}
