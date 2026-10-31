/** 活物总管 — 动物和僵尸的生成/消失/每帧更新/被打死掉东西，Game 只管喊它干活 */

import * as THREE from 'three';
import { ANIMAL, BIRD, BLOODZOMBIE, CAT, CHUNK, CORRUPT, DAY, DEEPGREEN_DROP, FISH, MANUAL, NEAR_HOOFED, RAT, STARZOMBIE, WARRIOR, WOLF, ZOMBIE } from '../../config';
import { BLOOD_MEAT, COOKED_MEAT, DIY_MANUAL, DYE_DEEPGREEN, FEATHER_BLACK, GLOW_SHROOM, IRON_NUGGET, RAW_MEAT, SILK, SNOWFLAKE, SOUL_DYE, STAR_SHARD, WOLF_STAR_SHARD } from '../../world/blocks/Block';
import { STAR_ZOMBIE_GLOW_CHANCE } from '../../world/terrain/mushrooms';
import { DIY_GOLD_MANUAL as GOLD_MANUAL } from '../../world/recipes/GoldenItems';
import { World } from '../../world/World';
import { Animal, BIRD_KINDS, rayHitAnimal, spawnAnimals } from '../creatures/Animal';
import { Archer, BowForm } from '../summons/Archer';
import { FISH_ITEM, Fish, rayHitFish, spawnFish } from '../creatures/Fish';
import { Warrior, WarriorTier } from '../summons/Warrior';
import { Zombie, ZombieKind, rayHitZombie, spawnZombies } from './Zombie';

export interface MobHit {
  mob: Animal | Zombie | Fish;
  dist: number;
}

export class Mobs {
  animals: Animal[] = [];
  zombies: Zombie[] = [];
  /** 小战士（玩家买蛋召唤的保镖）：跟着玩家、优先打正在打玩家的怪 */
  warriors: Warrior[] = [];
  /** 弓箭手小战士（小战士弓召唤的哨兵）：守在岗位上放箭，不跟主人跑 */
  archers: Archer[] = [];
  /** 海里的鱼：下水按 P 打，打死掉生鱼 */
  fish: Fish[] = [];
  /** 僵尸攻击开关：关掉后僵尸只会瞎逛，不追人也不挠人 */
  zombieAttack = true;
  zombieSpawn = true;
  /** 负面豁免期间（春卷/圣诞甜饼）让星空尸不主动追人 */
  calmStars = false;
  private timer = 0; // 补刷倒计时

  constructor(
    private world: World,
    private scene: THREE.Scene,
    /** 掉一个掉落物（掉落物归 Game 管） */
    private onDrop: (id: number, n: number, x: number, y: number, z: number) => void,
    /** 僵尸挠到玩家了（扣血 + 提示归 Game 管；kind 区分是哪种僵尸） */
    private onPlayerHit: (damage: number, kind: ZombieKind) => void,
    /** 还有没有手册能教的方法（学全了就不再掉 DIY 手册） */
    private canDropManual: () => boolean = () => true,
    /** 小战士砍死了怪 / 放了特技（暴击、秒杀），提示归 Game 管 */
    private onWarriorKill: (warrior: Warrior, tag: string) => void = () => {},
    /** 河豚扎到玩家了（扣血 + 提示归 Game 管） */
    private onPufferSting: (damage: number) => void = () => {},
    /** 小战士打死的怪：战利品交给 Game 直接塞进主人背包（不落地） */
    private onWarriorLoot: (loot: [number, number][]) => void = () => {},
  ) {}

  /** 召唤一个小战士（玩家拿蛋对地按 M）；刚出来站在主人脚边 */
  summonWarrior(tier: WarriorTier, x: number, y: number, z: number): Warrior {
    const w = new Warrior(tier, x, y, z);
    this.warriors.push(w);
    this.scene.add(w.group);
    return w;
  }

  /** 召唤一名弓箭手哨兵（玩家拿小战士弓对地按 M）：站在落点守家 */
  summonArcher(form: BowForm, x: number, y: number, z: number): Archer {
    const a = new Archer(form, x, y, z);
    this.archers.push(a);
    this.scene.add(a.group);
    return a;
  }

  /** 身边几格内有没有小战士或弓箭手：僵尸优先打他们（没有就还是打玩家） */
  private nearestWarrior(x: number, z: number): Warrior | Archer | null {
    let best: Warrior | Archer | null = null;
    let bestD = ZOMBIE.AGGRO;
    for (const w of [...this.warriors, ...this.archers]) {
      if (w.dead) continue;
      const d = Math.hypot(w.x - x, w.z - z);
      if (d < bestD) { best = w; bestD = d; }
    }
    return best;
  }

