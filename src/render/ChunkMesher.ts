/** 区块网格化 — 把方块数据变成三角形：普通方块只画看得见的面，异形方块按碰撞盒画 */

import * as THREE from 'three';
import { AO_CURVE, CHUNK, FACE_SHADE } from '../config';
import { AIR, BLOCKS, BlockDef, WATER } from '../world/Block';
import { Box, FOUNTAIN_WATER, META_DIRS, renderBoxes } from '../world/Shapes';
import { World } from '../world/World';
import { Atlas } from './Textures';

/** 立方体 6 个面的顶点（单位格），配合三角索引 0-1-2 / 0-2-3 */
const FACES = [
  { n: [1, 0, 0],  v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], tex: 'side' },
  { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], tex: 'side' },
  { n: [0, 1, 0],  v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], tex: 'top' },
  { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], tex: 'bottom' },
  { n: [0, 0, 1],  v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], tex: 'side' },
  { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], tex: 'side' },
] as const;

/** 面法线 → 方向序号（META_DIRS 的顺序：-z +x +z -x）；上下返回 -1 */
function dirIndex(n: readonly number[]): number {
  if (n[2] === -1) return 0;
  if (n[0] === 1) return 1;
  if (n[2] === 1) return 2;
  if (n[0] === -1) return 3;
  return -1;
}

const QUAD_UV = [[0, 0], [1, 0], [1, 1], [0, 1]];
const WATER_TOP_DIP = 0.12; // 水面比顶面矮一点，更像水
const CROP_DIP = 0.2;       // 长在水上的植物（水稻）往下沉这么多，杆子像插在水里
const EPS = 1e-4;

interface GeoArrays {
  pos: number[];
  normal: number[];
  uv: number[];
  color: number[];
  effect: number[];
  index: number[];
}

function createGeoArrays(): GeoArrays {
  return { pos: [], normal: [], uv: [], color: [], effect: [], index: [] };
}

const DEFAULT_AO: readonly [number, number, number, number] = [1, 1, 1, 1];

/** 面法线 → 面方向明暗系数（顶 1.0 / ±z 0.86 / ±x 0.76 / 底 0.6） */
function faceShade(n: readonly number[]): number {
  if (n[1] === 1) return FACE_SHADE.TOP;
  if (n[1] === -1) return FACE_SHADE.BOTTOM;
  if (n[2] !== 0) return FACE_SHADE.SIDE_Z;
  return FACE_SHADE.SIDE_X;
}

function pushQuad(
  g: GeoArrays,
  verts: number[][],
  normal: readonly number[],
  uvRect: [number, number, number, number],
  flipY = false,
  ao: readonly [number, number, number, number] = DEFAULT_AO,
  shade = 1,
): void {
  const base = g.pos.length / 3;
  for (let i = 0; i < 4; i++) {
    g.pos.push(verts[i][0], verts[i][1], verts[i][2]);
    g.normal.push(normal[0], normal[1], normal[2]);
    g.uv.push(
      uvRect[0] + QUAD_UV[i][0] * (uvRect[2] - uvRect[0]),
      uvRect[1] + (flipY ? 1 - QUAD_UV[i][1] : QUAD_UV[i][1]) * (uvRect[3] - uvRect[1]),
    );
    const c = ao[i] * shade;
    g.color.push(c, c, c);
    g.effect.push(0);
  }
  if (ao[0] + ao[2] < ao[1] + ao[3]) {
    g.index.push(base + 1, base + 2, base + 3, base, base + 1, base + 3);
  } else {
    g.index.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}

function toGeometry(g: GeoArrays): THREE.BufferGeometry | null {
  if (g.index.length === 0) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.normal, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(g.color, 3));
  geo.setAttribute('aEffect', new THREE.Float32BufferAttribute(g.effect, 1));
  geo.setIndex(g.index);
  return geo;
}

function texOf(tex: BlockDef['tex'], faceTex: string): string {
  return faceTex === 'top' ? tex.top : faceTex === 'bottom' ? (tex.bottom ?? tex.side) : tex.side;
}

/** 邻居是不是不透光的完整方块（是的话贴着的面不用画） */
function opaqueCube(id: number): boolean {
  const d = BLOCKS[id];
  return !!d && d.solid && !d.seeThrough && !d.shape && !d.doorPanel;
}

