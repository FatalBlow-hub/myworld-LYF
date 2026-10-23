/** 挑战房 — 5×5×5 石头壳 + 3×3×3 打怪房：
 *  盖：拿"挑战房"道具对 5×5 平地按 L，上面 7 层要全空、场内不能有活物；
 *  玩：对着门按 M 交 10 生肉门票进屋开打，4 关全清拿大奖；
 *  规矩：中途开门＝放弃（门票白交、怪消失，人放到门外）；打死了也一样；
 *        存档里记着打到第几关，半路退出游戏回来接着打 */

import * as THREE from 'three';
import { CHALLENGE } from '../config';
import {
  AIR, BLUE_SHARD, CHALLENGE_DOOR, CHALLENGE_STONE, GOLD_NUGGET,
  IRON_NUGGET, RAW_MEAT, RICE_GRAIN, isSolid,
} from '../world/Block';
import { World } from '../world/World';
import { BlockHit } from '../interact/BlockPicker';
import { PlayerBody } from '../player/Physics';
import { Inventory } from '../player/Inventory';
import { Hud } from '../ui/Hud';
import { Mobs } from '../entities/Mobs';
import { Zombie, ZombieKind } from '../entities/Zombie';

/** 一座盖好的挑战房：x/y/z = 地面左下角那格；dx/dy/dz = 门下格 */
interface House { x: number; y: number; z: number; dx: number; dy: number; dz: number }
/** 正在打的挑战 */
interface Fight { house: House; wave: number; mobs: Zombie[] }
/** 存档格式 */
export interface ChallengeSave {
  houses: { x: number; y: number; z: number; dx: number; dy: number; dz: number }[];
  fight: { x: number; y: number; z: number; wave: number } | null;
}

/** 四关怪：种类、数量、播报名 */
const WAVES: [ZombieKind, number, string][] = [
  ['normal', 2, '2 只僵尸'],
  ['blood', 2, '2 只血尸'],
  ['corrupt', 2, '2 只腐败人'],
  ['star', 2, '2 只星空尸'],
];
/** 通关大奖：64 稻粒 + 10 铁粒 + 3 金粒 + 1 蓝钻石碎 */
const REWARD: [number, number][] = [[RICE_GRAIN, 64], [IRON_NUGGET, 10], [GOLD_NUGGET, 3], [BLUE_SHARD, 1]];
/** 屋里刷怪的格子（3×3 内圈，居中是玩家站位） */
const SPAWN_CELLS: [number, number][] = [[1, 1], [3, 1], [1, 3], [3, 3], [2, 2]];
const keyOf = (h: House) => `${h.x},${h.y},${h.z}`;

export class Challenge {
  /** 盖过的所有挑战房（存门的位置，按 M 时认门用） */
  private houses = new Map<string, House>();
  /** 正在进行的挑战（一次只能打一间） */
  private fight: Fight | null = null;
  /** 第一次按 M 后的确认窗口 */
  private pendingKey = '';
  private pendingT = 0;

  constructor(private scene: THREE.Scene, private mobs: Mobs, private onWin: () => void = () => {}) {}

  get active(): boolean { return this.fight !== null; }

