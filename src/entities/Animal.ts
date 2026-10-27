/** 动物 — 牛/猪/羊在世界闲逛：受重力、撞墙会绕路、挨打掉血、死了掉肉 */

import * as THREE from 'three';
import { ANIMAL, BIRD, POTION } from '../config';
import { TimedEffects } from '../player/TimedEffects';
import { COLOR_CSS, DIRT, FEATHER_BLACK, FEATHER_BLUE, FEATHER_GRAY, FEATHER_GREEN, FEATHER_WHITE, FEATHER_YELLOW, GRASS, SNOW, WOOL_IDS, WOOL_WHITE } from '../world/Block';
import { World } from '../world/World';
import { heightAt } from '../world/TerrainGen';
import { collidesAABB, stepWalk } from '../player/Physics';
import { rayHitBox } from './hitbox';

export type AnimalKind = 'cow' | 'pig' | 'sheep' | 'bird' | 'budgie' | 'crow';

interface KindDef {
  hp: number;
  body: number;   // 身体颜色
  head: number;   // 头颜色
  snout: number;  // 口鼻颜色
  leg: number;    // 腿颜色
  patch?: number; // 身体花纹颜色（奶牛白斑）
}

const KINDS: Record<AnimalKind, KindDef> = {
  cow:    { hp: 10, body: 0x6e4b2a, head: 0x8a6134, snout: 0xd9b295, leg: 0x553717, patch: 0xf0e6d2 },
  pig:    { hp: 10, body: 0xf0a0a8, head: 0xf0a0a8, snout: 0xe07b85, leg: 0xdd8f97 },
  sheep:  { hp: 8,  body: 0xececec, head: 0xd8c8b0, snout: 0xb09880, leg: 0xa89888 },
  // 鸟的长相不看这张表（用 BIRD_LOOK，按羽毛颜色上妆），这几个数字是凑数的
  bird:   { hp: BIRD.HP, body: 0xeeeeee, head: 0xeeeeee, snout: 0xe8952e, leg: 0xe8952e },
  budgie: { hp: BIRD.HP, body: 0x5ab84a, head: 0x5ab84a, snout: 0xe8952e, leg: 0xe8952e },
  crow:   { hp: BIRD.HP, body: 0x262626, head: 0x262626, snout: 0x555555, leg: 0x555555 },
};

/** 鸟的颜色方案：按「掉的羽毛」上妆（普通鸟白/灰，虎皮鹦鹉绿/蓝/黄/白，乌鸦黑） */
const BIRD_LOOK: Record<number, { body: number; wing: number; tail: number; beak: number }> = {
  [FEATHER_WHITE]:  { body: 0xeeeeee, wing: 0xd0d0d0, tail: 0xbcbcbc, beak: 0xe8952e },
  [FEATHER_GRAY]:   { body: 0x9a9a9a, wing: 0x7a7a7a, tail: 0x666666, beak: 0xe8952e },
  [FEATHER_GREEN]:  { body: 0x5ab84a, wing: 0x3d8a33, tail: 0x2e7028, beak: 0xe8a02e },
  [FEATHER_BLUE]:   { body: 0x4a90c8, wing: 0x3870a8, tail: 0x2a5888, beak: 0xe8a02e },
  [FEATHER_YELLOW]: { body: 0xe8d84a, wing: 0xc8b838, tail: 0xa89828, beak: 0xe8952e },
  [FEATHER_BLACK]:  { body: 0x262626, wing: 0x181818, tail: 0x0e0e0e, beak: 0x666666 },
};

/** 虎皮鹦鹉的四个花色（掉什么颜色的羽毛） */
const BUDGIE_FEATHERS = [FEATHER_GREEN, FEATHER_BLUE, FEATHER_YELLOW, FEATHER_WHITE];

const W = 0.9;   // 四脚动物身体宽
const H = 0.95;  // 四脚动物身体高
const BW = 0.5;  // 鸟的碰撞宽
const BH = 0.8;  // 鸟的碰撞高

export class Animal {
  readonly kind: AnimalKind;
  readonly group = new THREE.Group();
  /** 羊的羊毛颜色（掉什么颜色的羊毛）；牛/猪用不上 */
  woolId = WOOL_WHITE;
  hp: number;
  dead = false;
  slowT = 0;
  frozenT = 0;
  private poisons = new TimedEffects();

