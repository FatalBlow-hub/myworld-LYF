/** 开局菜单 — 本地 3 槽位（后端没开的退路）+ 服务器账号菜单（一个账号一档）
 *  开新档统一走模式选择页（ui/ModeSelect.ts）；「重新开档 / 删除存档」收进底部危险区，
 *  点完先弹页面内确认框（不用浏览器原生 confirm，手机上好看好点） */

import type { GameMode } from '../player/Health';
import { ModeSelect } from './ModeSelect';
import { isMobile } from './Platform';

/** 菜单底部的操作说明 — 手机看虚拟按键怎么说，电脑看键盘怎么说 */
function hintHtml(): string {
  const lines = isMobile()
    ? [
        '左下摇杆走路（左右推是横移）· 右边空白处拖动转视角 · 右下角 ↺↻ 转身',
        '按住「挖」挖方块 / 打动物 · 「放」放方块 · 「用」开关门、上下车',
        '点快捷栏格子直接换 · 「包」开背包（能合成）· 「吃」吃东西 · 「跳」跳起来',
        '顶上一排：「书」制作方法 · 「存」存档 · 「家」回重生点 · 「厅」进出大厅 · 「停」暂停退出',
        '拿着稻粒对水按「放」种水稻，拿着胡萝卜对草地或泥土按「放」种地里',
        '创造模式会飞：「跳」上升 · 「降」下降',
      ]
    : [
        'WASD 走路（A/D 是横移）· 点一下画面锁定鼠标转视角 · ESC 解锁',
        '纯键盘也行：↑↓ 抬头低头 · ←→ 转身（8/2 同效）',
        '按住 P 挖方块 / 打动物 · L 放方块 · M 开关门',
        '4/6 选格子 · 9 打开背包（能合成）· E 吃东西 · 空格 跳',
        '1 存档（也会自动存）· 3 回重生点 · 7 制作方法 · N 切换僵尸生成 · 天黑对着床按 M 睡觉',
        '拿着稻粒对水按 L 种水稻，拿着胡萝卜对草地或泥土按 L 种地里 · H 进出大厅',
        '坦克：L 放地上 · 对着按 M 上车 · 拿炮弹按 L 装弹 · P 开炮 · M 下车',
        '挑战房：5×5 空地放 · 对门按 M 交 10 生肉打 4 关，中途不许出来',
        '创造模式会飞：空格 上升 · Shift 下降',
      ];
  // 每行独立成块：横屏说明分两栏排，用 <br/> 断行会让某一行被从中间劈到下一栏
  return lines.map((line) => `<div>${line}</div>`).join('');
}

/* ---------------- 本地 3 槽位菜单（后端没开时的退路） ---------------- */

export interface MenuActions {
  /** 继续某个账号的存档（僵尸设置用存档里存的） */
  onContinue: (slot: number) => void;
  /** 带着某个账号的存档直接去大厅排队 */
  onHall: (slot: number) => void;
  /** 模式页选好了 → 开新档 */
  onPickMode: (mode: GameMode, zombieAttack: boolean) => void;
  /** 手动从 saves/ 备份找回存档 */
  onRestore: () => void;
  /** 删除某个账号的存档 */
  onDelete: (slot: number) => void;
}

export class Menu {
  private el: HTMLDivElement;
  private modeSelect: ModeSelect | null = null;

  constructor(
    private actions: MenuActions,
    opts: { saves: { slot: number; mode: GameMode }[]; nextSlot: number | null; hall: boolean },
  ) {
    this.el = document.createElement('div');
    this.el.className = 'overlay';
    this.el.innerHTML = `
      <h1>方块世界</h1>
      <p>选一个账号开始玩</p>
      ${opts.saves.map((s) => `<div class="saverow" style="display:flex;gap:6px"><button data-slot="${s.slot}" style="flex:1">继续账号${s.slot}（${s.mode === 'survival' ? '生存' : '创造'}）</button>${opts.hall ? `<button data-hall="${s.slot}" style="flex:0 0 auto" title="读档后直接去大厅排队">大厅</button>` : ''}<button data-del="${s.slot}" style="flex:0 0 auto;opacity:.6" title="删掉这个账号的存档">删</button></div>`).join('\n')}
      ${opts.nextSlot !== null ? `<button data-add="1">＋ 添加账号${opts.nextSlot}</button>` : ''}
      <button data-restore style="opacity:.6;font-size:12px">存档不见了？点我找回</button>
      <div class="hint">${hintHtml()}</div>
    `;
    this.el.querySelectorAll('button[data-slot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.hide();
        actions.onContinue(Number((btn as HTMLElement).dataset.slot));
      });
    });
    this.el.querySelectorAll('button[data-hall]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.hide();
        actions.onHall(Number((btn as HTMLElement).dataset.hall));
      });
    });
    this.el.querySelectorAll('button[data-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (confirm(`确定删掉账号${(btn as HTMLElement).dataset.del}？里面的东西就没啦`)) {
          actions.onDelete(Number((btn as HTMLElement).dataset.del));
        }
      });
    });
    // 添加账号 → 打开模式选择页（生存/创造）
    this.el.querySelector('button[data-add]')?.addEventListener('click', () => this.openModeSelect());
    this.el.querySelector('button[data-restore]')?.addEventListener('click', () => actions.onRestore());
    document.body.appendChild(this.el);
  }

  /** 打开模式选择页（开新档） */
  private openModeSelect(): void {
    this.modeSelect?.dispose();
    this.modeSelect = new ModeSelect({
      onPick: (mode, z) => { this.hide(); this.actions.onPickMode(mode, z); },
      onCancel: () => this.closeModeSelect(),
    }, { zombieChecked: true });
  }

  private closeModeSelect(): void { this.modeSelect?.dispose(); this.modeSelect = null; }

  private hide(): void { this.closeModeSelect(); this.el.remove(); }
}

