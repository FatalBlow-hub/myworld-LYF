/** PVZ 助力卡效果 — 从 engine.ts 拆出的卡面逻辑（控制文件行数） */
import type { PvzSim } from './engine';
import {
  ROWS, COLS, PLANTS, CARDS, CardKind, PlantKind,
  SUN_RATE_T, ATK_RATE_T, DAYTIME_T, HOURGLASS_DELAY, WIND_PUSH,
} from './data';

/** 使用一张助力卡（一次性生效），返回提示文案 */
export function applyCard(sim: PvzSim, kind: CardKind): string {
  const d = CARDS[kind];
  switch (kind) {
    case 'sun150': sim.sun += 150; break;
    case 'sunRate': sim.sunRateT = Math.max(sim.sunRateT, SUN_RATE_T); break;
    case 'daytime':
      sim.sunRateT = Math.max(sim.sunRateT, DAYTIME_T);
      for (const z of sim.zombies) if (!z.dead && z.kind === 'balloon') sim.popBalloon(z);
      break;
    case 'atkRate': sim.atkRateT = Math.max(sim.atkRateT, ATK_RATE_T); break;
    case 'nutDrop': dropPlant(sim, 'nut'); break;
    case 'peaDrop': dropPlant(sim, 'pea'); break;
    case 'tntDrop': dropPlant(sim, 'potato'); break;
    case 'freeze': sim.freezeAll(); break;
    case 'hourglass': if (sim.wave < sim.level.waves.length) sim.waveWait += HOURGLASS_DELAY; break;
    case 'wind':
      for (const z of sim.zombies) {
        if (z.dead || z.kind === 'white' || z.kind === 'red' || z.kind === 'diamond' || z.kind === 'mech') continue;
        z.x += WIND_PUSH;
      }
      break;
    case 'freePlant': sim.freeNext = true; break;
  }
  return `用了助力卡「${d.cn}」！`;
}

/** 随机两个空格子白送一棵植物 */
function dropPlant(sim: PvzSim, kind: PlantKind): void {
  const empty: [number, number][] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!sim.plantAt(r, c)) empty.push([r, c]);
  for (let n = 0; n < 2 && empty.length; n++) {
    const [r, c] = empty.splice(Math.floor(Math.random() * empty.length), 1)[0];
    sim.plants.push({ kind, row: r, col: c, hp: PLANTS[kind].hp, t: 0, chew: 0 });
  }
}
