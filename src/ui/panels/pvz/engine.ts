/** 植物大战僵尸·模拟引擎 — 无 DOM 的纯逻辑：格子/麦粒/植物/僵尸/弹道/波次
 *
 *  坐标口径：列是整数格子（0..8），僵尸 x 是浮点列号，从右往左走（x 变小）。
 *  5 行 9 列，左边是家——任何僵尸 x<0 就输。 */

import {
  COLS, ROWS, PLANTS, ZOMBIES, PlantKind, ZKind, LevelDef,
  START_SUN, SKY_SUN_EVERY, SKY_SUN_LIVE, SUN_VALUE, SUNFLOWER_EVERY,
  POTATO_ARM, CHOMPER_CHEW, WAVE_GAP, FIRST_WAVE, unlockedCards,
} from './data';

export interface Plant { kind: PlantKind; row: number; col: number; hp: number; t: number; armed?: boolean; chew?: number; pumpkin?: number; laddered?: boolean }
export interface Zombie { kind: ZKind; row: number; x: number; hp: number; slowT: number; poisonT: number; eatT: number; state: string; charm?: boolean; grabbed?: { row: number; col: number }; stompT?: number; dead?: boolean }
export interface Proj { kind: 'pea' | 'ice' | 'venom' | 'knife'; row: number; x: number; vx: number; tx: number; dmg: number }
export interface SunToken { row: number; col: number; live: number }

export type SimResult = 'play' | 'win' | 'lose';

export class PvzSim {
  sun = START_SUN;
  elapsed = 0;
  wave = 0;                    // 已经放出去几波（0=还没刷）
  private waveWait = FIRST_WAVE;
  plants: Plant[] = [];
  zombies: Zombie[] = [];
  projs: Proj[] = [];
  suns: SunToken[] = [];
  cards: PlantKind[];
  cardCd: Record<string, number> = {};
  result: SimResult = 'play';
  kills = 0;
  log: string[] = [];          // 最近的战斗播报（面板上方滚动条）

  constructor(public level: LevelDef, doneLevels: number) {
    this.cards = unlockedCards(doneLevels);
    for (const k of this.cards) this.cardCd[k] = 0;
  }

  plantAt(row: number, col: number): Plant | undefined {
    return this.plants.find((p) => p.row === row && p.col === col);
  }

  /** 点卡片再点格子。返回失败原因（null=种下了） */
  plant(kind: PlantKind, row: number, col: number): string | null {
    const d = PLANTS[kind];
    if (this.sun < d.cost) return '麦粒不够';
    if (this.cardCd[kind] > 0) return '还在冷却';
    const cur = this.plantAt(row, col);
    if (kind === 'pumpkin') {
      if (!cur || cur.kind === 'pumpkin' || cur.pumpkin != null) return '要套在别的植物上';
    } else if (cur) return '这格有植物了';
    this.sun -= d.cost;
    this.cardCd[kind] = d.cd;
    if (kind === 'melon') {
      // 变身西瓜：随机变成本局已解锁的植物（变身西瓜自己除外）
      const pool = this.cards.filter((k) => k !== 'melon');
      kind = pool[Math.floor(Math.random() * pool.length)] ?? 'pea';
      this.pushLog(`变身西瓜变成了${PLANTS[kind].cn}！`);
    }
    if (kind === 'pumpkin' && cur) { cur.pumpkin = PLANTS.pumpkin.hp; return null; }
    this.plants.push({ kind, row, col, hp: PLANTS[kind].hp, t: 0, chew: 0 });
    return null;
  }

  /** 点天上掉下来的麦粒收起来 */
  collectSun(s: SunToken): void { this.sun += SUN_VALUE; this.suns.splice(this.suns.indexOf(s), 1); }

  private pushLog(t: string): void { this.log.push(t); if (this.log.length > 3) this.log.shift(); }

  private spawnWave(): void {
    const w = this.level.waves[this.wave];
    if (!w) return;
    let i = 0;
    for (const [kind, n] of Object.entries(w) as [ZKind, number][]) {
      for (let k = 0; k < n; k++) {
        const z: Zombie = {
          kind, row: Math.floor(Math.random() * ROWS), x: COLS + 0.5 + (i++) * 0.4,
          hp: ZOMBIES[kind].hp, slowT: 0, poisonT: 0, eatT: 0, state: 'walk', stompT: 7,
        };
        if (kind === 'bungee') this.bungeeDrop(z);
        else if (kind === 'digger') z.state = 'dig';
        this.zombies.push(z);
      }
    }
    this.wave++;
    this.waveWait = WAVE_GAP;
    this.pushLog(`第 ${this.wave} 波来了！`);
  }

