/** 入口 — 创建游戏，先显示主菜单选模式 */

import { Game } from './core/Game';
import { registerGoldenContent } from './world/GoldenRegistry';

registerGoldenContent();
const game = new Game(document.body);
game.start();
// 调试钩子：控制台里用 __game 查看游戏状态
(window as unknown as { __game: Game }).__game = game;
