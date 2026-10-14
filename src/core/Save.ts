/** 存档 — 把当前游戏打包成 JSON 存进浏览器，刷新/关掉页面后还能继续玩 */

import * as THREE from 'three';
import { SKATES } from '../config';
import { Animal, AnimalKind } from '../entities/Animal';
import { ItemDrop } from '../entities/ItemDrop';
import { GameMode, Health } from '../player/Health';
import { Inventory } from '../player/Inventory';
import { PlayerBody } from '../player/Physics';
import { ROLLER_SKATES, Slots, Stack } from '../world/Block';
import { FurnaceState, World } from '../world/World';
import { Zombie, ZombieKind } from '../entities/Zombie';
import { Tank } from '../entities/Tank';
import { Challenge, ChallengeSave } from './Challenge';

/** 最多 3 个账号存档：blockworld-save-1 / -2 / -3 */
export const MAX_SLOTS = 3;
const keyOf = (slot: number) => `blockworld-save-${slot}`;
const LEGACY_KEY = 'blockworld-save'; // 旧版单存档，自动搬进 1 号账号
const OWNER_KEY = 'blockworld-owner'; // 记着本地 1 号槽的档是哪个账号的，防止串号

/** 服务器模式开关：登录账号玩的时候存档才往服务器传；本地模式纯浏览器存储，不碰后端 */
let serverOn = false;
export function setServerMode(on: boolean): void { serverOn = on; }

export interface SaveData {
  v: 1;
  mode: GameMode;
  /** 重生点 */
  spawn: { x: number; y: number; z: number };
  /** 玩家站的位置和朝向；boostT = 腌菜桶剩下的加速秒数 */
  body: { x: number; y: number; z: number; yaw: number; pitch: number; boostT?: number };
  hp: number;
  oxygen: number;
  /** 快捷栏选到哪格 */
  slot: number;
  inv: {
    hotbar: Slots;
    storage: Slots;
    armor: Slots;
    waistbag?: Slots;
    craftIn: Slots;
    craftBig: Slots;
    held: Stack | null;
  };
  /** 区块 key → 被玩家改过的格子 [下标, 方块ID][]（只存差别，存档很小） */
  chunks: Record<string, [number, number][]>;
  /** 方块朝向表 "x,y,z" → 朝向 */
  meta: Record<string, number>;
  chests: Record<string, Slots>;
  furnaces: Record<string, FurnaceState>;
  animals: { kind: AnimalKind; x: number; y: number; z: number; woolId: number; hp: number; grow?: number; tamed?: boolean; waiting?: boolean; feather?: number }[];
  /** 僵尸也存（旧存档没这字段就当没有）；kind = 哪种僵尸（旧字段 blood 还认） */
  zombies?: { x: number; y: number; z: number; hp: number; blood?: boolean; kind?: ZombieKind }[];
  drops: { id: number; count: number; x: number; y: number; z: number; age: number }[];
  /** 已收集的制作方法下标（旧存档没这字段就当一条都没学） */
  learned?: number[];
  golden?: { learned?: number[]; tasks?: number[]; waterUses?: number };
  /** 今天是第几秒（0~120，80 以后是黑夜）；旧存档没有就从头一天的早上开始 */
  dayTime?: number;
  /** 存的时候是不是暂停着 */
  paused?: boolean;
  /** 僵尸攻击开关（旧存档没有就默认开着） */
  zombieAttack?: boolean;
  zombieSpawn?: boolean;
  /** 停在地上的坦克（旧存档没有就没坦克）；不存"正在开"，读档后人站在车外；ammo = 弹药舱剩几发 */
  tanks?: { x: number; y: number; z: number; yaw: number; ammo?: number }[];
  /** 挑战房：盖过的房子 + 打到第几关（旧存档没有就没盖过） */
  challenge?: ChallengeSave;
}

/** 列出所有存在的账号存档（顺手把旧版单存档搬成 1 号账号） */
export function listSaves(): { slot: number; data: SaveData }[] {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      if (!localStorage.getItem(keyOf(1))) localStorage.setItem(keyOf(1), legacy);
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch {
    // 浏览器不让存东西时跳过搬家，反正下面有兜底
  }
  const out: { slot: number; data: SaveData }[] = [];
  for (let s = 1; s <= MAX_SLOTS; s++) {
    const d = readSave(s);
    if (d) out.push({ slot: s, data: d });
  }
  return out;
}

/** 网页里印着的存档备份（vite 插件嵌进 index.html 的），浏览器存不了档时的兜底 */
function embeddedSave(slot: number): SaveData | null {
  const d = (window as { __BW_SAVES__?: Record<number, SaveData> }).__BW_SAVES__?.[slot];
  return d && d.v === 1 ? d : null;
}

