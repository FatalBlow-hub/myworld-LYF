/** 开局前的菜单流程 — 先问服务器"我是谁"，再按结果走本地 3 槽位菜单 / 登录界面 / 账号菜单 */

import { GameMode } from '../../player/stats/Health';
import { Auth, logout, probeAuth } from '../../ui/account/Auth';
import { AccountMenu, Menu } from '../../ui/panels/Menu';
import { MAX_SLOTS, SaveData, deleteSave, listSaves, restoreBackups, setServerMode, syncServerSave } from '../Save';

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
      // 继续游戏：僵尸设置直接用存档里存的（不再每次问）；开新档才走模式选择页
      onContinue: (slot) => {
        const s = saves.find((x) => x.slot === slot)!;
        begin(s.data.mode, s.data, s.data.zombieAttack ?? true, slot);
      },
      onHall: (slot) => {
        const s = saves.find((x) => x.slot === slot)!;
        begin(s.data.mode, s.data, s.data.zombieAttack ?? true, slot, true);
      },
      onPickMode: (mode, z) => begin(mode, undefined, z, nextSlot!),
      onRestore: () => void restoreBackups(true).then(() => location.reload()),
      onDelete: (slot) => {
        deleteSave(slot);
        location.reload(); // 刷新一下菜单就重新算空位了
      },
    },
    {
      saves: saves.map((s) => ({ slot: s.slot, mode: s.data.mode })),
      nextSlot,
      hall: hallOk, // 后端在才显示「大厅」按钮（排队要走联机）
    },
  );
}

/** 家长在游戏里设的强制项（禁创造 / 僵尸）：游戏启动时拉一次，应用到开局
 *  服务端读档时也会覆盖，这里再应用一遍 = 「下次进游戏就生效」 */
export interface GameConfig {
  coins: number;
  everCreative: boolean;
  creativeBlocked: boolean;
  zombieForced: number | null; // null=家长不干预 / 0=关 / 1=开
}

/** 拉家长配置：没登录或后端不在就当没设置，不挡正常玩 */
async function fetchGameConfig(): Promise<GameConfig | null> {
  try {
    const r = await fetch('/api/game/config');
    if (!r.ok) return null;
    return (await r.json()) as GameConfig;
  } catch {
    return null;
  }
}

/** 服务器模式：已登录账号的菜单 — 服务器档先搬到本地 1 号槽再开玩，写档自动传回服务器 */
export async function showAccountMenu(name: string, begin: BeginGame): Promise<void> {
  setServerMode(true); // 从这开始，写档/删档都会同步到服务器
  const [save, cfg] = await Promise.all([syncServerSave(name), fetchGameConfig()]);
  // 家长设置优先：禁创造 → 强制生存；强制僵尸 → 覆盖存档里的开关
  const modeOf = (m: GameMode): GameMode => (cfg?.creativeBlocked ? 'survival' : m);
  const zombieOf = (z: boolean): boolean =>
    cfg?.zombieForced === 0 || cfg?.zombieForced === 1 ? cfg.zombieForced === 1 : z;
  const started = save
    ? { ...save, mode: modeOf(save.mode), zombieAttack: zombieOf(save.zombieAttack ?? true) }
    : null;
  const note = cfg?.creativeBlocked
    ? '家长已关闭创造模式（只能玩生存）'
    : (cfg?.zombieForced === 0 ? '家长已关闭僵尸攻击' : '');
  new AccountMenu(
    {
      onContinue: () => begin(started!.mode, started!, started!.zombieAttack, 1),
      onHall: () => begin(started!.mode, started!, started!.zombieAttack, 1, true),
      onPickMode: (mode, z) => begin(modeOf(mode), undefined, zombieOf(z), 1),
      onDelete: () => {
        deleteSave(1);
        location.reload();
      },
      onLogout: () => void logout().then(() => location.reload()),
    },
    {
      name,
      save: started ? { mode: started.mode, zombieAttack: started.zombieAttack } : null,
      note,
    },
  );
}

/** 进游戏第一道门：后端没跑 → 本地菜单；后端在但没登录 → 登录界面；已登录 → 账号菜单 */
export async function runMenuFlow(begin: BeginGame): Promise<void> {
  const who = await probeAuth();
  if (who === 'off') {
    await showLocalMenu(begin, false); // 后端没跑：纯本地，大厅要联机所以不显示
  } else if (!who.name) {
    new Auth({
      onDone: () => location.reload(), // 登录成功刷新重进，带着 Cookie 走账号流程
      // 游客游玩开关（服务端 GUEST_PLAY，默认关）：关时不传 onLocal，登录页不给「不登录」入口
      onLocal: who.guest ? () => void showLocalMenu(begin, true) : undefined,
    });
  } else {
    await showAccountMenu(who.name, begin);
  }
}
