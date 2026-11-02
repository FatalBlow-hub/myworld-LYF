/** 电脑「躲避 TNT」小游戏 — 对电脑方块按 M 开机：黑屏→蓝屏→开玩。
 *
 *  玩法（2026-11-01 设定）：
 *  - 场地：底下 10 个草方块，上面 5 格高；玩家是 5 个小方块连起来的小人，只能 ←→ 走（不能跳）
 *  - 第一关：开局 5 个黑 TNT 在顶行连着往下掉（1 秒 1 格），每 3 秒顶行再刷一个；被砸中就爆炸回黑屏
 *  - 撑过 120 秒进无尽模式：底排变灵魂草方块（游戏画面里的，挖不了），掉的是黑色天梯（每 2 秒刷一个、0.5 秒掉一格）
 *  - 无尽模式每多活 10 秒发岛币：单人 3 个；双人都在场每人 1.5 个；一个人死了另一个变回 3 个
 *  - 双人：访岛同屏时蓝屏变 3 秒，对方也对着同一台电脑按 M 就同屏一起玩（visit.tnt 消息握手）
 *
 *  两边画面一致的原理：所有掉落物的时间表和列号都由同一个 seed 决定（mulberry32），
 *  开局时把 seed 发给对端，两边各自模拟就能得到同一块场地；对端小人的列号每帧互发。 */

import type { Controller } from '../../player/motion/Controller';
import type { TntPacket } from '../../net/Protocol';

// —— 场地与节奏（改数字只动这里） ——
const W = 10;              // 场地宽：底下一排 10 个草方块
const AIR_ROWS = 5;        // 空中的高：5 格
const STAGE1_SECONDS = 120; // 第一关要撑这么久
const STEP1 = 1.0;         // 第一关 TNT 每几秒掉一格（设定：每秒落下）
const STEP2 = 0.5;         // 无尽模式每几秒掉一格（设定：0.5 秒一格）
const SPAWN1 = 3;          // 第一关每几秒在顶行刷一个 TNT
const SPAWN2 = 2;          // 无尽模式每几秒在顶行刷一个黑色天梯
const REWARD_EVERY = 10;   // 无尽模式每活几秒发一次奖
const REWARD_SOLO = 3;     // 单人（或对手已死）每次得几个岛币
const REWARD_EACH = 1.5;   // 双人都在场每次每人得几个岛币
const BOOT_SOLO = 1;       // 单人蓝屏几秒（设定：一秒蓝屏就进游戏）
const BOOT_COOP = 3;       // 双人等待蓝屏几秒（设定：访岛时三秒，等对方按 M）
const PLAYER_SPEED = 5.5;  // 玩家每秒走几列
const HIT_RADIUS = 0.45;   // 被砸中的列距判定（半格不到一点，手下留情）

/** 掉落物：出生时刻 + 列 + 种类（ladder=true 是黑色天梯，只在无尽模式刷） */
interface Hazard { t: number; col: number; ladder: boolean }

/** 从种子推随机数（mulberry32）：双人局两端要出同一批 TNT，不能用 Math.random */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TntDeps {
  controller: Controller;
  /** 现在有没有真人在同屏联机（visitSync.active） */
  visitActive: () => boolean;
  /** 我的名字/对端名字（邀请撞车时字典序小的当主机，两边规则一致不打架） */
  myName: () => string;
  peerName: () => string;
  /** 发 visit.tnt 消息；没在联机会返回 false */
  send: (d: TntPacket) => boolean;
  /** 发奖：岛币进账（正数即可，面板不管余额） */
  addCoins: (n: number) => void;
  /** 面板右上角的小提示（比如"对方也进来了！"） */
  toast: (text: string) => void;
}

type Screen = 'off' | 'boot' | 'play' | 'boom';

export class TntGame {
  visible = false;

  private el: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private screen: Screen = 'off';
  private bootT = 0;
  private boomT = 0;

  // —— 本局状态 ——
  private comp = { x: 0, y: 0, z: 0 }; // 开的是哪台电脑（邀请/加入按它配对）
  private seed = 0;
  private elapsed = 0;
  private hazards: Hazard[] = [];
  private nextIdx = 0;          // 时间表走到哪一格了（schedule 是预生成的）
  private schedule: Hazard[] = [];
  private playerCol = 4.5;
  private moveTouch = 0;        // 手机左右键：-1/0/1
  private rewardN = 0;          // 无尽模式已经发过几次奖
  private floaties: { text: string; t: number }[] = []; // 画面上飘的"+3 岛币"

