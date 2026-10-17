/** 防沉迷控制台（家长端）— 独立入口 admin.html，与游戏 bundle 分离
 *  流程：登录 → GET /api/admin/me 校验 is_admin → 账号列表（可按日期查）→
 *        点账号进详情（单日大数字 + 最近 14 天趋势 + 游戏内情况 + 封停/删账号）→
 *        详情内设上限 / 加时 / 开关 / 封停 / 删除账号
 */

interface Row {
  name: string;
  isAdmin: boolean;
  banned: boolean;
  day: string;
  usedSec: number;
  limitSec: number;
  bonusSec: number;
  remainingSec: number;
  locked: boolean;
  enabled: boolean;
}

/** 历史接口返回的单日数据（字段与 Row 的额度部分同构） */
interface DayStat {
  day: string;
  usedSec: number;
  limitSec: number;
  bonusSec: number;
  remainingSec: number;
  locked: boolean;
  enabled: boolean;
}

/** 游戏内情况（只读，来自账号存档 JSON） */
interface GameStat {
  name: string;
  banned: boolean;
  hasSave: boolean;
  updatedAt: number | null;
  mode: 'survival' | 'creative' | null;
  everCreative: boolean;
  zombieAttack: boolean | null;
  character: string | null;
  islandType: string | null;
  coins: number;
  hp: number | null;
  itemCount: number;
  warriors: number;
  tanks: number;
  learned: number;
}

/** 展示用的中文映射（不引游戏 config，控制台保持独立入口） */
const CN: Record<string, string> = {
  survival: '生存', creative: '创造',
  steve: '史蒂夫', alex: '艾力克斯',
  apple: '苹果岛', peach: '桃子岛', orange: '橙子岛',
};

const $ = (id: string): HTMLElement => document.getElementById(id)!;
const fmtMMSS = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const todayStr = (): string => {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
/** 日期加减天（'YYYY-MM-DD'，本地时区） */
const dayShift = (day: string, delta: number): string => {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() + delta);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const weekdayCN = (day: string): string => `周${['日', '一', '二', '三', '四', '五', '六'][new Date(`${day}T00:00:00`).getDay()]}`;
const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

function showView(view: 'login' | 'deny' | 'main' | 'detail'): void {
  const map: Record<string, string> = { login: 'login-view', deny: 'deny-view', main: 'main-view', detail: 'detail-view' };
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

/** 危险操作按钮（封停 / 删除账号）：不显眼，且都要走确认弹窗 */
function dangerBtn(label: string, onClick: () => Promise<void>): HTMLButtonElement {
  const b = miniBtn(label, onClick);
  b.classList.add('danger-btn');
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
  const bonusBtn = miniBtn('加时', async () => {
    await api('/api/admin/bonus', 'POST', { name: u.name, minutes: Number(bonusIn.value) });
    await refresh();
  });
  // 加时只对当天有意义：看的不是今天就地禁用，避免"给昨天加时"的困惑
  if (u.day !== todayStr()) {
    bonusBtn.disabled = true;
    bonusBtn.title = '加时只能加在今天（把右上角日期切回今天）';
    bonusIn.disabled = true;
  }
  td.append(
    limitIn,
    miniBtn('设置上限', async () => {
      await api('/api/admin/config', 'PUT', { name: u.name, dailyLimitSec: Number(limitIn.value) * 60 });
      await refresh();
    }),
    bonusIn,
    bonusBtn,
    miniBtn(u.enabled ? '关闭防沉迷' : '开启防沉迷', async () => {
      await api('/api/admin/config', 'PUT', { name: u.name, enabled: !u.enabled });
      await refresh();
    }),
  );
  return td;
}

/** 账号状态标签：封停 > 防沉迷关 > 已锁定 > 正常 */
function statusHtml(u: Row): string {
  if (u.banned) return '<span class="tag ban">已封停</span>';
  if (!u.enabled) return '<span class="tag off">防沉迷关</span>';
  if (u.locked) return '<span class="tag lock">已锁定</span>';
  return '<span class="tag">正常</span>';
}

function renderRows(users: Row[]): void {
  const tbody = $('rows');
  tbody.innerHTML = '';
  for (const u of users) {
    const tr = document.createElement('tr');
    tr.title = '点这一行看账号详情';
    // 列序与表头一致：账号 / 已玩 / 剩余 / 上限 / 加时 / 状态 / 操作
    const tdName = document.createElement('td');
    tdName.className = 'name-cell';
    tdName.innerHTML = `${escapeHtml(u.name)}${u.isAdmin ? ' <span class="tag">管理员</span>' : ''} ▸`;
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
    const tdStatus = document.createElement('td');
    tdStatus.innerHTML = statusHtml(u);
    tr.appendChild(tdStatus);
    tr.appendChild(actionCell(u));
    // 点行（避开操作区）→ 账号详情
    tr.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('td.ops')) return;
      void openDetail(u.name);
    });
    tbody.appendChild(tr);
  }
}

