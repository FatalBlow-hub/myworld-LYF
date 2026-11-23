/** 狂野世界·植物机制 — 14 种狂野植物的攻击/生产/辅助逻辑（引擎每帧调 tickWild） */
import { PvzSim, Plant, Zombie } from './engine';
import {
  COLS, PLANTS, ZOMBIES, PlantKind, POTATO_DMG,
  WSUN_INT, WSUN_MIN, WPEA_RATE, WSHROOM_RATE, WSPIKE_RATE,
  WJUICE_SPRAY, WJUICE_CD, WJUICE_DELAY, WEVO_T, WEVO_AGE,
} from './data';

const WILD_KINDS: PlantKind[] = ['wsun','wpea','wnut','wdbl','wboom','wheal','wapple','wjuice','wthrow','wtorch','wpear','wshroom','wspike','wevo'];
export const isWild = (k: PlantKind): boolean => WILD_KINDS.includes(k);

/** 狂野植物每帧逻辑；返回 true = 已处理这株（引擎不用再走通用逻辑） */
export function tickWild(sim: PvzSim, p: Plant, dt: number, inRow: Zombie[]): boolean {
  switch (p.kind) {
    case 'wsun': { // 向野葵：22秒起步，每产一次-1秒，最低10秒
      p.prod = p.prod ?? WSUN_INT;
      if (p.t >= p.prod) { p.t = 0; sim.sunNear(p, 25); p.prod = Math.max(WSUN_MIN, p.prod - 1); }
      return true;
    }
    case 'wpea': { // 扬刀豌豆：每发+2%攻速
      if (inRow.length && p.t >= 1.4 / (1 + WPEA_RATE * (p.turbo ?? 0))) {
        p.t = 0; p.turbo = (p.turbo ?? 0) + 1;
        sim.projs.push({ kind: 'pea', row: p.row, x: p.col + 0.4, vx: 3.5, tx: COLS + 1, dmg: 1 });
      }
      return true;
    }
    case 'wnut': // 青龙坚果：每5秒回1血
      if (p.t >= 5) { p.t = 0; p.hp = Math.min(PLANTS.wnut.hp, p.hp + 1); }
      return true;
    case 'wdbl': // 多发豌豆：一次两颗
      if (inRow.length && p.t >= sim.atkInterval(1.4)) {
        p.t = 0;
        for (let n = 0; n < 2; n++) sim.projs.push({ kind: 'pea', row: p.row, x: p.col + 0.4 + n * 0.15, vx: 3.5, tx: COLS + 1, dmg: 1 });
      }
      return true;
    case 'wheal': { // 治疗桃子：每5秒给3×3植物回1血
      if (p.t >= 5) {
        p.t = 0;
        for (const q of sim.plants) if (Math.abs(q.row - p.row) <= 1 && Math.abs(q.col - p.col) <= 1) q.hp = Math.min(PLANTS[q.kind].hp, q.hp + 1);
      }
      return true;
    }
    case 'wapple': { // 苹果守卫：近战打前1~2格，每秒1次2伤害
      if (p.t >= 1) {
        p.t = 0;
        const t = sim.zombies.find((z) => !z.dead && z.row === p.row && z.x > p.col && z.x - p.col <= 2.5 && z.x < COLS);
        if (t) sim.hurt(t, 2);
      }
      return true;
    }
    case 'wjuice': { // 橙子汁喷手：前方3格有僵尸→等0.5秒喷3秒（每0.5秒3伤）→冷却15秒
      p.spray = p.spray ?? 0;
      if (p.spray === 0) { // 侦察
        if (inRow.some((z) => z.x - p.col <= 3.5)) { p.spray = 1; p.t = 0; }
      } else if (p.spray === 1 && p.t >= WJUICE_DELAY) { p.spray = 2; p.t = 0; }
      else if (p.spray === 2) {
        if (p.t >= WJUICE_SPRAY) { p.spray = 3; p.t = 0; }
        else if (Math.floor(p.t / 0.5) !== Math.floor((p.t - dt) / 0.5)) {
          for (const z of sim.zombies) if (!z.dead && z.row === p.row && z.x > p.col && z.x - p.col <= 3.5) sim.hurt(z, 3);
        }
      } else if (p.spray === 3 && p.t >= WJUICE_CD) { p.spray = 0; p.t = 0; }
      return true;
    }
    case 'wthrow': { // 柿子投手：1.5秒一发抛物线1.25伤
      if (inRow.length && p.t >= sim.atkInterval(1.5)) {
        p.t = 0;
        const z = inRow.sort((a, b) => a.x - b.x)[0];
        sim.projs.push({ kind: 'knife', row: p.row, x: p.col, vx: 0, tx: z.x, dmg: 1.25 });
      }
      return true;
    }
    case 'wshroom': { // 狂野菇：0.75伤，每发+5%攻速
      if (inRow.length && p.t >= 1.4 / (1 + WSHROOM_RATE * (p.turbo ?? 0))) {
        p.t = 0; p.turbo = (p.turbo ?? 0) + 1;
        sim.projs.push({ kind: 'pea', row: p.row, x: p.col + 0.4, vx: 3.5, tx: COLS + 1, dmg: 0.75 });
      }
      return true;
    }
    case 'wspike': { // 猛猖地刺：每打一下+3%攻速
      const int = 0.5 / (1 + WSPIKE_RATE * (p.turbo ?? 0));
      if (p.t >= int) {
        p.t = 0;
        const t = sim.zombies.filter((z) => !z.dead && z.row === p.row && Math.abs(z.x - p.col) < 0.5 && !ZOMBIES[z.kind].flying);
        if (t.length) { p.turbo = (p.turbo ?? 0) + 1; for (const z of t) { if (z.kind === 'bike') { sim.hurt(z, 999); p.hp = 0; } else sim.hurt(z, 1); } }
      }
      return true;
    }
    case 'wevo': { // 进化菇：3阶段升阶火球（2倍豌豆伤）
      p.age = (p.age ?? 0) + dt;
      const stage = p.age >= WEVO_AGE[0] + WEVO_AGE[1] ? 2 : p.age >= WEVO_AGE[0] ? 1 : 0;
      p.stage = stage;
      if (inRow.length && p.t >= WEVO_T[stage]) {
        p.t = 0;
        sim.projs.push({ kind: 'fire', row: p.row, x: p.col + 0.4, vx: 3.5, tx: COLS + 1, dmg: 2 });
      }
      return true;
    }
    default: return false;
  }
}

/** 狂野坚果类死亡/火炬、梨炬子弹穿透：在引擎对应位置调用 */
export function wildDeath(sim: PvzSim, p: Plant): void {
  if (p.kind !== 'wboom' || !sim.wild) return;
  for (const z of sim.zombies) if (!z.dead && Math.abs(z.row - p.row) <= 1 && Math.abs(z.x - p.col) <= 1.5 && !ZOMBIES[z.kind].flying) sim.hurt(z, POTATO_DMG);
  sim.pushLog('爆炸坚果炸了！');
}

/** 子弹穿过火炬→火球(1.5×)，穿过梨炬→梨果(2倍)；返回是否变了 */
export function wildTorchPass(sim: PvzSim, kind: string, row: number, prevX: number, x: number, dmg: number): { kind: string; dmg: number } {
  for (const tp of sim.plants) {
    if (tp.row !== row || tp.col < prevX || tp.col >= x) continue;
    if (tp.kind === 'wtorch' && kind !== 'fire' && kind !== 'pear') return { kind: 'fire', dmg: Math.max(1, dmg * 1.5) };
    if (tp.kind === 'wpear' && (kind === 'pea' || kind === 'fire')) return { kind: 'pear', dmg: 2 };
  }
  return { kind, dmg };
}
