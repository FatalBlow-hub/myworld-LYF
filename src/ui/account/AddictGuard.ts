/** 幼儿防沉迷（用户端）— 登录账号的每日在线时长守护
 *
 * 独立模块，装配在 main.ts（不碰已超标的 Game.ts）：
 *  - 自己发心跳、自己弹提醒、自己锁屏；锁屏时经 logout + reload 收尾（beforeunload 自动存档）
 *  - 服务端踢人信号走 window 事件 'addict-locked'（WS welcome.locked / addict.locked）
 *  - 用 #hud 元素存在性感知"在游戏中"（Game.begin() 时才建 HUD）
 *  - 只对登录账号生效：本地模式/未登录没有服务端额度，不启用
 */

import { ADDICT } from '../../config';
import { probeAuth, logout } from './Auth';

/** 防沉迷额度快照（与 GET /api/playtime/me 对齐） */
interface Quota {
  day: string;
  usedSec: number;
  limitSec: number;
  bonusSec: number;
  remainingSec: number;
  locked: boolean;
  enabled: boolean;
}

const BAR_ID = 'addict-bar';
const LOCK_ID = 'addict-lock';
const REMIND_ID = 'addict-remind';

const fmtClock = (sec: number): string =>
  `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/** Game.begin() 后会建 #hud，存在即算"在游戏中" */
const inGame = (): boolean => !!document.getElementById('hud');

export class AddictGuard {
  private quota: Quota | null = null;
  private hbTimer: number | null = null;
  private watchTimer: number | null = null;
  private unlockTimer: number | null = null;
  private nextRemindAt = ADDICT.REMIND_SEC;
  private locked = false;

  async start(): Promise<void> {
    const who = await probeAuth();
    if (who === 'off' || !who.name) { console.log('[防沉迷] 本地模式/未登录，不启用'); return; }
    try {
      const r = await fetch('/api/playtime/me');
      if (r.ok) this.quota = (await r.json()) as Quota;
    } catch { /* 服务端抽风：不阻塞游戏，安静放弃防沉迷 */ }
    if (this.quota?.locked) { this.showLock('今天已经不能玩啦'); return; }
    window.addEventListener('addict-locked', this.onServerLock);
    this.watchInGame();
    window.setInterval(() => this.renderBar(), 1000); // 倒计时条每秒刷新
  }

  /** 服务端踢下线信号（WS welcome.locked 或 addict.locked；reason 区分额度用完 / 账号停用） */
  private onServerLock = (e: Event): void => {
    const reason = (e as CustomEvent<{ reason?: string }>).detail?.reason;
    const banned = reason === 'banned';
    this.showLock(banned ? '这个账号被家长停用了' : '时间到啦，强制休息', banned);
  };

  /** 盯着进游戏没有：#hud 出现就开始心跳，消失就停 */
  private watchInGame(): void {
    if (this.watchTimer !== null) return;
    this.watchTimer = window.setInterval(() => {
      if (inGame() && this.hbTimer === null) this.startHeartbeat();
      if (!inGame() && this.hbTimer !== null) this.stopHeartbeat();
    }, 500);
  }

  /* ---------------- 心跳 ---------------- */

  private startHeartbeat(): void {
    const beat = async (): Promise<void> => {
      try {
        const r = await fetch('/api/playtime/heartbeat', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
        });
        const q = (await r.json()) as Quota;
        this.quota = q;
        // 每累计玩满 REMIND_SEC 提醒一次（按服务端权威用时，切页面/重登都准）
        if (q.usedSec >= this.nextRemindAt) {
          this.nextRemindAt = Math.floor(q.usedSec / ADDICT.REMIND_SEC) * ADDICT.REMIND_SEC + ADDICT.REMIND_SEC;
          this.showRemind(q);
        }
        if (r.status === 403 || q.locked) this.showLock('时间到啦，强制休息');
      } catch { /* 网络抖动：下个周期再来 */ }
    };
    void beat();
    this.hbTimer = window.setInterval(() => void beat(), ADDICT.HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (this.hbTimer !== null) { window.clearInterval(this.hbTimer); this.hbTimer = null; }
  }

  /* ---------------- 界面 ---------------- */

  /** 顶部常驻倒计时条（游戏内才显示） */
  private renderBar(): void {
    const existing = document.getElementById(BAR_ID);
    if (!this.quota || this.locked || !inGame()) { existing?.remove(); return; }
    const bar = existing ?? this.createBar();
    const left = this.quota.remainingSec;
    bar.textContent = this.quota.enabled ? `⏱ 今天还剩 ${fmtClock(left)}` : '⏱ 防沉迷已关闭';
    bar.style.color = this.quota.enabled && left < ADDICT.WARN_SEC ? 'var(--heart)' : 'var(--hud-text)';
  }

  private createBar(): HTMLElement {
    const el = document.createElement('div');
    el.id = BAR_ID;
    el.className = 'addict-bar';
    // 常驻小条：顶部居中、不挡操作（pointer-events:none）；颜色统一走 CSS 变量
    el.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:5;'
      + 'font:13px system-ui,sans-serif;color:var(--hud-text);text-shadow:var(--hud-shadow);'
      + 'background:rgba(0,0,0,.35);padding:2px 10px;border-radius:8px;pointer-events:none;';
    document.body.appendChild(el);
    return el;
  }

  /** 每 10 分钟一次的提醒（模态，要孩子点"知道啦"） */
  private showRemind(q: Quota): void {
    if (this.locked || document.getElementById(REMIND_ID)) return;
    const el = document.createElement('div');
    el.id = REMIND_ID;
    el.className = 'overlay';
    el.innerHTML = `
      <h1>玩久啦，注意休息</h1>
      <p>已经玩了 <b>${Math.floor(q.usedSec / 60)} 分钟</b>，今天还剩 <b>${fmtClock(q.remainingSec)}</b>。</p>
      <p>每 10 分钟提醒一次；时间用完，今天就不能再玩啦。</p>
      <div><button data-ok>知道啦</button></div>`;
    el.querySelector('button[data-ok]')!.addEventListener('click', () => el.remove());
    document.body.appendChild(el);
  }

  /** 锁屏：到点用完 / 账号被停用。停心跳、回登录页入口；
   *  banned=true 时不轮询解锁（只能等家长在控制台解封后重新登录） */
  private showLock(reason: string, banned = false): void {
    if (this.locked) return;
    this.locked = true;
    this.stopHeartbeat();
    if (this.watchTimer !== null) { window.clearInterval(this.watchTimer); this.watchTimer = null; }
    window.removeEventListener('addict-locked', this.onServerLock);
    document.getElementById(BAR_ID)?.remove();
    document.getElementById(REMIND_ID)?.remove();
    const q = this.quota;
    const el = document.createElement('div');
    el.id = LOCK_ID;
    el.className = 'overlay';
    el.innerHTML = `
      <h1>${banned ? '这个账号被停用了' : '今天的游玩时间用完啦'}</h1>
      <p>${reason}</p>
      <p>${q && !banned ? `今天已经玩了 <b>${Math.floor(q.usedSec / 60)} 分钟</b>（上限 ${Math.floor((q.limitSec + q.bonusSec) / 60)} 分钟）。` : ''}</p>
      <p>${banned ? '请家长在控制台解封之后，重新登录再玩。' : '明天 0 点恢复。家长加时后这里会自动放开。'}</p>
      <div><button data-exit>退出登录</button></div>`;
    el.querySelector('button[data-exit]')!.addEventListener('click', () => {
      void logout().then(() => location.reload());
    });
    document.body.appendChild(el);
    if (banned) return; // 封停不轮询：只有家长解封后重新登录才恢复
    // 家长可能在控制台加时：定期问服务端，放开了就收起锁屏接着玩
    this.unlockTimer = window.setInterval(async () => {
      try {
        const r = await fetch('/api/playtime/me');
        if (!r.ok) return;
        const now = (await r.json()) as Quota;
        if (now.locked) return;
        if (this.unlockTimer !== null) { window.clearInterval(this.unlockTimer); this.unlockTimer = null; }
        el.remove();
        this.locked = false;
        this.quota = now;
        this.nextRemindAt = Math.max(ADDICT.REMIND_SEC,
          Math.floor(now.usedSec / ADDICT.REMIND_SEC) * ADDICT.REMIND_SEC + ADDICT.REMIND_SEC);
        window.addEventListener('addict-locked', this.onServerLock);
        this.watchInGame();
      } catch { /* 网络抖动：下轮再问 */ }
    }, ADDICT.HEARTBEAT_MS);
  }
}
