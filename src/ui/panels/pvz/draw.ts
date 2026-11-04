/** 植物大战僵尸·画布渲染 — 卡片栏/草坪/植物/僵尸/弹道/阳光/助力卡/腐败球/播报 */

import { COLS, ROWS, PLANTS, ZOMBIES, CARDS } from './data';
import { PvzSim, Plant, Zombie, SunToken } from './engine';

export const PVZ_W = 640, PVZ_H = 400;
const CARD_H = 46;          // 顶部卡片栏高
const GX = 90, GY = 60;     // 草坪左上角
const CW = 56, CH = 62;     // 格子宽高（9×56=504，5×62=310）
const BOOST_H = 34;         // 助力卡条高（屏幕底右）

/** 植物卡的排布：卡多就自动挤一挤，保证全部塞得进屏幕 */
function cardLayout(sim: PvzSim): { x0: number; step: number; w: number } {
  const x0 = 64;
  const step = Math.min(44, (PVZ_W - x0 - 8) / Math.max(1, sim.cards.length));
  return { x0, step, w: step - 4 };
}

export function cellAt(mx: number, my: number): { row: number; col: number } | null {
  const col = Math.floor((mx - GX) / CW), row = Math.floor((my - GY) / CH);
  return row >= 0 && row < ROWS && col >= 0 && col < COLS ? { row, col } : null;
}
/** 卡片栏命中测试：返回卡片序号（对应 sim.cards 下标） */
export function cardAt(sim: PvzSim, mx: number, my: number): number {
  if (my < 4 || my > 4 + 38) return -1;
  const { x0, step, w } = cardLayout(sim);
  for (let i = 0; i < sim.cards.length; i++) {
    const x = x0 + i * step;
    if (mx >= x && mx <= x + w) return i;
  }
  return -1;
}
/** 助力卡命中测试：返回 pendingCards 下标 */
export function boostAt(sim: PvzSim, mx: number, my: number): number {
  if (my < PVZ_H - BOOST_H - 4 || my > PVZ_H - 4) return -1;
  for (let i = 0; i < sim.pendingCards.length; i++) {
    const x = PVZ_W - 8 - (i + 1) * 76;
    if (mx >= x && mx <= x + 72) return i;
  }
  return -1;
}
/** 阳光命中测试 */
export function sunAt(sim: PvzSim, mx: number, my: number): SunToken | null {
  return sim.suns.find((s) => Math.hypot(mx - (GX + s.col * CW + CW / 2), my - (GY + s.row * CH + CH / 2)) < 22) ?? null;
}

