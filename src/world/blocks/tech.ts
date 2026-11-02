/** 科技一族 — 芯片/电脑/无尽方块（2026-11-01 设定批次）
 *
 *  纯数据、无逻辑：被 blocks.data.ts 合并进 BLOCKS 表。
 *  注意：本文件不许 import blocks.data 的运行时值（会形成循环），只允许 import type。
 *  无尽之剑不在这里——它是武器，定义和战斗属性都在 blocks.swords.ts 跟其他剑一起。 */

import type { BlockDef } from './data';

// —— 芯片与电脑（403~404）——
export const CHIP = 403;      // 芯片：星星碎片×1 + 铁粒×2，做电脑的核心件
export const COMPUTER = 404;  // 电脑：占一格能放地上，对它按 M 开机玩「躲避 TNT」

// —— 无尽方块（405）——
export const ENDLESS_BLOCK = 405; // 挖石头 0.01% 概率掉：两个加一根木棍合成无尽之剑

const itemDef = (cn: string, tex: string): BlockDef => ({
  cn, tex: { top: tex, side: tex }, solid: false, seeThrough: true, hardness: 0, item: true,
});

export const TECH_BLOCKS: Record<number, BlockDef> = {
  [CHIP]: itemDef('芯片', 'chip'),
  // 电脑：顶面画键盘、侧面画显示器（屏幕是黑的，开机动画在 UI 层不在方块上）
  [COMPUTER]: { cn: '电脑', tex: { top: 'computer_top', side: 'computer_side' }, solid: true, seeThrough: false, hardness: 1 },
  // 无尽方块：彩虹纹路的实心方块，挖掉掉自己
  [ENDLESS_BLOCK]: { cn: '无尽方块', tex: { top: 'endless_block', side: 'endless_block' }, solid: true, seeThrough: false, hardness: 2 },
};
