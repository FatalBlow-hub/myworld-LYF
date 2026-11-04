/** 植物大战僵尸·模拟引擎 — 无 DOM 的纯逻辑：格子/阳光/植物/僵尸/弹道/波次/助力卡/BOSS
 *
 *  坐标口径：列是整数格子（0..8），僵尸 x 是浮点列号，从右往左走（x 变小）。
 *  5 行 9 列，左边是家——任何僵尸 x<0 就输。
 *  定稿节奏（2026-11-04）：开局 60 秒第一波；普通波隔 40 秒、最后一波前隔 60 秒；
 *  每波来前 1 秒抽一张助力卡，点卡再点任意草坪格激活，一次性。 */

import {
  COLS, ROWS, PLANTS, ZOMBIES, CARDS, CARD_KINDS, PlantKind, ZKind, CardKind, LevelDef,
  START_SUN, SKY_SUN_EVERY, SKY_SUN_LIVE, SUN_VALUE, SUNBUD_VALUE, SUNFLOWER_EVERY, SUNBUD_EVERY,
  POTATO_ARM, POTATO_DMG, CHOMPER_CHEW, FIRST_WAVE, WAVE_GAP, FINAL_GAP, CARD_BEFORE_WAVE,
  SUN_RATE_T, ATK_RATE_T, DAYTIME_T, FREEZE_T, HOURGLASS_DELAY, WIND_PUSH,
  MECH_SUMMON_EVERY, MECH_BALL_EVERY, MECH_ROW_EVERY, BALL_HP, BALL_SPEED, unlockedCards,
} from './data';

export interface Plant { kind: PlantKind; row: number; col: number; hp: number; t: number; armed?: boolean; chew?: number; pumpkin?: number; laddered?: boolean }
export interface Zombie { kind: ZKind; row: number; x: number; hp: number; slowT: number; poisonT: number; freezeT: number; eatT: number; state: string; charm?: boolean; usedLadder?: boolean; summonT?: number; ballT?: number; rowT?: number; dead?: boolean }
export interface Proj { kind: 'pea' | 'ice' | 'venom' | 'knife' | 'arrow' | 'bomb'; row: number; x: number; vx: number; tx: number; dmg: number; hits?: Set<Zombie> }
export interface SunToken { row: number; col: number; live: number; value: number }
export interface CorruptBall { row: number; x: number; hp: number }

export type SimResult = 'play' | 'win' | 'lose';

export class PvzSim {
  sun = START_SUN;
  elapsed = 0;
  wave = 0;                    // 已经放出去几波（0=还没刷）
  private waveWait = FIRST_WAVE;
  private drewCard = false;    // 下一波的助力卡抽了没
  plants: Plant[] = [];
  zombies: Zombie[] = [];
  projs: Proj[] = [];
  suns: SunToken[] = [];
  balls: CorruptBall[] = [];   // 机甲喷的腐败球
  pendingCards: CardKind[] = []; // 抽到手还没用的助力卡
  cards: PlantKind[];
  cardCd: Record<string, number> = {};
  // 助力卡增益
  sunRateT = 0;                // 产阳光 ×2 剩余秒
  atkRateT = 0;                // 攻击 ×2 剩余秒
  freeNext = false;            // 下一株免费
  result: SimResult = 'play';
  kills = 0;
  log: string[] = [];          // 最近的战斗播报（面板上方滚动条）

  constructor(public level: LevelDef, doneLevels: number) {
    this.cards = unlockedCards(doneLevels);
    for (const k of this.cards) this.cardCd[k] = 0;
    if (level.boss) this.waveWait = FIRST_WAVE + 1; // 机甲 1 秒登场，登场后再等 60 秒
  }

  plantAt(row: number, col: number): Plant | undefined {
    return this.plants.find((p) => p.row === row && p.col === col);
  }