/* ---------------- 账号详情（按日期 + 14 天趋势 + 游戏情况） ---------------- */

/** 当前详情页状态：看哪个账号、哪一天 */
const detail = { name: '', day: todayStr() };
/** 详情可翻看的范围：最近 14 天 ~ 今天 */
const detailMinDay = (): string => dayShift(todayStr(), -13);

/** 打开账号详情（默认今天） */
async function openDetail(name: string, day?: string): Promise<void> {
  detail.name = name;
  detail.day = day ?? todayStr();
  $('detail-name').textContent = name;
  syncDayInput();
  showView('detail');
  await loadDetail();
}

function syncDayInput(): void {
  ($('detail-day') as HTMLInputElement).value = detail.day;
}

/** 拉最近 14 天历史 + 游戏内情况，渲染选中日详情 */
async function loadDetail(): Promise<void> {
  const [h, g] = await Promise.all([
    api(`/api/admin/history?name=${encodeURIComponent(detail.name)}&days=14`, 'GET'),
    api(`/api/admin/game?name=${encodeURIComponent(detail.name)}`, 'GET'),
  ]);
  let game: GameStat | null = null;
  if (h.ok) {
    const d = (await h.json()) as { name: string; days: DayStat[] };
    renderDetailDay(d.days.find((x) => x.day === detail.day) ?? null);
    renderDayList(d.days);
  }
  if (g.ok) {
    game = (await g.json()) as GameStat;
    renderGame(game);
  }
  renderAccountOps(game); // 账号操作不依赖游戏数据，游戏接口挂了也要能封停
}

/** 选中那天的单日详情（大数字） */
function renderDetailDay(stat: DayStat | null): void {
  const box = $('detail-summary');
  const ops = $('detail-ops');
  ops.innerHTML = '';
  if (!stat) {
    box.innerHTML = `<p class="muted">没有 ${detail.day} 的数据——这天没玩，或超出了最近 14 天范围（用趋势条或日期框翻看）。</p>`;
    return;
  }
  const status = !stat.enabled
    ? '<span class="tag off">防沉迷关</span>'
    : stat.locked ? '<span class="tag lock">已锁定</span>' : '<span class="tag">正常</span>';
  box.innerHTML = `
    <div class="detail-num"><span class="v">${fmtMMSS(stat.usedSec)}</span><span class="k">${stat.day} ${weekdayCN(stat.day)} · 已玩（分:秒）</span></div>
    <div class="detail-num"><span class="v">${stat.enabled ? fmtMMSS(stat.remainingSec) : '不限'}</span><span class="k">当天剩余</span></div>
    <div class="detail-num"><span class="v">${Math.round(stat.limitSec / 60)} 分钟</span><span class="k">每日上限${stat.bonusSec ? `（含当天加时 +${Math.round(stat.bonusSec / 60)} 分）` : ''}</span></div>
    <div class="detail-num"><span class="v">${status}</span><span class="k">当天状态</span></div>`;
  renderDetailOps(stat);
}