  // —— 双人联机状态 ——
  private coop = false;
  private peerCol = 4.5;
  private peerTarget = 4.5;
  private peerAlive = true;
  private peerBoomT = 0;
  private waitingJoin = false;   // 我发了邀请在等人 join
  private waitingStart = false;  // 我发了 join 在等 start
  private invite: { x: number; y: number; z: number; until: number } | null = null; // 收到的邀请
  private posAcc = 0;

  constructor(private d: TntDeps) {
    this.el = document.createElement('div');
    this.el.className = 'tnt-overlay';
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 400;
    this.el.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    // 手机左右键：按住就走，没有跳
    for (const [text, dir] of [['◀', -1], ['▶', 1]] as const) {
      const b = document.createElement('button');
      b.className = 'tnt-move';
      b.textContent = text;
      b.style.left = dir < 0 ? '16px' : 'auto';
      b.style.right = dir < 0 ? 'auto' : '16px';
      const on = (e: Event) => { e.preventDefault(); this.moveTouch = dir; };
      const off = (e: Event) => { e.preventDefault(); if (this.moveTouch === dir) this.moveTouch = 0; };
      b.addEventListener('touchstart', on, { passive: false });
      b.addEventListener('touchend', off);
      b.addEventListener('touchcancel', off);
      b.addEventListener('mousedown', on);
      b.addEventListener('mouseup', off);
      this.el.appendChild(b);
    }
    document.body.appendChild(this.el);
  }

  isOpen(): boolean { return this.visible; }

  /** 测试钩子：局内状态快照（自动化断言用，正常玩法不走这里） */
  debugState() {
    return {
      screen: this.screen, elapsed: +this.elapsed.toFixed(2), col: +this.playerCol.toFixed(2),
      coop: this.coop, peerAlive: this.peerAlive, rewards: this.rewardN,
      hazards: this.hazards.map((h) => ({ col: h.col, row: this.rowOf(h), ladder: h.ladder })),
      seed: this.seed, endless: this.elapsed >= STAGE1_SECONDS,
    };
  }

  /** 测试钩子：把小人摆到某一列（躲 TNT 测试不用模拟长按方向键） */
  debugMove(col: number): void { this.playerCol = Math.max(0, Math.min(W - 1, col)); }

  /** 测试钩子：快进 n 秒（等不了 120 秒真打无尽模式时用；
   *  只挪时钟不补碰撞，掉在半路的掉落物按新时刻重算行号） */
  debugSkip(seconds: number): void { this.elapsed += seconds; }

  /** 对电脑按 M：开机。x,y,z 是电脑方块的坐标（双人配对用） */
  open(x: number, y: number, z: number): void {
    this.comp = { x, y, z };
    this.visible = true;
    this.screen = 'boot';
    this.coop = false;
    this.waitingJoin = false;
    this.waitingStart = false;
    this.peerAlive = true;
    this.peerBoomT = 0;
    this.el.style.display = 'flex';
    if (!this.d.visitActive()) {
      this.bootT = BOOT_SOLO; // 没客人：一秒蓝屏直接玩
    } else {
      this.bootT = BOOT_COOP; // 有客人：三秒蓝屏，等对方也按 M
      const inv = this.invite;
      if (inv && inv.until > performance.now() && inv.x === x && inv.y === y && inv.z === z) {
        // 对方已经按了这台电脑在等我：直接 join，进"等 start"状态
        this.d.send({ m: 'join', x, y, z });
        this.waitingStart = true;
      } else {
        // 我先按的：发邀请，等对方 join；撞车（两边都发了邀请）由名字字典序定主机
        this.d.send({ m: 'invite', x, y, z });
        this.waitingJoin = true;
      }
    }
    this.draw();
  }