  addPoison(dmg: number, every: number, dur: number): void {
    this.poisons.add(dmg, every, dur);
  }
  /** 被蒲公英驯服了：会跟着玩家（按 M 可以切换成原地等待） */
  tamed = false;
  /** 等待模式：站着不动，不跟玩家 */
  waiting = false;
  /** 被绳索拴住了：也会跟着玩家走（和驯服互不影响，喂蒲公英照样能驯服） */
  leashed = false;
  /** 成长计时：长够 GROW_SECONDS 秒就是成年（刚生出来是 0） */
  growT = ANIMAL.GROW_SECONDS;
  /** 生宝宝倒计时：成年后开始走，到 0 生一只 */
  breedT = ANIMAL.BREED_EVERY * Math.random(); // 随机错开，不会扎堆生
  /** 鸟掉的羽毛是哪根（0 = 不是鸟）；鸟的颜色也照这根羽毛画 */
  feather = 0;
  /** 还剩几秒寿命（Infinity = 长生不老）；鸟寿终正寝不掉东西 */
  lifeT = Infinity;
  /** 碰撞盒宽高：四脚动物用 W/H，鸟用小的 */
  w = W;
  h = H;
  x: number; y: number; z: number;
  private vy = 0;
  private yaw = Math.random() * Math.PI * 2;
  private wanderT = 0;
  private idleT = 0; // >0 时站着发呆
  private flyT = 0;  // >0 = 正在飞（鸟专属）：扇几下翅膀往前飘，到点落回地上
  private flapT = 0; // 扇翅膀的节奏计时

  constructor(kind: AnimalKind, x: number, y: number, z: number, woolId = WOOL_WHITE, feather = 0) {
    this.kind = kind;
    this.woolId = woolId;
    this.feather = feather;
    this.hp = KINDS[kind].hp;
    if (feather !== 0) {
      this.w = BW; this.h = BH;
      this.lifeT = BIRD.LIFE_SECONDS;
      this.breedT = BIRD.BREED_EVERY * Math.random(); // 鸟的第一胎也用鸟的间隔
    }
    this.x = x; this.y = y; this.z = z;
    this.buildMesh();
    this.syncMesh();
  }

  /** 是鸟吗（bird/budgie/crow，看有没有羽毛） */
  get isBird(): boolean {
    return this.feather !== 0;
  }

  /** 挨打：只扣血，**不后退、不飞走**（不然一直打不中，追着跑很烦）；fromYaw 留着兼容调用方 */
  hurt(dmg: number, _fromYaw?: number): void {
    this.hp -= dmg;
    if (this.hp <= 0) this.dead = true;
  }

  /** 成年了吗（宝宝不能生崽） */
  get adult(): boolean {
    return this.growT >= ANIMAL.GROW_SECONDS;
  }

  /** 生宝宝：同种类的小不点；小羊的羊毛颜色跟野外刷的一样随机 */
  giveBirth(scene: THREE.Scene): Animal {
    const wool = this.kind === 'sheep'
      ? (Math.random() < 0.5 ? WOOL_WHITE : WOOL_IDS[1 + Math.floor(Math.random() * (WOOL_IDS.length - 1))])
      : WOOL_WHITE;
    const baby = new Animal(this.kind, this.x, this.y, this.z, wool, this.feather); // 鸟宝宝随爸妈花色
    baby.growT = 0;
    baby.breedT = this.isBird ? BIRD.BREED_EVERY : ANIMAL.BREED_EVERY; // 宝宝长大才开始算生崽
    baby.applyScale();
    scene.add(baby.group);
    return baby;
  }

  /** 宝宝只有一半大，30 秒慢慢长到正常体型 */
  applyScale(): void {
    const k = 0.5 + 0.5 * Math.min(1, this.growT / ANIMAL.GROW_SECONDS);
    this.group.scale.setScalar(k);
  }