/** 详情页操作区：防沉迷配置 + 加时（仅今天）+ 封停 + 删除账号 */
function renderDetailOps(stat: DayStat): void {
  const ops = $('detail-ops');
  const note = document.createElement('span');
  note.className = 'muted';
  note.textContent = '上限和开关改的是账号配置（之后都按这个来）';
  ops.appendChild(note);
  const limitIn = numInput(String(Math.round(stat.limitSec / 60)), '每日上限（分钟，0~1440）');
  ops.append(
    limitIn,
    miniBtn('设置上限', async () => {
      await api('/api/admin/config', 'PUT', { name: detail.name, dailyLimitSec: Number(limitIn.value) * 60 });
      await loadDetail();
    }),
    miniBtn(stat.enabled ? '关闭防沉迷' : '开启防沉迷', async () => {
      await api('/api/admin/config', 'PUT', { name: detail.name, enabled: !stat.enabled });
      await loadDetail();
    }),
  );
  if (stat.day === todayStr()) {
    const bonusIn = numInput('15', '加时（分钟，1~240，仅当天有效）');
    ops.append(
      bonusIn,
      miniBtn('加时', async () => {
        await api('/api/admin/bonus', 'POST', { name: detail.name, minutes: Number(bonusIn.value), day: stat.day });
        await loadDetail();
      }),
    );
  } else {
    const tip = document.createElement('span');
    tip.className = 'muted';
    tip.textContent = '加时只能加在今天';
    ops.appendChild(tip);
  }
}

/** 封停 / 删除账号（危险操作，走确认弹窗） */
function renderAccountOps(g: GameStat | null): void {
  const ops = $('detail-ops');
  const banned = g?.banned ?? false;
  ops.append(
    dangerBtn(banned ? '解封账号' : '封停账号', async () => {
      await confirmBox(
        banned ? '确定解封这个账号？' : '确定封停这个账号？',
        banned ? '解封后他可以正常登录和游玩。' : '封停后他不能登录、正在玩的会被踢下线，直到你解封。',
        banned ? '确定解封' : '确定封停',
        async () => {
          await api('/api/admin/ban', 'POST', { name: detail.name, banned: !banned });
          await loadDetail();
        },
      );
    }),
    dangerBtn('删除账号', async () => {
      await confirmBox(
        '确定删除这个账号？',
        '账号、存档、游玩记录会一起删掉，不可恢复。只是想清进度的话用「删除存档」更合适。',
        '确定删除',
        async () => {
          await api(`/api/admin/user?name=${encodeURIComponent(detail.name)}`, 'DELETE');
          showView('main');
          await refresh();
        },
      );
    }),
  );
}

/** 页面内确认弹窗（替代浏览器原生 confirm，手机上好点） */
function confirmBox(title: string, text: string, yesLabel: string, onYes: () => Promise<void>): Promise<void> {
  return new Promise((resolve) => {
    const mask = $('detail-confirm');
    (mask.querySelector('.confirm-title') as HTMLElement).textContent = title;
    (mask.querySelector('.confirm-text') as HTMLElement).textContent = text;
    const yes = $('detail-confirm-yes') as HTMLButtonElement;
    yes.textContent = yesLabel;
    mask.style.display = 'flex';
    const close = (): void => { mask.style.display = 'none'; resolve(); };
    ($('detail-confirm-no') as HTMLButtonElement).onclick = close;
    yes.onclick = () => { close(); void onYes(); };
    mask.onclick = (e) => { if (e.target === mask) close(); };
  });
}