  /** 收到对端的 visit.tnt 消息（Game 从 NetClient 回调接进来） */
  onPeerMsg(d: TntPacket): void {
    if (d.m === 'invite') {
      this.invite = { x: d.x, y: d.y, z: d.z, until: performance.now() + 5000 };
      // 撞车：我也在 boot 且发了同一台电脑的邀请 → 名字大的让位当 joiner
      if (this.screen === 'boot' && this.waitingJoin && this.sameComp(d)
        && this.d.myName() > this.d.peerName()) {
        this.d.send({ m: 'join', x: d.x, y: d.y, z: d.z });
        this.waitingJoin = false;
        this.waitingStart = true;
      }
      // 我已经在单人玩这台电脑：把他拉进我这局（发当前种子和进度）
      else if (this.screen === 'play' && !this.coop && this.sameComp(d)) {
        this.d.send({ m: 'start', x: d.x, y: d.y, z: d.z, seed: this.seed, t: this.elapsed });
        this.coop = true;
        this.peerAlive = true;
        this.d.toast(`${this.d.peerName()} 也进来玩了！奖励平半分`);
      }
      return;
    }
    if (d.m === 'join' && this.sameComp(d)) {
      if (this.screen === 'boot' && this.waitingJoin) {
        // 对方接了邀请：我当主机，定种子开局，把种子告诉他
        this.startPlay(this.makeSeed(), true);
        this.d.send({ m: 'start', x: d.x, y: d.y, z: d.z, seed: this.seed, t: 0 });
        this.d.toast(`${this.d.peerName()} 进来了，双人模式！`);
      } else if (this.screen === 'play' && !this.coop) {
        // 我在单人玩、对方重新按 M（join）：把他拉进这局，发当前种子和进度
        this.d.send({ m: 'start', x: d.x, y: d.y, z: d.z, seed: this.seed, t: this.elapsed });
        this.coop = true;
        this.peerAlive = true;
        this.d.toast(`${this.d.peerName()} 也进来玩了！奖励平半分`);
      }
      return;
    }
    if (d.m === 'start' && this.screen === 'boot' && this.sameComp(d)
      && (this.waitingStart || this.waitingJoin)) {
      // waitingJoin 也要收 start：对方已经开打了（我方阵亡后重按 M 回局走的是邀请→对方回 start）
      this.waitingJoin = false;
      this.waitingStart = false;
      this.startPlay(d.seed, true, d.t ?? 0);
      return;
    }
    if (d.m === 'pos') {
      this.peerTarget = d.c;
      return;
    }
    if (d.m === 'dead' || d.m === 'quit') {
      this.peerAlive = false;
      this.peerBoomT = 0.6;
      this.coop = false; // 退回单人：他要是再按 M，还能被"中途加入"拉回这局
    }
  }

  /** 对端会话断了（visit.end）：等于对方退出，奖励回到单人价；等握手的也别干等 */
  onPeerGone(): void {
    this.coop = false;
    this.peerAlive = false;
    this.peerBoomT = 0;
    this.peerCol = -99;
    this.waitingJoin = false;
    this.waitingStart = false;
    this.invite = null;
    if (this.screen === 'boot') this.bootT = Math.min(this.bootT, BOOT_SOLO);
  }

  private sameComp(d: { x: number; y: number; z: number }): boolean {
    return d.x === this.comp.x && d.y === this.comp.y && d.z === this.comp.z;
  }

  private makeSeed(): number {
    return Math.floor(Math.random() * 0x7fffffff);
  }

  /** 开局：重置时间表和小人；startAt>0 = 中途加入，直接快进到主机的进度 */
  private startPlay(seed: number, coop: boolean, startAt = 0): void {
    this.seed = seed;
    this.coop = coop;
    this.screen = 'play';
    this.elapsed = 0;
    this.rewardN = 0;
    this.playerCol = 4.5;
    this.peerCol = 4.5;
    this.peerTarget = 4.5;
    this.peerAlive = true;
    this.floaties = [];
    this.buildSchedule();
    // 中途加入：时间表快进到主机同一时刻，还没掉到底的掉落物都补出来
    if (startAt > 0) {
      this.elapsed = startAt;
      while (this.nextIdx < this.schedule.length && this.schedule[this.nextIdx].t <= startAt) {
        this.hazards.push(this.schedule[this.nextIdx]);
        this.nextIdx++;
      }
      // 已经到底消失的就别补了
      this.hazards = this.hazards.filter((h) => this.rowOf(h) >= 0);
    }
  }

