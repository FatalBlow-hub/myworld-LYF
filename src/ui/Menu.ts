/** 主菜单 — 账号制：继续已有的账号存档，或者添加新账号开新档（最多 3 个） */

import type { GameMode } from '../player/Health';
import { isMobile } from './Platform';

/** 菜单底部的操作说明 — 手机看虚拟按键怎么说，电脑看键盘怎么说 */
function hintHtml(): string {
  if (isMobile()) {
    return [
      '左下摇杆走路 + 转弯 · 右边 ▲▼ 看上下',
      '按住「挖」挖方块 / 打动物 · 「放」放方块 · 「用」开关门、上下车',
      '◀▶ 换格子 · 「包」开背包（能合成）· 「吃」吃东西 · 「跳」跳起来',
      '顶上一排：「书」制作方法 · 「存」存档 · 「家」回重生点 · 「厅」进出大厅 · 「停」暂停退出',
      '拿着稻粒对水按「放」种水稻，拿着胡萝卜对草地或泥土按「放」种地里',
      '创造模式会飞：「跳」上升 · 「降」下降',
    ].join('<br/>');
  }
  return [
    '↑↓ 走路 · ←→ 转弯 · 8/2 看上下',
    '按住 P 挖方块 / 打动物 · L 放方块 · M 开关门',
    '4/6 选格子 · 9 打开背包（能合成）· E 吃东西 · 空格 跳',
    '1 存档（也会自动存）· 3 回重生点 · 7 制作方法 · N 切换僵尸生成 · 天黑对着床按 M 睡觉',
    '拿着稻粒对水按 L 种水稻，拿着胡萝卜对草地或泥土按 L 种地里 · H 进出大厅',
    '坦克：L 放地上 · 对着按 M 上车 · 拿炮弹按 L 装弹 · P 开炮 · M 下车',
    '挑战房：5×5 空地放 · 对门按 M 交 10 生肉打 4 关，中途不许出来',
    '创造模式会飞：空格 上升 · Shift 下降',
  ].join('<br/>');
}

export interface MenuActions {
  /** 继续某个账号的存档 */
  onContinue: (slot: number, zombieAttack: boolean) => void;
  /** 带着某个账号的存档直接去大厅排队 */
  onHall: (slot: number, zombieAttack: boolean) => void;
  /** 开新账号（slot 由外面决定是哪个空位） */
  onNew: (mode: GameMode, zombieAttack: boolean) => void;
  /** 手动从 saves/ 备份找回存档 */
  onRestore: () => void;
  /** 删除某个账号的存档 */
  onDelete: (slot: number) => void;
}

export class Menu {
  private el: HTMLDivElement;

  constructor(
    actions: MenuActions,
    opts: { saves: { slot: number; mode: GameMode; zombieAttack: boolean }[]; nextSlot: number | null; zombieChecked: boolean; hall: boolean },
  ) {
    this.el = document.createElement('div');
    this.el.className = 'overlay';
    this.el.innerHTML = `
      <h1>方块世界</h1>
      <p>选一个账号开始玩</p>
      ${opts.saves.map((s) => `<div class="saverow" style="display:flex;gap:6px"><button data-slot="${s.slot}" style="flex:1">继续账号${s.slot}（${s.mode === 'survival' ? '生存' : '创造'}）</button>${opts.hall ? `<button data-hall="${s.slot}" style="flex:0 0 auto" title="读档后直接去大厅排队">大厅</button>` : ''}<button data-del="${s.slot}" style="flex:0 0 auto;opacity:.6" title="删掉这个账号的存档">删</button></div>`).join('\n')}
      ${opts.nextSlot !== null ? `<button data-add="1">＋ 添加账号${opts.nextSlot}</button>` : ''}
      <button data-restore style="opacity:.6;font-size:12px">存档不见了？点我找回</button>
      <div class="newgame" style="display:none">
        <button data-mode="survival">生存模式（有血条）</button>
        <button data-mode="creative">创造模式（不会死）</button>
      </div>
      <label class="zombie-toggle"><input type="checkbox" data-zombie ${opts.zombieChecked ? 'checked' : ''}/> 僵尸会攻击人（生存模式）</label>
      <div class="hint">${hintHtml()}</div>
    `;
    const zombieBox = () => this.el.querySelector('input[data-zombie]') as HTMLInputElement;
    const zombieOn = () => zombieBox().checked;
    this.el.querySelectorAll('button[data-slot]').forEach((btn) => {
      // 指着哪个账号的按钮，开关就显示那个账号上次存的状态（每个账号独立）
      btn.addEventListener('mouseenter', () => {
        const s = opts.saves.find((x) => x.slot === Number((btn as HTMLElement).dataset.slot));
        if (s) zombieBox().checked = s.zombieAttack;
      });
      btn.addEventListener('click', () => {
        const slot = Number((btn as HTMLElement).dataset.slot);
        this.hide();
        actions.onContinue(slot, zombieOn());
      });
    });
    this.el.querySelectorAll('button[data-hall]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slot = Number((btn as HTMLElement).dataset.hall);
        this.hide();
        actions.onHall(slot, zombieOn());
      });
    });
    this.el.querySelectorAll('button[data-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slot = Number((btn as HTMLElement).dataset.del);
        if (confirm(`确定删掉账号${slot}？里面的东西就没啦`)) actions.onDelete(slot);
      });
    });
    // 添加账号 → 展开出"生存/创造"两个按钮
    this.el.querySelector('button[data-add]')?.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement).style.display = 'none';
      (this.el.querySelector('.newgame') as HTMLElement).style.display = 'block';
    });
    this.el.querySelector('button[data-restore]')?.addEventListener('click', () => actions.onRestore());
    this.el.querySelectorAll('button[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset.mode as GameMode;
        this.hide();
        actions.onNew(mode, zombieOn());
      });
    });
    document.body.appendChild(this.el);
  }

  private hide(): void {
    this.el.remove();
  }
}

