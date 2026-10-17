/** 模式选择页 — 开新游戏前选生存/创造
 *  两大卡片点即进；底部僵尸开关（仅生存模式相关）+ 取消返回菜单。
 *  账号菜单与本地 3 槽位菜单共用；「继续游戏」不走这里（用存档里存的模式和僵尸设置） */

import type { GameMode } from '../player/Health';

export interface ModeSelectActions {
  /** 选好模式（带僵尸开关状态）→ 开局 */
  onPick: (mode: GameMode, zombieAttack: boolean) => void;
  /** 取消，返回菜单 */
  onCancel: () => void;
}

/** 两张卡片的文案：一句定位 + 三条要点（说清两个模式到底差在哪） */
const MODE_CARDS: { mode: GameMode; icon: string; name: string; lines: string[] }[] = [
  { mode: 'survival', icon: '❤', name: '生存模式', lines: ['有血条，会饿肚子', '僵尸会攻击人', '方块要自己动手造'] },
  { mode: 'creative', icon: '✦', name: '创造模式', lines: ['不会死，不饿肚子', '背包里什么方块都有', '可以飞'] },
];

export class ModeSelect {
  private el: HTMLDivElement;

  constructor(actions: ModeSelectActions, opts: { zombieChecked: boolean }) {
    this.el = document.createElement('div');
    this.el.className = 'overlay modeselect';
    this.el.innerHTML = `
      <h1>开始新游戏</h1>
      <p>选一个模式，点卡片就开工</p>
      <div class="mode-cards">
        ${MODE_CARDS.map((c) => `
          <button class="mode-card" data-mode="${c.mode}">
            <span class="mode-icon">${c.icon}</span>
            <span class="mode-name">${c.name}</span>
            <span class="mode-lines">${c.lines.map((l) => `<span>${l}</span>`).join('')}</span>
          </button>`).join('')}
      </div>
      <label class="zombie-toggle"><input type="checkbox" data-zombie ${opts.zombieChecked ? 'checked' : ''}/> 僵尸会攻击人（生存模式）</label>
      <button class="mode-cancel" data-cancel>取消，不开了</button>
    `;
    const zombieOn = (): boolean => (this.el.querySelector('input[data-zombie]') as HTMLInputElement).checked;
    this.el.querySelectorAll('button[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        actions.onPick((btn as HTMLElement).dataset.mode as GameMode, zombieOn());
      });
    });
    this.el.querySelector('button[data-cancel]')!.addEventListener('click', () => actions.onCancel());
    document.body.appendChild(this.el);
  }

  /** 收摊（取消或已选好都要调） */
  dispose(): void { this.el.remove(); }
}