  /** 整局掉落物时间表：开局 5 个连着（列 3~7）；第一关每 3 秒一个；120 秒后每 2 秒一个天梯。
   *  列号从 seed 的同一条随机流按时间顺序取——两端各自重放结果一模一样，中途加入也能对上 */
  private buildSchedule(): void {
    const rng = mulberry32(this.seed);
    this.schedule = [{ t: 0, col: 3, ladder: false }, { t: 0, col: 4, ladder: false },
      { t: 0, col: 5, ladder: false }, { t: 0, col: 6, ladder: false }, { t: 0, col: 7, ladder: false }];
    for (let t = SPAWN1; t < STAGE1_SECONDS; t += SPAWN1) {
      this.schedule.push({ t, col: Math.floor(rng() * W), ladder: false });
    }
    for (let t = STAGE1_SECONDS + SPAWN2; t < STAGE1_SECONDS + 600; t += SPAWN2) {
      this.schedule.push({ t, col: Math.floor(rng() * W), ladder: true });
    }
    this.hazards = [...this.schedule.filter((h) => h.t <= 0)];
    this.nextIdx = this.hazards.length;
  }

  /** 掉落物现在在第几行（行 0 = 草方块那层，往上 1~5 格）；<0 = 到底消失了 */
  private rowOf(h: Hazard): number {
    const step = this.elapsed < STAGE1_SECONDS ? STEP1 : STEP2;
    return AIR_ROWS - Math.floor((this.elapsed - h.t) / step);
  }

  /** 每帧跑：PanelStack 的 update 接进来（画面被占时世界暂停，这里照常走） */
  update(dt: number): void {
    if (!this.visible) return;
    if (this.screen === 'boot') {
      this.bootT -= dt;
      // 双人局对方突然走了：蓝屏照常计完变单人
      if (this.waitingJoin && !this.d.visitActive()) this.bootT = Math.min(this.bootT, BOOT_SOLO);
      if (this.bootT <= 0 && !this.waitingStart) this.startPlay(this.makeSeed(), false);
      // 等 start 超时（对方退了/网卡）：别干等，单人开一局
      if (this.bootT <= -1 && this.waitingStart) this.startPlay(this.makeSeed(), false);
      this.draw();
      return;
    }
    if (this.screen === 'boom') {
      this.boomT -= dt;
      this.draw();
      if (this.boomT <= 0) this.close();
      return;
    }
    if (this.screen !== 'play') return;

    this.elapsed += dt;
    // 时间表放新掉落物
    while (this.nextIdx < this.schedule.length && this.schedule[this.nextIdx].t <= this.elapsed) {
      this.hazards.push(this.schedule[this.nextIdx]);
      this.nextIdx++;
    }
    this.hazards = this.hazards.filter((h) => this.rowOf(h) >= 0);

    // 左右移动（←→ 方向键 / A D / 手机按钮都能走；没有跳）
    const c = this.d.controller;
    const left = c.isDown('turnLeft') || c.isDown('strafeLeft') || this.moveTouch < 0;
    const right = c.isDown('turnRight') || c.isDown('strafeRight') || this.moveTouch > 0;
    if (left) this.playerCol -= PLAYER_SPEED * dt;
    if (right) this.playerCol += PLAYER_SPEED * dt;
    this.playerCol = Math.max(0, Math.min(W - 1, this.playerCol));

    // 双人：自己的列号发给对端（变化超过一点点或每 0.15 秒报一次）
    if (this.coop) {
      this.posAcc += dt;
      if (this.posAcc >= 0.15) {
        this.posAcc = 0;
        this.d.send({ m: 'pos', c: this.playerCol });
      }
      this.peerCol += (this.peerTarget - this.peerCol) * Math.min(1, dt * 14);
      if (this.peerBoomT > 0) this.peerBoomT -= dt;
    }

    // 被砸中判定：掉落物走到 1~2 行（小人占这两格高）且列撞上 → 爆炸
    for (const h of this.hazards) {
      const r = this.rowOf(h);
      if ((r === 1 || r === 2) && Math.abs(h.col - this.playerCol) < HIT_RADIUS + 0.5) {
        this.die();
        this.draw();
        return;
      }
    }

    // 无尽模式发奖：每活 10 秒一次，双人都在每人 1.5、只剩自己回到 3
    if (this.elapsed > STAGE1_SECONDS) {
      const due = Math.floor((this.elapsed - STAGE1_SECONDS) / REWARD_EVERY);
      while (this.rewardN < due) {
        this.rewardN++;
        const n = this.coop && this.peerAlive ? REWARD_EACH : REWARD_SOLO;
        this.d.addCoins(n);
        this.floaties.push({ text: `+${n} 岛币`, t: 1.4 });
      }
    }
    for (const f of this.floaties) f.t -= dt;
    this.floaties = this.floaties.filter((f) => f.t > 0);
    this.draw();
  }