  /** L 盖房：指着的那格当 5×5 中心；要平地、7 层全空、没活物 */
  build(world: World, hit: BlockHit | null, body: PlayerBody, hud: Hud): boolean {
    if (!hit) return false;
    const S = CHALLENGE.SIZE;
    const ox = hit.x - 2, oy = hit.y, oz = hit.z - 2;
    for (let dx = 0; dx < S; dx++) for (let dz = 0; dz < S; dz++) {
      if (!isSolid(world.getBlock(ox + dx, oy, oz + dz))) {
        hud.showMessage('要 5×5 全是实地才能盖挑战房');
        return false;
      }
      for (let dy = 1; dy <= CHALLENGE.CLEAR; dy++) {
        if (world.getBlock(ox + dx, oy + dy, oz + dz) !== AIR) {
          hud.showMessage('上面 7 层要全空，草和水都不能有');
          return false;
        }
      }
    }
    const inBox = (m: { x: number; y: number; z: number }) =>
      m.x >= ox && m.x < ox + S && m.z >= oz && m.z < oz + S && m.y >= oy && m.y < oy + CHALLENGE.CLEAR;
    if ([...this.mobs.animals, ...this.mobs.zombies].some(inBox)) {
      hud.showMessage('场地上有活物，先把它们赶走');
      return false;
    }
    // 盖壳：底+顶+四面墙，里面空心 3×3×3（y+2 ~ y+4）
    for (let dx = 0; dx < S; dx++) for (let dy = 1; dy <= S; dy++) for (let dz = 0; dz < S; dz++) {
      if (dx === 0 || dx === S - 1 || dz === 0 || dz === S - 1 || dy === 1 || dy === S) {
        world.setBlock(ox + dx, oy + dy, oz + dz, CHALLENGE_STONE);
      }
    }
    // 门开在哪面墙：看玩家站哪边，就开在朝玩家那面
    const h: House = { x: ox, y: oy, z: oz, dx: 0, dy: 0, dz: 0 };
    const px = body.x - (ox + 2.5), pz = body.z - (oz + 2.5);
    if (Math.abs(px) > Math.abs(pz)) {
      h.dx = px > 0 ? ox + S - 1 : ox; h.dz = oz + 2;
    } else {
      h.dx = ox + 2; h.dz = pz > 0 ? oz + S - 1 : oz;
    }
    h.dy = oy + 2; // 门下格在第二层，上门框第三层（屋内地面是 y+1 那层石板）
    for (const dy of [h.dy, h.dy + 1]) world.setBlock(h.dx, dy, h.dz, CHALLENGE_DOOR);
    this.houses.set(keyOf(h), h);
    hud.showMessage(`挑战房盖好啦！对着门按 M 交 ${CHALLENGE.MEAT_COST} 生肉开打`, 3);
    return true;
  }

  /** 对着挑战门按 M：门票确认 / 进屋 / 没事干免费出来 */
  useDoor(hitX: number, hitY: number, hitZ: number, body: PlayerBody, inv: Inventory, hud: Hud): void {
    const h = [...this.houses.values()].find((h) =>
      h.dx === hitX && h.dz === hitZ && (h.dy === hitY || h.dy + 1 === hitY));
    if (!h) return;
    const cx = h.x + 2.5, cz = h.z + 2.5;
    const inside = Math.abs(body.x - cx) < 2 && Math.abs(body.z - cz) < 2 && body.y >= h.y + 1 && body.y < h.y + 5;
    if (this.fight) {
      // 打架中开门 = 放弃这次挑战：怪清场、门票不退，人放到门外（门里门外都能按）
      const atDoor = Math.abs(body.x - cx) < 2.6 && Math.abs(body.z - cz) < 2.6 && body.y >= h.y && body.y < h.y + 5;
      if (!atDoor) { hud.showMessage('挑战还在进行，进屋打完才能再开'); return; }
      this.endFight();
      const out = this.outsideSpot(h);
      body.x = out.x; body.y = out.y; body.z = out.z; body.vy = 0;
      hud.showMessage('开门出来了：这次挑战算放弃，门票不退、怪都跑了');
      return;
    }
    if (inside) {
      // 屋里没打架：免费放你出来（门票只管进不管出）
      const out = this.outsideSpot(h);
      body.x = out.x; body.y = out.y; body.z = out.z; body.vy = 0;
      hud.showMessage('出来了！想挑战再按 M 交门票');
      return;
    }
    if (inv.countOf(RAW_MEAT) < CHALLENGE.MEAT_COST) {
      hud.showMessage(`门票要 ${CHALLENGE.MEAT_COST} 生肉，你只有 ${inv.countOf(RAW_MEAT)} 个`);
      return;
    }
    if (this.pendingKey !== keyOf(h) || this.pendingT <= 0) {
      this.pendingKey = keyOf(h);
      this.pendingT = CHALLENGE.CONFIRM_SECONDS;
      hud.showMessage(`进去打 4 关怪！门票 ${CHALLENGE.MEAT_COST} 生肉，再按 M 确认（中途开门＝放弃，门票不退）`, 3.5);
      return;
    }
    // 确认：收门票、传送进屋、放第一关
    inv.take(RAW_MEAT, CHALLENGE.MEAT_COST);
    this.pendingKey = ''; this.pendingT = 0;
    body.x = cx; body.y = h.y + 2; body.z = cz; body.vx = body.vy = body.vz = 0;
    this.startWave(h, 1, hud);
  }

