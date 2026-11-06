/** 植物大战僵尸·模拟引擎 — 无 DOM 的纯逻辑：格子/阳光/植物/僵尸/弹道/波次/助力卡/BOSS
 *
 *  坐标口径：列是整数格子（0..8），僵尸 x 是浮点列号，从右往左走（x 变小）。
 *  5 行 9 列，左边是家——任何僵尸 x<0 就输。
 *  定稿节奏（2026-11-04）：开局 60 秒第一波；普通波隔 40 秒、最后一波前隔 60 秒；
 *  每波来前 1 秒抽一张助力卡，点卡再点任意草坪格激活，一次性。 */

import {
  COLS, ROWS, PLANTS, ZOMBIES, CARD_KINDS, PlantKind, ZKind, CardKind, LevelDef,
  START_SUN, SKY_SUN_EVERY, SKY_SUN_LIVE, SUN_VALUE, SUNBUD_VALUE, SUNFLOWER_EVERY, SUNBUD_EVERY,
  POTATO_ARM, POTATO_DMG, CHOMPER_CHEW, FIRST_WAVE, WAVE_GAP, FINAL_GAP, CARD_BEFORE_WAVE,
  FREEZE_T,
  MECH_SUMMON_EVERY, MECH_BALL_EVERY, MECH_ROW_EVERY, BALL_HP, BALL_SPEED, MECH_ARRIVE,
  VENOM_PLANTS, MOSSPEA_INT, MOSSPEA_DMG, MOSSPEA_POISON, TOXIN_POISON, VENOMBUD_EVERY,
  SOUL_FREEZE, SOUL_SLOW, SOUL_DMG, SOUL_SLOW_RATE, COPY_DELAY,
  SUNEARD_EVERY, SUNEARD_VALUE, SUNEARD_AURA, VSPIKE_POISON, ISPIKE_SLOW, BEAN_T, unlockedCards,
  ALIEN_HP_BONUS, ALIEN_SPEED_MUL, UFO_SUMMON, UFO_DMG_CAP, UFO_BIKE_EVERY, alienCards,
} from './data';
import { applyCard, useBeanOn } from './cards';

export interface Plant { kind: PlantKind; row: number; col: number; hp: number; t: number; blackhole?: number; holeT?: number; pokes?: number; armed?: boolean; chew?: number; pumpkin?: number; moss?: number; soul?: number; laddered?: boolean; done?: boolean; drops?: number; boostT?: number }
export interface Zombie { kind: ZKind; row: number; x: number; hp: number; slowT: number; poisonT: number; freezeT: number; eatT: number; state: string; charm?: boolean; usedLadder?: boolean; soulSlowT?: number; summonT?: number; ballT?: number; rowT?: number; dead?: boolean; bean?: boolean; pullX?: number; pullRow?: number; dmgAcc?: number; dmgT?: number }
export interface Proj { kind: 'pea' | 'ice' | 'venom' | 'knife' | 'arrow' | 'bomb' | 'moss' | 'minibomb'; row: number; x: number; vx: number; tx: number; dmg: number; hits?: Set<Zombie>; space?: boolean }
export interface SunToken { x: number; y: number; ty: number; live: number; value: number } // x/y 是格子单位的自由坐标（不一定在格心）
export interface CorruptBall { row: number; x: number; hp: number }

export type SimResult = 'play' | 'win' | 'lose';