/** 采样完整方块某面 4 个顶点的 AO 亮度系数（沿法线偏移到相邻空气格后看两正交侧邻 + 对角邻） */
function sampleFaceAO(world: World, wx: number, y: number, wz: number, face: (typeof FACES)[number]): [number, number, number, number] {
  const [nx, ny, nz] = face.n;
  const ax = wx + nx, ay = y + ny, az = wz + nz;
  const out: [number, number, number, number] = [1, 1, 1, 1];
  for (let i = 0; i < 4; i++) {
    const [vx, vy, vz] = face.v[i];
    const sx = nx === 0 ? (vx ? 1 : -1) : 0;
    const sy = ny === 0 ? (vy ? 1 : -1) : 0;
    const sz = nz === 0 ? (vz ? 1 : -1) : 0;
    let s1 = 0, s2 = 0;
    if (nx !== 0) {
      s1 = opaqueCube(world.getBlock(ax, ay + sy, az)) ? 1 : 0;
      s2 = opaqueCube(world.getBlock(ax, ay, az + sz)) ? 1 : 0;
    } else if (ny !== 0) {
      s1 = opaqueCube(world.getBlock(ax + sx, ay, az)) ? 1 : 0;
      s2 = opaqueCube(world.getBlock(ax, ay, az + sz)) ? 1 : 0;
    } else {
      s1 = opaqueCube(world.getBlock(ax + sx, ay, az)) ? 1 : 0;
      s2 = opaqueCube(world.getBlock(ax, ay + sy, az)) ? 1 : 0;
    }
    const corner = (s1 && s2) ? 0 : (opaqueCube(world.getBlock(ax + sx, ay + sy, az + sz)) ? 1 : 0);
    const occ = (s1 && s2) ? 3 : (s1 + s2 + corner);
    out[i] = AO_CURVE[occ];
  }
  return out;
}

/** 盒子的某个面贴在格子边界上吗（贴了才需要查邻居遮挡） */
function onBoundary(b: Box, n: readonly number[]): boolean {
  if (n[0] === 1) return b[3] >= 1 - EPS;
  if (n[0] === -1) return b[0] <= EPS;
  if (n[1] === 1) return b[4] >= 1 - EPS;
  if (n[1] === -1) return b[1] <= EPS;
  if (n[2] === 1) return b[5] >= 1 - EPS;
  return b[2] <= EPS;
}

/** 画一个盒子（在格子内的任意小盒子），六个面按遮挡和贴图规则出 */
function emitBox(g: GeoArrays, atlas: Atlas, world: World, wx: number, y: number, wz: number, b: Box, def: BlockDef, meta: number): void {
  const frontIdx = def.oriented ? (meta + 2) % 4 : -9; // 正面朝放方块的人
  // 床头那格（meta≥4）换成枕头贴图
  const texSet = (def.shape === 'bed' && meta >= 4 && def.texHead) ? def.texHead : def.tex;
  for (const face of FACES) {
    const n = face.n;
    if (onBoundary(b, n)) {
      const nid = world.getBlock(wx + n[0], y + n[1], wz + n[2]);
      if (opaqueCube(nid)) continue;
    }
    let tex = texOf(texSet, face.tex);
    if (dirIndex(n) === frontIdx && def.tex.front) tex = def.tex.front;
    const verts = face.v.map(([vx, vy, vz]) => [
      wx + b[0] + vx * (b[3] - b[0]),
      y + b[1] + vy * (b[4] - b[1]),
      wz + b[2] + vz * (b[5] - b[2]),
    ]);
    pushQuad(g, verts, n, atlas.uv(tex), false, DEFAULT_AO, def.glow ? 1 : faceShade(n));
  }
}

export interface ChunkMesh {
  opaque: THREE.BufferGeometry | null;
  water: THREE.BufferGeometry | null;
  /** 会发光的方块（星空系列）：不受光照影响，夜里也亮 */
  glow: THREE.BufferGeometry | null;
}

/** 为一个区块生成三套网格：不透明、半透明（水/玻璃）、发光各一套 */
export function meshChunk(world: World, cx: number, cz: number, atlas: Atlas): ChunkMesh {
  const solid = createGeoArrays();
  const water = createGeoArrays();
  const glow = createGeoArrays();
  const baseX = cx * CHUNK.SIZE;
  const baseZ = cz * CHUNK.SIZE;

  for (let y = 0; y < CHUNK.HEIGHT; y++) {
    for (let z = 0; z < CHUNK.SIZE; z++) {
      for (let x = 0; x < CHUNK.SIZE; x++) {
        const wx = baseX + x;
        const wz = baseZ + z;
        const id = world.getBlock(wx, y, wz);
        if (id === AIR) continue;
        const def = BLOCKS[id];
        const meta = world.getMeta(wx, y, wz);

        // 花草：两张交叉薄片，不走盒子逻辑；底下是水就往水里沉一点（水稻像插在水里）
        if (def.shape === 'cross') {
          const dip = world.getBlock(wx, y - 1, wz) === WATER ? CROP_DIP : 0;
          emitCross(solid, atlas, wx, y - dip, wz, def.tex.side);
          continue;
        }

        // 异形方块：按渲染盒画（星空床/星空地毯等发光异形走 glow 层）
        if (def.shape || def.doorPanel) {
          const shapeTarget = def.glow ? glow : solid;
          for (const b of renderBoxes(id, meta)) emitBox(shapeTarget, atlas, world, wx, y, wz, b, def, meta);
          if (def.shape === 'fence') emitFenceBars(shapeTarget, atlas, world, wx, y, wz, def, meta);
          // 喷泉水面画到半透明层，真·透明水
          if (def.shape === 'fountain') for (const b of FOUNTAIN_WATER) emitPlainBox(water, atlas, wx, y, wz, b, 'water');
          continue;
        }

        const target = def.alphaBlend ? water : def.glow ? glow : solid;
        for (const face of FACES) {
          const nid = world.getBlock(wx + face.n[0], y + face.n[1], wz + face.n[2]);
          const nd = BLOCKS[nid];
          if (nd?.solid && !nd.seeThrough && !nd.shape && !nd.doorPanel) continue;
          // 同种透明方块贴在一起时不画中间的面（水-水、玻璃-玻璃）
          if (nid === id && def.seeThrough) continue;

          let texKey = texOf(def.tex, face.tex);
          if (def.oriented && dirIndex(face.n) === (meta + 2) % 4 && def.tex.front) {
            texKey = def.tex.front;
          }
          const uvRect = atlas.uv(texKey);
          const verts = face.v.map(([vx, vy, vz]) => {
            // 水面下沉一点（最上面一层水才下沉）
            const dip = id === WATER && face.n[1] === 1 && world.getBlock(wx, y + 1, wz) !== WATER
              ? WATER_TOP_DIP : 0;
            return [wx + vx, y + vy - dip, wz + vz];
          });
          const ao = def.glow ? DEFAULT_AO : sampleFaceAO(world, wx, y, wz, face);
          const shade = def.glow ? 1 : faceShade(face.n);
          pushQuad(target, verts, face.n, uvRect, false, ao, shade);
        }
      }
    }
  }

  return { opaque: toGeometry(solid), water: toGeometry(water), glow: toGeometry(glow) };
}

