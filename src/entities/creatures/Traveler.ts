/** 旅者 NPC — 四季各有一位，只在自己岛上、对应季节出现；靠近按 M 对话解锁当季配方
 *
 *  四位旅者各有自己的形象（复用玩家那套方块小人 + 皮肤），站定会呼吸、会转头看人。 */

import * as THREE from 'three';
import { CharacterKind, CharacterModel, createCharacter } from './Character';

export type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';

/** 四季旅者的形象（2026-10-28 设定）：春=艾利克斯、夏=彩虹史蒂夫、秋=原版史蒂夫、冬=南瓜头史蒂夫 */
const SEASON_SKIN: Record<SeasonName, CharacterKind> = {
  spring: 'alex',
  summer: 'rainbow',
  autumn: 'steve',
  winter: 'pumpkin',
};

/** 每位旅者的名字与招呼语 */
export const TRAVELERS: Record<SeasonName, { name: string; greet: string }> = {
  spring: { name: '踏青旅者', greet: '春天好呀！柳絮飘得正好，带你去挖点春笋…… 来，这本春卷的做法送你。' },
  summer: { name: '端午旅者', greet: '水面上的菖蒲叶正嫩，编个香囊挂在身上，怪物近不了身。' },
  autumn: { name: '丰收旅者', greet: '今年果子结得好！两样水果配上麦粒，摊一盘点心吧。' },
  winter: { name: '冬雪旅者', greet: '雪天挖树叶能捡到彩珠子，做成甜饼和礼花最应景。' },
};

export class Traveler {
  readonly group: THREE.Group;
  readonly season: SeasonName;
  private model: CharacterModel;

  constructor(season: SeasonName, x: number, y: number, z: number) {
    this.season = season;
    this.model = createCharacter(SEASON_SKIN[season], TRAVELERS[season].name);
    this.group = this.model.group;
    this.group.position.set(x, y, z);
  }

  update(dt: number, px: number, pz: number): void {
    this.model.update(dt);
    this.model.faceTo(px, pz);
  }

  dispose(): void {
    this.model.dispose();
  }
}
