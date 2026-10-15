/** 开局前的菜单流程 — 先问服务器"我是谁"，再按结果走本地 3 槽位菜单 / 登录界面 / 账号菜单 */

import { GameMode } from '../player/Health';
import { Auth, logout, probeAuth } from '../ui/Auth';
import { AccountMenu, Menu } from '../ui/Menu';
import { MAX_SLOTS, SaveData, deleteSave, listSaves, restoreBackups, setServerMode, syncServerSave } from './Save';

/** 菜单选好之后：mode + 存档 + 僵尸开关 + 槽位 + 是否直接去大厅 → 开局 */
export type BeginGame = (mode: GameMode, save: SaveData | undefined, zombieAttack: boolean, slot: number, toHall?: boolean) => void;

/** 本地模式：浏览器存档 + 老的 3 槽位菜单（后端没开时的退路）；hallOk=false 时不显示大厅按钮 */
export async function showLocalMenu(begin: BeginGame, hallOk: boolean): Promise<void> {
  // 浏览器里的档被清了的话，先从项目 saves/ 文件夹把备份搬回来
  await restoreBackups();
  const saves = listSaves();
  const used = new Set(saves.map((s) => s.slot));
  const nextSlot = [1, 2, 3].slice(0, MAX_SLOTS).find((s) => !used.has(s)) ?? null;
  new Menu(
    {
      onContinue: (slot, z) => {
        const s = saves.find((x) => x.slot === slot)!;
        begin(s.data.mode, s.data, z, slot);
      },
      onHall: (slot, z) => {
        const s = saves.find((x) => x.slot === slot)!;
        begin(s.data.mode, s.data, z, slot, true);
      },
      onNew: (mode, z) => begin(mode, undefined, z, nextSlot!),
      onRestore: () => void restoreBackups(true).then(() => location.reload()),
      onDelete: (slot) => {
        deleteSave(slot);
        location.reload(); // 刷新一下菜单就重新算空位了
      },
    },
    {
      saves: saves.map((s) => ({ slot: s.slot, mode: s.data.mode, zombieAttack: s.data.zombieAttack ?? true })),
      nextSlot,
      zombieChecked: saves[0]?.data.zombieAttack ?? true, // 开关默认按 1 号账号上次存的显示
      hall: hallOk, // 后端在才显示「大厅」按钮（排队要走联机）
    },
  );
}

/** 服务器模式：已登录账号的菜单 — 服务器档先搬到本地 1 号槽再开玩，写档自动传回服务器 */
export async function showAccountMenu(name: string, begin: BeginGame): Promise<void> {
  setServerMode(true); // 从这开始，写档/删档都会同步到服务器
  const save = await syncServerSave(name);
  new AccountMenu(
    {
      onContinue: (z) => begin(save!.mode, save!, z, 1),
      onHall: (z) => begin(save!.mode, save!, z, 1, true),
      onNew: (mode, z) => begin(mode, undefined, z, 1),
      onLogout: () => void logout().then(() => location.reload()),
      onDelete: () => {
        deleteSave(1);
        location.reload();
      },
    },
    {
      name,
      save: save ? { mode: save.mode, zombieAttack: save.zombieAttack ?? true } : null,
    },
  );
}

/** 进游戏第一道门：后端没跑 → 本地菜单；后端在但没登录 → 登录界面；已登录 → 账号菜单 */
export async function runMenuFlow(begin: BeginGame): Promise<void> {
  const who = await probeAuth();
  if (who === 'off') {
    await showLocalMenu(begin, false);
  } else if (!who.name) {
    new Auth({
      onDone: () => location.reload(), // 登录成功刷新重进，带着 Cookie 走账号流程
      onLocal: () => void showLocalMenu(begin, true), // 不想登录也能玩本地档
    });
  } else {
    await showAccountMenu(who.name, begin);
  }
}