  /** 新生成的区块可能本来就住着动物：一半概率撒 1~2 只 */
  onChunkGen(cx: number, cz: number): void {
    if (this.animals.length >= ANIMAL.COUNT || Math.random() >= ANIMAL.CHUNK_CHANCE) return;
    const n = Math.min(1 + Math.floor(Math.random() * ANIMAL.CHUNK_PACK), ANIMAL.COUNT - this.animals.length);
    this.animals.push(...spawnAnimals(
      this.world, this.scene,
      cx * CHUNK.SIZE + CHUNK.SIZE / 2, cz * CHUNK.SIZE + CHUNK.SIZE / 2,
      n, 0, CHUNK.SIZE / 2,
    ));
  }

  /** 新档开局：出生点周围补撒动物（区块自带的不算够才补） */
  spawnInitial(x: number, z: number): void {
    const n = ANIMAL.COUNT - this.animals.length;
    if (n > 0) this.animals.push(...spawnAnimals(this.world, this.scene, x, z, n));
  }

  /** 每帧：活物都走起来 + 定时检查「走远的消失、不够数的补刷」
   *  night = 现在是黑夜；dayTime = 游戏内第几秒（腐败人只在黑夜尾巴上刷） */
  update(dt: number, px: number, py: number, pz: number, night: boolean, dayTime: number): void {
    const babies: Animal[] = [];
    for (const a of this.animals) {
      a.update(dt, this.world, px, py, pz);
      // 成年动物倒计时生宝宝；总数到上限就不生了
      if (!a.dead && a.adult) {
        a.breedT -= dt;
        if (a.breedT <= 0 && this.animals.length + babies.length < ANIMAL.MAX_TOTAL) {
          a.breedT = a.isBird ? BIRD.BREED_EVERY : ANIMAL.BREED_EVERY;
          babies.push(a.giveBirth(this.scene));
        }
      }
    }
    this.animals.push(...babies);
    // 寿终正寝的动物（鸟活够 90 秒）：化成烟，不掉东西
    if (this.animals.some((a) => a.dead)) {
      for (const a of this.animals.filter((a) => a.dead)) {
        if (a.hp <= 0) this.kill(a);
        else this.scene.remove(a.group);
      }
      this.animals = this.animals.filter((a) => !a.dead);
    }
    const summoned: Zombie[] = [];
    // 小战士先动：选目标 → 上去砍（砍完才知道有没有打死）
    for (const w of this.warriors) {
      w.lastHitTier = '';
      const killed = w.update(dt, this.world, { x: px, y: py, z: pz }, this.zombies);
      if (killed) this.onWarriorKill(w, w.lastHitTier);
    }
    if (this.warriors.some((w) => w.dead)) {
      for (const w of this.warriors.filter((w) => w.dead)) this.scene.remove(w.group);
      this.warriors = this.warriors.filter((w) => !w.dead);
    }
    // 弓箭手哨兵：站位放风筝打怪（打死怪也走 killedByWarrior，战利品直接进主人背包）
    for (const a of this.archers) a.update(dt, this.world, this.zombies);
    if (this.archers.some((a) => a.dead)) {
      for (const a of this.archers.filter((a) => a.dead)) {
        this.scene.remove(a.group);
        a.dispose();
      }
      this.archers = this.archers.filter((a) => !a.dead);
    }
    for (const z of this.zombies) {
      // 怪优先打小战士：身边有小战士就把目标换成它，没有才是玩家；挑战房的怪只认玩家；
      // 被牵引绳索拴住的怪不挠人也不当保镖目标（主人牵着走，见牵引绳索设定）
      const guard = this.zombieAttack && !z.inChallenge && !z.leashed ? this.nearestWarrior(z.x, z.z) : null;
      // 春卷/圣诞甜饼的负面豁免期间：星空尸不主动追人（其他怪照常）
    const starCalm = this.calmStars && z.kind === 'star';
    if (z.update(dt, this.world, guard ? guard.x : px, guard ? guard.z : pz, this.zombieAttack && !starCalm)) {
        if (guard) guard.hurt(z.damage);
        else {
          z.hurtOwnerT = WARRIOR.MEMORY; // 记一笔：这只怪正在打主人，小战士优先揍它
          this.onPlayerHit(z.damage, z.kind);
        }
      }
      // 腐败人：玩家走进 3 格内立刻吐第一只老鼠，之后每 3 秒一只（开关关了不吐）
      if (!z.dead && z.kind === 'corrupt' && this.zombieAttack && this.zombieSpawn) {
        const inRange = Math.hypot(px - z.x, pz - z.z) < CORRUPT.RANGE;
        const ratCount = this.zombies.filter((r) => r.kind === 'rat').length + summoned.length;
        if (inRange && ratCount < CORRUPT.MAX_RATS) {
          z.summonT -= dt;
          if (z.summonT <= 0) {
            z.summonT = CORRUPT.SUMMON_EVERY;
            summoned.push(...spawnZombies(this.world, this.scene, z.x, z.z, 1, 0.5, 1.5, 'rat'));
          }
        }
      }
    }
    this.zombies.push(...summoned);

    // 死掉的僵尸：寿终正寝的（silent）化成烟不掉东西；打死/毒死的走 kill 掉东西
    if (this.zombies.some((z) => z.dead)) {
      for (const z of this.zombies.filter((z) => z.dead)) {
        if (z.silent) {
          this.scene.remove(z.group);
          this.zombies = this.zombies.filter((x) => x !== z);
        } else {
          this.kill(z);
        }
      }
    }

    // 鱼在水里游；河豚扎到玩家就喊 Game 扣血
    for (const f of this.fish) {
      if (f.update(dt, this.world, px, py, pz)) this.onPufferSting(FISH.STING_DAMAGE);
    }
    // 死鱼（打死的/离水扑腾死的）走 kill：变成一条生鱼掉出来
    if (this.fish.some((f) => f.dead)) {
      for (const f of this.fish.filter((f) => f.dead)) this.kill(f);
    }

    // 血尸/星空尸只在晚上出没：天亮了就全部化掉（化成烟，不掉东西）
    // 挑战房里的血尸/星空尸不化（2026-10-29 设定：挑战房内不受黑夜限制，白天照样能打）
    // 腐败人和老鼠是黑夜尾巴上才来的，出现了就不走，得玩家自己打死
    const dayBurn = (z: Zombie) => (z.kind === 'blood' || z.kind === 'star') && !z.inChallenge;
    if (!night && this.zombies.some(dayBurn)) {
      for (const z of this.zombies) {
        if (dayBurn(z)) this.scene.remove(z.group);
      }
      this.zombies = this.zombies.filter((z) => !dayBurn(z));
    }

    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = ANIMAL.RESPAWN_EVERY;

    const far2 = ANIMAL.DESPAWN_DIST * ANIMAL.DESPAWN_DIST;
    const keepNear = <T extends { x: number; z: number; group: THREE.Group }>(list: T[], keep?: (e: T) => boolean): T[] =>
      list.filter((e) => {
        if (keep?.(e)) return true;
        if ((e.x - px) ** 2 + (e.z - pz) ** 2 <= far2) return true;
        this.scene.remove(e.group);
        return false;
      });
    this.animals = keepNear(this.animals, (a) => a.tamed || a.leashed); // 驯服的/被绳索拴住的不会被刷掉
    this.zombies = keepNear(this.zombies, (z) => z.leashed); // 被牵引绳索拴住的怪不会被刷掉
    this.fish = keepNear(this.fish);

    // 动物补在草/雪/泥土地上；僵尸什么地面都能刷
    const need = ANIMAL.COUNT - this.animals.length;
    if (need > 0) {
      this.animals.push(...spawnAnimals(this.world, this.scene, px, pz, need, ANIMAL.SPAWN_NEAR, ANIMAL.SPAWN_FAR));
    }
    // 羊牛猪保底（2026-11-01 设定）：玩家方圆 10 格内一只羊/牛/猪都没有，就补刷一只在 10~16 格外
    if (this.animals.length < ANIMAL.MAX_TOTAL && !this.animals.some((a) => !a.dead && !a.isBird
      && (a.kind === 'cow' || a.kind === 'pig' || a.kind === 'sheep')
      && Math.hypot(a.x - px, a.z - pz) <= NEAR_HOOFED.RADIUS)) {
      this.animals.push(...spawnAnimals(this.world, this.scene, px, pz, 1,
        NEAR_HOOFED.SPAWN_NEAR, NEAR_HOOFED.SPAWN_FAR, ['cow', 'pig', 'sheep']));
    }
    // 周围一只鸟都没有就定向补 2 只（老动物不会老死，名额被它们占满时鸟永远刷不出来；鸟 90 秒老死不会挤爆）
    if (!this.animals.some((a) => a.isBird) && this.animals.length < ANIMAL.MAX_TOTAL) {
      this.animals.push(...spawnAnimals(this.world, this.scene, px, pz, 2, ANIMAL.SPAWN_NEAR, ANIMAL.SPAWN_FAR, BIRD_KINDS));
    }
    // 海里补鱼：只刷在水里，岸上一只都不会有
    const needF = FISH.COUNT - this.fish.length;
    if (needF > 0) {
      this.fish.push(...spawnFish(this.world, this.scene, px, pz, needF, FISH.SPAWN_NEAR, FISH.SPAWN_FAR));
    }
    const needZ = this.zombieSpawn ? ZOMBIE.COUNT - this.zombies.filter((z) => z.kind === 'normal').length : 0;
    if (needZ > 0) {
      this.zombies.push(...spawnZombies(this.world, this.scene, px, pz, needZ, ANIMAL.SPAWN_NEAR, ANIMAL.SPAWN_FAR));
    }
    // 特殊僵尸只有晚上才刷：血尸和星空尸各补各的；腐败人只在黑夜最后几秒冒头
    if (night && this.zombieSpawn) {
      const needB = BLOODZOMBIE.COUNT - this.zombies.filter((z) => z.kind === 'blood').length;
      if (needB > 0) {
        this.zombies.push(...spawnZombies(this.world, this.scene, px, pz, needB, ANIMAL.SPAWN_NEAR, ANIMAL.SPAWN_FAR, 'blood'));
      }
      const needS = STARZOMBIE.COUNT - this.zombies.filter((z) => z.kind === 'star').length;
      if (needS > 0) {
        this.zombies.push(...spawnZombies(this.world, this.scene, px, pz, needS, ANIMAL.SPAWN_NEAR, ANIMAL.SPAWN_FAR, 'star'));
      }
      if (dayTime >= DAY.LENGTH - CORRUPT.LAST_SECONDS) {
        const needC = CORRUPT.COUNT - this.zombies.filter((z) => z.kind === 'corrupt').length;
        if (needC > 0) {
          this.zombies.push(...spawnZombies(this.world, this.scene, px, pz, needC, ANIMAL.SPAWN_NEAR, ANIMAL.SPAWN_FAR, 'corrupt'));
        }
      }
    }
  }

