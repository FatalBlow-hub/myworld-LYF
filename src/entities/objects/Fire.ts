/** 临时火焰 — 打火石点出红火/蓝色灵火，按时熄灭且不会蔓延 */

import * as THREE from 'three';
import { CHUNK, FIRE } from '../../config';
import { AIR, isSolid } from '../../world/blocks/Block';
import type { BlockHit } from '../../interact/BlockPicker';
import { World } from '../../world/World';
import { createFlameTexture } from '../../render/textures/FireTextures';
import type { FlameColor } from '../../render/textures/FireTextures';

interface BurningFire {
  sprite: THREE.Sprite;
  remaining: number;
}

export class FireSystem {
  private fires = new Map<string, BurningFire>();
  private textures: Record<FlameColor, THREE.CanvasTexture> = {
    red: createFlameTexture('red'),
    blue: createFlameTexture('blue'),
  };

  constructor(private scene: THREE.Scene) {}

  ignite(world: World, hit: BlockHit, color: FlameColor): boolean {
    const x = hit.x + hit.nx;
    const y = hit.y + hit.ny;
    const z = hit.z + hit.nz;
    if (y <= 0 || y >= CHUNK.HEIGHT) return false;
    world.ensureChunk(Math.floor(x / CHUNK.SIZE), Math.floor(z / CHUNK.SIZE));
    if (world.getBlock(x, y, z) !== AIR || !isSolid(world.getBlock(x, y - 1, z))) return false;
    const key = `${x},${y},${z}`;
    if (this.fires.has(key)) return false;

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.textures[color], transparent: true, alphaTest: 0.05, depthWrite: false,
    }));
    sprite.position.set(x + 0.5, y + FIRE.HEIGHT / 2, z + 0.5);
    sprite.scale.set(FIRE.WIDTH, FIRE.HEIGHT, 1);
    this.scene.add(sprite);
    this.fires.set(key, { sprite, remaining: color === 'blue' ? FIRE.SOUL_SECONDS : FIRE.RED_SECONDS });
    return true;
  }

  update(dt: number): void {
    for (const [key, fire] of this.fires) {
      fire.remaining -= dt;
      if (fire.remaining <= 0) {
        this.scene.remove(fire.sprite);
        fire.sprite.material.dispose();
        this.fires.delete(key);
      }
    }
  }

  clear(): void {
    for (const fire of this.fires.values()) {
      this.scene.remove(fire.sprite);
      fire.sprite.material.dispose();
    }
    this.fires.clear();
  }
}
