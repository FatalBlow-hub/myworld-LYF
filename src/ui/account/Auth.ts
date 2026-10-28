/** 登录/注册界面 — 双页签（登录 / 注册），注册带确认密码与可见切换
 *  连上后端时，进游戏前先过这道门；注册成功直接带着 Cookie 进账号流程 */

/** 问服务器"我是谁"：
 *  返回 'off' = 后端没在跑（本地模式，用老的本地存档菜单）；
 *  { name: 'xxx' } = 已登录；{ name: null } = 后端在但没登录，该弹登录框了
 *  guest = 服务端 GUEST_PLAY 开关：未登录时要不要给「不登录，玩本地存档」入口（默认关） */
export async function probeAuth(): Promise<{ name: string | null; guest: boolean } | 'off'> {
  try {
    const r = await fetch('/api/auth/me');
    if (!(r.headers.get('content-type') ?? '').includes('json')) return 'off'; // 纯前端模式
    if (!r.ok) {
      // 401 体里带 guest 字段；老后端没这字段按关处理（入口不给）
      let guest = false;
      try { guest = (await r.json() as { guest?: boolean }).guest === true; } catch { /* 拿不到就当关 */ }
      return { name: null, guest };
    }
    const d = (await r.json()) as { name?: string; guest?: boolean };
    return { name: typeof d.name === 'string' ? d.name : null, guest: d.guest === true };
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
  /** 不想登录，玩本地存档。游客游玩开关（服务端 GUEST_PLAY）关掉时不传——登录页不出这个入口 */
  onLocal?: () => void;
}

type AuthTab = 'login' | 'register';

export class Auth {
  private el: HTMLDivElement;

  constructor(actions: AuthActions) {
    this.el = document.createElement('div');
    this.el.className = 'overlay auth';
    // 游客游玩开关（GUEST_PLAY，默认关）关掉时，「不登录」入口整个不渲染——后端在跑就必须登录/注册
    const guestLink = actions.onLocal
      ? '<div class="auth-link" data-local>不登录，玩本地存档</div>'
      : '';
    this.el.innerHTML = `
      <h1>方块世界</h1>
      <div class="auth-tabs">
        <button type="button" data-tab="login" class="on">登录</button>
        <button type="button" data-tab="register">注册</button>
      </div>
      <div class="auth-fields">
        <div class="auth-field">
          <input data-name type="text" placeholder="名字（2~16位）" maxlength="16" autocomplete="username" />
        </div>
        <div class="auth-field">
          <input data-pass type="password" placeholder="密码（至少4位）" maxlength="64" autocomplete="current-password" />
          <button type="button" class="eye" data-eye="pass" title="显示 / 隐藏密码">👁</button>
        </div>
        <div class="auth-field" data-confirm style="display:none">
          <input data-pass2 type="password" placeholder="再输一次密码" maxlength="64" autocomplete="new-password" />
          <button type="button" class="eye" data-eye="pass2" title="显示 / 隐藏密码">👁</button>
        </div>
      </div>
      <div class="auth-error"></div>
      <button type="button" data-submit>登录</button>
      <div class="auth-tip" data-tip>还没有账号？点上面的「注册」</div>
      ${guestLink}
    `;
    const nameIn = this.el.querySelector('input[data-name]') as HTMLInputElement;
    const passIn = this.el.querySelector('input[data-pass]') as HTMLInputElement;
    const pass2In = this.el.querySelector('input[data-pass2]') as HTMLInputElement;
    const confirmRow = this.el.querySelector('[data-confirm]') as HTMLElement;
    const errEl = this.el.querySelector('.auth-error') as HTMLElement;
    const submitBtn = this.el.querySelector('button[data-submit]') as HTMLButtonElement;
    const tipEl = this.el.querySelector('[data-tip]') as HTMLElement;

    /** 当前在哪个页签 */
    const curTab = (): AuthTab =>
      (this.el.querySelector('button[data-tab].on') as HTMLElement).dataset.tab as AuthTab;

    /** 切页签：登录态 / 注册态是两套字段（注册多一行确认密码） */
    const switchTab = (tab: AuthTab): void => {
      this.el.querySelectorAll('button[data-tab]').forEach((b) => {
        b.classList.toggle('on', (b as HTMLElement).dataset.tab === tab);
      });
      confirmRow.style.display = tab === 'register' ? 'flex' : 'none';
      submitBtn.textContent = tab === 'register' ? '注册并登录' : '登录';
      tipEl.textContent = tab === 'register' ? '已有账号？点上面的「登录」' : '还没有账号？点上面的「注册」';
      pass2In.value = '';
      errEl.textContent = '';
      nameIn.focus();
    };
    this.el.querySelectorAll('button[data-tab]').forEach((b) => {
      b.addEventListener('click', () => switchTab((b as HTMLElement).dataset.tab as AuthTab));
    });

    /** 小眼睛：密码可见切换（防打错，尤其手机上） */
    this.el.querySelectorAll('button[data-eye]').forEach((b) => {
      b.addEventListener('click', () => {
        const input = this.el.querySelector(`input[data-${(b as HTMLElement).dataset.eye}]`) as HTMLInputElement;
        input.type = input.type === 'password' ? 'text' : 'password';
        input.focus();
      });
    });

    const submit = async (): Promise<void> => {
      errEl.textContent = '';
      const name = nameIn.value.trim();
      const password = passIn.value;
      const tab = curTab();
      if (!name || !password) { errEl.textContent = '名字和密码都要填'; return; }
      if (tab === 'register') {
        if (password.length < 4) { errEl.textContent = '密码要至少 4 位'; return; }
        if (password !== pass2In.value) { errEl.textContent = '两次输入的密码不一样'; pass2In.value = ''; pass2In.focus(); return; }
      }
      try {
        const r = await fetch(`/api/auth/${tab === 'register' ? 'register' : 'login'}`, {
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
    submitBtn.addEventListener('click', () => void submit());
    // 回车：账号框 → 密码框 →（注册态）确认框 /（登录态）直接提交
    nameIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') passIn.focus(); });
    passIn.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      if (curTab() === 'register') pass2In.focus(); else void submit();
    });
    pass2In.addEventListener('keydown', (e) => { if (e.key === 'Enter') void submit(); });
    if (actions.onLocal) {
      this.el.querySelector('[data-local]')!.addEventListener('click', () => {
        this.el.remove();
        actions.onLocal!();
      });
    }
    document.body.appendChild(this.el);
    nameIn.focus();
  }
}