  /** 点卡片再点格子。返回失败原因（null=种下了） */
  plant(kind: PlantKind, row: number, col: number): string | null {
    const d = PLANTS[kind];
    if (!this.freeNext && this.sun < d.cost) return '阳光不够';
    if (this.cardCd[kind] > 0) return '还在冷却';
    const cur = this.plantAt(row, col);
    if (kind === 'pumpkin') {
      if (!cur || cur.kind === 'pumpkin' || cur.pumpkin != null) return '要套在别的植物上';
    } else if (cur) return '这格有植物了';
    if (this.freeNext) this.freeNext = false; else this.sun -= d.cost;
    this.cardCd[kind] = d.cd;
    if (kind === 'melon') {
      // 变身西瓜：随机变成本局已解锁的植物（变身西瓜自己除外）
      const pool = this.cards.filter((k) => k !== 'melon');
      kind = pool[Math.floor(Math.random() * pool.length)] ?? 'pea';
      this.pushLog(`变身西瓜变成了${PLANTS[kind].cn}！`);
    }
    if (kind === 'pumpkin' && cur) { cur.pumpkin = PLANTS.pumpkin.hp; return null; }
    if (kind === 'iceshroom') {
      // 冰霜菇：种下去当场炸开寒气，冻住全场（自行车免疫），自己消耗掉
      this.freezeAll();
      this.pushLog('冰霜菇炸开寒气，全场冻结！');
      return null;
    }
    this.plants.push({ kind, row, col, hp: PLANTS[kind].hp, t: 0, chew: 0 });
    return null;
  }

  /** 点天上/植物产出的阳光收起来 */
  collectSun(s: SunToken): void { this.sun += s.value; this.suns.splice(this.suns.indexOf(s), 1); }

  /** 用手上的助力卡：点卡再点草坪任意一格（格子的位置不重要，仪式一下） */
  useCard(i: number): void {
    const kind = this.pendingCards[i];
    if (!kind) return;
    this.pendingCards.splice(i, 1);
    const d = CARDS[kind];
    switch (kind) {
      case 'sun150': this.sun += 150; break;
      case 'sunRate': this.sunRateT = Math.max(this.sunRateT, SUN_RATE_T); break;
      case 'daytime':
        this.sunRateT = Math.max(this.sunRateT, DAYTIME_T);
        for (const z of this.zombies) if (!z.dead && z.kind === 'balloon') this.popBalloon(z);
        break;
      case 'atkRate': this.atkRateT = Math.max(this.atkRateT, ATK_RATE_T); break;
      case 'nutDrop': this.dropPlant('nut'); break;
      case 'peaDrop': this.dropPlant('pea'); break;
      case 'tntDrop': this.dropPlant('potato'); break;
      case 'freeze': this.freezeAll(); break;
      case 'hourglass': if (this.wave < this.level.waves.length) this.waveWait += HOURGLASS_DELAY; break;
      case 'wind':
        for (const z of this.zombies) {
          if (z.dead || z.kind === 'white' || z.kind === 'red' || z.kind === 'mech') continue;
          z.x += WIND_PUSH;
        }
        break;
      case 'freePlant': this.freeNext = true; break;
    }
    this.pushLog(`用了助力卡「${d.cn}」！`);
  }