/** 防名字里有尖括号把页面 HTML 搞坏（注册时已限制字符，双保险） */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export interface AccountMenuActions {
  /** 继续这个账号的存档 */
  onContinue: (zombieAttack: boolean) => void;
  /** 带着这个账号的存档直接去大厅排队 */
  onHall: (zombieAttack: boolean) => void;
  /** 开新档（会把服务器上的旧档顶掉，旧档进服务器 backup） */
  onNew: (mode: GameMode, zombieAttack: boolean) => void;
  /** 退出登录 → 回登录界面 */
  onLogout: () => void;
  /** 删掉这个账号的存档 */
  onDelete: () => void;
}

/** 服务器模式的账号菜单 — 一个账号一档：不用选槽位，登录后要么继续要么新开 */
export class AccountMenu {
  private el: HTMLDivElement;

  constructor(
    actions: AccountMenuActions,
    opts: { name: string; save: { mode: GameMode; zombieAttack: boolean } | null },
  ) {
    this.el = document.createElement('div');
    this.el.className = 'overlay';
    this.el.innerHTML = `
      <h1>方块世界</h1>
      <p class="account-name">你好，${esc(opts.name)}</p>
      ${opts.save ? `<div class="saverow" style="display:flex;gap:6px"><button data-continue style="flex:1">继续游戏（${opts.save.mode === 'survival' ? '生存' : '创造'}）</button><button data-hall style="flex:0 0 auto" title="读档后直接去大厅排队">大厅</button><button data-del style="flex:0 0 auto;opacity:.6" title="删掉这个账号的存档">删</button></div>` : ''}
      <button data-add="1">${opts.save ? '重新开档' : '＋ 开始新游戏'}</button>
      <div class="newgame" style="display:none">
        <button data-mode="survival">生存模式（有血条）</button>
        <button data-mode="creative">创造模式（不会死）</button>
      </div>
      <label class="zombie-toggle"><input type="checkbox" data-zombie ${(opts.save?.zombieAttack ?? true) ? 'checked' : ''}/> 僵尸会攻击人（生存模式）</label>
      <button data-logout style="opacity:.6;font-size:14px;padding:8px 24px">退出登录</button>
      <div class="hint">${hintHtml()}</div>
    `;
    const zombieOn = () => (this.el.querySelector('input[data-zombie]') as HTMLInputElement).checked;
    this.el.querySelector('button[data-continue]')?.addEventListener('click', () => {
      this.hide();
      actions.onContinue(zombieOn());
    });
    this.el.querySelector('button[data-hall]')?.addEventListener('click', () => {
      this.hide();
      actions.onHall(zombieOn());
    });
    this.el.querySelector('button[data-del]')?.addEventListener('click', () => {
      if (confirm('确定删掉存档？里面的东西就没啦')) actions.onDelete();
    });
    this.el.querySelector('button[data-add]')?.addEventListener('click', (e) => {
      // 已有档还想新开：先确认会顶掉旧档（服务器留有 backup 后悔药）
      if (opts.save && !confirm('开新档会顶掉现在的存档，确定？')) return;
      (e.currentTarget as HTMLElement).style.display = 'none';
      (this.el.querySelector('.newgame') as HTMLElement).style.display = 'block';
    });
    this.el.querySelector('button[data-logout]')?.addEventListener('click', () => actions.onLogout());
    this.el.querySelectorAll('button[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset.mode as GameMode;
        this.hide();
        actions.onNew(mode, zombieOn());
      });
    });
    document.body.appendChild(this.el);
  }

  private hide(): void {
    this.el.remove();
  }
}
