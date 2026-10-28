/** CS 联机房间面板 — 建房 / 按房间号加入 / 房主开赛 / 退出
 *
 *  房间里的成员列表由服务端下发（cs.room），谁开赛也由服务端认定（只有房主能开）。 */

import { CS } from '../../config';
import type { CsRoomView } from '../../net/Protocol';

export type CsRoomAction = 'create1' | 'create3' | 'join' | 'start' | 'leave';

export class CsRoomPanel {
  private el: HTMLDivElement;
  private win: HTMLDivElement;
  private myName = '';
  private room: CsRoomView | null = null;
  visible = false;

  constructor(private onAction: (action: CsRoomAction, code: string) => void) {
    this.el = document.createElement('div');
    this.el.className = 'inv-overlay';
    this.el.style.display = 'none';
    this.win = document.createElement('div');
    this.win.className = 'inv-window';
    this.el.appendChild(this.win);
    this.el.addEventListener('mousedown', (e) => { if (e.target === this.el) this.close(); });
    document.body.appendChild(this.el);
  }

  open(myName: string): void {
    this.myName = myName;
    this.render();
    this.visible = true;
    this.el.style.display = 'flex';
  }

  close(): void {
    this.visible = false;
    this.el.style.display = 'none';
  }

  /** 服务端下发房间快照后重画 */
  setRoom(room: CsRoomView | null): void {
    this.room = room;
    if (this.visible) this.render();
  }

  private render(): void {
    this.win.innerHTML = '';
    const room = this.room;

    const title = document.createElement('p');
    title.className = 'inv-sub';
    title.textContent = room
      ? `CS 房间 ${room.code}（${room.mode === '3v3' ? '3V3' : '1V1'}）`
      : `CS 联机对战（开赛每人 ${CS.FEE} 岛币）`;
    this.win.appendChild(title);

    if (!room) {
      // 没进房间：建房两个按钮 + 房间号输入
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;justify-content:center;padding:6px 0;';
      for (const [label, action] of [['建 1V1 房间', 'create1'], ['建 3V3 房间', 'create3']] as const) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.style.cssText = 'padding:6px 10px;font-size:13px;border-radius:6px;border:1px solid #888;'
          + 'background:#2f5f8a;color:#fff;cursor:pointer;';
        btn.addEventListener('click', () => this.onAction(action, ''));
        row.appendChild(btn);
      }
      this.win.appendChild(row);

      const joinRow = document.createElement('div');
      joinRow.style.cssText = 'display:flex;gap:8px;align-items:center;justify-content:center;padding:6px 0;';
      const input = document.createElement('input');
      input.placeholder = '输入房间号';
      input.maxLength = 4;
      input.style.cssText = 'width:110px;padding:6px;font-size:14px;border-radius:6px;border:1px solid #888;';
      joinRow.appendChild(input);
      const joinBtn = document.createElement('button');
      joinBtn.textContent = '加入房间';
      joinBtn.style.cssText = 'padding:6px 10px;font-size:13px;border-radius:6px;border:1px solid #888;'
        + 'background:#3e8a46;color:#fff;cursor:pointer;';
      joinBtn.addEventListener('click', () => this.onAction('join', input.value.trim()));
      joinRow.appendChild(joinBtn);
      this.win.appendChild(joinRow);
    } else {
      // 房间里：成员列表 + 开赛/退出
      const list = document.createElement('div');
      list.style.cssText = 'text-align:left;font-size:14px;line-height:1.8;padding:4px 0;';
      for (const m of room.members) {
        const line = document.createElement('div');
        const me = m.name === this.myName ? '（我）' : '';
        line.textContent = `${m.host ? '👑 ' : ''}${m.name}${me} · ${m.team} 队 · ${m.hp} 血${m.alive ? '' : '（阵亡）'}`;
        list.appendChild(line);
      }
      this.win.appendChild(list);

      const need = room.mode === '3v3' ? 6 : 2;
      const tip = document.createElement('p');
      tip.style.cssText = 'font-size:13px;color:#bbb;text-align:left;';
      tip.textContent = `房间号 ${room.code}，发给朋友就能一起打（还差 ${Math.max(0, need - room.members.length)} 人，房主点开赛）`;
      this.win.appendChild(tip);

      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;justify-content:center;padding:6px 0;';
      const startBtn = document.createElement('button');
      const iAmHost = room.members.some((m) => m.host && m.name === this.myName);
      startBtn.textContent = '开赛';
      startBtn.style.cssText = 'padding:6px 10px;font-size:13px;border-radius:6px;border:1px solid #888;color:#fff;';
      if (iAmHost && room.members.length >= 2) {
        startBtn.style.background = '#a8641e';
        startBtn.style.cursor = 'pointer';
        startBtn.addEventListener('click', () => this.onAction('start', ''));
      } else {
        startBtn.textContent = iAmHost ? '至少两个人才能开赛' : '等房主开赛';
        startBtn.style.background = '#5a5a5a';
        startBtn.style.cursor = 'default';
      }
      row.appendChild(startBtn);

      const leaveBtn = document.createElement('button');
      leaveBtn.textContent = '退出房间';
      leaveBtn.style.cssText = 'padding:6px 10px;font-size:13px;border-radius:6px;border:1px solid #888;'
        + 'background:#7a3a3a;color:#fff;cursor:pointer;';
      leaveBtn.addEventListener('click', () => this.onAction('leave', ''));
      row.appendChild(leaveBtn);
      this.win.appendChild(row);
    }

    const hint = document.createElement('div');
    hint.className = 'inv-hint';
    hint.textContent = '建房后把房间号发给朋友 · 点空白关闭';
    this.win.appendChild(hint);
  }
}
