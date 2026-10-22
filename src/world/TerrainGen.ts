/** 地形生成 — 用噪声画出有山有水有树的世界（固定种子，每次进游戏都一样） */

import { BAMBOO_FOREST, CHUNK, CROP, ISLAND, ORE, PALM, SEA_LEVEL, SPAWN, WORLD_SEED } from '../config';
import { BAMBOO, BLUE_ORE, CACTUS, CARROT_MATURE, COAL_ORE, DANDELION, DIRT, GOLD_ORE, GRASS, ICE, IRON_ORE, LEAVES, MELON, PALM_LEAVES, POPPY, PUMPKIN, RICE_MATURE, SAND, SANDSTONE, SEAWEED, SNOW, SOUL_GRASS, SPECIES_BY_LEAF, STONE, TALL_GRASS, WATER, WOOD } from './Block';
import { canRootIn } from './bamboo';
import { Chunk } from './Chunk';
import { swampAt } from './Swamp';
import { treeBlocks } from './Trees';
import { GLOW_SHROOM_CHANCE, MUSHROOM_GROW_CHANCE, pickMushroom } from './mushrooms';
import { GLOW_SHROOM } from './blocks.mushrooms';
import type { TreeSpecies } from './blocks.trees';

const sampleTerrain = (x: number, z: number) => ({ height: heightAt(x, z), biome: biomeAt(x, z) });
const liquidAt = (x: number, z: number) => swampAt(x, z, heightAt(x, z), biomeAt(x, z), sampleTerrain);

/** 当前地形种子与是否只生成草地（副本岛按 islandId 设种子并开启纯草地，无沙漠/无雪地；默认保持本岛原样） */
let activeSeed = WORLD_SEED;
let grassOnlyMode = false;
/** 岛上果树的树叶方块 ID 列表（空 = 这座岛不长果树）；每座岛的树里约两成是本岛品种的果树，多品种时随机挑一种 */
let activeTreeLeaves: number[] = [];
/** 这座岛附不附带竹林（夏/秋/冬岛附带） */
let activeBamboo = false;
/** 全岛按雪地生成（冬季岛：地表盖雪、湖面结冰） */
let activeSnowOnly = false;
/** 当前季节：蘑菇按季节长（秋季才长），进入冬季由 Game 统一清掉 */
let activeSeason: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer';

/** 切换地形生成参数：不传或传默认参数即恢复玩家自己的岛配置；fruitLeaf 是本岛果树的树叶 ID */
export function setTerrainConfig(seed = WORLD_SEED, grassOnly = false, fruitLeaf = 0): void {
  activeSeed = seed;
  grassOnlyMode = grassOnly;
  activeTreeLeaves = fruitLeaf ? [fruitLeaf] : [];
  activeBamboo = false;
  activeSnowOnly = false;
}

/** 换季：地形生成按季节决定要不要长蘑菇（入冬后已长出来的由 Game 清掉） */
export function setActiveSeason(season: 'spring' | 'summer' | 'autumn' | 'winter'): void {
  activeSeason = season;
}

/** 四季岛的额外地形规则：果树品种、竹林、全岛雪地 */
export function setIslandProfile(profile: { trees: number[]; bamboo: boolean; snowOnly?: boolean }): void {
  activeTreeLeaves = [...profile.trees];
  activeBamboo = profile.bamboo;
  activeSnowOnly = profile.snowOnly === true;
}