export class PvzSim {
  sun = START_SUN;
  elapsed = 0;
  wave = 0;                    // 已经放出去几波（0=还没刷）
  waveWait = FIRST_WAVE; // 距下一波秒数（助力卡可调）
  private drewCard = false;    // 下一波的助力卡抽了没
  plants: Plant[] = [];
  zombies: Zombie[] = [];
  projs: Proj[] = [];
  suns: SunToken[] = [];
  balls: CorruptBall[] = [];   // 机甲喷的腐败球
  pendingCards: CardKind[] = []; // 抽到手还没用的助力卡
  venomTiles = new Set<string>(); // 毒液地块 "r,c"：毒死的僵尸留下 / 19关起第5列自带
  beans = 0;                     // 能量豆数量：每波最强僵尸掉一颗
  get alien(): boolean { return !!this.level.alien; } // 外星来客模式：换皮+改机制
  private delayed: { kind: ZKind; t: number }[] = []; // 波次里的迟到僵尸（如红眼巨人晚10秒）
  private beanKind: ZKind | null = null; // 本波掉豆的"最强僵尸"种类
  private beanGiven = false;             // 本波标记掉豆的僵尸生成了没
  cards: PlantKind[];
  cardCd: Record<string, number> = {};
  // 助力卡增益
  sunRateT = 0;                // 产阳光 ×2 剩余秒
  atkRateT = 0;                // 攻击 ×2 剩余秒
  freeNext = false;            // 下一株免费
  result: SimResult = 'play';
  kills = 0;
  log: string[] = [];          // 最近的战斗播报（面板上方滚动条）

