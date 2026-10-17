/** 活物总管 — 动物和僵尸的生成/消失/每帧更新/被打死掉东西，Game 只管喊它干活 */

import * as THREE from 'three';
import { ANIMAL, BIRD, BLOODZOMBIE, CHUNK, CORRUPT, DAY, DEEPGREEN_DROP, MANUAL, RAT, STARZOMBIE, WARRIOR, ZOMBIE } from '../config';
import { BLOOD_MEAT, COOKED_MEAT, DIY_MANUAL, DYE_DEEPGREEN, FEATHER_BLACK, IRON_NUGGET, RAW_MEAT, STAR_SHARD } from '../world/Block';
import { DIY_GOLD_MANUAL as GOLD_MANUAL } from '../world/GoldenItems';
import { World } from '../world/World';
import { Animal, BIRD_KINDS, rayHitAnimal, spawnAnimals } from './Animal';
import { Warrior, WarriorTier } from './Warrior';
import { Zombie, ZombieKind, rayHitZombie, spawnZombies } from './Zombie';

export interface MobHit {
  mob: Animal | Zombie;
  dist: number;
}

export class Mobs {
  animals: Animal[] = [];
  zombies: Zombie[] = [];
  /** 小战士（玩家买蛋召唤的保镖）：跟着玩家、优先打正在打玩家的怪 */
  warriors: Warrior[] = [];
  /** 僵尸攻击开关：关掉后僵尸只会瞎逛，不追人也不挠人 */
  zombieAttack = true;
  zombieSpawn = true;
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
  ) {}

  /** 召唤一个小战士（玩家拿蛋对地按 M）；刚出来站在主人脚边 */
  summonWarrior(tier: WarriorTier, x: number, y: number, z: number): Warrior {
    const w = new Warrior(tier, x, y, z);
    this.warriors.push(w);
    this.scene.add(w.group);
    return w;
  }

  /** 身边几格内有没有小战士：僵尸优先打它（没有就还是打玩家） */
  private nearestWarrior(x: number, z: number): Warrior | null {
    let best: Warrior | null = null;
    let bestD = ZOMBIE.AGGRO;
    for (const w of this.warriors) {
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
    for (const z of this.zombies) {
      // 怪优先打小战士：身边有小战士就把目标换成它，没有才是玩家
      const guard = this.zombieAttack ? this.nearestWarrior(z.x, z.z) : null;
      if (z.update(dt, this.world, guard ? guard.x : px, guard ? guard.z : pz, this.zombieAttack)) {
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

    // 血尸/星空尸只在晚上出没：天亮了就全部化掉（化成烟，不掉东西）
    // 腐败人和老鼠是黑夜尾巴上才来的，出现了就不走，得玩家自己打死
    if (!night && this.zombies.some((z) => z.kind === 'blood' || z.kind === 'star')) {
      for (const z of this.zombies) {
        if (z.kind === 'blood' || z.kind === 'star') this.scene.remove(z.group);
      }
      this.zombies = this.zombies.filter((z) => z.kind !== 'blood' && z.kind !== 'star');
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
    this.animals = keepNear(this.animals, (a) => a.tamed); // 驯服的羊不会被刷掉
    this.zombies = keepNear(this.zombies);

    // 动物补在草/雪/泥土地上；僵尸什么地面都能刷
    const need = ANIMAL.COUNT - this.animals.length;
    if (need > 0) {
      this.animals.push(...spawnAnimals(this.world, this.scene, px, pz, need, ANIMAL.SPAWN_NEAR, ANIMAL.SPAWN_FAR));
    }
    // 周围一只鸟都没有就定向补 2 只（老动物不会老死，名额被它们占满时鸟永远刷不出来；鸟 90 秒老死不会挤爆）
    if (!this.animals.some((a) => a.isBird) && this.animals.length < ANIMAL.MAX_TOTAL) {
      this.animals.push(...spawnAnimals(this.world, this.scene, px, pz, 2, ANIMAL.SPAWN_NEAR, ANIMAL.SPAWN_FAR, BIRD_KINDS));
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

  /** 指着谁：动物和僵尸谁近算谁 */
  rayHit(
    ox: number, oy: number, oz: number,
    dx: number, dy: number, dz: number,
    maxDist: number,
  ): MobHit | null {
    const a = rayHitAnimal(this.animals, ox, oy, oz, dx, dy, dz, maxDist);
    const z = rayHitZombie(this.zombies, ox, oy, oz, dx, dy, dz, maxDist);
    if (a && (!z || a.dist <= z.dist)) return { mob: a.animal, dist: a.dist };
    if (z) return { mob: z.zombie, dist: z.dist };
    return null;
  }

  private dropManuals(count: number, x: number, y: number, z: number): void {
    for (let i = 0; i < count; i++) {
      const id = Math.random() < MANUAL.GOLD_CHANCE ? GOLD_MANUAL : DIY_MANUAL;
      this.onDrop(id, 1, x, y, z);
    }
  }

  /** 活物被打死：消失 + 掉东西（僵尸掉得多，还可能掉熟肉） */
  kill(mob: Animal | Zombie): void {
    this.scene.remove(mob.group);
    if (mob instanceof Zombie) {
      this.zombies = this.zombies.filter((x) => x !== mob);
      // 挑战房的怪不掉东西
      if (mob.noLoot) return;
      // 所有僵尸都有 1/20 概率掉一颗深绿颜料（沼泽特产）
      if (Math.random() < DEEPGREEN_DROP) this.onDrop(DYE_DEEPGREEN, 1, mob.x, mob.y, mob.z);
      // 腐败人：掉 6 个铁粒；腐败老鼠：掉 1 个铁粒
      if (mob.kind === 'corrupt') {
        this.onDrop(IRON_NUGGET, CORRUPT.NUGGETS, mob.x, mob.y, mob.z);
        return;
      }
      if (mob.kind === 'rat') {
        this.onDrop(IRON_NUGGET, RAT.NUGGETS, mob.x, mob.y, mob.z);
        return;
      }
      // 星空尸：必掉 1 颗星星碎片 + 1 个生肉
      if (mob.kind === 'star') {
        this.onDrop(STAR_SHARD, 1, mob.x, mob.y, mob.z);
        this.onDrop(RAW_MEAT, 1, mob.x, mob.y, mob.z);
        return;
      }
      // 血尸：掉 1~2 个血尸肉 + 必掉 1 本 DIY 手册
      if (mob.kind === 'blood') {
        this.onDrop(BLOOD_MEAT, 1 + (Math.random() < BLOODZOMBIE.MEAT_EXTRA ? 1 : 0), mob.x, mob.y, mob.z);
        if (this.canDropManual()) this.dropManuals(1, mob.x, mob.y, mob.z);
        return;
      }
      const n = ZOMBIE.MEAT_MIN + (Math.random() < ZOMBIE.MEAT_EXTRA ? 1 : 0);
      this.onDrop(RAW_MEAT, n, mob.x, mob.y, mob.z);
      if (Math.random() < ZOMBIE.COOKED_CHANCE) this.onDrop(COOKED_MEAT, 1, mob.x, mob.y, mob.z);
      // 僵尸 100% 掉 2 本 DIY 手册（方法学全了就不掉）
      if (this.canDropManual()) this.dropManuals(2, mob.x, mob.y, mob.z);
      return;
    }
    this.animals = this.animals.filter((x) => x !== mob);
    // 鸟：普通鸟掉 1~2 生肉 + 一半概率掉自己的羽毛；虎皮鹦鹉必掉 2 生肉；乌鸦必掉 1 生肉 + 1 黑羽毛
    if (mob.isBird) {
      const meat = mob.kind === 'budgie' ? 2 : mob.kind === 'crow' ? 1 : 1 + (Math.random() < 0.5 ? 1 : 0);
      this.onDrop(RAW_MEAT, meat, mob.x, mob.y, mob.z);
      if (mob.kind === 'crow') this.onDrop(FEATHER_BLACK, 1, mob.x, mob.y, mob.z);
      else if (Math.random() < BIRD.FEATHER_CHANCE) this.onDrop(mob.feather, 1, mob.x, mob.y, mob.z);
    } else {
      this.onDrop(RAW_MEAT, 1 + Math.floor(Math.random() * 3), mob.x, mob.y, mob.z);
      if (mob.kind === 'sheep') this.onDrop(mob.woolId, 1, mob.x, mob.y, mob.z);
    }
    // 一半概率掉 DIY 手册：捡了能学会一个制作方法；方法学全了就不再掉
    if (Math.random() < MANUAL.DROP_CHANCE && this.canDropManual()) {
      this.dropManuals(1, mob.x, mob.y, mob.z);
    }
  }
}
