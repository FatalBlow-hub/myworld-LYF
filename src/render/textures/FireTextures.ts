/** 打火石和火焰贴图 — 圆石碎、五种打火石、红火和蓝色灵火 */

import * as THREE from 'three';
import type { Painter } from './Textures';

export type FlameColor = 'red' | 'blue';

const firestarter = (body: string, metal: string, spark: string): Painter => (c, x, y) => {
  c.fillStyle = body;
  c.fillRect(x + 3, y + 10, 5, 3); c.fillRect(x + 6, y + 7, 5, 3);
  c.fillRect(x + 9, y + 4, 4, 3); c.fillRect(x + 12, y + 2, 2, 2);
  c.fillStyle = metal;
  c.fillRect(x + 4, y + 9, 4, 2); c.fillRect(x + 8, y + 6, 4, 2);
  c.fillStyle = spark;
  c.fillRect(x + 12, y, 1, 2); c.fillRect(x + 14, y + 2, 2, 1); c.fillRect(x + 11, y + 3, 1, 1);
};

const flame = (outer: string, inner: string, core: string): Painter => (c, x, y) => {
  c.fillStyle = outer;
  c.fillRect(x + 6, y + 10, 5, 5); c.fillRect(x + 4, y + 8, 3, 5);
  c.fillRect(x + 10, y + 7, 3, 6); c.fillRect(x + 7, y + 4, 4, 6);
  c.fillRect(x + 9, y + 1, 2, 4); c.fillRect(x + 4, y + 5, 2, 4);
  c.fillStyle = inner;
  c.fillRect(x + 7, y + 9, 4, 5); c.fillRect(x + 6, y + 6, 4, 4);
  c.fillStyle = core;
  c.fillRect(x + 8, y + 10, 2, 4); c.fillRect(x + 8, y + 7, 2, 2);
};

export const FIRE_PAINTERS: Record<string, Painter> = {
  cobble_shard: (c, x, y) => {
    c.fillStyle = '#8d8d8d';
    c.fillRect(x + 2, y + 4, 5, 5); c.fillRect(x + 8, y + 8, 6, 4);
    c.fillStyle = '#686868';
    c.fillRect(x + 4, y + 5, 3, 3); c.fillRect(x + 9, y + 9, 4, 2);
    c.fillStyle = '#b0b0b0';
    c.fillRect(x + 3, y + 4, 2, 1); c.fillRect(x + 9, y + 8, 2, 1);
  },
  firestarter_coal: firestarter('#303034', '#777777', '#ff6030'),
  firestarter_mang: firestarter('#8a6b2b', '#d5bd65', '#ffe99a'),
  firestarter_star: firestarter('#34326c', '#8c8cf0', '#d9fbff'),
  firestarter_soul: firestarter('#1c3268', '#5989e8', '#62baff'),
  firestarter_hydrogen: firestarter('#235d6b', '#5fc4d8', '#c8ffff'),
  fire_red: flame('#b42b12', '#f05a20', '#ffd34f'),
  fire_blue: flame('#163ca8', '#3186f0', '#c9f7ff'),
};

export function createFlameTexture(color: FlameColor): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const context = canvas.getContext('2d')!;
  context.imageSmoothingEnabled = false;
  FIRE_PAINTERS[color === 'blue' ? 'fire_blue' : 'fire_red'](context, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