  update(dt: number, world: World, px?: number, py?: number, pz?: number): void {
    this.poisons.update(dt, (amount) => { this.hp = Math.max(0, this.hp - amount); });
    if (this.hp <= 0) { this.dead = true; return; }
    this.slowT = Math.max(0, this.slowT - dt);
    this.frozenT = Math.max(0, this.frozenT - dt);
    if (this.frozenT > 0) { this.vy = 0; this.syncMesh(); return; }
    // 寿终正寝：鸟活够 90 秒就没了（死得安详，不掉东西）
    if (this.lifeT !== Infinity) {
      this.lifeT -= dt;
      if (this.lifeT <= 0) { this.dead = true; return; }
    }
    // 长个子：没长大就一点点变大
    if (!this.adult) {
      this.growT += dt;
      this.applyScale();
    }

    if ((this.tamed || this.leashed) && px !== undefined && py !== undefined && pz !== undefined) {
      // 驯服的羊/拴住的动物：等待（仅驯服）时钉在原地；离玩家超过 5 格就跟上去，太远跟丢直接传送
      if (!this.waiting || this.leashed) {
        const dist = Math.hypot(px - this.x, pz - this.z);
        if (dist > ANIMAL.TELEPORT_DIST) {
          for (const [ox, oz] of [[1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]] as const) {
            if (!collidesAABB(world, px + ox, py, pz + oz, this.w, this.h)) {
              this.x = px + ox; this.z = pz + oz; this.y = py; this.vy = 0;
              break;
            }
          }
        } else if (dist > ANIMAL.FOLLOW_DIST) {
          this.yaw = Math.atan2(-(px - this.x), -(pz - this.z));
          const sp = ANIMAL.FOLLOW_SPEED;
          this.tryMove(world, -Math.sin(this.yaw) * sp * dt, 0);
          this.tryMove(world, 0, -Math.cos(this.yaw) * sp * dt);
        }
        // 够近了：站着不动陪你
      }
    } else {
      // 野生的才会闲逛：每隔几秒换个方向，偶尔站着发呆
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = 2 + Math.random() * 3;
        if (Math.random() < 0.3) this.idleT = 1 + Math.random() * 2;
        else this.yaw = Math.random() * Math.PI * 2;
        // 鸟想飞就飞：一半概率起飞扑腾 1.5~4 秒
        if (this.isBird && Math.random() < 0.5) this.flyT = 1.5 + Math.random() * 2.5;
      }

      if (this.idleT > 0) {
        this.idleT -= dt;
      } else {
        const sp = this.flyT > 0 ? ANIMAL.SPEED * 2.2 : ANIMAL.SPEED; // 飞起来跑得更快
        const dx = -Math.sin(this.yaw) * sp * dt;
        const dz = -Math.cos(this.yaw) * sp * dt;
        if (!this.tryMove(world, dx, 0)) this.yaw += Math.PI / 2; // 撞墙就拐弯
        if (!this.tryMove(world, 0, dz)) this.yaw += Math.PI / 2;
      }
    }

    if (this.flyT > 0) {
      // 扑腾飞行：每 0.35 秒扇一下翅膀往上蹿一点，中间慢慢往下掉——一上一下往前飘
      this.flyT -= dt;
      this.flapT -= dt;
      if (this.flapT <= 0) { this.vy = 4; this.flapT = 0.35; }
      this.vy -= 12 * dt; // 飞的时候重力减半（不然蹿不起来）
    } else {
      this.vy -= 24 * dt;
    }
    // 垂直移动：掉下去或落地
    const ny = this.y + this.vy * dt;
    if (collidesAABB(world, this.x, ny, this.z, this.w, this.h)) {
      this.vy = 0;
    } else {
      this.y = ny;
    }
    this.syncMesh();
  }

  /** 水平挪一步，撞了就试试抬高 1 格跨上去（共用走路逻辑在 Physics.stepWalk） */
  private tryMove(world: World, dx: number, dz: number): boolean {
    const mult = this.slowT > 0 ? POTION.SLOW.mult : 1;
    const r = stepWalk(world, this.x, this.y, this.z, dx * mult, dz * mult, this.w, this.h);
    this.x = r.x; this.y = r.y; this.z = r.z;
    return r.moved;
  }

  private syncMesh(): void {
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.yaw;
  }

  /** 搭动物模型：鸟是鸟的样子，四脚动物是四脚的样子 */
  private buildMesh(): void {
    if (this.isBird) { this.buildBirdMesh(); return; }
    const d = KINDS[this.kind];
    // 彩色羊：身体染成羊毛的颜色，脸/腿还是原来那样
    const bodyColor = this.kind === 'sheep' ? parseInt(COLOR_CSS[this.woolId].slice(1), 16) : d.body;
    const mat = (c: number) => new THREE.MeshLambertMaterial({ color: c });
    const box = (w: number, h: number, l: number, x: number, y: number, z: number, c: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat(c));
      m.position.set(x, y, z);
      m.castShadow = true;
      this.group.add(m);
      return m;
    };

    // 身体（羊的身体更大一圈像毛茸茸）
    const bw = this.kind === 'sheep' ? 1.0 : W;
    box(bw, 0.55, 1.1, 0, 0.62, 0, bodyColor);
    if (d.patch !== undefined) {
      box(bw + 0.02, 0.3, 0.5, 0, 0.62, 0.2, d.patch); // 奶牛白斑
    }
    // 头朝 -z 方向（和 yaw=0 的朝向一致）
    box(0.42, 0.42, 0.42, 0, 0.95, -0.65, d.head);
    box(0.24, 0.18, 0.12, 0, 0.88, -0.92, d.snout);   // 口鼻
    box(0.06, 0.08, 0.02, -0.12, 1.02, -0.87, 0x222222); // 左眼
    box(0.06, 0.08, 0.02, 0.12, 1.02, -0.87, 0x222222);  // 右眼
    // 四条腿
    box(0.16, 0.35, 0.16, -0.28, 0.17, -0.4, d.leg);
    box(0.16, 0.35, 0.16, 0.28, 0.17, -0.4, d.leg);
    box(0.16, 0.35, 0.16, -0.28, 0.17, 0.4, d.leg);
    box(0.16, 0.35, 0.16, 0.28, 0.17, 0.4, d.leg);
    // 奶牛加耳朵
    if (this.kind === 'cow') {
      box(0.14, 0.08, 0.08, -0.26, 1.14, -0.65, d.head);
      box(0.14, 0.08, 0.08, 0.26, 1.14, -0.65, d.head);
    }
  }

  /** 搭鸟：小身板两条腿，脑袋 + 尖嘴 + 尾巴翘起来 + 两片翅膀，颜色跟掉的羽毛走 */
  private buildBirdMesh(): void {
    const look = BIRD_LOOK[this.feather] ?? BIRD_LOOK[FEATHER_WHITE];
    const mat = (c: number) => new THREE.MeshLambertMaterial({ color: c });
    const box = (w: number, h: number, l: number, x: number, y: number, z: number, c: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat(c));
      m.position.set(x, y, z);
      m.castShadow = true;
      this.group.add(m);
      return m;
    };
    box(0.34, 0.3, 0.44, 0, 0.44, 0, look.body);             // 圆身子
    box(0.22, 0.22, 0.22, 0, 0.66, -0.28, look.body);        // 脑袋（头朝 -z）
    box(0.1, 0.06, 0.14, 0, 0.62, -0.44, look.beak);         // 尖嘴
    box(0.05, 0.06, 0.02, -0.07, 0.7, -0.39, 0x111111);      // 左眼
    box(0.05, 0.06, 0.02, 0.07, 0.7, -0.39, 0x111111);       // 右眼
    box(0.05, 0.3, 0.32, -0.19, 0.46, 0, look.wing);         // 左翅膀
    box(0.05, 0.3, 0.32, 0.19, 0.46, 0, look.wing);          // 右翅膀
    const tail = box(0.2, 0.05, 0.26, 0, 0.56, 0.32, look.tail); // 尾巴翘起来
    tail.rotation.x = -0.5;
    box(0.06, 0.3, 0.06, -0.08, 0.15, 0, look.beak);         // 左腿
    box(0.06, 0.3, 0.06, 0.08, 0.15, 0, look.beak);          // 右腿
  }
}

