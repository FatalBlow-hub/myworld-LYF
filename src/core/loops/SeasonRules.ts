/** 季节玩法规则 — 哪种水果属于哪个季节（砍树叶掉果、后续蘑菇/雪花都按季节判定）
 *  设定：春季岛产桃子；夏季岛产苹果、梨、香蕉；秋季岛产橘子、柿子。
 */

import type { Season } from './Calendar';

/** 水果 ID → 它的季节：只有到了自己的季节，砍树叶才会掉这个果 */
export const FRUIT_SEASON: Record<number, Season> = {
  237: 'spring', // 桃子
  236: 'summer', // 苹果
  259: 'summer', // 梨
  287: 'summer', // 香蕉（香蕉岛专属）
  238: 'autumn', // 橘子
  260: 'autumn', // 柿子
};

/** 这个水果现在是不是当季（没登记季节的水果一律不算，避免老存档突然掉果） */
export const isFruitInSeason = (fruitId: number, season: Season): boolean =>
  FRUIT_SEASON[fruitId] === season;
