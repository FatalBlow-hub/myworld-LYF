/** 载具总管 — 坦克的停车/上车下车/开炮/瞄准红点/炮弹飞行；Game 每帧喊它 update */

import * as THREE from 'three';
import { PLAYER, TANK } from '../../config';
import { TANK_BULLET, TANK as TANK_ITEM, isSolid } from '../../world/blocks/Block';
import { World } from '../../world/World';
import { BlockHit } from '../../interact/BlockPicker';
import { PlayerBody } from '../../player/motion/Physics';
import { Controller } from '../../player/motion/Controller';
import { Inventory } from '../../player/Inventory';
import { Hud } from '../../ui/hud/Hud';
import { Mobs } from '../../entities/mobs/Mobs';
import { Bullet, Tank, rayHitTank } from '../../entities/objects/Tank';

export class Vehicles {
  /** 放在地上的所有坦克（正开着的那辆也在里面） */
  readonly tanks: Tank[] = [];
  /** 正在飞的炮弹 */
  private bullets: Bullet[] = [];
  /** 正在开的坦克（null = 没开车） */
  riding: Tank | null = null;
  private fireT = 0;  // 开炮冷却
  private pickT = 0;  // 收坦克冷却
  /** 瞄到生物时贴在它身上的小红点（开火准星） */
  private aimDot: THREE.Mesh;