/** 读某个账号的档：先读浏览器仓库，读不到就读网页里印的备份（没有或坏了就返回 null） */
export function readSave(slot: number): SaveData | null {
  let local: SaveData | null = null;
  try {
    const raw = localStorage.getItem(keyOf(slot));
    if (raw) {
      const d = JSON.parse(raw) as SaveData;
      if (d.v === 1) local = d;
    }
  } catch {
    // localStorage 被拒就直接用兜底
  }
  const emb = embeddedSave(slot);
  // 浏览器里是个啥都没建的新档（chunks=0）、但备份里有盖过的东西 → 档被新世界误覆盖了，用备份
  if (emb && !Object.keys(local?.chunks ?? {}).length && Object.keys(emb.chunks ?? {}).length) return emb;
  return local ?? emb;
}

/** 删除某个账号的档：浏览器仓库 + saves/ 备份文件一起清 */
export function deleteSave(slot: number): void {
  try {
    localStorage.removeItem(keyOf(slot));
  } catch {
    // 浏览器不让动就算了，反正文件删了兜底也读不到
  }
  if (serverOn) fetch(`/api/save/${slot}`, { method: 'DELETE' }).catch(() => {});
}

export function writeSave(slot: number, d: SaveData): void {
  try {
    localStorage.setItem(keyOf(slot), JSON.stringify(d));
  } catch {
    // 浏览器存不下就算了，不炸游戏
  }
  // 双保险：登录账号玩时再传一份到服务器（存进 SQLite + saves/<账号>.json 备份）
  if (serverOn) fetch(`/api/save/${slot}`, { method: 'POST', body: JSON.stringify(d) }).catch(() => {});
}

/** 打开游戏时检查：浏览器里没档但 saves/ 文件夹里有备份 → 搬回来（清缓存后的救命稻草）
 *  备份有两条路：vite 把 saves/ 嵌进网页里（window.__BW_SAVES__），或走 /api/save 接口 */
export async function restoreBackups(force = false): Promise<void> {
  const embedded = (window as { __BW_SAVES__?: Record<string, unknown> }).__BW_SAVES__ ?? {};
  for (let s = 1; s <= MAX_SLOTS; s++) {
    try {
      if (!force && localStorage.getItem(keyOf(s))) continue;
      if (embedded[s]) {
        localStorage.setItem(keyOf(s), JSON.stringify(embedded[s]));
        continue;
      }
    } catch {
      // 浏览器不让存就靠 readSave 的兜底直接读嵌入档
      if (embedded[s]) continue;
    }
    try {
      const r = await fetch(`/api/save/${s}`);
      if (r.ok) localStorage.setItem(keyOf(s), await r.text());
    } catch {
      // 服务器没开备份功能（比如打包后）就当没有
    }
  }
}

/** 服务器模式下同步存档：把服务器档搬到本地 1 号槽；
 *  服务器还没档时，本地老档（自己账号的或账号系统出来前的）自动传上去当起家档 */
export async function syncServerSave(name: string): Promise<SaveData | null> {
  let remote: SaveData | null = null;
  try {
    const r = await fetch('/api/save/1');
    if (r.ok) {
      const d = (await r.json()) as SaveData;
      if (d?.v === 1) remote = d;
    }
  } catch {
    // 服务器抽风就先用本地的顶着，写档时会再试着传上去
  }
  try {
    const owner = localStorage.getItem(OWNER_KEY);
    const local = readSave(1);
    if (remote) {
      localStorage.setItem(keyOf(1), JSON.stringify(remote));
    } else if (local && (!owner || owner === name)) {
      writeSave(1, local); // 自己的老档 → 传上服务器，换设备也能接着玩
      remote = local;
    } else {
      localStorage.removeItem(keyOf(1)); // 上个账号残留的档，别串号
    }
    localStorage.setItem(OWNER_KEY, name);
  } catch {
    // 浏览器不让存也照玩（服务器那份还在）
  }
  return remote;
}

/** 打包：从游戏各部分收集要存的东西 */
export function buildSave(g: {
  mode: GameMode;
  spawn: { x: number; y: number; z: number };
  body: PlayerBody;
  health: Health;
  slot: number;
  inv: Inventory;
  world: World;
  animals: Animal[];
  zombies: Zombie[];
  drops: ItemDrop[];
  tanks: Tank[];
  challenge: Challenge;
  learned: number[];
  golden: { learned: number[]; tasks: number[]; waterUses: number };
  paused: boolean;
  dayTime: number;
  zombieAttack: boolean;
  zombieSpawn: boolean;
}): SaveData {
  return {
    v: 1,
    mode: g.mode,
    spawn: { ...g.spawn },
    body: { x: g.body.x, y: g.body.y, z: g.body.z, yaw: g.body.yaw, pitch: g.body.pitch, boostT: g.body.speedBoostT },
    hp: g.health.hp,
    oxygen: g.health.oxygen,
    slot: g.slot,
    inv: {
      hotbar: g.inv.hotbar, storage: g.inv.storage, armor: g.inv.armor, waistbag: g.inv.waistbag,
      craftIn: g.inv.craftIn, craftBig: g.inv.craftBig, held: g.inv.held,
    },
    chunks: g.world.exportDiffs(),
    meta: g.world.exportMeta(),
    chests: Object.fromEntries(g.world.chests),
    furnaces: Object.fromEntries(g.world.furnaces),
    animals: g.animals.map((a) => ({ kind: a.kind, x: a.x, y: a.y, z: a.z, woolId: a.woolId, hp: a.hp, grow: a.growT, tamed: a.tamed, waiting: a.waiting, feather: a.feather })),
    // 挑战房的怪（noLoot）不走僵尸存档——它们由 challenge 字段自己恢复，存两份会刷双倍
    zombies: g.zombies.filter((z) => !z.noLoot).map((z) => ({ x: z.x, y: z.y, z: z.z, hp: z.hp, kind: z.kind === 'normal' ? undefined : z.kind })),
    drops: g.drops.map((d) => ({ id: d.itemId, count: d.count, x: d.x, y: d.y, z: d.z, age: d.age })),
    tanks: g.tanks.map((t) => ({ x: t.x, y: t.y, z: t.z, yaw: t.yaw, ammo: t.ammo })),
    challenge: g.challenge.serialize(),
    learned: g.learned,
    golden: g.golden,
    paused: g.paused,
    dayTime: g.dayTime,
    zombieAttack: g.zombieAttack,
    zombieSpawn: g.zombieSpawn,
  };
}