/** 游戏内情况（只读网格）：岛币 / 模式 / 创造 / 僵尸 / 背包 / 小战士… */
function renderGame(g: GameStat): void {
  const box = $('game-box');
  box.innerHTML = '';
  const cells: { k: string; v: string; warn?: boolean }[] = [
    { k: '岛币', v: String(g.coins) },
    { k: '游戏模式', v: CN[g.mode ?? ''] ?? '还没开过档' },
    { k: '曾开创造', v: g.everCreative ? '是（联机会被排除）' : '否', warn: g.everCreative },
    { k: '僵尸攻击', v: g.zombieAttack === null ? '—' : (g.zombieAttack ? '开' : '关') },
    { k: '背包格数', v: String(g.itemCount) },
    { k: '小战士', v: `${g.warriors} 个` },
    { k: '坦克', v: `${g.tanks} 辆` },
    { k: '已学配方', v: `${g.learned} 条` },
    { k: '角色', v: CN[g.character ?? ''] ?? '—' },
    { k: '专属岛', v: CN[g.islandType ?? ''] ?? '—' },
    { k: '血量', v: g.hp === null ? '—' : `${g.hp} 心` },
    { k: '存档更新', v: g.updatedAt ? new Date(g.updatedAt * 1000).toLocaleString('zh-CN') : '—' },
  ];
  for (const c of cells) {
    const div = document.createElement('div');
    div.className = `gcell${c.warn ? ' warn' : ''}`;
    div.innerHTML = `<div class="k">${c.k}</div><div class="v">${escapeHtml(c.v)}</div>`;
    box.appendChild(div);
  }
}

/** 最近 14 天趋势条：条长按"期间最长那天"归一；锁过的天显红；点某天跳那天 */
function renderDayList(days: DayStat[]): void {
  const box = $('daylist');
  box.innerHTML = '';
  const max = Math.max(...days.map((d) => d.usedSec), 1);
  for (const st of days) {
    const row = document.createElement('div');
    row.className = `dayrow${st.locked ? ' lock' : ''}${st.day === detail.day ? ' sel' : ''}`;
    const label = document.createElement('span');
    label.className = 'd';
    label.textContent = `${st.day.slice(5)} ${weekdayCN(st.day)}`;
    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('div');
    fill.className = 'fill';
    fill.style.width = `${Math.round((st.usedSec / max) * 100)}%`;
    bar.appendChild(fill);
    const t = document.createElement('span');
    t.className = 't';
    t.textContent = st.usedSec > 0 ? fmtMMSS(st.usedSec) : '没玩';
    row.append(label, bar, t);
    row.title = `${st.day}：已玩 ${fmtMMSS(st.usedSec)}`;
    row.addEventListener('click', () => { detail.day = st.day; syncDayInput(); void loadDetail(); });
    box.appendChild(row);
  }
}

/** 详情页日期导航（裁剪在 最近14天 ~ 今天） */
function shiftDetailDay(delta: number): void {
  const next = dayShift(detail.day, delta);
  if (next > todayStr() || next < detailMinDay()) return;
  detail.day = next;
  syncDayInput();
  void loadDetail();
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

// 详情页：返回 / 日期导航 / 快捷日期 / 退出登录
$('back-btn').addEventListener('click', () => { showView('main'); void refresh(); });
$('prev-day').addEventListener('click', () => shiftDetailDay(-1));
$('next-day').addEventListener('click', () => shiftDetailDay(1));
const detailDayInput = $('detail-day') as HTMLInputElement;
detailDayInput.min = detailMinDay();
detailDayInput.max = todayStr();
detailDayInput.addEventListener('change', () => {
  detail.day = detailDayInput.value || todayStr();
  void loadDetail();
});
$('day-today').addEventListener('click', () => { detail.day = todayStr(); syncDayInput(); void loadDetail(); });
$('day-yesterday').addEventListener('click', () => { detail.day = dayShift(todayStr(), -1); syncDayInput(); void loadDetail(); });
$('day-before').addEventListener('click', () => { detail.day = dayShift(todayStr(), -2); syncDayInput(); void loadDetail(); });
$('detail-logout').addEventListener('click', () => void logout());

// 自动刷新：列表页刷列表，详情页刷详情
window.setInterval(() => {
  if (!$('detail-view').hidden) void loadDetail();
  else if (!$('main-view').hidden) void refresh();
}, 30_000);

void enter();