/** 确定性伪随机：同一个 (x,z) 永远算出同一个 0~1 的数 */
function hash(x: number, z: number): number {
  let h = (x * 374761393 + z * 668265263 + activeSeed * 974634) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** 平滑噪声：在四个随机点之间插值，山地才不会坑坑洼洼 */
function smoothNoise(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi);
  const b = hash(xi + 1, zi);
  const c = hash(xi, zi + 1);
  const d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** 地表高度：几层不同大小的噪声叠起来，有大山也有小坡；"平整骰子"大的地方压成大平原 */
export function heightAt(wx: number, wz: number): number {
  const n =
    smoothNoise(wx * 0.02, wz * 0.02) * 0.6 +
    smoothNoise(wx * 0.06, wz * 0.06) * 0.3 +
    smoothNoise(wx * 0.15, wz * 0.15) * 0.1;
  const raw = 14 + n * 34; // 高度大约在 14~48 之间
  // 平整度噪声：变化很慢，f 超过 0.5 的地方逐渐压平到 26 格高（刚好高过海平面一点）
  const f = smoothNoise(wx * 0.006 + 4444, wz * 0.006 - 2222);
  const t = Math.max(0, Math.min(1, (f - 0.5) / 0.15));
  return Math.floor(raw * (1 - t) + 26 * t);
}

/** 生物群系：草地 / 雪地 / 沙漠，世界是一块一块拼起来的 */
export type Biome = 'grass' | 'snow' | 'desert';

/** 找一个出生点：从家附近一圈圈往外找「不靠海的草地」，找不到就退回原点 */
export function findGrassSpawn(homeX: number, homeZ: number): { x: number; z: number } {
  for (let r = 0; r <= 400; r += 4) {
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const x = Math.round(homeX + Math.cos(a) * r);
      const z = Math.round(homeZ + Math.sin(a) * r);
      if (biomeAt(x, z) === 'grass' && heightAt(x, z) > SEA_LEVEL + 2 && liquidAt(x, z) === 0) {
        return { x: x + 0.5, z: z + 0.5 };
      }
    }
  }
  return { x: homeX, z: homeZ };
}

/** 随机出生点：在世界范围里掷骰子选点，再找附近能站人的草地；多试几次防止掷到海里 */
export function randomGrassSpawn(): { x: number; z: number } {
  for (let i = 0; i < SPAWN.TRIES; i++) {
    const hx = (Math.random() * 2 - 1) * SPAWN.RANGE;
    const hz = (Math.random() * 2 - 1) * SPAWN.RANGE;
    const p = findGrassSpawn(hx, hz);
    const x = Math.floor(p.x);
    const z = Math.floor(p.z);
    if (biomeAt(x, z) === 'grass' && heightAt(x, z) > SEA_LEVEL + 2 && liquidAt(x, z) === 0) return p;
  }
  return findGrassSpawn(8.5, 8.5); // 实在找不到就回老家附近
}

/** 掷一次"温度骰子"：噪声变化很慢，所以群系是上百格宽的一大块（副本岛开启 grassOnly 时只返回 grass，无沙漠/无雪地） */
export function biomeAt(wx: number, wz: number): Biome {
  if (grassOnlyMode) return 'grass';
  if (activeSnowOnly) return 'snow'; // 冬季岛：整座岛都是雪地
  const t = smoothNoise(wx * 0.008 + 777, wz * 0.008 - 333);
  if (t < 1 / 3) return 'snow';
  if (t > 2 / 3) return 'desert';
  return 'grass';
}

