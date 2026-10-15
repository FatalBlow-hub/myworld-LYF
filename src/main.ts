/** 入口 — 创建游戏，先显示主菜单选模式 */

import { applyPlatformClass } from './ui/Platform';
import { Game } from './core/Game';

// 先认清是手机还是电脑（决定 UI 布局与要不要虚拟按键），再建游戏
applyPlatformClass();

const game = new Game(document.body);
game.start();
// 调试钩子：控制台里用 __game 查看游戏状态
(window as unknown as { __game: Game }).__game = game;
