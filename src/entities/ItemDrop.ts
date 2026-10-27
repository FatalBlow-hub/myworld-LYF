/** 掉落物 — 掉在地上转圈的小方块，玩家走近会被吸进背包 */

import * as THREE from 'three';
import { ANIMAL } from '../config';
import { BLOCKS, BLOOD_MEAT, COBBLE_SHARD, COAL_FIRESTARTER, DIY_MANUAL, DYE_BLOOD, HYDROGEN_FIRESTARTER, MANG_FIRESTARTER, SOUL_FIRESTARTER, STAR_FIRESTARTER, STAR_SHARD } from '../world/Block';
import { World } from '../world/World';
import { PlayerBody } from '../player/Physics';

const SIZE = 0.28;
const PICKUP_DIST = 1.4;   // 多远开始被吸过去
const COLLECT_DIST = 0.6;  // 多近算捡到
const MAGNET_SPEED = 5;

export class ItemDrop {
  readonly mesh: THREE.Mesh;
  x: number; y: number; z: number;
  private vy = 3;
  dead = false;
  age = 0;
  /** 被背包拒收后的躲避时间（秒）：这几秒不往玩家身上飞，免得站在原地被提示刷屏 */
  refuseT = 0;
  private spin = Math.random() * Math.PI * 2;

  constructor(public itemId: number, public count: number, x: number, y: number, z: number) {
    // 小方块 + 物品颜色
    const c = BLOCKS[itemId]?.tex.side ? guessColor(itemId) : 0xffffff;
    // 会发光的物品（星星碎片）：自发光材质，黑夜里也亮晶晶
    const glow = BLOCKS[itemId]?.glow;
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(SIZE, SIZE, SIZE),
      new THREE.MeshLambertMaterial({ color: c, emissive: glow ? c : 0x000000 }),
    );
    this.mesh.castShadow = true;
    this.x = x; this.y = y; this.z = z;
    this.mesh.position.set(x, y + SIZE / 2, z);
  }

  /** 每帧：蹦一下落地、转圈、被玩家吸走。返回 true = 被捡了 */
  update(dt: number, world: World, body: PlayerBody): boolean {
    this.age += dt;
    if (this.age > ANIMAL.DROP_AGE) { this.dead = true; return false; }
    this.spin += dt * 3;

    // 重力 + 落地（小盒子半径当碰撞）
    const ny = this.y + this.vy * dt;
    if (world.isSolidAt(Math.floor(this.x), Math.floor(ny), Math.floor(this.z))) {
      this.vy = 0;
    } else {
      this.y = ny;
      this.vy -= 20 * dt;
    }

    // 靠近玩家 → 飞过去被吃掉（刚被拒收的东西先躲一会儿）
    if (this.refuseT > 0) this.refuseT = Math.max(0, this.refuseT - dt);
    const px = body.x, py = body.y + 0.8, pz = body.z;
    const dist = Math.hypot(px - this.x, py - this.y, pz - this.z);
    if (this.refuseT <= 0 && dist < PICKUP_DIST) {
      const k = Math.min(1, MAGNET_SPEED * dt / Math.max(dist, 0.01));
      this.x += (px - this.x) * k;
      this.y += (py - this.y) * k;
      this.z += (pz - this.z) * k;
      if (dist < COLLECT_DIST) { this.dead = true; return true; }
    }

    this.mesh.position.set(this.x, this.y + SIZE / 2 + Math.sin(this.spin * 0.6) * 0.05, this.z);
    this.mesh.rotation.y = this.spin;
    return false;
  }

  /** 背包满/装不下：把剩下这堆弹开，几秒内不再往玩家身上飞（东西留在地上，不凭空消失） */
  repel(body: PlayerBody, seconds: number): void {
    const dx = this.x - body.x;
    const dz = this.z - body.z;
    const len = Math.hypot(dx, dz) || 1;
    this.x = body.x + (dx / len) * (PICKUP_DIST + 0.6);
    this.z = body.z + (dz / len) * (PICKUP_DIST + 0.6);
    this.vy = 2;
    this.dead = false;      // 捡到一半时要把"已被捡走"的标记撤回
    this.refuseT = seconds;
  }
}