  /** 被 TNT 砸了：爆炸一会儿，然后回黑屏（关掉面板露出黑屏电脑） */
  private die(): void {
    this.screen = 'boom';
    this.boomT = 0.8;
    if (this.coop) this.d.send({ m: 'dead' });
  }

  close(): void {
    if (!this.visible) return;
    if (this.coop && (this.screen === 'play' || this.screen === 'boot')) this.d.send({ m: 'quit' });
    this.visible = false;
    this.screen = 'off';
    this.el.style.display = 'none';
    this.moveTouch = 0;
  }

  // —————————— 下面是画面 ——————————

  /** 一格多少像素（场地 10 列占满 640 宽的中间 400 像素宽） */
  private get CELL(): number { return 40; }
  private get OX(): number { return (this.canvas.width - W * this.CELL) / 2; }
  private get OY(): number { return 120; } // 顶行 y（上面留给计时/标题）

  private draw(): void {
    const c = this.ctx;
    const { width, height } = this.canvas;
    if (this.screen === 'boot') {
      // 蓝屏：纯色 + 一行字（双人时写"等对方也按 M"）
      c.fillStyle = '#1a4fbd';
      c.fillRect(0, 0, width, height);
      c.fillStyle = '#ffffff';
      c.font = 'bold 28px sans-serif';
      c.textAlign = 'center';
      c.fillText('躲 避 T N T', width / 2, 170);
      c.font = '18px sans-serif';
      c.fillText(this.d.visitActive() && this.screen === 'boot'
        ? '等对方也对着电脑按 M 一起玩…' : '马上开始…', width / 2, 220);
      c.fillText('← → 或 A D 左右躲，没有跳', width / 2, 260);
      return;
    }
    // —— 游戏画面：天 + 场地 + 掉落物 + 小人 + HUD ——
    const sky = c.createLinearGradient(0, 0, 0, height);
    const endless = this.elapsed >= STAGE1_SECONDS;
    sky.addColorStop(0, endless ? '#101028' : '#8ecdf0');
    sky.addColorStop(1, endless ? '#28306a' : '#cfeaff');
    c.fillStyle = sky;
    c.fillRect(0, 0, width, height);

    // 底下一排 10 个草方块 / 无尽模式灵魂草方块（画死在游戏里，挖不了）
    const gy = this.OY + AIR_ROWS * this.CELL;
    for (let i = 0; i < W; i++) {
      const x = this.OX + i * this.CELL;
      c.fillStyle = endless ? '#3a3a8a' : '#6fae3a';
      c.fillRect(x, gy, this.CELL, 10);
      c.fillStyle = endless ? '#241f4a' : '#7a5230';
      c.fillRect(x, gy + 10, this.CELL, this.CELL - 10);
      c.strokeStyle = 'rgba(0,0,0,.25)';
      c.strokeRect(x + 0.5, gy + 0.5, this.CELL - 1, this.CELL - 1);
    }

    // 掉落物：黑 TNT / 黑色天梯
    for (const h of this.hazards) {
      const r = this.rowOf(h);
      if (r < 0 || r > AIR_ROWS) continue;
      const x = this.OX + h.col * this.CELL;
      const y = this.OY + (AIR_ROWS - r) * this.CELL; // r=5 在顶行，r=0 贴草地
      if (h.ladder) this.drawLadder(x, y);
      else this.drawTnt(x, y);
    }

    // 玩家小人（5 个小方块：头 + 身体 + 俩胳膊 + 腿）
    this.drawPlayer(this.playerCol, '#3a8ae8', true);
    if (this.coop) {
      if (this.peerBoomT > 0) this.drawBoom(this.peerCol, 1 - this.peerBoomT / 0.6);
      else if (this.peerAlive) this.drawPlayer(this.peerCol, '#e88a3a', false);
    }

    // 我爆炸的画面
    if (this.screen === 'boom') this.drawBoom(this.playerCol, 1 - this.boomT / 0.8);

    // HUD：时间 / 阶段 / 提示飘字
    c.fillStyle = endless ? '#ffe97a' : '#1a3a5a';
    c.font = 'bold 20px sans-serif';
    c.textAlign = 'center';
    const sec = Math.floor(this.elapsed);
    c.fillText(endless ? `无尽模式 · 已活 ${sec - STAGE1_SECONDS} 秒`
      : `撑过 ${STAGE1_SECONDS} 秒进无尽 · ${sec} 秒`, this.canvas.width / 2, 40);
    if (this.coop) {
      c.font = '14px sans-serif';
      c.fillText(this.peerAlive ? '双人同玩 · 奖励每人一半' : '对方阵亡 · 奖励恢复全额', this.canvas.width / 2, 64);
    }
    c.font = 'bold 22px sans-serif';
    c.fillStyle = '#ffe97a';
    this.floaties.forEach((f, i) => {
      c.globalAlpha = Math.min(1, f.t);
      c.fillText(f.text, this.canvas.width / 2 + 80, 90 - i * 26 - (1.4 - f.t) * 20);
      c.globalAlpha = 1;
    });
  }

