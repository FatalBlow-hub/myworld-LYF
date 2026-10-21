/** 存档 — 把当前游戏打包成 JSON 存进浏览器，刷新/关掉页面后还能继续玩 */

import * as THREE from 'three';
import { HUNGER, ISLAND_TYPES, LEGACY_ISLAND_MAP, pickIslandType, IslandType, SKATES } from '../config';
import { Animal, AnimalKind } from '../entities/Animal';
import { CharacterKind } from '../entities/Character';
import { ItemDrop } from '../entities/ItemDrop';
import { spawnDrop } from '../entities/drops';
import { GameMode, Health } from '../player/Health';
import type { ShopQuota } from '../world/shopLimits';
import { Hunger } from '../player/Hunger';
import { Inventory } from '../player/Inventory';
import { PlayerBody } from '../player/Physics';
import { ROLLER_SKATES, Slots, Stack } from '../world/Block';
import { FurnaceState, World } from '../world/World';
import { SPORE_GROW_SECONDS, SPORE_PLANT_IDS } from '../world/mushrooms';
import { Zombie, ZombieKind } from '../entities/Zombie';
import { Warrior, WarriorTier } from '../entities/Warrior';
import { Tank } from '../entities/Tank';
import { GameDate, normalizeDate } from './Calendar';
import { Challenge, ChallengeSave } from './Challenge';

/** 最多 3 个账号存档：blockworld-save-1 / -2 / -3 */
export const MAX_SLOTS = 3;
const keyOf = (slot: number) => `blockworld-save-${slot}`;
const LEGACY_KEY = 'blockworld-save'; // 旧版单存档，自动搬进 1 号账号
const OWNER_KEY = 'blockworld-owner'; // 记着本地 1 号槽的档是哪个账号的，防止串号

/** 服务器模式开关：登录账号玩的时候存档才往服务器传；本地模式纯浏览器存储，不碰后端 */
let serverOn = false;
export function setServerMode(on: boolean): void { serverOn = on; }

/** 存档格式版本：加字段 / 改结构时 +1，并到 migrateSave() 里补老版本 → 新版本的转换 */
export const SAVE_VERSION = 1;

/** 这个档认不认：比当前版本还新的档宁可不读也别读坏；老档一律认，缺的字段交给 migrateSave 补 */
export function isSupportedSave(d: SaveData | null | undefined): d is SaveData {
  return !!d && typeof d.v === 'number' && d.v > 0 && d.v <= SAVE_VERSION;
}

/** 新档抽一座自家岛：季节各 1/4 → 候选品种里再抽一个（登录出生落不到香蕉岛） */
export function randomIslandType(): IslandType {
  return pickIslandType(Math.random, true);
}

/** 读档时的岛型归一：旧季节岛（P6 的一岛多树版）升成品种岛；合法品种岛原样保留 */
function normalizeIslandType(raw: unknown): IslandType | null {
  const id = String(raw ?? '');
  if (id in LEGACY_ISLAND_MAP) return LEGACY_ISLAND_MAP[id];
  return id in ISLAND_TYPES ? (id as IslandType) : null;
}

/** 老版本存档升级成当前版本（现在只有 v1；老档缺的字段在这里补默认值） */
export function migrateSave(d: SaveData): SaveData {
  const islandType = normalizeIslandType(d.islandType) ?? randomIslandType();
  return {
    ...d,
    v: SAVE_VERSION,
    hunger: d.hunger ?? HUNGER.MAX,
    hungerOn: d.hungerOn ?? false,
    everCreative: d.everCreative ?? (d.mode === 'creative'),
    islandType,
    coins: d.coins ?? 0,
    body: {
      ...d.body,
      boostMult: d.body.boostMult ?? 1,
    },
  };
}

