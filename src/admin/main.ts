/** 防沉迷控制台（家长端）— 独立入口 admin.html，与游戏 bundle 分离
 *  流程：登录 → GET /api/admin/me 校验 is_admin → 拉当天用量 → 按账号设上限 / 加时 / 开关
 */

interface Row {
  name: string;
  isAdmin: boolean;
  day: string;
  usedSec: number;
  limitSec: number;
  bonusSec: number;
  remainingSec: number;
  locked: boolean;
  enabled: boolean;
}

const $ = (id: string): HTMLElement => document.getElementById(id)!;
const fmtMMSS = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const todayStr = (): string => {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

function showView(view: 'login' | 'deny' | 'main'): void {
  const map: Record<string, string> = { login: 'login-view', deny: 'deny-view', main: 'main-view' };
  for (const [v, id] of Object.entries(map)) $(id).hidden = v !== view;
}

async function api(path: string, method: string, body?: unknown): Promise<Response> {
  return fetch(path, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function login(): Promise<void> {
  const name = ($('login-name') as HTMLInputElement).value.trim();
  const pass = ($('login-pass') as HTMLInputElement).value;
  const err = $('login-err');
  err.textContent = '';
  if (!name || !pass) { err.textContent = '账号和密码都要填'; return; }
  try {
    const r = await api('/api/auth/login', 'POST', { name, password: pass });
    const d = (await r.json()) as { error?: string };
    if (!r.ok) { err.textContent = d.error ?? '登录失败'; return; }
    await enter();
  } catch {
    err.textContent = '连不上服务器';
  }
}

async function enter(): Promise<void> {
  const me = await fetch('/api/auth/me');
  if (!me.ok) { showView('login'); return; }
  const who = (await me.json()) as { name?: string };
  const adm = await fetch('/api/admin/me');
  if (adm.status === 403) { $('deny-name').textContent = who.name ?? ''; showView('deny'); return; }
  if (!adm.ok) { showView('login'); return; }
  $('who').textContent = who.name ?? '';
  showView('main');
  await refresh();
}

async function refresh(): Promise<void> {
  const day = ($('day') as HTMLInputElement).value || todayStr();
  const r = await api(`/api/admin/playtime?day=${encodeURIComponent(day)}`, 'GET');
  if (!r.ok) return;
  const d = (await r.json()) as { day: string; users: Row[] };
  renderRows(d.users);
}

function miniBtn(label: string, onClick: () => Promise<void>): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'mini';
  b.textContent = label;
  b.addEventListener('click', () => void onClick());
  return b;
}

function numInput(value: string, title: string): HTMLInputElement {
  const i = document.createElement('input');
  i.type = 'number';
  i.value = value;
  i.title = title;
  return i;
}

function actionCell(u: Row): HTMLTableCellElement {
  const td = document.createElement('td');
  td.className = 'ops';
  const limitIn = numInput(String(Math.round(u.limitSec / 60)), '每日上限（分钟，0~1440）');
  const bonusIn = numInput('15', '加时（分钟，1~240）');
  td.append(
    limitIn,
    miniBtn('设置上限', async () => {
      await api('/api/admin/config', 'PUT', { name: u.name, dailyLimitSec: Number(limitIn.value) * 60 });
      await refresh();
    }),
    bonusIn,
    miniBtn('加时', async () => {
      await api('/api/admin/bonus', 'POST', { name: u.name, minutes: Number(bonusIn.value) });
      await refresh();
    }),
    miniBtn(u.enabled ? '关闭防沉迷' : '开启防沉迷', async () => {
      await api('/api/admin/config', 'PUT', { name: u.name, enabled: !u.enabled });
      await refresh();
    }),
  );
  return td;
}

function renderRows(users: Row[]): void {
  const tbody = $('rows');
  tbody.innerHTML = '';
  for (const u of users) {
    const tr = document.createElement('tr');
    // 列序与表头一致：账号 / 已玩 / 剩余 / 上限 / 加时 / 状态 / 操作
    const tdName = document.createElement('td');
    tdName.innerHTML = `${escapeHtml(u.name)}${u.isAdmin ? ' <span class="tag">管理员</span>' : ''}`;
    tr.appendChild(tdName);
    const texts = [
      fmtMMSS(u.usedSec),
      u.enabled ? fmtMMSS(u.remainingSec) : '不限',
      `${Math.round(u.limitSec / 60)} 分钟`,
      u.bonusSec ? `+${Math.round(u.bonusSec / 60)} 分钟` : '—',
    ];
    for (const text of texts) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.appendChild(td);
    }
    const status = !u.enabled
      ? '<span class="tag off">防沉迷关</span>'
      : u.locked ? '<span class="tag lock">已锁定</span>' : '<span class="tag">正常</span>';
    const tdStatus = document.createElement('td');
    tdStatus.innerHTML = status;
    tr.appendChild(tdStatus);
    tr.appendChild(actionCell(u));
    tbody.appendChild(tr);
  }
}

async function logout(): Promise<void> {
  await api('/api/auth/logout', 'POST');
  showView('login');
}

/* ---------------- 事件装配 ---------------- */

$('login-btn').addEventListener('click', () => void login());
($('login-pass') as HTMLInputElement).addEventListener('keydown', (e) => {
  if (e.key === 'Enter') void login();
});
($('login-name') as HTMLInputElement).addEventListener('keydown', (e) => {
  if (e.key === 'Enter') ($('login-pass') as HTMLInputElement).focus();
});
$('logout-btn').addEventListener('click', () => void logout());
$('deny-logout').addEventListener('click', () => void logout());
$('refresh-btn').addEventListener('click', () => void refresh());
const dayInput = $('day') as HTMLInputElement;
dayInput.value = todayStr();
dayInput.addEventListener('change', () => void refresh());
window.setInterval(() => { if (!$('main-view').hidden) void refresh(); }, 30_000);

void enter();
