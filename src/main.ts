/** 入口 — 创建游戏，先显示主菜单选模式 */

import { applyPlatformClass } from './ui/Platform';
import { Game } from './core/Game';
import { AddictGuard } from './ui/AddictGuard';

// 先认清是手机还是电脑（决定 UI 布局与要不要虚拟按键），再建游戏
applyPlatformClass();

const game = new Game(document.body);
game.start();
// 幼儿防沉迷：独立模块自主运行（心跳/提醒/锁屏），锁屏经 logout+reload 收尾，beforeunload 自动存档
void new AddictGuard().start();
// 调试钩子：控制台里用 __game 查看游戏状态
(window as unknown as { __game: Game }).__game = game;