export interface SaveData {
  v: number;
  mode: GameMode;
  /** 是否曾开启过创造模式（只要选过或切到过创造模式就置 true；老档默认 false） */
  everCreative?: boolean;
  /** 专属岛屿类型（新建档随机分配，老档在 migrateSave 补随机默认） */
  islandType?: IslandType;
  /** 岛币余额（大厅机器买卖用；老档没有就 0 元起） */
  coins?: number;
  /** 玩家形象（史蒂夫/艾力克斯）：旧档没有就按账号名固定挑一个，朋友访岛时看到的就是这个 */
  character?: CharacterKind;
  /** 已拥有的皮肤（售卖机买的；老档没有就只有默认两个） */
  skins?: CharacterKind[];
  /** 重生点 */
  spawn: { x: number; y: number; z: number };
  /** 玩家站的位置和朝向；boostT = 食物加速剩下的秒数；boostMult = 加速倍率 */
  body: { x: number; y: number; z: number; yaw: number; pitch: number; boostT?: number; boostMult?: number };
  hp: number;
  oxygen: number;
  /** 当前饥饿值（0~7；老档没有就默认 7 格满） */
  hunger?: number;
  /** 饥饿模式开关（每档独立；老档没有就默认关闭） */
  hungerOn?: boolean;
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
  /** 玩家亲手种下的蘑菇位置（"x,y,z"）：入冬清场时这些要留下；老档没有就当没有 */
  playerMushrooms?: string[];
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
  /** 游戏内日期（几月几号）；旧存档没有就当开局的 7 月 8 日 */
  date?: { month: number; day: number };
  /** 商店每日限量已购记录（杂货铺用）；旧存档没有就从零开始 */
  shopQuota?: ShopQuota;
  /** 存的时候是不是暂停着 */
  paused?: boolean;
  /** 僵尸攻击开关（旧存档没有就默认开着） */
  zombieAttack?: boolean;
  zombieSpawn?: boolean;
  /** 停在地上的坦克（旧存档没有就没坦克）；不存"正在开"，读档后人站在车外；ammo = 弹药舱剩几发 */
  tanks?: { x: number; y: number; z: number; yaw: number; ammo?: number }[];
  /** 挑战房：盖过的房子 + 打到第几关（旧存档没有就没盖过） */
  challenge?: ChallengeSave;
  /** 小战士（保镖）：只存品质和位置，血量每次进游戏满血；打死的就不存了 */
  warriors?: { tier: WarriorTier; x: number; y: number; z: number }[];
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
  return isSupportedSave(d) ? migrateSave(d) : null;
}