  constructor(private scene: THREE.Scene, private mobs: Mobs) {
    this.aimDot = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 0.18),
      new THREE.MeshBasicMaterial({ color: 0xff2010 }),
    );
    this.aimDot.visible = false;
    scene.add(this.aimDot);
  }

  /** L 放坦克：指着方块放它旁边/上面——脚下要有实地、身子两格空位 */
  parkTank(world: World, hit: BlockHit | null, yaw: number): boolean {
    if (!hit) return false;
    const tx = hit.x + hit.nx, ty = hit.y + hit.ny, tz = hit.z + hit.nz;
    if (!isSolid(world.getBlock(tx, ty - 1, tz))) return false; // 脚下得是实地，不能停半空
    if (isSolid(world.getBlock(tx, ty, tz)) || isSolid(world.getBlock(tx, ty + 1, tz))) return false;
    this.spawn(tx + 0.5, ty, tz + 0.5, yaw);
    return true;
  }

  /** 把一辆坦克放到地上（L 键放出来） */
  spawn(x: number, y: number, z: number, yaw: number): void {
    const t = new Tank(x, y, z);
    t.yaw = yaw;
    this.tanks.push(t);
    this.scene.add(t.group);
  }

  /**
   * 人死了还骑着车：背包有地儿就收进包（返回 true），没地儿就继续骑着复活（返回 false）。
   * 继续骑着时坦克留在原地等着——它每帧都贴在玩家脚下，复活后人挪走车就跟着挪。
   */
  stowOnDeath(inv: Inventory): boolean {
    if (!this.riding) return true;
    if (!inv.hasRoom(TANK_ITEM, 1)) return false; // 背包满了：人复活还骑着它
    this.scene.remove(this.riding.group);
    this.tanks.splice(this.tanks.indexOf(this.riding), 1);
    this.riding = null;
    inv.add(TANK_ITEM, 1);
    return true;
  }

  /**
   * 每帧干活：开车（贴脚走+两倍速标记）/ 瞄红点 / 开炮 / 下车；
   * 没开车时：指着坦克按 M 上车、按 P 收回背包。
   * aimDist = 现在指着的东西（生物/方块）里最近的距离，坦克比它近才抢得到按键。
   * slot = 快捷栏选中格；onInv = 装弹/收车后喊一声，让快捷栏数字刷新。
   */
  update(
    dt: number,
    world: World,
    body: PlayerBody,
    input: Controller,
    inv: Inventory,
    hud: Hud,
    aimDist: number,
    slot: number,
    onInv: () => void,
  ): void {
    this.fireT = Math.max(0, this.fireT - dt);
    this.pickT = Math.max(0, this.pickT - dt);

    const cp = Math.cos(body.pitch);
    const dx = -Math.sin(body.yaw) * cp;
    const dy = Math.sin(body.pitch);
    const dz = -Math.cos(body.yaw) * cp;
    const ox = body.x, oy = body.y + PLAYER.EYE, oz = body.z;

    // 拿炮弹按 L = 装弹：开着就装进自己这辆，没开就装进指着的那辆，手里这摞全进弹药舱
    const held = inv.hotbar[slot];
    if (held?.id === TANK_BULLET && input.isDown('place')) {
      const loadInto = this.riding ?? rayHitTank(this.tanks, ox, oy, oz, dx, dy, dz, Math.min(PLAYER.REACH, aimDist))?.tank;
      if (loadInto && input.take('place')) {
        loadInto.ammo += held.count;
        inv.hotbar[slot] = null;
        onInv();
        hud.showMessage(`装进 ${held.count} 发炮弹！弹药舱：${loadInto.ammo} 发`);
      }
    }

    if (this.riding) {
      // 开车：坦克贴在玩家脚下走，炮管跟着视线转
      this.riding.setPose(body.x, body.y, body.z, body.yaw);
      // 瞄到活物 → 它身上亮红点
      const aim = this.mobs.rayHit(ox, oy, oz, dx, dy, dz, TANK.BULLET_RANGE);
      this.aimDot.visible = !!aim;
      if (aim) this.aimDot.position.set(ox + dx * aim.dist, oy + dy * aim.dist, oz + dz * aim.dist);
      // P 开炮：打弹药舱里的炮弹，创造模式炮弹管够
      if (input.isDown('mine') && this.fireT <= 0) {
        this.fireT = TANK.FIRE_EVERY;
        if (inv.infinite || this.riding.ammo > 0) {
          if (!inv.infinite) this.riding.ammo--;
          const b = new Bullet(ox + dx * 0.8, oy + dy * 0.8, oz + dz * 0.8, dx, dy, dz);
          this.bullets.push(b);
          this.scene.add(b.mesh);
          onInv();
        } else {
          hud.showMessage(`弹药舱空了！拿着炮弹对坦克按 L 装弹（2 铁粒做 1 发）`);
        }
      }
      // M 下车：坦克原地停着
      if (input.take('door')) {
        const left = this.riding.ammo;
        this.riding = null;
        hud.showMessage(`下车了！弹药舱还剩 ${left} 发，对着坦克按 M 再上车`);
      }
    } else {
      this.aimDot.visible = false;
      // 指着停着的坦克（且它比指着的其他东西都近）→ M 上车 / P 收回
      const th = rayHitTank(this.tanks, ox, oy, oz, dx, dy, dz, Math.min(PLAYER.REACH, aimDist));
      if (th) {
        if (input.take('door')) {
          this.riding = th.tank;
          hud.showMessage(`上车啦！弹药舱 ${th.tank.ammo} 发 · P 开炮 · M 下车`);
        } else if (input.isDown('mine') && this.pickT <= 0) {
          this.pickT = TANK.PICK_COOLDOWN;
          this.scene.remove(th.tank.group);
          this.tanks.splice(this.tanks.indexOf(th.tank), 1);
          inv.add(TANK_ITEM, 1);
          if (th.tank.ammo > 0) inv.add(TANK_BULLET, th.tank.ammo); // 弹药舱里的炮弹退回来
          onInv();
          hud.showMessage(th.tank.ammo > 0 ? `坦克收回背包了（退回 ${th.tank.ammo} 发炮弹）` : '坦克收回背包了');
        }
      }
    }

    // 炮弹飞一帧，撞了的从场景里拿走
    this.bullets = this.bullets.filter((b) => {
      if (b.update(dt, world, this.mobs)) return true;
      this.scene.remove(b.mesh);
      return false;
    });
  }
}