/** 生成一个区块的地形：石头打底、按群系盖面、低处灌水、随缘种树/仙人掌（可传 grassOnly 强制无沙漠/雪地） */
export function generateChunk(chunk: Chunk, opts?: { grassOnly?: boolean }): void {
  const prevGrassOnly = grassOnlyMode;
  if (opts?.grassOnly !== undefined) grassOnlyMode = opts.grassOnly;
  const baseX = chunk.cx * CHUNK.SIZE;
  const baseZ = chunk.cz * CHUNK.SIZE;

  for (let lx = 0; lx < CHUNK.SIZE; lx++) {
    for (let lz = 0; lz < CHUNK.SIZE; lz++) {
      const wx = baseX + lx;
      const wz = baseZ + lz;
      const h = Math.min(heightAt(wx, wz), CHUNK.HEIGHT - 8);
      const nearSea = h <= SEA_LEVEL + 1;
      const biome = biomeAt(wx, wz);
      // 沼泽：草地上偶尔冒出一圈毒水塘（外淡内凶），长沼泽的列不长草不种树
      const swamp = swampAt(wx, wz, h, biome, sampleTerrain);

      for (let y = 0; y < CHUNK.HEIGHT; y++) {
        let id = 0;
        if (y < h - 3) {
          id = STONE;
          // 煤矿铺在地下石层里；其他矿石仍按原来的深度和概率生成
          if (hash(wx * 11 + y * 31, wz * 13 - y * 29) < ORE.COAL_CHANCE) id = COAL_ORE;
          else if (y <= ORE.BLUE_MAX_Y && hash(wx * 3 + y * 11, wz * 5 - y * 7) < ORE.BLUE_CHANCE) id = BLUE_ORE;
          else if (y <= ORE.GOLD_MAX_Y && hash(wx * 7 - y * 13, wz * 3 + y * 17) < ORE.GOLD_CHANCE) id = GOLD_ORE;
          else if (hash(wx * 5 + y * 19, wz * 7 - y * 23) < ORE.IRON_CHANCE) id = IRON_ORE;
        }
        else if (y < h - 1) id = biome === 'desert' ? SANDSTONE : (nearSea ? SAND : DIRT);
        else if (y === h - 1) {
          // 表层：湖边一律沙子；沙漠盖沙、雪地盖雪、草地盖草（千分之一藏灵魂草）
          if (nearSea || biome === 'desert') id = SAND;
          else if (biome === 'snow') id = SNOW;
          else id = hash(wx * 13 + 5, wz * 13 + 7) < 0.001 ? SOUL_GRASS : GRASS;
        }
        else if (y <= SEA_LEVEL) id = biome === 'snow' && y === SEA_LEVEL ? ICE : WATER;
        // 雪地里湖面最上面一层冻成冰
        // 注意：只在自己是空气时才覆盖——前面的列种下的树叶/椰子会伸到这一列来，
        // 不判一下就会被这里重新写成空气，树冠只剩朝 -x/-z 的半边
        const idx = Chunk.index(lx, y, lz);
        if (id !== 0 || chunk.data[idx] === 0) chunk.data[idx] = id;
      }

      // 沼泽水塘：地表往下两格换成泽液，踩进去才会中招
      if (swamp) {
        chunk.data[Chunk.index(lx, h - 1, lz)] = swamp;
        chunk.data[Chunk.index(lx, h - 2, lz)] = swamp;
      }

      // 种树：沙漠不长树；只在草地上、离区块边缘 2 格以上（树冠才不会伸到别的区块）。
      // 先掷"是不是果树"（岛上两成的树是本岛品种），再按品种要的留边决定种不种：
      // 果树树冠能伸 3 格要留 3 格边，普通树留 2 格；掷中果树但贴边就不种，免得果树比例被边偷走
      if (!swamp && !nearSea && biome !== 'desert' && hash(wx * 7 + 1, wz * 7 + 3) < 0.02 &&
          ![-2, -1, 0, 1, 2].some((dx) => [-2, -1, 0, 1, 2].some((dz) => liquidAt(wx + dx, wz + dz)))) {
        const fruit = SPECIES_BY_LEAF[activeTreeLeaves[Math.floor(hash(wx * 7 + 33, wz * 7 + 33) * activeTreeLeaves.length)] ?? 0];
        const fruitRoll = fruit !== undefined && hash(wx * 29 + 11, wz * 37 + 5) < ISLAND.FRUIT_TREE_CHANCE;
        const fruitBounds = lx >= 3 && lx <= CHUNK.SIZE - 4 && lz >= 3 && lz <= CHUNK.SIZE - 4;
        if (fruitRoll && fruitBounds) {
          plantSpecies(chunk, lx, h, lz, fruit);
        } else if (lx >= 2 && lx <= CHUNK.SIZE - 3 && lz >= 2 && lz <= CHUNK.SIZE - 3) {
          plantTree(chunk, lx, h, lz);
        }
      }

      // 蘑菇（用户 2026-10-22 设定）：**只按日期季节**——秋季草地上 0.2% 长普通菇、0.1% 长夜光蓝菇；
      // 进入冬季全部消失（Game.onNewDay 调 clearBlocks）；夜光蓝菇不限夜晚。
      if (activeSeason === 'autumn' && !swamp && !nearSea && biome !== 'desert'
          && chunk.data[Chunk.index(lx, h - 1, lz)] === GRASS
          && chunk.data[Chunk.index(lx, h, lz)] === 0) {
        if (hash(wx * 31 + 7, wz * 31 + 17) < MUSHROOM_GROW_CHANCE) {
          chunk.data[Chunk.index(lx, h, lz)] = pickMushroom(() => hash(wx * 41 + 3, wz * 41 + 9));
        } else if (hash(wx * 37 + 11, wz * 37 + 23) < GLOW_SHROOM_CHANCE) {
          chunk.data[Chunk.index(lx, h, lz)] = GLOW_SHROOM;
        }
      }

      // 竹林：夏/秋/冬岛附带竹子——按 96 格的大网格掷一片竹林，林是半径 6 格的圆，圆里再按密度长竹丛
      const bambooGround = chunk.data[Chunk.index(lx, h - 1, lz)];
      // 竹根只认泥土/草方块；雪块只有冬季岛（满岛是雪）才算地面
      const bambooSoil = canRootIn(bambooGround) && (bambooGround !== SNOW || activeSnowOnly);
      if (activeBamboo && !swamp && !nearSea && biome !== 'desert'
          && bambooSoil
          && chunk.data[Chunk.index(lx, h, lz)] === 0) {
        const gx = Math.round(wx / BAMBOO_FOREST.CELL_SIZE) * BAMBOO_FOREST.CELL_SIZE;
        const gz = Math.round(wz / BAMBOO_FOREST.CELL_SIZE) * BAMBOO_FOREST.CELL_SIZE;
        const inGrove = (wx - gx) ** 2 + (wz - gz) ** 2 <= BAMBOO_FOREST.RADIUS ** 2;
        const hasGrove = hash(gx * 3 + 11, gz * 3 + 7) < BAMBOO_FOREST.CHANCE;
        if (inGrove && hasGrove && hash(wx * 5 + 3, wz * 5 + 9) < 0.16) {
          const tall = BAMBOO_FOREST.HEIGHT_MIN
            + Math.floor(hash(wx * 9 + 5, wz * 9 + 13) * (BAMBOO_FOREST.HEIGHT_MAX - BAMBOO_FOREST.HEIGHT_MIN + 1));
          for (let i = 0; i < tall; i++) chunk.data[Chunk.index(lx, h + i, lz)] = BAMBOO;
        }
      }

      // 仙人掌：只长在沙漠的沙滩上，2~3 格高一小根
      if (biome === 'desert' && !nearSea && hash(wx * 17 + 4, wz * 17 + 9) < 0.02) {
        const tall = 2 + Math.floor(hash(wx * 23 + 6, wz * 23 + 8) * 2);
        for (let i = 0; i < tall; i++) {
          chunk.data[Chunk.index(lx, h + i, lz)] = CACTUS;
        }
      }

      // 椰子树：只长在沙滩上（沙子地面、海平面往上 2 格以内的窄带），稀稀拉拉
      const beachSand = chunk.data[Chunk.index(lx, h - 1, lz)] === SAND && h > SEA_LEVEL && h <= SEA_LEVEL + 2;
      if (!swamp && beachSand && hash(wx * 43 + 13, wz * 43 + 29) < PALM.CHANCE &&
          lx >= 2 && lx <= CHUNK.SIZE - 3 && lz >= 2 && lz <= CHUNK.SIZE - 3 &&
          chunk.data[Chunk.index(lx, h, lz)] === 0) {
        plantSpecies(chunk, lx, h, lz, SPECIES_BY_LEAF[PALM_LEAVES]);
      }

      // 花草与作物点缀：草方块/泥土顶上是空格才长；稀稀拉拉，不铺满
      const ground = chunk.data[Chunk.index(lx, h - 1, lz)];
      if (!swamp && chunk.data[Chunk.index(lx, h, lz)] === 0 && (ground === GRASS || ground === DIRT)) {
        const cropRoll = ground === GRASS ? hash(wx * 31 + 9, wz * 31 + 15) : 1;
        if (cropRoll < CROP.CARROT_CHANCE) {
          chunk.data[Chunk.index(lx, h, lz)] = CARROT_MATURE;
        } else if (cropRoll < CROP.CARROT_CHANCE + CROP.PUMPKIN_CHANCE) {
          chunk.data[Chunk.index(lx, h, lz)] = PUMPKIN;
        } else if (cropRoll < CROP.CARROT_CHANCE + CROP.PUMPKIN_CHANCE + CROP.MELON_CHANCE) {
          chunk.data[Chunk.index(lx, h, lz)] = MELON;
        } else {
          const r = hash(wx * 11 + 2, wz * 11 + 5);
          if (r < 0.25) chunk.data[Chunk.index(lx, h, lz)] = TALL_GRASS;
          else if (r < 0.29) chunk.data[Chunk.index(lx, h, lz)] = r < 0.27 ? DANDELION : POPPY;
        }
      }

      // 水草：泡在水底的格子上偶尔冒一根（要头顶还有水压着，浅水塘水面不戳洞）
      if (h <= SEA_LEVEL - 1 && !(biome === 'snow' && h === SEA_LEVEL) &&
          hash(wx * 41 + 3, wz * 41 + 17) < 0.15) {
        chunk.data[Chunk.index(lx, h, lz)] = SEAWEED;
      }

      // 野生水稻：草地浅水塘（水 1~2 格深）偶尔冒一小窝。每个"窝中心"必带右边一株，
      // 再一半概率带前边一株 → 一窝正好 2~3 株，稀稀拉拉不会铺满水塘
      const riceHome = (ax: number, az: number) => hash(ax * 29 + 11, az * 29 + 13) < 0.008;
      if (biome === 'grass' && (h === SEA_LEVEL || h === SEA_LEVEL - 1) &&
          (riceHome(wx, wz) || riceHome(wx - 1, wz) ||
           (riceHome(wx, wz - 1) && hash(wx * 37 + 5, (wz - 1) * 37 + 21) < 0.5))) {
        chunk.data[Chunk.index(lx, SEA_LEVEL + 1, lz)] = RICE_MATURE;
      }
    }
  }
  grassOnlyMode = prevGrassOnly;
}