/** 读某个账号的档：先读浏览器仓库，读不到就读网页里印的备份（没有或坏了就返回 null） */
export function readSave(slot: number): SaveData | null {
  let local: SaveData | null = null;
  try {
    const raw = localStorage.getItem(keyOf(slot));
    if (raw) {
      const d = JSON.parse(raw) as SaveData;
      if (isSupportedSave(d)) local = migrateSave(d);
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
      if (isSupportedSave(d)) remote = migrateSave(d);
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
  everCreative?: boolean;
  islandType: IslandType;
  coins: number;
  character?: CharacterKind;
  skins?: CharacterKind[];
  spawn: { x: number; y: number; z: number };
  body: PlayerBody;
  health: Health;
  hunger: Hunger;
  slot: number;
  inv: Inventory;
  world: World;
  animals: Animal[];
  zombies: Zombie[];
  drops: ItemDrop[];
  tanks: Tank[];
  challenge: Challenge;
  warriors: Warrior[];
  learned: number[];
  golden: { learned: number[]; tasks: number[]; waterUses: number };
  paused: boolean;
  dayTime: number;
  date: GameDate;
  /** 商店每日限量已购记录；旧的调用方不传就当没有（todayQuota 会兜底） */
  shopQuota?: ShopQuota;
  zombieAttack: boolean;
  zombieSpawn: boolean;
}): SaveData {
  return {
    v: SAVE_VERSION,
    mode: g.mode,
    everCreative: g.everCreative || g.mode === 'creative',
    islandType: g.islandType,
    coins: Math.round(g.coins * 100) / 100,
    character: g.character,
    skins: g.skins,
    spawn: { ...g.spawn },
    body: {
      x: g.body.x, y: g.body.y, z: g.body.z,
      yaw: g.body.yaw, pitch: g.body.pitch,
      boostT: g.body.speedBoostT,
      boostMult: g.body.speedBoostMult,
    },
    hp: g.health.hp,
    oxygen: g.health.oxygen,
    hunger: g.hunger.value,
    hungerOn: g.hunger.enabled,
    slot: g.slot,
    inv: {
      hotbar: g.inv.hotbar, storage: g.inv.storage, armor: g.inv.armor, waistbag: g.inv.waistbag,
      craftIn: g.inv.craftIn, craftBig: g.inv.craftBig, held: g.inv.held,
    },
    chunks: g.world.exportDiffs(),
    meta: g.world.exportMeta(),
    playerMushrooms: g.world.exportPlayerMushrooms(),
    chests: Object.fromEntries(g.world.chests),
    furnaces: Object.fromEntries(g.world.furnaces),
    animals: g.animals.map((a) => ({ kind: a.kind, x: a.x, y: a.y, z: a.z, woolId: a.woolId, hp: a.hp, grow: a.growT, tamed: a.tamed, waiting: a.waiting, feather: a.feather })),
    // 挑战房的怪（noLoot）不走僵尸存档——它们由 challenge 字段自己恢复，存两份会刷双倍
    zombies: g.zombies.filter((z) => !z.noLoot).map((z) => ({ x: z.x, y: z.y, z: z.z, hp: z.hp, kind: z.kind === 'normal' ? undefined : z.kind })),
    drops: g.drops.map((d) => ({ id: d.itemId, count: d.count, x: d.x, y: d.y, z: d.z, age: d.age })),
    tanks: g.tanks.map((t) => ({ x: t.x, y: t.y, z: t.z, yaw: t.yaw, ammo: t.ammo })),
    warriors: g.warriors.filter((w) => !w.dead).map((w) => ({ tier: w.tier, x: w.x, y: w.y, z: w.z })),
    challenge: g.challenge.serialize(),
    learned: g.learned,
    golden: g.golden,
    paused: g.paused,
    dayTime: g.dayTime,
    date: { ...g.date },
    shopQuota: g.shopQuota,
    zombieAttack: g.zombieAttack,
    zombieSpawn: g.zombieSpawn,
  };
}

/** 还原：把存档里的东西一件件摆回去；返回出生点和选中的格子由调用方接 */
export function applySave(
  d: SaveData,
  into: { inv: Inventory; health: Health; hunger: Hunger; world: World; scene: THREE.Scene; animals: Animal[]; zombies: Zombie[]; drops: ItemDrop[]; tanks: Tank[]; challenge: Challenge; warriors: Warrior[] },
): { spawn: { x: number; y: number; z: number }; slot: number; learned: number[]; golden?: SaveData['golden']; paused: boolean; dayTime: number; date: GameDate; shopQuota: ShopQuota | undefined; zombieAttack: boolean; zombieSpawn: boolean; islandType: IslandType; everCreative: boolean; coins: number } {
  const { inv, health, hunger, world, scene, animals, zombies, drops, tanks, challenge, warriors } = into;
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
  hunger.value = Math.min(HUNGER.MAX, Math.max(0, d.hunger ?? HUNGER.MAX));
  hunger.enabled = d.hungerOn ?? false;
  world.applyDiffs(d.chunks);
  world.applyMeta(d.meta);
  // 玩家亲手种的蘑菇：位置认回来（入冬清场时留下）；还没长成的孢子苗重新计时，接着长
  world.applyPlayerMushrooms(d.playerMushrooms ?? []);
  world.resumeSpores(SPORE_PLANT_IDS, SPORE_GROW_SECONDS);
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
    const it = spawnDrop({ scene, drops }, dr.id, dr.count, dr.x, dr.y, dr.z);
    it.age = dr.age;
  }
  for (const t of d.tanks ?? []) {
    const tk = new Tank(t.x, t.y, t.z);
    tk.setPose(t.x, t.y, t.z, t.yaw);
    tk.ammo = t.ammo ?? 0; // 弹药舱剩几发也读回来
    tanks.push(tk);
    scene.add(tk.group);
  }
  challenge.restore(d.challenge); // 挑战房：房子认回来，打到一半接着打
  // 小战士：只认品质和位置，血是满的（死掉的没存进来）
  for (const w of d.warriors ?? []) {
    const warrior = new Warrior(w.tier, w.x, w.y, w.z);
    warriors.push(warrior);
    scene.add(warrior.group);
  }
  return {
    spawn: { ...d.spawn }, slot: d.slot, learned: d.learned ?? [], golden: d.golden,
    paused: d.paused ?? false, dayTime: d.dayTime ?? 0, date: normalizeDate(d.date), zombieAttack: d.zombieAttack ?? true, zombieSpawn: d.zombieSpawn ?? true,
    shopQuota: d.shopQuota,
    islandType: normalizeIslandType(d.islandType) ?? randomIslandType(),
    everCreative: Boolean(d.everCreative || d.mode === 'creative'),
    coins: d.coins ?? 0,
  };
}
