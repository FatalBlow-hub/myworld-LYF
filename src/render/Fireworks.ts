/** 彩珠礼花 — 放下去炸一束红黄蓝烟花，纯装饰、不造成任何伤害
 *
 *  一次 burst 生成 36 颗小光点，向外飞散 + 受重力下坠 + 逐渐变淡，2 秒后整组收回。 */

import * as THREE from 'three';

interface Flare {
  sprite: THREE.Sprite;
  vx: number; vy: number; vz: number;
  age: number;
  life: number;
}

const COLORS = [0xff5a4a, 0xffd24a, 0x4a8cff];

export class Fireworks {
  private flares: Flare[] = [];
  private material: THREE.SpriteMaterial;

  constructor(private scene: THREE.Scene) {
    this.material = new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, depthWrite: false });
  }

  /** 在 (x,y,z) 炸一束烟花 */
  burst(x: number, y: number, z: number): void {
    for (let i = 0; i < 36; i++) {
      const color = COLORS[i % COLORS.length];
      const sprite = new THREE.Sprite(this.material.clone());
      sprite.material.color.setHex(color);
      sprite.position.set(x, y, z);
      sprite.scale.set(0.16, 0.16, 0.16);
      this.scene.add(sprite);
      const ang = (Math.PI * 2 * i) / 36 + Math.random() * 0.2;
      const speed = 2.5 + Math.random() * 3.5;
      this.flares.push({
        sprite,
        vx: Math.cos(ang) * speed,
        vy: 3 + Math.random() * 4,
        vz: Math.sin(ang) * speed,
        age: 0,
        life: 1.4 + Math.random() * 0.6,
      });
    }
  }

  update(dt: number): void {
    for (let i = this.flares.length - 1; i >= 0; i--) {
      const f = this.flares[i];
      f.age += dt;
      if (f.age >= f.life) {
        this.scene.remove(f.sprite);
        f.sprite.material.dispose();
        this.flares.splice(i, 1);
        continue;
      }
      f.vy -= 6 * dt;
      f.sprite.position.x += f.vx * dt;
      f.sprite.position.y += f.vy * dt;
      f.sprite.position.z += f.vz * dt;
      f.sprite.material.opacity = 1 - f.age / f.life;
    }
  }

  clear(): void {
    for (const f of this.flares) {
      this.scene.remove(f.sprite);
      f.sprite.material.dispose();
    }
    this.flares = [];
  }
}