export function drawPvz(c: CanvasRenderingContext2D, sim: PvzSim, sel: number, boostSel: number, levelNo: number): void {
  // 背景：白天草地
  c.fillStyle = '#2a5424';
  c.fillRect(0, 0, PVZ_W, PVZ_H);
  // 草坪格子
  for (let r = 0; r < ROWS; r++) for (let col = 0; col < COLS; col++) {
    c.fillStyle = (r + col) % 2 ? '#4a8038' : '#55a044';
    c.fillRect(GX + col * CW, GY + r * CH, CW - 1, CH - 1);
  }
  // 房子线（最左一列内缘）
  c.fillStyle = '#5a7a4a';
  c.fillRect(GX - 6, GY, 4, ROWS * CH);

  // 阳光（天上掉的 + 植物产的，点一个收一个）
  for (const s of sim.suns) {
    const x = GX + s.col * CW + CW / 2, y = GY + s.row * CH + CH / 2;
    c.fillStyle = '#f0d43a';
    c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#a87a10';
    c.font = 'bold 11px sans-serif'; c.textAlign = 'center';
    c.fillText(String(s.value), x, y + 4);
  }
  // 植物
  for (const p of sim.plants) drawPlant(c, p);
  // 僵尸
  for (const z of sim.zombies) if (!z.dead && z.state !== 'gone') drawZombie(c, z);
  // 腐败球
  for (const b of sim.balls) {
    const x = GX + b.x * CW + CW / 2, y = GY + b.row * CH + CH / 2;
    c.fillStyle = '#3a1a4a';
    c.beginPath(); c.arc(x, y, 13, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#8a4ac8'; c.lineWidth = 2;
    c.beginPath(); c.arc(x, y, 13, 0, Math.PI * 2); c.stroke(); c.lineWidth = 1;
    c.fillStyle = '#fff'; c.font = '9px sans-serif'; c.textAlign = 'center';
    c.fillText(String(b.hp), x, y + 3);
  }
  // 弹道
  for (const pr of sim.projs) {
    const x = GX + pr.x * CW + CW / 2, y = GY + pr.row * CH + CH / 2 - 6;
    c.fillStyle = pr.kind === 'ice' ? '#9adcf8' : pr.kind === 'venom' ? '#3a9a2a'
      : pr.kind === 'knife' ? '#e8823a' : pr.kind === 'arrow' ? '#5ad8a8' : pr.kind === 'bomb' ? '#f8f8d8' : '#5ec84a';
    c.beginPath(); c.arc(x, y, pr.kind === 'knife' || pr.kind === 'bomb' ? 6 : 4, 0, Math.PI * 2); c.fill();
  }
  // 顶部：阳光数 + 植物卡栏 + 关卡/播报
  c.fillStyle = 'rgba(0,0,0,.55)';
  c.fillRect(0, 0, PVZ_W, CARD_H);
  c.fillStyle = '#f0d43a'; c.font = 'bold 18px sans-serif'; c.textAlign = 'left';
  c.fillText(`☀️ ${Math.floor(sim.sun)}`, 6, 30);
  c.fillStyle = '#fff'; c.font = '13px sans-serif';
  c.fillText(`第 ${levelNo} 关 · 第 ${sim.wave}/${sim.level.waves.length} 波`, 6, 44);
  const { x0, step, w } = cardLayout(sim);
  sim.cards.forEach((k, i) => {
    const x = x0 + i * step, d = PLANTS[k];
    const afford = (sim.freeNext || sim.sun >= d.cost) && sim.cardCd[k] <= 0;
    c.fillStyle = sel === i ? '#ffe97a' : afford ? d.color : '#555';
    c.fillRect(x, 4, w, 38);
    c.fillStyle = '#fff'; c.font = `${w < 34 ? 8 : 10}px sans-serif`; c.textAlign = 'center';
    c.fillText(d.cn.slice(0, w < 34 ? 2 : 4), x + w / 2, 17);
    c.fillText(sim.freeNext ? '0' : `${d.cost}`, x + w / 2, 30);
    if (sim.cardCd[k] > 0) { c.fillStyle = '#8af'; c.fillText(`${Math.ceil(sim.cardCd[k])}s`, x + w / 2, 40); }
  });
  // 助力卡：屏幕底右侧一排，点卡再点草坪格激活
  sim.pendingCards.forEach((k, i) => {
    const x = PVZ_W - 8 - (i + 1) * 76, y = PVZ_H - BOOST_H - 4;
    const d = CARDS[k];
    c.fillStyle = boostSel === i ? '#ffe97a' : d.color;
    c.fillRect(x, y, 72, BOOST_H);
    c.fillStyle = '#222'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center';
    c.fillText(d.cn, x + 36, y + 14);
    c.font = '8px sans-serif';
    c.fillText(d.desc.slice(0, 10), x + 36, y + 27);
  });
  // 增益计时 + 播报
  c.fillStyle = '#8af'; c.font = '10px sans-serif'; c.textAlign = 'left';
  const buffs: string[] = [];
  if (sim.sunRateT > 0) buffs.push(`产速×2 ${Math.ceil(sim.sunRateT)}s`);
  if (sim.atkRateT > 0) buffs.push(`攻速×2 ${Math.ceil(sim.atkRateT)}s`);
  if (sim.freeNext) buffs.push('下一株免费');
  if (buffs.length) c.fillText(buffs.join(' · '), 8, CARD_H + 12);
  c.fillStyle = '#ffe97a'; c.font = 'bold 14px sans-serif';
  const last = sim.log[sim.log.length - 1];
  if (last) c.fillText(last, 8, PVZ_H - 8);
}

function drawPlant(c: CanvasRenderingContext2D, p: Plant): void {
  const x = GX + p.col * CW + CW / 2, y = GY + p.row * CH + CH / 2;
  c.fillStyle = PLANTS[p.kind].color;
  if (p.kind === 'potato' && !p.armed) {
    // 未成型：只有信号灯
    c.fillStyle = '#5a4a2a'; c.fillRect(x - 3, y - 14, 6, 14);
    c.fillStyle = '#e83a3a'; c.beginPath(); c.arc(x, y - 16, 4, 0, Math.PI * 2); c.fill();
  } else {
    c.beginPath(); c.arc(x, y, 14, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(0,0,0,.35)'; c.font = '9px sans-serif'; c.textAlign = 'center';
    c.fillText(PLANTS[p.kind].cn.slice(0, 2), x, y + 3);
  }
  // 南瓜壳
  if ((p.pumpkin ?? 0) > 0) {
    c.strokeStyle = '#e88a2a'; c.lineWidth = 4;
    c.strokeRect(x - 18, y - 18, 36, 36); c.lineWidth = 1;
  }
  if (p.laddered) { c.fillStyle = '#c8a85a'; c.fillRect(x - 10, y - 18, 3, 36); c.fillRect(x + 7, y - 18, 3, 36); }
  if ((p.chew ?? 0) > 0) { c.fillStyle = '#fff'; c.font = '9px sans-serif'; c.fillText('嚼…', x, y - 20); }
}

function drawZombie(c: CanvasRenderingContext2D, z: Zombie): void {
  const d = ZOMBIES[z.kind];
  const x = GX + z.x * CW + CW / 2, base = GY + z.row * CH + CH - 6;
  const big = z.kind === 'white' || z.kind === 'red' || z.kind === 'mech';
  const h = big ? 46 : 30;
  c.fillStyle = z.charm ? '#e87ab8' : z.freezeT > 0 ? '#7ab8e8' : d.color;
  c.fillRect(x - (big ? 16 : 10), base - h, big ? 32 : 20, h);
  // 眼睛
  c.fillStyle = z.charm ? '#3a8ae8' : z.kind === 'red' ? '#f00' : '#fff';
  c.fillRect(x - 5, base - h + 6, 4, 4); c.fillRect(x + 2, base - h + 6, 4, 4);
  c.fillStyle = '#222'; c.font = '9px sans-serif'; c.textAlign = 'center';
  c.fillText(d.cn.slice(0, 3), x, base - h - 4);
  // 减速/中毒/冰冻标记
  if (z.slowT > 0) { c.fillStyle = '#9adcf8'; c.fillRect(x - 10, base - h - 8, 20, 3); }
  if (z.poisonT > 0) { c.fillStyle = '#3a9a2a'; c.fillRect(x - 10, base - h - 12, 20, 3); }
  if (z.kind === 'balloon') { c.fillStyle = '#c85a8a'; c.beginPath(); c.arc(x, base - h - 12, 8, 0, Math.PI * 2); c.fill(); }
  // 血条
  const full = ZOMBIES[z.kind].hp;
  c.fillStyle = '#000'; c.fillRect(x - 12, base - h - 6, 24, 3);
  c.fillStyle = '#5ec84a'; c.fillRect(x - 12, base - h - 6, 24 * Math.max(0, z.hp / full), 3);
}
