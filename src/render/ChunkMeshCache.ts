/** 区块网格缓存 — 标脏的区块重建网格、旧网格释放；材质也归它管，Game 只管喊"刷新" */

import * as THREE from 'three';
import { BLOOM } from '../config';
import { meshChunk } from './ChunkMesher';
import { Atlas } from './Textures';
import { attachWindSway, createDepthMaterial, createWaterMaterial } from './WaterMaterial';
import { World } from '../world/World';

interface ChunkMeshes {
  opaque: THREE.Mesh | null;
  water: THREE.Mesh | null;
  /** 会发光的方块（星空系列）：不受光照影响 */
  glow: THREE.Mesh | null;
}

export class ChunkMeshCache {
  private meshes = new Map<string, ChunkMeshes>();
  private opaqueMat!: THREE.MeshLambertMaterial;
  private depthMat!: THREE.MeshDepthMaterial;
  /** 发光材质：不受光照影响，黑夜里也亮堂堂 */
  private glowMat!: THREE.MeshBasicMaterial;
  private waterMat!: THREE.MeshLambertMaterial;

  private buildMaterials(): void {
    // alphaTest 让花草贴图的透明部分被裁掉（不然透明处会变成黑色方块）
    this.opaqueMat = new THREE.MeshLambertMaterial({
      map: this.atlas.texture,
      alphaTest: 0.5,
      vertexColors: true,
    });
    attachWindSway(this.opaqueMat, this.clock);
    this.depthMat = createDepthMaterial(this.atlas.texture, this.clock);
    this.waterMat = createWaterMaterial(this.atlas.texture, this.clock);
    this.glowMat = new THREE.MeshBasicMaterial({
      map: this.atlas.texture,
      alphaTest: 0.5,
      vertexColors: true,
      color: new THREE.Color(...BLOOM.GLOW_COLOR),
    });
  }

  constructor(
    private scene: THREE.Scene,
    private atlas: Atlas,
    readonly clock: { value: number } = { value: 0 },
  ) {
    this.buildMaterials();
  }

  /** 把标脏的区块重新生成网格，换掉旧网格 */
  rebuildDirty(world: World): void {
    for (const key of world.dirtyChunks) {
      const [cx, cz] = key.split(',').map(Number);
      const old = this.meshes.get(key);
      if (old) {
        old.opaque?.geometry.dispose();
        old.water?.geometry.dispose();
        old.glow?.geometry.dispose();
        if (old.opaque) this.scene.remove(old.opaque);
        if (old.water) this.scene.remove(old.water);
        if (old.glow) this.scene.remove(old.glow);
      }
      const geo = meshChunk(world, cx, cz, this.atlas);
      const entry: ChunkMeshes = { opaque: null, water: null, glow: null };
      if (geo.opaque) {
        entry.opaque = new THREE.Mesh(geo.opaque, this.opaqueMat);
        entry.opaque.castShadow = true;
        entry.opaque.receiveShadow = true;
        entry.opaque.customDepthMaterial = this.depthMat;
        this.scene.add(entry.opaque);
      }
      if (geo.water) {
        entry.water = new THREE.Mesh(geo.water, this.waterMat);
        entry.water.castShadow = false;
        entry.water.receiveShadow = true;
        this.scene.add(entry.water);
      }
      if (geo.glow) {
        entry.glow = new THREE.Mesh(geo.glow, this.glowMat);
        entry.glow.receiveShadow = true;
        this.scene.add(entry.glow);
      }
      this.meshes.set(key, entry);
      world.dirtyChunks.delete(key);
    }
  }

  /** 清空所有区块网格：几何体与材质一并释放并从场景移除 */
  clear(): void {
    for (const old of this.meshes.values()) {
      old.opaque?.geometry.dispose();
      old.water?.geometry.dispose();
      old.glow?.geometry.dispose();
      if (old.opaque) this.scene.remove(old.opaque);
      if (old.water) this.scene.remove(old.water);
      if (old.glow) this.scene.remove(old.glow);
    }
    this.meshes.clear();
    this.opaqueMat.dispose();
    this.depthMat.dispose();
    this.waterMat.dispose();
    this.glowMat.dispose();
    this.buildMaterials();
  }
}