  /** 指着谁：动物、僵尸、鱼谁近算谁 */
  rayHit(
    ox: number, oy: number, oz: number,
    dx: number, dy: number, dz: number,
    maxDist: number,
  ): MobHit | null {
    const a = rayHitAnimal(this.animals, ox, oy, oz, dx, dy, dz, maxDist);
    const z = rayHitZombie(this.zombies, ox, oy, oz, dx, dy, dz, maxDist);
    const f = rayHitFish(this.fish, ox, oy, oz, dx, dy, dz, maxDist);
    let best: MobHit | null = null;
    if (a) best = { mob: a.animal, dist: a.dist };
    if (z && (!best || z.dist < best.dist)) best = { mob: z.zombie, dist: z.dist };
    if (f && (!best || f.dist < best.dist)) best = { mob: f.fish, dist: f.dist };
    return best;
  }

  /** 掉哪本手册：金色还是普通按概率定 */
  private manualId(): number {
    return Math.random() < MANUAL.GOLD_CHANCE ? GOLD_MANUAL : DIY_MANUAL;
  }

  /** 钓上来的鱼：把咬钩那只从海里摘走（钓鱼系统用），不走路不掉落 */
  removeFish(f: Fish): void {
    this.scene.remove(f.group);
    this.fish = this.fish.filter((x) => x !== f);
  }

