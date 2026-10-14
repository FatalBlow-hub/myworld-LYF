/** 登录/注册界面 + 账号接口的小封装 — 连上后端时，进游戏前先过这道门 */

/** 问服务器"我是谁"：
 *  返回 'off' = 后端没在跑（本地模式，用老的本地存档菜单）；
 *  { name: 'xxx' } = 已登录；{ name: null } = 后端在但没登录，该弹登录框了 */
export async function probeAuth(): Promise<{ name: string | null } | 'off'> {
  try {
    const r = await fetch('/api/auth/me');
    if (!(r.headers.get('content-type') ?? '').includes('json')) return 'off'; // 纯前端模式
    if (!r.ok) return { name: null };
    const d = (await r.json()) as { name?: string };
    return { name: typeof d.name === 'string' ? d.name : null };
  } catch {
    return 'off'; // 后端没跑/断网 → 本地模式
  }
}

/** 退出登录：让服务器把通行证作废，再刷新回登录界面 */
export async function logout(): Promise<void> {
  try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* 失败也照刷新 */ }
}

export interface AuthActions {
  /** 登录/注册成功（Cookie 已经带上了） */
  onDone: () => void;
  /** 不想登录，玩本地存档 */
  onLocal: () => void;
}

export class Auth {
  private el: HTMLDivElement;

  constructor(actions: AuthActions) {
    this.el = document.createElement('div');
    this.el.className = 'overlay';
    this.el.innerHTML = `
      <h1>方块世界</h1>
      <p>登录你的账号（第一次玩直接点注册）</p>
      <input data-name type="text" placeholder="名字（2~16位）" maxlength="16" autocomplete="username" />
      <input data-pass type="password" placeholder="密码（至少4位）" maxlength="64" autocomplete="current-password" />
      <div class="auth-error"></div>
      <div>
        <button data-login>登录</button>
        <button data-register>注册新账号</button>
      </div>
      <div class="auth-link" data-local>不登录，玩本地存档</div>
    `;
    const nameIn = this.el.querySelector('input[data-name]') as HTMLInputElement;
    const passIn = this.el.querySelector('input[data-pass]') as HTMLInputElement;
    const errEl = this.el.querySelector('.auth-error') as HTMLElement;

    const submit = async (action: 'login' | 'register') => {
      errEl.textContent = '';
      const name = nameIn.value.trim();
      const password = passIn.value;
      if (!name || !password) { errEl.textContent = '名字和密码都要填'; return; }
      try {
        const r = await fetch(`/api/auth/${action}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, password }),
        });
        const d = (await r.json()) as { error?: string };
        if (!r.ok) { errEl.textContent = d.error ?? '出错了，再试一次'; return; }
        actions.onDone();
      } catch {
        errEl.textContent = '连不上服务器，再试一次';
      }
    };

    this.el.querySelector('button[data-login]')!.addEventListener('click', () => void submit('login'));
    this.el.querySelector('button[data-register]')!.addEventListener('click', () => void submit('register'));
    // 密码框里回车 = 登录
    passIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') void submit('login'); });
    nameIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') passIn.focus(); });
    this.el.querySelector('[data-local]')!.addEventListener('click', () => {
      this.el.remove();
      actions.onLocal();
    });
    document.body.appendChild(this.el);
    nameIn.focus();
  }
}