  /** 蹦极僵尸：挑一棵植物吊下来抓（有香菇保护伞罩着就抓不了） */
  private bungeeDrop(z: Zombie): void {
    const targets = this.plants.filter((p) => p.kind !== 'spike');
    const t = targets[Math.floor(Math.random() * targets.length)];
    if (!t) { z.kind = 'corrupt'; z.state = 'walk'; z.hp = ZOMBIES.corrupt.hp; return; }
    z.grabbed = { row: t.row, col: t.col };
    z.row = t.row; z.x = t.col;
    z.state = 'drop';
  }

  update(dt: number): void {
    if (this.result !== 'play') return;
    this.elapsed += dt;
    // 波次：一波没清完最多等 WAVE_GAP 秒就下一波；BOSS 关杂兵按波走
    if (this.wave < this.level.waves.length) {
      this.waveWait -= dt;
      const waveZombies = this.zombies.filter((z) => !z.dead && z.kind !== 'mech' && z.kind !== 'corrupt');
      if (this.waveWait <= 0 || (this.wave > 0 && waveZombies.length === 0)) this.spawnWave();
    }
    for (const k in this.cardCd) if (this.cardCd[k] > 0) this.cardCd[k] -= dt;
    // 天上掉麦粒
    if ((this.elapsed % SKY_SUN_EVERY) < dt) this.suns.push({ row: Math.floor(Math.random() * ROWS), col: Math.floor(Math.random() * COLS), live: SKY_SUN_LIVE });
    for (const s of this.suns) s.live -= dt;
    this.suns = this.suns.filter((s) => s.live > 0);
    this.tickPlants(dt);
    this.tickZombies(dt);
    this.tickProjs(dt);
    // 输赢判定
    if (this.zombies.some((z) => !z.dead && z.x < 0.1 && z.state !== 'gone' && !z.charm)) this.result = 'lose';
    const addsLeft = this.level.waves.length - this.wave;
    if (addsLeft <= 0 && this.zombies.every((z) => z.dead)) {
      if (this.level.boss && !this.plants.length) { /* BOSS 关也别因为清场错判 */ }
      this.result = 'win';
    }
  }

  private tickPlants(dt: number): void {
    for (const p of this.plants) {
      p.t += dt;
      const ahead = (z: Zombie) => !z.dead && z.row === p.row && z.x > p.col && z.state !== 'gone' && !z.charm;
      const inRow = this.zombies.filter(ahead);
      if (p.kind === 'sunflower' && p.t >= SUNFLOWER_EVERY) { p.t = 0; this.suns.push({ row: p.row, col: p.col, live: SKY_SUN_LIVE }); }
      if ((p.kind === 'pea' || p.kind === 'snow' || p.kind === 'venom') && inRow.length && p.t >= 1.4) {
        p.t = 0;
        const kind = p.kind === 'snow' ? 'ice' : p.kind === 'venom' ? 'venom' : 'pea';
        this.projs.push({ kind, row: p.row, x: p.col + 0.4, vx: 3.5, tx: COLS + 1, dmg: 1 });
      }
      if (p.kind === 'catapult' && inRow.length && p.t >= 2.0) {
        p.t = 0;
        const z = inRow.sort((a, b) => a.x - b.x)[0];
        this.projs.push({ kind: 'knife', row: p.row, x: p.col, vx: 0, tx: z.x, dmg: 2 }); // 抛物线直达落点，不被坚果挡
      }
      if (p.kind === 'potato') {
        if (!p.armed && p.t >= POTATO_ARM) { p.armed = true; this.pushLog('土豆TNT成型了！'); }
        if (p.armed) {
          const hit = this.zombies.find((z) => !z.dead && z.row === p.row && Math.abs(z.x - p.col) < 0.5);
          if (hit) {
            for (const z of this.zombies.filter((z) => !z.dead && z.row === p.row)) this.hurt(z, 90);
            p.hp = 0; this.pushLog('轰！土豆TNT炸了一整行');
          }
        }
      }
      if (p.kind === 'gloom' && p.t >= 1) {
        p.t = 0;
        for (const z of this.zombies) if (!z.dead && Math.abs(z.row - p.row) <= 1 && Math.abs(z.x - p.col) <= 1.5) this.hurt(z, 1);
      }
      if (p.kind === 'spike') {
        for (const z of this.zombies) {
          if (z.dead || z.row !== p.row || Math.abs(z.x - p.col) >= 0.5) continue;
          if (z.kind === 'bike') { this.hurt(z, 999); p.hp = 0; this.pushLog('柳条刺刺扎爆了车轮！'); }
          else if (!ZOMBIES[z.kind].flying) this.hurt(z, 2 * dt);
          if (ZOMBIES[z.kind].flying) { z.kind = 'corrupt'; z.hp = ZOMBIES.corrupt.hp; this.pushLog('气球被扎破了！'); }
        }
      }
      if (p.kind === 'chomper' && p.t >= 0.4) {
        p.t = 0;
        if ((p.chew ?? 0) > 0) { p.chew = (p.chew ?? 0) - 0.4; }
        else {
          const prey = this.zombies.find((z) => !z.dead && z.row === p.row && Math.abs(z.x - p.col) < 1.2 && !z.charm);
          if (prey) {
            const big = prey.kind === 'white' || prey.kind === 'red' || prey.kind === 'bike' || prey.kind === 'mech';
            if (big) this.hurt(prey, 2 * 0.4);   // 吞不下巨人/车/机甲：只能持续咬
            else { prey.dead = true; this.kills++; p.chew = CHOMPER_CHEW; this.pushLog('大嘴花吞下了一只僵尸！'); }
          }
        }
      }
    }
    // 被啃完/炸完的植物清理
    this.plants = this.plants.filter((p) => p.hp > 0);
  }