  /** 每帧：确认窗口倒计时 + 这关清完放下一关 + 全清发奖 */
  update(dt: number, body: PlayerBody, inv: Inventory, hud: Hud): void {
    this.pendingT = Math.max(0, this.pendingT - dt);
    const f = this.fight;
    if (!f || !f.mobs.every((z) => z.dead)) return;
    if (f.wave < WAVES.length) {
      this.startWave(f.house, f.wave + 1, hud);
      return;
    }
    for (const [id, n] of REWARD) inv.add(id, n);
    hud.showMessage('挑战成功！奖品：64 稻粒 + 10 铁粒 + 3 金粒 + 1 蓝钻石碎！', 4);
    this.onWin();
    const out = this.outsideSpot(f.house);
    body.x = out.x; body.y = out.y; body.z = out.z; body.vy = 0;
    this.fight = null;
  }

  /** 玩家在挑战中死了：怪清场、门票没收、房变回闲的 */
  onPlayerDeath(hud: Hud): void {
    if (!this.fight) return;
    this.endFight();
    hud.showMessage('挑战失败！门票没了，怪也跑了');
  }

  /** 结束当前挑战：房里剩下的怪清场，房变回空闲（打输了 / 主动开门放弃共用） */
  private endFight(): void {
    const f = this.fight;
    if (!f) return;
    for (const z of f.mobs) {
      if (!z.dead) this.scene.remove(z.group);
      this.mobs.zombies = this.mobs.zombies.filter((x) => x !== z);
    }
    this.fight = null;
  }

  /** 存：盖过的房 + 打到第几关 */
  serialize(): ChallengeSave {
    return {
      houses: [...this.houses.values()].map((h) => ({ ...h })),
      fight: this.fight ? { x: this.fight.house.x, y: this.fight.house.y, z: this.fight.house.z, wave: this.fight.wave } : null,
    };
  }

  /** 读：房子认回来；存档时正在打的，从那一关重新放怪接着打 */
  restore(d: ChallengeSave | undefined): void {
    for (const h of d?.houses ?? []) this.houses.set(`${h.x},${h.y},${h.z}`, { ...h });
    if (d?.fight) {
      const h = this.houses.get(`${d.fight.x},${d.fight.y},${d.fight.z}`);
      if (h) this.startWave(h, d.fight.wave);
    }
  }

  /** 放一关怪：内圈四角刷出，打上"不掉东西"标记；读档恢复时不用喊话（hud 可省） */
  private startWave(h: House, wave: number, hud?: Hud): void {
    const [kind, n, label] = WAVES[wave - 1];
    const spawned: Zombie[] = [];
    for (let i = 0; i < n; i++) {
      const [cx, cz] = SPAWN_CELLS[i % SPAWN_CELLS.length];
      const z = new Zombie(h.x + cx + 0.5, h.y + 2, h.z + cz + 0.5, kind);
      z.noLoot = true; // 挑战房的怪打死了什么都没有
      z.inChallenge = true; // 只认玩家：不追小战士，也不被小战士砍
      spawned.push(z);
      this.mobs.zombies.push(z);
      this.scene.add(z.group);
    }
    this.fight = { house: h, wave, mobs: spawned };
    hud?.showMessage(`第 ${wave} 关：${label}！打完不许跑`, 2.5);
  }

  /** 门外一格的落脚点（放人出来 / 发完奖赶出去用） */
  private outsideSpot(h: House): { x: number; y: number; z: number } {
    let x = h.dx + 0.5, z = h.dz + 0.5;
    if (h.dx === h.x) x = h.x - 0.5;
    else if (h.dx === h.x + CHALLENGE.SIZE - 1) x = h.x + CHALLENGE.SIZE + 0.5;
    if (h.dz === h.z) z = h.z - 0.5;
    else if (h.dz === h.z + CHALLENGE.SIZE - 1) z = h.z + CHALLENGE.SIZE + 0.5;
    return { x, y: h.dy, z };
  }
}