  /** 随机两个空格子白送一棵植物 */
  private dropPlant(kind: PlantKind): void {
    const empty: [number, number][] = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!this.plantAt(r, c)) empty.push([r, c]);
    for (let n = 0; n < 2 && empty.length; n++) {
      const [r, c] = empty.splice(Math.floor(Math.random() * empty.length), 1)[0];
      this.plants.push({ kind, row: r, col: c, hp: PLANTS[kind].hp, t: 0, chew: 0 });
    }
  }

  private freezeAll(): void {
    for (const z of this.zombies) if (!z.dead && z.kind !== 'bike' && z.kind !== 'mech') z.freezeT = FREEZE_T;
  }

  /** 气球破了：腐败者落地变普通僵尸 */
  private popBalloon(z: Zombie): void {
    z.kind = 'basic'; z.hp = ZOMBIES.basic.hp;
    this.pushLog('气球破了，腐败者落地变成普通僵尸！');
  }

  private pushLog(t: string): void { this.log.push(t); if (this.log.length > 3) this.log.shift(); }

  private spawnZombie(kind: ZKind, row?: number): Zombie {
    const z: Zombie = {
      kind, row: row ?? Math.floor(Math.random() * ROWS), x: COLS + 0.5,
      hp: ZOMBIES[kind].hp, slowT: 0, poisonT: 0, freezeT: 0, eatT: 0, state: 'walk',
    };
    if (kind === 'digger') z.state = 'dig';
    this.zombies.push(z);
    return z;
  }

  private spawnWave(): void {
    const w = this.level.waves[this.wave];
    if (!w) return;
    let i = 0;
    for (const [kind, n] of Object.entries(w) as [ZKind, number][]) {
      for (let k = 0; k < n; k++) {
        const z = this.spawnZombie(kind);
        z.x += (i++) * 0.4;
      }
    }
    this.wave++;
    // 下一波是不是最后一波：是→60秒，否→40秒（10秒缓冲+30/50秒冷却）
    this.waveWait = this.wave === this.level.waves.length - 1 ? FINAL_GAP : WAVE_GAP;
    this.drewCard = false;
    this.pushLog(`第 ${this.wave} 波来了！`);
  }

  /** 产阳光植物把阳光刷在旁边的格子（上下左右/斜角都行，掉到场内） */
  private sunNear(p: Plant, value: number): void {
    const cells: [number, number][] = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const r = p.row + dr, c = p.col + dc;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) cells.push([r, c]);
    }
    const [r, c] = cells.length ? cells[Math.floor(Math.random() * cells.length)] : [p.row, p.col];
    this.suns.push({ row: r, col: c, live: SKY_SUN_LIVE, value });
  }

  update(dt: number): void {
    if (this.result !== 'play') return;
    this.elapsed += dt;
    // 波次：严格按表走——开局60秒、普通间隔40秒、最后一波前60秒，残留僵尸不清
    if (this.wave < this.level.waves.length) {
      this.waveWait -= dt;
      if (!this.drewCard && this.waveWait <= CARD_BEFORE_WAVE) {
        this.drewCard = true;
        this.pendingCards.push(CARD_KINDS[Math.floor(Math.random() * CARD_KINDS.length)]);
      }
      if (this.waveWait <= 0) this.spawnWave();
    }
    for (const k in this.cardCd) if (this.cardCd[k] > 0) this.cardCd[k] -= dt;
    if (this.sunRateT > 0) this.sunRateT -= dt;
    if (this.atkRateT > 0) this.atkRateT -= dt;
    // 天上掉阳光
    if ((this.elapsed % SKY_SUN_EVERY) < dt) {
      this.suns.push({ row: Math.floor(Math.random() * ROWS), col: Math.floor(Math.random() * COLS), live: SKY_SUN_LIVE, value: SUN_VALUE });
    }
    for (const s of this.suns) s.live -= dt;
    this.suns = this.suns.filter((s) => s.live > 0);
    // BOSS 机甲 1 秒登场
    if (this.level.boss && this.elapsed >= 1 && !this.zombies.some((z) => z.kind === 'mech')) {
      const m = this.spawnZombie('mech', 2);
      m.x = COLS - 0.4; m.summonT = MECH_SUMMON_EVERY; m.ballT = MECH_BALL_EVERY; m.rowT = MECH_ROW_EVERY;
      this.pushLog('腐败机甲登场了！');
    }
    this.tickPlants(dt);
    this.tickZombies(dt);
    this.tickProjs(dt);
    this.tickBalls(dt);
    // 输赢判定
    if (this.zombies.some((z) => !z.dead && z.x < 0.1 && z.state !== 'gone' && !z.charm)) this.result = 'lose';
    if (this.level.boss) {
      if (this.zombies.some((z) => z.kind === 'mech' && z.dead)) this.result = 'win'; // 机甲爆了直接通关
    } else if (this.wave >= this.level.waves.length && this.zombies.every((z) => z.dead)) {
      this.result = 'win';
    }
  }

  private atkInterval(base: number): number { return this.atkRateT > 0 ? base / 2 : base; }

  private tickPlants(dt: number): void {
    for (const p of this.plants) {
      p.t += dt;
      const inRow = this.zombies.filter((z) => !z.dead && z.row === p.row && z.x > p.col && z.state !== 'gone' && !z.charm);
      const inRowGround = inRow.filter((z) => !ZOMBIES[z.kind].flying); // 地面射手不会对气球开火
      const sunMul = this.sunRateT > 0 ? 2 : 1;
      if (p.kind === 'sunflower' && p.t >= SUNFLOWER_EVERY / sunMul) { p.t = 0; this.sunNear(p, SUN_VALUE); }
      if (p.kind === 'sunbud' && p.t >= SUNBUD_EVERY / sunMul) { p.t = 0; this.sunNear(p, SUNBUD_VALUE); }
      if ((p.kind === 'pea' || p.kind === 'snow' || p.kind === 'venom') && inRowGround.length && p.t >= this.atkInterval(1.4)) {
        p.t = 0;
        const kind = p.kind === 'snow' ? 'ice' : p.kind === 'venom' ? 'venom' : 'pea';
        this.projs.push({ kind, row: p.row, x: p.col + 0.4, vx: 3.5, tx: COLS + 1, dmg: 1 });
      }
      if (p.kind === 'arrow' && inRow.length && p.t >= this.atkInterval(1.4)) {
        p.t = 0;
        this.projs.push({ kind: 'arrow', row: p.row, x: p.col + 0.4, vx: 3.5, tx: COLS + 1, dmg: 1, hits: new Set() });
      }
      if (p.kind === 'catapult' && inRow.length && p.t >= this.atkInterval(2.0)) {
        p.t = 0;
        const z = inRow.sort((a, b) => a.x - b.x)[0];
        this.projs.push({ kind: 'knife', row: p.row, x: p.col, vx: 0, tx: z.x, dmg: 2 }); // 抛物线直达落点，不被坚果挡
      }
      if (p.kind === 'dandelion' && inRow.length && p.t >= this.atkInterval(3.5)) {
        p.t = 0;
        const z = inRow.sort((a, b) => a.x - b.x)[0];
        this.projs.push({ kind: 'bomb', row: p.row, x: p.col, vx: 0, tx: z.x, dmg: 2 }); // 蒲公英炸弹：飘到僵尸头顶炸，能打气球
      }
      if (p.kind === 'potato') {
        if (!p.armed && p.t >= POTATO_ARM) { p.armed = true; this.pushLog('土豆TNT成型了！'); }
        if (p.armed) {
          const hit = this.zombies.find((z) => !z.dead && z.row === p.row && !z.charm && z.state !== 'dig' && z.state !== 'gone' && !ZOMBIES[z.kind].flying && Math.abs(z.x - p.col) < 0.85);
          if (hit) {
            // 只炸自己这一格：伤害=一个普通僵尸的满血——普通僵尸炸死，血尸/巨人只掉一截
            for (const z of this.zombies.filter((z) => !z.dead && z.row === p.row && !ZOMBIES[z.kind].flying && Math.abs(z.x - p.col) <= 0.9)) this.hurt(z, POTATO_DMG);
            p.hp = 0; this.pushLog('轰！土豆TNT炸了');
          }
        }
      }
      if (p.kind === 'gloom' && p.t >= this.atkInterval(1)) {
        p.t = 0;
        for (const z of this.zombies) if (!z.dead && Math.abs(z.row - p.row) <= 1 && Math.abs(z.x - p.col) <= 1.5) this.hurt(z, 1);
      }
      if (p.kind === 'spike') {
        for (const z of this.zombies) {
          if (z.dead || z.row !== p.row || Math.abs(z.x - p.col) >= 0.5) continue;
          if (z.kind === 'bike') { this.hurt(z, 999); p.hp = 0; this.pushLog('柳条刺刺扎爆了车轮！'); }
          else if (!ZOMBIES[z.kind].flying) this.hurt(z, 2 * dt);
          if (ZOMBIES[z.kind].flying) this.popBalloon(z);
        }
      }
      if (p.kind === 'chomper' && p.t >= this.atkInterval(0.4)) {
        p.t = 0;
        if ((p.chew ?? 0) > 0) { p.chew = (p.chew ?? 0) - 0.4; }
        else {
          const prey = this.zombies.find((z) => !z.dead && z.row === p.row && Math.abs(z.x - p.col) < 1.2 && !z.charm && !ZOMBIES[z.kind].flying);
          if (prey) {
            const big = prey.kind === 'white' || prey.kind === 'red' || prey.kind === 'bike' || prey.kind === 'mech';
            if (big) this.hurt(prey, 30);   // 吞不下巨人/车/机甲：每口咬 30
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
    if (z.hp <= 0) { z.dead = true; this.kills++; }
  }

  private tickZombies(dt: number): void {
    for (const z of this.zombies) {
      if (z.dead) continue;
      const def = ZOMBIES[z.kind];
      if (z.slowT > 0) z.slowT -= dt;
      if (z.poisonT > 0) { z.poisonT -= dt; this.hurt(z, 0.5 * dt); }
      if (z.freezeT > 0) { z.freezeT -= dt; continue; } // 冻住了：不走不吃
      const speed = def.speed * (z.slowT > 0 ? 0.5 : 1) * (z.charm ? -1 : 1);
      // 魅惑僵尸：往右走打别的僵尸
      if (z.charm) {
        z.x += Math.abs(def.speed) * dt;
        const foe = this.zombies.find((o) => !o.dead && o !== z && o.row === z.row && Math.abs(o.x - z.x) < 0.6 && !o.charm);
        if (foe) this.hurt(foe, 4 * dt);
        if (z.x > COLS + 0.5) z.state = 'gone';
        continue;
      }
      if (z.state === 'gone') { z.dead = true; continue; }
      // 矿工：挖到最左列冒头往回走（吃后排）
      if (z.state === 'dig') {
        z.x -= 0.45 * dt;
        if (z.x <= 0.5) { z.state = 'back'; }
        continue;
      }
      // BOSS 机甲：站定不换行地召唤+喷球+定时换行
      if (z.kind === 'mech') {
        z.summonT = (z.summonT ?? MECH_SUMMON_EVERY) - dt;
        z.ballT = (z.ballT ?? MECH_BALL_EVERY) - dt;
        z.rowT = (z.rowT ?? MECH_ROW_EVERY) - dt;
        if (z.summonT <= 0) {
          z.summonT = MECH_SUMMON_EVERY;
          const pool: ZKind[] = ['basic', 'cone', 'balloon', 'white'];
          const k = pool[Math.floor(Math.random() * pool.length)];
          this.spawnZombie(k);
          this.pushLog(`机甲召唤了${ZOMBIES[k].cn}！`);
        }
        if (z.ballT <= 0) {
          z.ballT = MECH_BALL_EVERY;
          this.balls.push({ row: z.row, x: z.x, hp: BALL_HP });
          this.pushLog('机甲低头喷出腐败球！');
        }
        if (z.rowT <= 0) { z.rowT = MECH_ROW_EVERY; z.row = Math.floor(Math.random() * ROWS); }
        continue; // 机甲不吃植物不走动
      }
      if (z.state === 'flee') { z.x += Math.abs(def.speed) * dt; if (z.x > COLS + 0.5) z.state = 'gone'; continue; }
      // 挡路判定：僵尸要走到贴近植物才停下（往左走查脚下格、矿工回头查前面一格），挡住就不走了
      const aheadCol = z.state === 'back' ? Math.ceil(z.x) : Math.floor(z.x);
      const plant = this.plantAt(z.row, Math.max(0, Math.min(COLS - 1, aheadCol)));
      const blocking = !!plant && Math.abs(z.x - plant.col) <= 0.6 && !plant.laddered && plant.kind !== 'spike' && !ZOMBIES[z.kind].flying;
      // 木梯僵尸：碰到坚果/竹盾/南瓜壳 → 架梯子翻过去不啃，梯子一次性用完就没了
      if (blocking && z.kind === 'ladder' && !z.usedLadder && (plant!.kind === 'nut' || plant!.kind === 'bamboo' || (plant!.pumpkin ?? 0) > 0)) {
        plant!.laddered = true;
        z.usedLadder = true;
        this.pushLog('木梯僵尸架上梯子了，僵尸都能翻过去！');
      } else if (blocking) {
        z.eatT += dt;
        // 巨人/冰车：不啃，直接砸/碾
        if (z.kind === 'white' || z.kind === 'red' || z.kind === 'bike') {
          if (z.eatT >= 1.5) { z.eatT = 0; plant!.hp = 0; this.pushLog(`${def.cn}砸扁了${PLANTS[plant!.kind].cn}！`); }
        } else {
          // 普通啃咬：先啃南瓜壳
          if (plant!.pumpkin != null && plant!.pumpkin > 0) { plant!.pumpkin -= def.eatDps * dt; if (plant!.pumpkin <= 0) this.pushLog('南瓜方框被啃破了！'); }
          else if (plant!.kind === 'hypno') {
            // 粉伞伞：咬一口就被魅惑，回头替植物打（巨人免疫）
            plant!.hp = 0; z.charm = true; this.pushLog(`${def.cn}被魅惑了！`);
          } else {
            plant!.hp -= def.eatDps * dt;
          }
        }
        continue;
      }
      // 没被挡住才走
      if (z.state === 'back') { z.x += Math.abs(def.speed) * dt; if (z.x > COLS + 0.5) z.state = 'gone'; }
      else z.x -= Math.abs(speed) * dt;
      // 雪傀儡：走到中场掉头跑
      if (z.kind === 'yeti' && z.x < COLS - 3 && z.state === 'walk') z.state = 'flee';
      z.eatT = 0;
    }
    // 输了判定在 update 顶部
  }

  private tickProjs(dt: number): void {
    for (const pr of this.projs) {
      // 抛物线弹（飞刀/蒲公英炸弹）：缓动飞向落点，落地瞬间才算命中（能越过坚果砸到后面的怪/气球）
      const landing = pr.kind === 'knife' || pr.kind === 'bomb';
      if (landing) pr.x += (pr.tx - pr.x) * Math.min(1, dt * 4);
      else pr.x += pr.vx * dt;
      const landed = !landing || Math.abs(pr.tx - pr.x) < 0.15;
      // 寒冰弹先拦腐败球（3发打掉一个球）
      if (pr.kind === 'ice') {
        const ball = this.balls.find((b) => b.row === pr.row && Math.abs(b.x - pr.x) < 0.45);
        if (ball) { ball.hp--; pr.dmg = -1; if (ball.hp <= 0) this.pushLog('寒冰打爆了腐败球！'); continue; }
      }
      // 箭羽草：穿透这一行所有僵尸，飞行的一箭破气球
      if (pr.kind === 'arrow') {
        for (const z of this.zombies) {
          if (z.dead || z.row !== pr.row || Math.abs(z.x - pr.x) >= 0.45 || z.x <= 0 || pr.hits!.has(z)) continue;
          pr.hits!.add(z);
          if (ZOMBIES[z.kind].flying) this.popBalloon(z);
          else this.hurt(z, pr.dmg);
        }
      } else if (landing) {
        if (landed) {
          const hit = this.zombies.find((z) => !z.dead && z.row === pr.row && Math.abs(z.x - pr.x) < 0.45 && z.x > 0);
          if (hit) {
            if (ZOMBIES[hit.kind].flying) this.popBalloon(hit);
            else this.hurt(hit, pr.dmg);
            pr.dmg = -1;
          }
        }
      } else {
        // 直线弹（豌豆/冰/毒）：打同行第一个活僵尸，打不着飞的
        const hit = this.zombies.find((z) => !z.dead && z.row === pr.row && Math.abs(z.x - pr.x) < 0.45 && z.x > 0 && !ZOMBIES[z.kind].flying);
        if (hit) {
          this.hurt(hit, pr.dmg);
          if (pr.kind === 'ice') hit.slowT = 4;
          if (pr.kind === 'venom') hit.poisonT = 5;
          pr.dmg = -1;
        }
      }
      if (pr.x > COLS + 1 || (landing && landed)) pr.dmg = -1;
    }
    this.projs = this.projs.filter((p) => p.dmg >= 0);
    this.balls = this.balls.filter((b) => b.hp > 0);
  }

  /** 腐败球：沿行慢慢往家滚，碾过谁毁谁；寒冰3发打掉 */
  private tickBalls(dt: number): void {
    for (const b of this.balls) {
      b.x -= BALL_SPEED * dt;
      const col = Math.floor(b.x);
      if (col >= 0 && col < COLS) {
        const p = this.plantAt(b.row, col);
        if (p) { p.hp = 0; p.pumpkin = 0; this.pushLog(`腐败球碾碎了${PLANTS[p.kind].cn}！`); }
      }
      if (b.x < -0.5) b.hp = 0;
    }
    this.balls = this.balls.filter((b) => b.hp > 0);
  }
}