  private hurt(z: Zombie, dmg: number): void {
    if (z.dead) return;
    z.hp -= dmg;
    if (z.hp <= 0) {
      z.dead = true; this.kills++;
      if (z.kind === 'mech') {
        // 机甲爆了：驾驶员跳出来变普通腐败尸接着打
        this.zombies.push({ kind: 'corrupt', row: z.row, x: z.x, hp: ZOMBIES.corrupt.hp, slowT: 0, poisonT: 0, eatT: 0, state: 'walk' });
        this.pushLog('机甲爆了！腐败尸跳出来了！');
      }
    }
  }

  /** 植物格子有没有被香菇保护伞罩住（3×3） */
  private covered(row: number, col: number): boolean {
    return this.plants.some((p) => p.kind === 'umbrella' && Math.abs(p.row - row) <= 1 && Math.abs(p.col - col) <= 1);
  }

  private tickZombies(dt: number): void {
    for (const z of this.zombies) {
      if (z.dead) continue;
      const def = ZOMBIES[z.kind];
      if (z.slowT > 0) z.slowT -= dt;
      if (z.poisonT > 0) { z.poisonT -= dt; this.hurt(z, 0.5 * dt); }
      const speed = def.speed * (z.slowT > 0 ? 0.5 : 1) * (z.charm ? -1 : 1);
      const col = Math.floor(z.x);
      const plant = this.plantAt(z.row, Math.max(0, Math.min(COLS - 1, col)));
      const blocking = plant && !plant.laddered && plant.kind !== 'spike' && !ZOMBIES[z.kind].flying;
      // 魅惑僵尸：往右走打别的僵尸
      if (z.charm) {
        z.x += Math.abs(def.speed) * dt;
        const foe = this.zombies.find((o) => !o.dead && o !== z && o.row === z.row && Math.abs(o.x - z.x) < 0.6 && !o.charm);
        if (foe) this.hurt(foe, 4 * dt);
        if (z.x > COLS + 0.5) z.state = 'gone';
        continue;
      }
      if (z.state === 'gone') { z.dead = true; continue; }
      // 蹦极：降下来→抓植物→飞走
      if (z.state === 'drop') {
        z.eatT += dt;
        const g = z.grabbed!;
        const target = this.plantAt(g.row, g.col);
        if (this.covered(g.row, g.col)) { z.state = 'gone'; this.pushLog('保护伞弹开了蹦极僵尸！'); continue; }
        if (!target) { z.state = 'gone'; continue; }
        if (z.eatT >= 2.5) {
          target.hp = 0; z.state = 'gone';
          this.pushLog(`腐败者抓走了${PLANTS[target.kind].cn}！`);
        }
        continue;
      }
      // 矿工：挖到最左列冒头往回走（吃后排）
      if (z.state === 'dig') {
        z.x -= 0.45 * dt;
        if (z.x <= 0.5) { z.state = 'back'; }
        continue;
      }
      if (z.state === 'back') z.x += Math.abs(def.speed) * dt; // 矿工冒头后往回走
      else z.x -= Math.abs(speed) * dt;
      // 雪傀儡：走到中场掉头跑
      if (z.kind === 'yeti' && z.x < COLS - 3 && z.state === 'walk') z.state = 'flee';
      if (z.state === 'flee') { z.x += Math.abs(def.speed) * dt; if (z.x > COLS + 0.5) z.state = 'gone'; continue; }
      if (z.state === 'gone') continue;
      // 机甲：定时踩扁自己这一整行
      if (z.kind === 'mech') {
        z.stompT = (z.stompT ?? 7) - dt;
        if (z.stompT <= 0) {
          z.stompT = 7;
          const row = z.row;
          for (const p of this.plants.filter((p) => p.row === row)) p.hp = 0;
          this.pushLog(`腐败机甲踩扁了第 ${row + 1} 行！`);
        }
        continue; // 机甲不吃植物
      }
      // 巨人/冰车：不啃，直接砸/碾
      const smasher = z.kind === 'white' || z.kind === 'red' || z.kind === 'bike';
      if (blocking) {
        z.eatT += dt;
        if (smasher) {
          if (z.eatT >= 1.5) { z.eatT = 0; plant.hp = 0; this.pushLog(`${def.cn}砸扁了${PLANTS[plant.kind].cn}！`); }
        } else {
          // 普通啃咬：先啃南瓜壳
          if (plant.pumpkin != null && plant.pumpkin > 0) { plant.pumpkin -= def.eatDps * dt; if (plant.pumpkin <= 0) this.pushLog('南瓜方框被啃破了！'); }
          else if (plant.kind === 'hypno' && z.kind !== 'white' && z.kind !== 'red') {
            // 粉伞伞：咬一口就被魅惑，回头替植物打（巨人免疫）
            plant.hp = 0; z.charm = true; this.pushLog(`${def.cn}被魅惑了！`);
          } else {
            plant.hp -= def.eatDps * dt;
          }
        }
        continue;
      }
      // 木梯僵尸：碰到坚果/竹盾/南瓜壳 → 架梯子，之后所有僵尸直接翻过这格
      if (z.kind === 'ladder' && plant && !plant.laddered && (plant.kind === 'nut' || plant.kind === 'bamboo' || (plant.pumpkin ?? 0) > 0)) {
        plant.laddered = true;
        this.pushLog('木梯僵尸架上梯子了，僵尸都能翻过去！');
      }
      z.eatT = 0;
    }
    // 输了判定在 update 顶部
  }