/** 射线打动物：返回最近被打中的动物和距离 */
export function rayHitAnimal(
  animals: Animal[],
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  maxDist: number,
): { animal: Animal; dist: number } | null {
  const r = rayHitBox(animals, W, H, ox, oy, oz, dx, dy, dz, maxDist);
  return r ? { animal: r.target, dist: r.dist } : null;
}

/** 三种鸟（定向撒鸟时用） */
export const BIRD_KINDS: AnimalKind[] = ['bird', 'budgie', 'crow'];

/** 在 (cx,cz) 周围 rMin~rMax 格的圆环里撒动物；开局和跑图补动物都用它；kinds 可指定只撒哪几种 */
export function spawnAnimals(
  world: World,
  scene: THREE.Scene,
  cx: number,
  cz: number,
  count: number,
  rMin = 0,
  rMax = 15,
  kinds: AnimalKind[] = ['cow', 'pig', 'sheep', 'bird', 'budgie', 'crow'],
): Animal[] {
  const out: Animal[] = [];
  let tries = 0;
  while (out.length < count && tries++ < count * 15) {
    const ang = Math.random() * Math.PI * 2;
    const dist = rMin + Math.random() * (rMax - rMin);
    const x = cx + Math.cos(ang) * dist;
    const z = cz + Math.sin(ang) * dist;
    const h = heightAt(Math.floor(x), Math.floor(z));
    // 只生在草/雪/泥土地上（沙漠不长动物）
    const ground = world.getBlock(Math.floor(x), h - 1, Math.floor(z));
    if (ground !== GRASS && ground !== SNOW && ground !== DIRT) continue;
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    // 羊：一半白羊，另一半随机彩色（红/黄/蓝/绿/粉/橙/黑/灰）
    const wool = kind === 'sheep'
      ? (Math.random() < 0.5 ? WOOL_WHITE : WOOL_IDS[1 + Math.floor(Math.random() * (WOOL_IDS.length - 1))])
      : WOOL_WHITE;
    // 鸟的花色 = 掉的羽毛：普通鸟一半白一半灰，虎皮鹦鹉四色随机，乌鸦只有黑
    const feather = kind === 'bird' ? (Math.random() < 0.5 ? FEATHER_WHITE : FEATHER_GRAY)
      : kind === 'budgie' ? BUDGIE_FEATHERS[Math.floor(Math.random() * BUDGIE_FEATHERS.length)]
      : kind === 'crow' ? FEATHER_BLACK
      : 0;
    const a = new Animal(kind, x, h + 0.1, z, wool, feather);
    scene.add(a.group);
    out.push(a);
  }
  return out;
}