/** 掉落物小方块的颜色：跟着物品贴图的主色走 */
function guessColor(id: number): number {
  const colors: Record<number, number> = {
    100: 0xc94f4f, // 生肉
    [DIY_MANUAL]: 0xf2efe4, // DIY手册 = 白纸色
    111: 0xcfcfcf, 112: 0xf0c030, 113: 0x4fc3dd, // 铁粒 金粒 蓝钻石碎
    114: 0xcfcfcf, 115: 0xf0c030, 116: 0x4fc3dd, // 铁锭 金锭 蓝钻石
    [BLOOD_MEAT]: 0x5a1510, [DYE_BLOOD]: 0x5a1510, // 血尸掉的：暗血红
    [STAR_SHARD]: 0xbfe8ff, // 星星碎片：青白发光色
    125: 0x6f9f3a, 126: 0x9fdcf8, // 腌菜桶绿色、氢气瓶浅蓝
    74: 0x8a9098, 75: 0x7d848e,   // 化学拆解器、氢气引擎：铁壳色
    127: 0x1c1c1e, 128: 0x26262a, 129: 0x3e6b2e, // 橡胶、轮子黑色系，坦克绿
    130: 0x2e2e33, // 炮弹：黑铁色
    136: 0x8a8f96, // 挑战房：石头灰
    139: 0xe08a2e, // 胡萝卜：橙色
    144: 0xe8e8e8, // 白羽毛
    145: 0x9a9a9a, // 灰羽毛
    146: 0x4ea83e, // 绿羽毛
    147: 0x4a80b8, // 蓝羽毛
    148: 0xe0cc3a, // 黄羽毛
    149: 0x2a2a2a, // 黑羽毛
    169: 0x3a3a3a, // 煤块
    170: 0x3a3a3a, // 煤条
    171: 0x2a2a2a, // 煤炭
    172: 0x1c1c1c, // 煤粉
    173: 0xf0dc78, // 芒星碎片：黄白
    174: 0xf5e9a8, // 芒能灯：淡黄
    175: 0xbfe8ff, // 星能灯：青白
    176: 0x6fdc6f, // 氢能灯：绿
    177: 0xb03a2e, // 轮滑鞋：红色
    [COBBLE_SHARD]: 0x8d8d8d, // 圆石碎
    [COAL_FIRESTARTER]: 0x303034, [MANG_FIRESTARTER]: 0xd5bd65,
    [STAR_FIRESTARTER]: 0x8c8cf0, [SOUL_FIRESTARTER]: 0x5989e8, [HYDROGEN_FIRESTARTER]: 0x5fc4d8,
    // 四季树冠产物与柳树一族
    338: 0xf2aecf, // 樱花花瓣：粉色
    339: 0xc8422a, // 枫叶：红橙
    345: 0xf7f4dc, // 柳絮孢子：奶白
    346: 0xb8a44a, // 柳条：黄绿
    347: 0xcfe88a, // 柳絮腰包：浅黄绿
    349: 0xf7a8c8, // 樱花药包：樱粉
    351: 0xc8422a, // 枫叶腰包：枫红
    352: 0xc8422a, // 枫叶飞刀：枫红
    353: 0xb8a44a, // 柳条陷阱：黄绿
    // 美食 DIY（2026-10-28）
    377: 0xe8e0cc, // 面粉：米白
    380: 0xefe9d6, // 面团：白面
    378: 0x9a7b4a, // 生菌汤：褐汤
    379: 0xc85a4a, // 火腿：腌肉红
    381: 0xc8913c, // 法式面包棍：焦黄
    382: 0xd8a860, // 法式三明治：面包色
    383: 0xe0952c, // 南瓜饼：金黄
    384: 0xe8c45a, // 河豚汤：金汤
    385: 0xe86a1e, // 煎小丑鱼：橙
    386: 0xe07a4a, // 炖鲑鱼：橙红
    387: 0xe8b45a, // 炸鳕鱼排：酥皮金黄
    388: 0xe0c888, // 肉夹馍：馍白
    389: 0x9ab04a, // 竹筒饭：竹青
    390: 0xefe9d6, // 胡萝卜肉饺：饺皮白
    391: 0xe08a3a, // 胡萝卜蛋糕：胡萝卜色糖霜
    392: 0xe07a2a, // 胡萝卜炒蘑菇：橙
    393: 0xa8813c, // 绳索：麻绳棕
  };
  return colors[id] ?? 0xcccccc;
}