  private drawTnt(x: number, y: number): void {
    const c = this.ctx, s = this.CELL;
    c.fillStyle = '#16161a';
    c.fillRect(x + 4, y + 4, s - 8, s - 8);
    c.fillStyle = '#2e2e36';
    c.fillRect(x + 4, y + 4, s - 8, 6); // 顶盖亮一点
    c.strokeStyle = '#000';
    c.strokeRect(x + 4.5, y + 4.5, s - 9, s - 9);
    c.fillStyle = '#f0f0f0';
    c.font = 'bold 11px sans-serif';
    c.textAlign = 'center';
    c.fillText('TNT', x + s / 2, y + s / 2 + 4);
  }

  private drawLadder(x: number, y: number): void {
    const c = this.ctx, s = this.CELL;
    c.strokeStyle = '#0e0e12';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x + 9, y + 4); c.lineTo(x + 9, y + s - 4);
    c.moveTo(x + s - 9, y + 4); c.lineTo(x + s - 9, y + s - 4);
    c.stroke();
    c.lineWidth = 3;
    c.beginPath();
    for (let i = 0; i < 3; i++) {
      const ry = y + 10 + i * 9;
      c.moveTo(x + 9, ry); c.lineTo(x + s - 9, ry);
    }
    c.stroke();
    c.lineWidth = 1;
  }

  /** 小人：头/身体/左右胳膊/腿 5 个小方块，站草上；self 蓝色、对方橙色 */
  private drawPlayer(col: number, color: string, self: boolean): void {
    const c = this.ctx, s = this.CELL;
    const cx = this.OX + (col + 0.5) * s; // 小人的中心线
    const base = this.OY + AIR_ROWS * s;  // 草地顶
    const u = s * 0.4;                    // 小方块边长
    c.fillStyle = color;
    c.fillRect(cx - u / 2, base - u * 3.0, u, u);       // 头
    c.fillRect(cx - u / 2, base - u * 1.9, u, u * 1.1); // 身体
    c.fillRect(cx - u * 1.1, base - u * 1.8, u * 0.55, u * 0.55); // 左胳膊
    c.fillRect(cx + u * 0.55, base - u * 1.8, u * 0.55, u * 0.55); // 右胳膊
    c.fillRect(cx - u / 2, base - u * 0.7, u, u * 0.7);            // 腿
    c.strokeStyle = self ? '#ffffff' : 'rgba(255,255,255,.5)';
    c.strokeRect(cx - u / 2 + 0.5, base - u * 3.0 + 0.5, u - 1, u - 1);
    if (!self) {
      c.fillStyle = '#ffffff';
      c.font = '11px sans-serif';
      c.textAlign = 'center';
      c.fillText(this.d.peerName().slice(0, 6), cx, base - u * 3.3);
    }
  }

  /** 爆炸：一团橙红闪光从小人位置扩出去 */
  private drawBoom(col: number, k: number): void {
    const c = this.ctx, s = this.CELL;
    const cx = this.OX + (col + 0.5) * s;
    const cy = this.OY + AIR_ROWS * s - s;
    const r = 10 + k * 70;
    const g = c.createRadialGradient(cx, cy, 2, cx, cy, r);
    g.addColorStop(0, 'rgba(255,240,160,.95)');
    g.addColorStop(0.5, 'rgba(255,120,40,.7)');
    g.addColorStop(1, 'rgba(255,60,20,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fill();
  }
}