  /** 一只活物被打死掉什么：地上掉落和小战士捡走共用这一张表 */
  private lootOf(mob: Animal | Zombie | Fish): [number, number][] {
    const out: [number, number][] = [];
    // 鱼：掉自己那一种生鱼
    if (mob instanceof Fish) {
      out.push([FISH_ITEM[mob.kind], 1]);
      return out;
    }
    if (mob instanceof Zombie) {
      if (mob.noLoot) return out;  // 挑战房的怪不掉东西
      // 幽灵鬼（灵魂虚空）：必掉 1 个灵魂蓝颜料 + 一半概率掉 1 朵雪花；不掺和普通僵尸的掉落池
      if (mob.kind === 'ghost') {
        out.push([SOUL_DYE, 1]);
        if (Math.random() < 0.5) out.push([SNOWFLAKE, 1]);
        return out;
      }
      // 所有僵尸都有 1/20 概率掉一颗深绿颜料（沼泽特产）
      if (Math.random() < DEEPGREEN_DROP) out.push([DYE_DEEPGREEN, 1]);
      // 腐败人：掉 6 个铁粒；腐败老鼠：掉 1 个铁粒
      if (mob.kind === 'corrupt') {
        out.push([IRON_NUGGET, CORRUPT.NUGGETS]);
        // 狼星碎片（2026-11-01 设定）：12.5% 概率额外掉一个灰白色的星星碎片
        if (Math.random() < WOLF.SHARD_CHANCE) out.push([WOLF_STAR_SHARD, 1]);
        return out;
      }
      if (mob.kind === 'rat') { out.push([IRON_NUGGET, RAT.NUGGETS]); return out; }
      // 星空尸：必掉 1 颗星星碎片 + 1 个生肉，10% 概率再掉一朵夜光蓝菇
      if (mob.kind === 'star') {
        out.push([STAR_SHARD, 1], [RAW_MEAT, 1]);
        if (Math.random() < STAR_ZOMBIE_GLOW_CHANCE) out.push([GLOW_SHROOM, 1]);
        return out;
      }
      // 血尸：掉 1~2 个血尸肉 + 必掉 1 本 DIY 手册
      if (mob.kind === 'blood') {
        out.push([BLOOD_MEAT, 1 + (Math.random() < BLOODZOMBIE.MEAT_EXTRA ? 1 : 0)]);
        if (this.canDropManual()) out.push([this.manualId(), 1]);
        return out;
      }
      out.push([RAW_MEAT, ZOMBIE.MEAT_MIN + (Math.random() < ZOMBIE.MEAT_EXTRA ? 1 : 0)]);
      if (Math.random() < ZOMBIE.COOKED_CHANCE) out.push([COOKED_MEAT, 1]);
      // 僵尸 100% 掉 2 本 DIY 手册（方法学全了就不掉）
      if (this.canDropManual()) out.push([this.manualId(), 1], [this.manualId(), 1]);
      return out;
    }
    // 猫（2026-11-01 设定）：固定 1 生肉；二次随机掉落原文写「75% 概率 +1 个生肉 / 25% 概率 +1 个生肉」，
    // 两档相同，按原文照写 = 固定再掉 1 个（要改成 25% 档掉别的，改这一行就行）+ 12.5% 摸下丝线
    if (mob.kind === 'cat') {
      out.push([RAW_MEAT, 1]); // 固定掉落
      out.push([RAW_MEAT, 1]); // 二次随机掉落（75%/25% 两档都是 +1）
      if (Math.random() < CAT.SILK_CHANCE) out.push([SILK, 1]);
      return out;
    }
    // 鸟：普通鸟掉 1~2 生肉 + 一半概率掉自己的羽毛；虎皮鹦鹉必掉 2 生肉；乌鸦必掉 1 生肉 + 1 黑羽毛
    if (mob.isBird) {
      const meat = mob.kind === 'budgie' ? 2 : mob.kind === 'crow' ? 1 : 1 + (Math.random() < 0.5 ? 1 : 0);
      out.push([RAW_MEAT, meat]);
      if (mob.kind === 'crow') out.push([FEATHER_BLACK, 1]);
      else if (Math.random() < BIRD.FEATHER_CHANCE) out.push([mob.feather, 1]);
    } else {
      out.push([RAW_MEAT, 1 + Math.floor(Math.random() * 3)]);
      if (mob.kind === 'sheep') out.push([mob.woolId, 1]);
    }
    // 一半概率掉 DIY 手册：捡了能学会一个制作方法；方法学全了就不再掉
    if (Math.random() < MANUAL.DROP_CHANCE && this.canDropManual()) out.push([this.manualId(), 1]);
    return out;
  }

  /** 活物被打死：消失 + 掉东西（僵尸掉得多，还可能掉熟肉）；小战士砍死的直接进主人背包 */
  kill(mob: Animal | Zombie | Fish): void {
    this.scene.remove(mob.group);
    if (mob instanceof Fish) this.fish = this.fish.filter((x) => x !== mob);
    else if (mob instanceof Zombie) this.zombies = this.zombies.filter((x) => x !== mob);
    else this.animals = this.animals.filter((x) => x !== mob);
    const loot = this.lootOf(mob);
    if (!loot.length) return;
    // 小战士砍死的：战利品不落地，直接送到主人背包
    if (mob instanceof Zombie && mob.killedByWarrior) { this.onWarriorLoot(loot); return; }
    for (const [id, n] of loot) this.onDrop(id, n, mob.x, mob.y, mob.z);
  }
}