  constructor(public level: LevelDef, doneLevels: number, venomCol = -1, picked?: PlantKind[]) {
    this.cards = picked ?? (level.alien ? alienCards(doneLevels) : unlockedCards(doneLevels));
    for (const k of this.cards) this.cardCd[k] = 0;
    if (venomCol >= 0) for (let r = 0; r < ROWS; r++) this.venomTiles.add(`${r},${venomCol}`);
    if (level.boss) this.waveWait = FIRST_WAVE + MECH_ARRIVE; // 机甲 15 秒登场，登场后再等 60 秒
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
    const isShell = kind === 'pumpkin' || kind === 'mossbox' || kind === 'soulbox';
    if ((this.alien ? kind === 'mosspea' : VENOM_PLANTS.includes(kind)) && !this.venomTiles.has(`${row},${col}`)) return this.alien ? '要种在紫色太空地板上' : '要种在毒液地块上';
    if (isShell) {
      if (!cur || isShell && cur.kind === kind || cur.pumpkin != null || cur.moss != null || cur.soul != null) return '要套在别的植物上';
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
    if (kind === 'mossbox' && cur) { cur.moss = PLANTS.mossbox.hp; return null; }
    if (kind === 'soulbox' && cur) { cur.soul = PLANTS.soulbox.hp; return null; }
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
  /** 能量豆点植物放大招；返回错误文案或 null */
  useBean(row: number, col: number): string | null { return useBeanOn(this, row, col); }

  useCard(i: number): void {
    const kind = this.pendingCards[i];
    if (!kind) return;
    this.pendingCards.splice(i, 1);
    this.pushLog(applyCard(this, kind)); // 卡面效果在 cards.ts
  }

  freezeAll(): void {
    for (const z of this.zombies) if (!z.dead && z.kind !== 'bike' && z.kind !== 'mech') z.freezeT = FREEZE_T;
  }

  /** 气球破了：腐败者落地变普通僵尸 */
  popBalloon(z: Zombie): void {
    z.kind = 'basic'; z.hp = ZOMBIES.basic.hp;
    this.pushLog('气球破了，腐败者落地变成普通僵尸！');
  }

  pushLog(t: string): void { this.log.push(t); if (this.log.length > 3) this.log.shift(); }

  private spawnZombie(kind: ZKind, row?: number): Zombie {
    const z: Zombie = {
      kind, row: row ?? Math.floor(Math.random() * ROWS), x: COLS + 0.5,
      hp: ZOMBIES[kind].hp + (this.level.alien ? ALIEN_HP_BONUS : 0), slowT: 0, poisonT: 0, freezeT: 0, eatT: 0, state: 'walk',
    };
    if (kind === 'digger') z.state = 'dig';
    this.zombies.push(z);
    return z;
  }

  private spawnWave(): void {
    const w = this.level.waves[this.wave];
    if (!w) return;
    // 只有第一波的血量最高僵尸标金星掉豆（一局就一颗，打完才有）
    const kinds = this.wave === 0
      ? [...Object.keys(w) as ZKind[], ...(this.level.delayed ?? []).filter((d) => d.wave === this.wave).map((d) => d.kind)]
      : [];
    this.beanKind = kinds.length ? kinds.reduce((a, b) => (ZOMBIES[a].hp >= ZOMBIES[b].hp ? a : b)) : null;
    this.beanGiven = false;
    let i = 0;
    for (const [kind, n] of Object.entries(w) as [ZKind, number][]) {
      for (let k = 0; k < n; k++) {
        const z = this.spawnZombie(kind);
        z.x += (i++) * 0.4;
        if (!this.beanGiven && kind === this.beanKind) { z.bean = true; this.beanGiven = true; }
      }
    }
    this.level.delayed?.forEach((d) => { if (d.wave === this.wave) this.delayed.push({ kind: d.kind, t: d.t }); });
    this.wave++;
    // 下一波等待：关卡自定义 gaps 优先，否则最后一波前 60 秒、普通 40 秒
    this.waveWait = this.level.gaps?.[this.wave] ?? (this.wave === this.level.waves.length - 1 ? FINAL_GAP : WAVE_GAP);
    this.drewCard = false;
    this.pushLog(`第 ${this.wave} 波来了！`);
  }

  /** 产阳光植物把阳光蹦在自己旁边（自由落点，不吸格心） */
  private sunNear(p: Plant, value: number): void {
    const x = Math.max(0.4, Math.min(COLS - 0.4, p.col + (Math.random() - 0.5) * 1.6));
    const y = Math.max(0.4, Math.min(ROWS - 0.4, p.row + 0.5 + (Math.random() - 0.5) * 0.9));
    this.suns.push({ x, y, ty: y, live: SKY_SUN_LIVE, value });
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
    // 天上掉阳光：从屏幕顶慢慢飘到草坪上某个随机位置
    if ((this.elapsed % SKY_SUN_EVERY) < dt) {
      this.suns.push({ x: 0.3 + Math.random() * (COLS - 0.6), y: -0.6, ty: 0.4 + Math.random() * (ROWS - 0.8), live: SKY_SUN_LIVE, value: SUN_VALUE });
    }
    for (const s of this.suns) {
      if (s.y < s.ty) s.y = Math.min(s.ty, s.y + 1.2 * dt); // 还在飘
      else s.live -= dt;                                   // 落地了才开始倒计时
    }
    this.suns = this.suns.filter((s) => s.live > 0);
    // 迟到僵尸到点出场
    for (const d of this.delayed) { d.t -= dt; if (d.t <= 0) { const z = this.spawnZombie(d.kind); if (!this.beanGiven && d.kind === this.beanKind) { z.bean = true; this.beanGiven = true; } this.pushLog(`${ZOMBIES[d.kind].cn}姗姗来迟！`); } }
    this.delayed = this.delayed.filter((d) => d.t > 0);
    // BOSS 机甲 1 秒登场
    if (this.level.boss && this.elapsed >= (this.level.alien ? 3 : MECH_ARRIVE) && !this.zombies.some((z) => z.kind === 'mech' || z.kind === 'ufo')) {
      if (this.level.alien) { const u = this.spawnZombie('ufo', ROWS - 2); u.x = COLS - 0.6; this.pushLog('外星飞碟降临了！'); return; }
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
      if (this.zombies.some((z) => (z.kind === 'mech' || z.kind === 'ufo') && z.dead)) this.result = 'win'; // BOSS爆了直接通关
    } else if (this.wave >= this.level.waves.length && !this.delayed.length && this.zombies.every((z) => z.dead)) {
      this.result = 'win';
    }
  }

  private atkInterval(base: number): number { return this.atkRateT > 0 ? base / 2 : base; }

  private tickPlants(dt: number): void {
    for (const p of this.plants) {
      p.t += dt;
      if ((p.boostT ?? 0) > 0) p.boostT! -= dt; // 能量豆大招倒计时
      const boosted = (p.boostT ?? 0) > 0;
      const beanInt = boosted ? (BEAN_T[p.kind]?.int ?? 0.5) : 0;
      const inRow = this.zombies.filter((z) => !z.dead && z.row === p.row && z.x > p.col && z.state !== 'gone' && !z.charm);
      const inRowGround = inRow.filter((z) => !ZOMBIES[z.kind].flying); // 地面射手不会对气球开火
      const sunMul = this.sunRateT > 0 ? 2 : 1;
      // 光穗草光环：3×3 内的向日葵/阳光小花产速×1.25
      const earMul = (p.kind === 'sunflower' || p.kind === 'sunbud')
        && this.plants.some((q) => q.kind === 'sunear' && q !== p && Math.abs(q.row - p.row) <= 1 && Math.abs(q.col - p.col) <= 1) ? SUNEARD_AURA : 1;
      if (p.kind === 'sunflower' && p.t >= (boosted ? beanInt : SUNFLOWER_EVERY / sunMul / earMul)) { p.t = 0; this.sunNear(p, SUN_VALUE); if (this.alien && Math.random() < 0.4) this.sunNear(p, SUN_VALUE); }
      if (p.kind === 'sunbud' && p.t >= (boosted ? beanInt : SUNBUD_EVERY / sunMul / earMul)) { p.t = 0; this.sunNear(p, SUNBUD_VALUE); }
      if (p.kind === 'sunear' && p.t >= SUNEARD_EVERY / sunMul) { p.t = 0; this.sunNear(p, SUNEARD_VALUE); }
      if (p.kind === 'venombud' && p.t >= (boosted ? beanInt : VENOMBUD_EVERY / sunMul)) { p.t = 0; this.sunNear(p, SUN_VALUE); }
      if (p.kind === 'sunbloom') {
        // 阳光蓓蕾：种下就转圈，5 秒内每半秒洒一个 15 阳光（共 150），洒完消失
        const drops = Math.min(10, Math.floor(p.t / 0.5));
        while ((p.drops ?? 0) < drops) { p.drops = (p.drops ?? 0) + 1; this.sunNear(p, 15); }
        if (p.t >= 5.2) { p.hp = 0; this.pushLog('阳光蓓蕾洒完阳光，消失了'); }
      }
      if (p.kind === 'mosspea' && inRowGround.length && p.t >= (boosted ? beanInt : this.atkInterval(MOSSPEA_INT))) {
        p.t = 0;
        this.projs.push({ kind: 'moss', row: p.row, x: p.col + 0.4, vx: 3.5, tx: COLS + 1, dmg: MOSSPEA_DMG });
      }
      if (p.kind === 'specialpea' && inRowGround.length && p.t >= (boosted ? beanInt : this.atkInterval(1.4))) {
        p.t = 0;
        const roll = (): Proj['kind'] => Math.random() < 0.5 ? 'pea'
          : (['venom', 'ice', 'minibomb'] as const)[Math.floor(Math.random() * 3)];
        // 吃豆：12 秒每 1/6 秒单发；平时：一次三连发
        const shots = boosted ? 1 : 3;
        for (let n = 0; n < shots; n++) {
          const kind = roll();
          this.projs.push({ kind, row: p.row, x: p.col + 0.4 + n * 0.15, vx: 3.5, tx: COLS + 1, dmg: kind === 'minibomb' ? 2 : 1, space: this.alien && kind !== 'pea' });
        }
      }
      if (p.kind === 'copycarrot' && !p.done && p.t >= COPY_DELAY) {
        for (const q of this.plants) {
          if (Math.abs(q.row - p.row) <= 1 && Math.abs(q.col - p.col) <= 1) { q.kind = 'copycarrot'; q.hp = PLANTS.copycarrot.hp; q.done = true; }
        }
        this.pushLog('复制胡萝卜把周围的植物都变成了自己！');
      }
      if ((p.kind === 'pea' || p.kind === 'snow' || p.kind === 'venom') && inRowGround.length && p.t >= (boosted ? beanInt : this.atkInterval(1.4))) {
        p.t = 0;
        const kind = p.kind === 'snow' ? 'ice' : p.kind === 'venom' ? 'venom' : 'pea';
        const space = this.alien && p.kind === 'pea';
        this.projs.push({ kind, row: p.row, x: p.col + 0.4, vx: 3.5, tx: COLS + 1, dmg: 1, space });
        if (space && Math.random() < 0.4) this.projs.push({ kind: 'pea', row: p.row, x: p.col + 0.55, vx: 3.5, tx: COLS + 1, dmg: 1, space: true }); // 太空豌豆40%双发
      }
      if (p.kind === 'arrow' && inRow.length && p.t >= (boosted ? beanInt : this.atkInterval(1.4))) {
        p.t = 0;
        this.projs.push({ kind: 'arrow', row: p.row, x: p.col + 0.4, vx: 3.5, tx: COLS + 1, dmg: 1, hits: new Set() });
      }
      if (p.kind === 'catapult' && inRow.length && p.t >= (boosted ? beanInt : this.atkInterval(2.0))) {
        p.t = 0;
        const z = inRow.sort((a, b) => a.x - b.x)[0];
        this.projs.push({ kind: 'knife', row: p.row, x: p.col, vx: 0, tx: z.x, dmg: 2, space: this.alien && Math.random() < 0.25 }); // 抛物线直达落点，不被坚果挡
      }
      if (p.kind === 'dandelion' && inRow.length && p.t >= (boosted ? beanInt : this.atkInterval(3.5))) {
        p.t = 0;
        const z = inRow.sort((a, b) => a.x - b.x)[0];
        this.projs.push({ kind: 'bomb', row: p.row, x: p.col, vx: 0, tx: z.x, dmg: 2, space: this.alien }); // 蒲公英炸弹：飘到僵尸头顶炸，能打气球
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
      if (p.kind === 'gloom' && p.t >= (boosted ? beanInt : this.atkInterval(1))) {
        p.t = 0;
        // 氢能灯毒雾：平时 3×3 每秒 1 血；吃豆后 5×5 每 0.9 秒 1 血
        for (const z of this.zombies) if (!z.dead && Math.abs(z.row - p.row) <= (boosted ? 2 : 1) && Math.abs(z.x - p.col) <= (boosted ? 2.5 : 1.5)) this.hurt(z, 1);
      }
      if (p.kind === 'spike' || p.kind === 'venomspike' || p.kind === 'icespike') {
        for (const z of this.zombies) {
          if (z.dead || z.row !== p.row || Math.abs(z.x - p.col) >= 0.5) continue;
          if (z.kind === 'bike') { this.hurt(z, 999); p.hp = 0; this.pushLog(`${PLANTS[p.kind].cn}扎爆了车轮！`); } // 自行车免疫毒/减速，只爆胎
          else if (!ZOMBIES[z.kind].flying) {
            this.hurt(z, 2 * dt);
            if (p.kind === 'venomspike' || (this.alien && p.kind === 'spike')) z.poisonT = Math.max(z.poisonT, VSPIKE_POISON);
            if (p.kind === 'icespike') z.slowT = Math.max(z.slowT, ISPIKE_SLOW);
          }
          if (ZOMBIES[z.kind].flying) this.popBalloon(z);
        }
      }
      if (p.kind === 'chomper' && p.t >= this.atkInterval(0.4)) {
        p.t = 0;
        if ((p.chew ?? 0) > 0) { p.chew = (p.chew ?? 0) - 0.4; }
        else {
          const near = (z: Zombie) => !z.dead && z.row === p.row && Math.abs(z.x - p.col) < 1.2 && !z.charm && !ZOMBIES[z.kind].flying;
          // 嘴边有大块头（巨人/车/机甲）优先咬它：吞不下只能啃，每口 30，吞小怪才去嚼
          const big = this.zombies.find((z) => near(z) && (z.kind === 'white' || z.kind === 'red' || z.kind === 'diamond' || z.kind === 'bike' || z.kind === 'mech'));
          if (big) this.hurt(big, 30);
          else {
            const prey = this.zombies.find(near);
            if (prey) { prey.dead = true; this.kills++; p.chew = CHOMPER_CHEW; this.pushLog('大嘴花吞下了一只僵尸！'); }
          }
        }
      }
    }
    // 被啃完/炸完的植物清理
    this.plants = this.plants.filter((p) => p.hp > 0);
  }

  private hurt(z: Zombie, dmg: number): void {
    if (z.dead) return;
    if (z.kind === 'ufo') { // 限伤：每秒最多 12.5
      z.dmgT = (z.dmgT ?? 1) - 0.016; if (z.dmgT <= 0) { z.dmgT = 1; z.dmgAcc = 0; }
      if ((z.dmgAcc ?? 0) >= UFO_DMG_CAP) return;
      z.dmgAcc = (z.dmgAcc ?? 0) + dmg;
    }
    z.hp -= dmg;
    if (z.hp <= 0) {
      z.dead = true; this.kills++;
      // 阳光僵尸：打死直接入账 25 阳光
      if (z.kind === 'sunzombie') { this.sun += SUN_VALUE; this.pushLog('击败阳光僵尸，+25 阳光！'); }
      // 本波最强僵尸：掉一颗能量豆（手里最多攒 1 颗，不用就浪费；下局重新算）
      if (z.bean) {
        if (this.beans < 1) { this.beans++; this.pushLog('打败最强僵尸，拿到一颗能量豆！'); }
        else this.pushLog('已经有能量豆了，这颗浪费了！');
      }
      // 被毒死的僵尸脚下变毒液地块
      if (z.poisonT > 0) this.venomTiles.add(`${z.row},${Math.max(0, Math.min(COLS - 1, Math.floor(z.x)))}`);
    }
  }

  private tickZombies(dt: number): void {
    for (const z of this.zombies) {
      if (z.dead) continue;
      const def = ZOMBIES[z.kind];
      if (z.slowT > 0) z.slowT -= dt;
      if ((z.soulSlowT ?? 0) > 0) z.soulSlowT! -= dt;
      if (z.poisonT > 0) { z.poisonT -= dt; this.hurt(z, 0.5 * dt); }
      if (z.freezeT > 0) { z.freezeT -= dt; continue; } // 冻住了：不走不吃
      const speed = def.speed * (this.alien && (z.kind === 'red' || z.kind === 'bike') ? ALIEN_SPEED_MUL : 1) * (z.slowT > 0 ? 0.5 : 1) * ((z.soulSlowT ?? 0) > 0 ? SOUL_SLOW_RATE : 1) * (z.charm ? -1 : 1);
      // 魅惑僵尸：往右走打别的僵尸
      if (z.charm) {
        z.x += Math.abs(def.speed) * dt;
        const foe = this.zombies.find((o) => !o.dead && o !== z && o.row === z.row && Math.abs(o.x - z.x) < 0.6 && !o.charm);
        if (foe) this.hurt(foe, 4 * dt);
        if (z.x > COLS + 0.5) z.dead = true; // 魅惑队友走出草坪=退场算死亡
        continue;
      }
      if (z.state === 'gone') { z.dead = true; continue; }
      // 地刺大招：进了 5×5 范围的僵尸被吸向地刺格子（吸的时候不能走不能吃）
      const pullSpike = this.plants.find((q) => (q.boostT ?? 0) > 0 && (q.kind === 'spike' || q.kind === 'venomspike' || q.kind === 'icespike')
        && Math.abs(z.row - q.row) <= 2 && Math.abs(z.x - q.col) <= 2.2 && Math.abs(z.x - q.col) > 0.3);
      if (z.pullX == null && pullSpike && !ZOMBIES[z.kind].flying) { z.pullX = pullSpike.col; z.pullRow = pullSpike.row; }
      if (z.pullX != null && !ZOMBIES[z.kind].flying) {
        z.x += Math.sign(z.pullX - z.x) * Math.abs(def.speed) * dt;
        if (Math.abs(z.x - z.pullX) < 0.3) { z.row = z.pullRow ?? z.row; z.pullX = undefined; z.pullRow = undefined; }
        continue;
      }
      // 矿工：挖到最左列冒头往回走（吃后排）
      if (z.state === 'dig') {
        z.x -= 0.45 * dt;
        if (z.x <= 0.5) { z.state = 'back'; }
        continue;
      }
      // BOSS 机甲：站定不换行地召唤+喷球+定时换行
      if (z.kind === 'ufo' || z.kind === 'mech') {
        if (z.kind === 'ufo') {
          z.summonT = (z.summonT ?? UFO_SUMMON) - dt;
          z.ballT = (z.ballT ?? UFO_BIKE_EVERY) - dt;
          z.rowT = (z.rowT ?? 5) - dt;
          if (z.summonT <= 0) {
            z.summonT = UFO_SUMMON;
            const pool: ZKind[] = ['basic', 'cone', 'balloon', 'white', 'bucket'];
            this.spawnZombie(pool[Math.floor(Math.random() * pool.length)], z.row);
            this.pushLog('飞碟召唤了一只僵尸！');
          }
          if (z.ballT <= 0) { // 百车向前：一列悬浮自行车
            z.ballT = UFO_BIKE_EVERY;
            for (let r = 0; r < ROWS; r++) this.spawnZombie('bike', r);
            this.pushLog('百车向前！一整列悬浮自行车杀过来了！');
          }
          if (z.rowT <= 0) { z.rowT = 5; z.row = ROWS - 1 - Math.floor(Math.random() * 3); } // 只在最后3排换行
          continue;
        }
        z.summonT = (z.summonT ?? MECH_SUMMON_EVERY) - dt;
        z.ballT = (z.ballT ?? MECH_BALL_EVERY) - dt;
        z.rowT = (z.rowT ?? MECH_ROW_EVERY) - dt;
        if (z.summonT <= 0) {
          z.summonT = MECH_SUMMON_EVERY;
          const pool: ZKind[] = ['basic', 'cone', 'balloon', 'white', 'bucket'];
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
      const isSpike = plant && (plant.kind === 'spike' || plant.kind === 'venomspike' || plant.kind === 'icespike');
      const blocking = !!plant && !isSpike && Math.abs(z.x - plant.col) <= 0.6 && !plant.laddered && !ZOMBIES[z.kind].flying;
      // 木梯僵尸：碰到坚果/竹盾/南瓜壳 → 架梯子翻过去不啃，梯子一次性用完就没了
      if (blocking && z.kind === 'ladder' && !z.usedLadder && (plant!.kind === 'nut' || plant!.kind === 'bamboo' || (plant!.pumpkin ?? 0) > 0 || (plant!.moss ?? 0) > 0 || (plant!.soul ?? 0) > 0)) {
        plant!.laddered = true;
        z.usedLadder = true;
        this.pushLog('木梯僵尸架上梯子了，僵尸都能翻过去！');
      } else if (blocking) {
        // 巨人/冰车/蓝钻甲：不啃，直接砸/碾
        const eatRate = (plant!.soul ?? 0) > 0 ? SOUL_SLOW_RATE : 1; // 蓝魂方框：啃它也变慢
        z.eatT += dt * eatRate;
        if (z.kind === 'white' || z.kind === 'red' || z.kind === 'diamond' || z.kind === 'bike') {
          if (z.eatT >= 1.5) { z.eatT = 0; plant!.hp = 0; this.pushLog(`${def.cn}砸扁了${PLANTS[plant!.kind].cn}！`); }
        } else {
          // 普通啃咬：先啃各种壳（蓝魂→苔藓→南瓜），壳破才啃本体
          if ((plant!.soul ?? 0) > 0) {
            plant!.soul! -= def.eatDps * dt * eatRate;
            z.soulSlowT = 2; if (plant!.soul! <= 0) this.pushLog('蓝魂方框被啃破了！');
          } else if ((plant!.moss ?? 0) > 0) {
            plant!.moss! -= def.eatDps * dt;
            z.poisonT = Math.max(z.poisonT, 1); if (plant!.moss! <= 0) this.pushLog('苔藓方框被啃破了！');
          } else if (plant!.pumpkin != null && plant!.pumpkin > 0) { plant!.pumpkin -= def.eatDps * dt; if (plant!.pumpkin <= 0) this.pushLog('南瓜方框被啃破了！'); }
          else if (plant!.kind === 'hypno') {
            // 粉伞伞：咬一口就被魅惑，回头替植物打（巨人免疫）
            plant!.hp = 0; z.charm = true; this.pushLog(`${def.cn}被魅惑了！`);
          } else if (plant!.kind === 'toxin') {
            // 毒素菇：吃掉它的僵尸中毒 15 秒
            plant!.hp = 0; z.poisonT = TOXIN_POISON; this.pushLog(`${def.cn}吃了毒素菇，中毒了！`);
          } else if (plant!.kind === 'soulweed') {
            // 蓝魂草：吃完冻结 5 秒 + 解冻后减速 10 秒 + 固定扣半格
            plant!.hp = 0; z.freezeT = SOUL_FREEZE; z.slowT = SOUL_FREEZE + SOUL_SLOW; this.hurt(z, SOUL_DMG);
            this.pushLog(`${def.cn}被蓝魂草冻住了！`);
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
          if (z.dead || z.row !== pr.row || Math.abs(z.x - pr.x) >= 0.45 || z.x <= 0 || z.charm || pr.hits!.has(z)) continue;
          pr.hits!.add(z);
          if (ZOMBIES[z.kind].flying) this.popBalloon(z);
          else this.hurt(z, pr.dmg);
        }
      } else if (landing) {
        if (landed) {
          const hit = this.zombies.find((z) => !z.dead && z.row === pr.row && Math.abs(z.x - pr.x) < 0.45 && z.x > 0 && !z.charm);
          if (hit) {
            if (ZOMBIES[hit.kind].flying) this.popBalloon(hit);
            else this.hurt(hit, pr.dmg);
            pr.dmg = -1;
          }
        }
      } else {
        // 直线弹（豌豆/冰/毒/藓/小炸）：打同行第一个活僵尸（小炸弹能崩气球），不打魅惑队友
        const hit = this.zombies.find((z) => !z.dead && z.row === pr.row && Math.abs(z.x - pr.x) < 0.45 && z.x > 0 && !z.charm
          && (pr.kind === 'minibomb' || !ZOMBIES[z.kind].flying));
        if (hit) {
          if (ZOMBIES[hit.kind].flying) { this.popBalloon(hit); pr.dmg = -1; }
          else {
            this.hurt(hit, pr.dmg);
            if (pr.kind === 'ice') hit.slowT = 4;
            if (pr.kind === 'venom') hit.poisonT = 5;
            if (pr.space) hit.poisonT = Math.max(hit.poisonT, 3); // 太空子弹附带太空效果
            if (pr.kind === 'moss') hit.poisonT = Math.max(hit.poisonT, MOSSPEA_POISON);
            pr.dmg = -1;
          }
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
