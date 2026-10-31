/** 天气与换季系统 — 降雪/柳絮两种场景粒子、换季换叶、冬季清蘑菇（2026-10-29 从 Game.ts 抽出） */

import { setActiveSeason } from '../../world/terrain/TerrainGen';
import { applySeasonLeaves } from '../../world/terrain/SeasonLeaves';
import { ALL_MUSHROOM_IDS } from '../../world/terrain/mushrooms';
import { Snowfall } from '../../render/fx/Snowfall';
import { Fluff } from '../../render/fx/Fluff';
import { AIR, CALAMUS, isSolid, SNOW, SNOWFLAKE, WILLOW_FLUFF, WILLOW_LEAVES } from '../../world/blocks/Block';
import { CHUNK, SNOWFALL } from '../../config';
import { PlayerBody } from '../../player/motion/Physics';
import { World } from '../../world/World';
import { Hud } from '../../ui/hud/Hud';
import { Inventory } from '../../player/Inventory';
import { GameDate, Season, seasonOf } from '../loops/Calendar';

type SceneMode = 'island' | 'hall' | 'visit' | 'void' | 'arena' | 'cs';

interface WeatherCtx {
  world: () => World;
  sceneMode: () => SceneMode;
  season: () => Season;
  inventory: () => Inventory | null;
  hud: () => Hud | null;
  /** 掉落物生成（蓝雪花落地变成可捡的雪花） */
  dropAt: (id: number, n: number, x: number, y: number, z: number) => void;
}

export class SeasonWeatherSystem {
  /** 冬季降雪粒子（构造时场景一建好就挂上，平时看不见） */
  private readonly snow: Snowfall;
  /** 春季柳絮孢子粒子（站在柳树旁才飘） */
  private readonly fluff: Fluff;
  private snowTimer = 0;
  private fluffTimer = 0;
  /** 上一次生效的季节：只有换季才做换叶 / 清蘑菇这些重活 */
  private lastSeason: Season | null = null;
  /** 自家/访岛是不是冬季岛：冬季岛常年下雪，不受日历季节限制 */
  private winterIsland = false;

  constructor(scene: import('three').Scene, private ctx: WeatherCtx) {
    this.snow = new Snowfall(scene, {
      landingAt: (x, z, fromY) => this.flakeLanding(x, z, fromY),
      onFlakeLand: (x, y, z) => this.ctx.dropAt(SNOWFLAKE, 1, x, y, z), // 蓝雪花落地→变成一个能捡的雪花
    }); // 雪花粒子平时隐藏，冬季站在雪地上才开
    this.fluff = new Fluff(scene, {
      collect: () => {
        const inv = this.ctx.inventory();
        if (!inv || inv.roomFor(WILLOW_FLUFF) < 1) return false; // 背包满了就留在原地
        inv.add(WILLOW_FLUFF, 1);
        return true;
      },
      solidAt: (x, y, z) => isSolid(this.ctx.world().getBlock(x, y, z)),
    }, (text) => this.ctx.hud()?.showMessage(text, 2)); // 柳絮：春季柳树旁飘，玩家靠近自动入包
  }

  /** 开局/读档：先把本季的树叶贴图与蘑菇季节定好（蘑菇只按日期季节长：秋季长、入冬全消） */
  initSeason(date: GameDate): void {
    const season = seasonOf(date);
    this.lastSeason = season;
    setActiveSeason(season);
    applySeasonLeaves(season);
  }

  /** 岛型落地：冬季岛常年下雪（applyIslandTerrain 顺带通知） */
  setWinterIsland(isWinter: boolean): void {
    this.winterIsland = isWinter;
  }

  /** 跨天：季节变了才换叶 / 入冬把地图上的蘑菇全清掉（设定：冬季蘑菇全部消失） */
  onNewDay(date: GameDate, world: World, rebuildDirty: (w: World) => void): void {
    const season = seasonOf(date);
    if (this.lastSeason === season) return;
    this.lastSeason = season;
    setActiveSeason(season);
    if (season === 'winter') world.clearBlocks(ALL_MUSHROOM_IDS);
    // 菖蒲叶是夏天的东西（2026-11-01 设定）：一到秋天全部消失，来年夏天再长
    if (season === 'autumn') world.clearBlocks([CALAMUS]);
    if (!applySeasonLeaves(season)) return;
    world.markAllDirty();
    rebuildDirty(world);
  }

  /** 降雪：冬季 + 脚下有雪才下，每隔 SNOWFALL.RECHECK 秒重新判断一次（别每帧都查方块） */
  snowTick(dt: number, body: PlayerBody): void {
    this.snowTimer -= dt;
    if (this.snowTimer <= 0) {
      this.snowTimer = SNOWFALL.RECHECK;
      const on = (this.winterIsland || this.ctx.season() === 'winter')
        && (this.ctx.sceneMode() === 'island' || this.ctx.sceneMode() === 'visit')
        && this.nearSnow(body.x, body.y, body.z);
      this.snow.setActive(on, body.x, body.y, body.z);
    }
    this.snow.update(dt, body.x, body.y, body.z);
  }

  /** 柳絮：春天 + 站在柳树旁才飘，每隔 0.5 秒重新判断一次（别每帧扫方块） */
  fluffTick(dt: number, body: PlayerBody): void {
    this.fluffTimer -= dt;
    if (this.fluffTimer <= 0) {
      this.fluffTimer = 0.5;
      const on = this.ctx.season() === 'spring'
        && (this.ctx.sceneMode() === 'island' || this.ctx.sceneMode() === 'visit')
        && this.nearWillow(body.x, body.y, body.z);
      this.fluff.setActive(on);
    }
    this.fluff.update(dt, body.x, body.y, body.z);
  }

  /** 换场景：柳絮是场景内的粒子，必须清干净 */
  clearParticles(): void {
    this.fluff.clear();
  }

  /** 蓝雪花的落点：从这格往下找第一个非空气方块；报出顶面高度和能不能落脚（落水里/花草上就化了，不留物品） */
  private flakeLanding(x: number, z: number, fromY: number): { y: number; solid: boolean } | null {
    const bx = Math.floor(x), bz = Math.floor(z);
    for (let y = Math.min(CHUNK.HEIGHT - 1, Math.floor(fromY)); y >= 0; y--) {
      const id = this.ctx.world().getBlock(bx, y, bz);
      if (id === AIR) continue;
      return { y: y + 1, solid: isSolid(id) };
    }
    return null;
  }

  /** 玩家周围 5×5、脚下 3 层里有没有雪块（判断这块地方算不算雪地） */
  private nearSnow(x: number, y: number, z: number): boolean {
    const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
    for (let dy = 0; dy >= -3; dy--) {
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          if (this.ctx.world().getBlock(bx + dx, by + dy, bz + dz) === SNOW) return true;
        }
      }
    }
    return false;
  }

  /** 玩家周围 5×5、头上下各 4 层里有没有柳树叶（判断"站在柳树旁"） */
  private nearWillow(x: number, y: number, z: number): boolean {
    const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
    for (let dy = -1; dy <= 4; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          if (this.ctx.world().getBlock(bx + dx, by + dy, bz + dz) === WILLOW_LEAVES) return true;
        }
      }
    }
    return false;
  }
}