/** 还原：把存档里的东西一件件摆回去；返回出生点和选中的格子由调用方接 */
export function applySave(
  d: SaveData,
  into: { inv: Inventory; health: Health; world: World; scene: THREE.Scene; animals: Animal[]; zombies: Zombie[]; drops: ItemDrop[]; tanks: Tank[]; challenge: Challenge },
): { spawn: { x: number; y: number; z: number }; slot: number; learned: number[]; golden?: SaveData['golden']; paused: boolean; dayTime: number; zombieAttack: boolean; zombieSpawn: boolean } {
  const { inv, health, world, scene, animals, zombies, drops, tanks, challenge } = into;
  const copy = (dst: Slots, src: Slots) => src.forEach((s, i) => { dst[i] = s; });
  copy(inv.hotbar, d.inv.hotbar);
  copy(inv.storage, d.inv.storage);
  copy(inv.armor, d.inv.armor);
  copy(inv.waistbag, d.inv.waistbag ?? []);
  copy(inv.craftIn, d.inv.craftIn);
  copy(inv.craftBig, d.inv.craftBig);
  inv.held = d.inv.held;
  // 旧档里轮滑鞋曾用 count 记耐久；升级成单件装备的 durability 字段
  const normalizeSkates = (stack: Stack | null) => {
    if (stack?.id !== ROLLER_SKATES) return;
    stack.durability = Math.max(1, Math.min(SKATES.MAX_FALLS, stack.durability ?? stack.count));
    stack.count = 1;
  };
  for (const slots of [inv.hotbar, inv.storage, inv.armor, inv.craftIn, inv.craftBig]) {
    slots.forEach(normalizeSkates);
  }
  normalizeSkates(inv.held);
  health.hp = d.hp;
  health.oxygen = d.oxygen;
  world.applyDiffs(d.chunks);
  world.applyMeta(d.meta);
  for (const [k, v] of Object.entries(d.chests)) world.chests.set(k, v);
  for (const [k, v] of Object.entries(d.furnaces)) world.furnaces.set(k, v);
  for (const a of d.animals) {
    const an = new Animal(a.kind, a.x, a.y, a.z, a.woolId, a.feather ?? 0);
    an.hp = a.hp;
    if (a.grow !== undefined) {
      an.growT = a.grow; // 读档时还是宝宝的话，接着长
      an.applyScale();
    }
    an.tamed = a.tamed ?? false;   // 驯服状态也读回来
    an.waiting = a.waiting ?? false;
    animals.push(an);
    scene.add(an.group);
  }
  for (const z of d.zombies ?? []) {
    // 旧档存的是 blood 布尔值，也认；新档直接存 kind
    const zb = new Zombie(z.x, z.y, z.z, z.kind ?? (z.blood ? 'blood' : 'normal'));
    zb.hp = z.hp;
    zombies.push(zb);
    scene.add(zb.group);
  }
  for (const dr of d.drops) {
    const it = new ItemDrop(dr.id, dr.count, dr.x, dr.y, dr.z);
    it.age = dr.age;
    drops.push(it);
    scene.add(it.mesh);
  }
  for (const t of d.tanks ?? []) {
    const tk = new Tank(t.x, t.y, t.z);
    tk.setPose(t.x, t.y, t.z, t.yaw);
    tk.ammo = t.ammo ?? 0; // 弹药舱剩几发也读回来
    tanks.push(tk);
    scene.add(tk.group);
  }
  challenge.restore(d.challenge); // 挑战房：房子认回来，打到一半接着打
  return {
    spawn: { ...d.spawn }, slot: d.slot, learned: d.learned ?? [], golden: d.golden,
    paused: d.paused ?? false, dayTime: d.dayTime ?? 0, zombieAttack: d.zombieAttack ?? true, zombieSpawn: d.zombieSpawn ?? true,
  };
}