  private tickProjs(dt: number): void {
    for (const pr of this.projs) {
      // 抛物线飞刀：缓动飞向落点，落地瞬间才算命中（能越过坚果砸到后面的怪）
      const landing = pr.kind === 'knife';
      if (landing) pr.x += (pr.tx - pr.x) * Math.min(1, dt * 4);
      else pr.x += pr.vx * dt;
      const landed = !landing || Math.abs(pr.tx - pr.x) < 0.15;
      // 命中：同行同列附近的第一个活僵尸（气球/飞行只吃投手类）
      const hit = landed && this.zombies.find((z) => !z.dead && z.row === pr.row && Math.abs(z.x - pr.x) < 0.45 && z.x > 0
        && (!ZOMBIES[z.kind].flying || pr.kind === 'knife'));
      if (hit) {
        this.hurt(hit, pr.dmg);
        if (pr.kind === 'ice') hit.slowT = 4;
        if (pr.kind === 'venom') hit.poisonT = 5;
        if (ZOMBIES[hit.kind].flying && !hit.dead) { hit.kind = 'corrupt'; hit.hp = ZOMBIES.corrupt.hp; this.pushLog('气球被打爆了！'); }
        pr.dmg = -1;
      }
      if (pr.x > COLS + 1 || (landing && landed)) pr.dmg = -1;
    }
    this.projs = this.projs.filter((p) => p.dmg >= 0);
  }
}