/** 画一个六面都出的盒子、指定贴图：给喷泉的水面用（不查遮挡，反正藏在造型里） */
function emitPlainBox(g: GeoArrays, atlas: Atlas, wx: number, y: number, wz: number, b: Box, tex: string): void {
  const uvRect = atlas.uv(tex);
  for (const face of FACES) {
    const verts = face.v.map(([vx, vy, vz]) => [
      wx + b[0] + vx * (b[3] - b[0]),
      y + b[1] + vy * (b[4] - b[1]),
      wz + b[2] + vz * (b[5] - b[2]),
    ]);
    pushQuad(g, verts, face.n, uvRect);
  }
}

/** 花草画成两张交叉的斜面薄片（沿格子对角线），正反两面都画，空白处靠 alphaTest 裁掉 */
function emitCross(g: GeoArrays, atlas: Atlas, wx: number, y: number, wz: number, tex: string): void {
  const uvRect = atlas.uv(tex);
  const planes: { v: number[][]; n: number[] }[] = [
    { v: [[0, 0, 0], [1, 0, 1], [1, 1, 1], [0, 1, 0]], n: [-0.707, 0, 0.707] },
    { v: [[1, 0, 0], [0, 0, 1], [0, 1, 1], [1, 1, 0]], n: [-0.707, 0, -0.707] },
  ];
  for (const p of planes) {
    const verts = p.v.map(([vx, vy, vz]) => [wx + vx, y + vy, wz + vz]);
    pushQuad(g, verts, p.n, uvRect);
    // 背面：顶点倒过来画一遍，法线取反（薄片两面都能看到）；顶点反了贴图上下要跟着翻，不然这面看过去草是倒的
    pushQuad(g, [...verts].reverse(), [-p.n[0], p.n[1], -p.n[2]], uvRect, true);
  }
}

/** 栅栏往四周伸横杆：旁边是栅栏或实心方块就伸过去 */
function emitFenceBars(g: GeoArrays, atlas: Atlas, world: World, wx: number, y: number, wz: number, def: BlockDef, meta: number): void {
  // 朝 +x 方向的两根横杆（高一低）
  const base: Box[] = [
    [0.5, 0.62, 0.4375, 1, 0.82, 0.5625],
    [0.5, 0.32, 0.4375, 1, 0.52, 0.5625],
  ];
  for (let m = 0; m < 4; m++) {
    const d = META_DIRS[m];
    const nid = world.getBlock(wx + d[0], y, wz + d[2]);
    const nd = BLOCKS[nid];
    if (!(nd?.shape === 'fence' || (nd?.solid && !nd?.item))) continue;
    for (const b of base) emitBox(g, atlas, world, wx, y, wz, rotateBar(b, (m - 1 + 4) % 4), def, meta);
  }
}

/** 横杆绕中心旋转 rot 个 90° */
function rotateBar(b: Box, rot: number): Box {
  let [x0, y0, z0, x1, y1, z1] = b;
  for (let i = 0; i < rot % 4; i++) {
    const nx0 = 1 - z1, nz0 = x0, nx1 = 1 - z0, nz1 = x1;
    x0 = Math.min(nx0, nx1); x1 = Math.max(nx0, nx1);
    z0 = Math.min(nz0, nz1); z1 = Math.max(nz0, nz1);
  }
  return [x0, y0, z0, x1, y1, z1];
}