/* ---------------- 服务器账号菜单（一个账号一档） ---------------- */

/** 防名字里有尖括号把页面 HTML 搞坏（注册时已限制字符，双保险） */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export interface AccountMenuActions {
  /** 继续这个账号的存档（僵尸设置用存档里存的） */
  onContinue: () => void;
  /** 带着这个账号的存档直接去大厅排队 */
  onHall: () => void;
  /** 模式页选好了 → 开新档（覆盖服务器旧档，旧档进 backup） */
  onPickMode: (mode: GameMode, zombieAttack: boolean) => void;
  /** 删掉这个账号的存档 */
  onDelete: () => void;
  /** 退出登录 → 回登录界面 */
  onLogout: () => void;
}

/** 服务器模式的账号菜单 — 登录后：继续 / 去大厅 / 开新档；重新开档与删档在底部危险区 */
export class AccountMenu {
  private el: HTMLDivElement;
  private modeSelect: ModeSelect | null = null;

  constructor(
    private actions: AccountMenuActions,
    private opts: { name: string; save: { mode: GameMode; zombieAttack: boolean } | null; note?: string },
  ) {
    this.el = document.createElement('div');
    this.el.className = 'overlay account';
    this.el.innerHTML = `
      <h1>方块世界</h1>
      <p class="account-name">你好，${esc(opts.name)}</p>
      ${opts.note ? `<p class="account-note">${esc(opts.note)}</p>` : ''}
      <div class="menu-main">
        ${opts.save ? `<button data-continue>▶ 继续游戏（${opts.save.mode === 'survival' ? '生存' : '创造'}）</button>` : ''}
        ${opts.save ? `<button data-hall>🏠 去大厅玩</button>` : ''}
        <button data-new>＋ 开始新游戏</button>
      </div>
      <button data-logout>退出登录</button>
      ${opts.save ? `
      <div class="danger-zone">
        <span class="danger-label">危险区 · 会丢进度</span>
        <div class="danger-row">
          <button class="danger-btn" data-restart>重新开档…</button>
          <button class="danger-btn" data-del>删除存档…</button>
        </div>
      </div>` : ''}
      <div class="hint">${hintHtml()}</div>
      <div class="confirm-mask" data-confirm style="display:none">
        <div class="confirm-box" role="alertdialog">
          <p class="confirm-title"></p>
          <p class="confirm-text"></p>
          <div class="confirm-row">
            <button data-confirm-no>取消</button>
            <button class="danger-btn" data-confirm-yes></button>
          </div>
        </div>
      </div>
    `;
    // 页面内确认弹窗（重新开档 / 删存档共用；点背景也可取消）
    const mask = this.el.querySelector('[data-confirm]') as HTMLElement;
    const titleEl = mask.querySelector('.confirm-title') as HTMLElement;
    const textEl = mask.querySelector('.confirm-text') as HTMLElement;
    const yesBtn = mask.querySelector('[data-confirm-yes]') as HTMLButtonElement;
    let onYes: (() => void) | null = null;
    const openConfirm = (title: string, text: string, yesLabel: string, fn: () => void): void => {
      titleEl.textContent = title;
      textEl.textContent = text;
      yesBtn.textContent = yesLabel;
      onYes = fn;
      mask.style.display = 'flex';
    };
    const closeConfirm = (): void => { mask.style.display = 'none'; onYes = null; };
    mask.addEventListener('click', (e) => { if (e.target === mask) closeConfirm(); });

    this.el.querySelector('button[data-continue]')?.addEventListener('click', () => {
      this.hide();
      this.actions.onContinue();
    });
    this.el.querySelector('button[data-hall]')?.addEventListener('click', () => {
      this.hide();
      this.actions.onHall();
    });
    // 开始新游戏：直接进模式选择页
    this.el.querySelector('button[data-new]')?.addEventListener('click', () => this.openModeSelect());
    // 重新开档：先确认（顶档只有一份 backup 后悔药），再进模式选择页
    this.el.querySelector('button[data-restart]')?.addEventListener('click', () => {
      openConfirm('确定要重新开档吗？', '当前存档会被覆盖，服务器只保留最近一份备份。', '确定覆盖', () => this.openModeSelect());
    });
    // 删存档：先确认
    this.el.querySelector('button[data-del]')?.addEventListener('click', () => {
      openConfirm('确定要删除存档吗？', '删了里面的东西就没啦，服务器也不再保留。', '确定删除', () => this.actions.onDelete());
    });
    mask.querySelector('[data-confirm-no]')!.addEventListener('click', closeConfirm);
    yesBtn.addEventListener('click', () => { const fn = onYes; closeConfirm(); fn?.(); });
    this.el.querySelector('button[data-logout]')!.addEventListener('click', () => this.actions.onLogout());
    document.body.appendChild(this.el);
  }

  /** 打开模式选择页（开始新游戏 / 确认后的重新开档共用） */
  private openModeSelect(): void {
    this.modeSelect?.dispose();
    this.modeSelect = new ModeSelect({
      onPick: (mode, z) => { this.hide(); this.actions.onPickMode(mode, z); },
      onCancel: () => this.closeModeSelect(),
    }, { zombieChecked: this.opts.save?.zombieAttack ?? true });
  }

  private closeModeSelect(): void { this.modeSelect?.dispose(); this.modeSelect = null; }

  private hide(): void { this.closeModeSelect(); this.el.remove(); }
}