/** 一棵指定品种的树：造型由 Trees.ts 的树形表决定，只往空气格里塞，边缘伸出去的砍掉 */
function plantSpecies(chunk: Chunk, x: number, groundY: number, z: number, sp: TreeSpecies): void {
  // 确定性随机：同一格每次生成同样的高矮和挂果数（rand 每调一次换一个骰子）
  let s = 0;
  const rand = () => hash(x * 53 + 7 + s * 31, z * 53 + 19 + s++ * 17);
  for (const b of treeBlocks(sp, rand)) {
    const bx = x + b.x, y = groundY + b.y, bz = z + b.z;
    if (bx < 0 || bx >= CHUNK.SIZE || bz < 0 || bz >= CHUNK.SIZE || y < 0 || y >= CHUNK.HEIGHT) continue;
    const i = Chunk.index(bx, y, bz);
    if (chunk.data[i] === 0) chunk.data[i] = b.id;
  }
}

/** 一棵树 = 4 格木干 + 一坨树叶 */
function plantTree(chunk: Chunk, x: number, groundY: number, z: number): void {
  const top = groundY + 4;
  for (let y = groundY; y < top; y++) {
    chunk.data[Chunk.index(x, y, z)] = WOOD;
  }
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const r = Math.abs(dx) + Math.abs(dz) + Math.abs(dy);
        if (r <= 3 && !(dx === 0 && dz === 0 && dy < 1)) {
          const y = top + dy;
          const i = Chunk.index(x + dx, y, z + dz);
          if (y < CHUNK.HEIGHT && chunk.data[i] === 0) {
            chunk.data[i] = LEAVES;
          }
        }
      }
    }
  }
}
