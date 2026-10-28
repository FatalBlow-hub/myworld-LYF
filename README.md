# 方块世界（Minecraft Web）

> 📅 2026-10-15 | 状态: 🚧 进行中 | 标签: #游戏 #threejs
> **摘要**：用浏览器就能玩的简化版《我的世界》

## 怎么玩

```bash
npm install
npm run dev
```

然后打开终端里显示的网址（一般是 http://localhost:5173）。

## 操作（纯键盘，不用鼠标）

| 按键 | 作用 |
| --- | --- |
| ↑ / ↓ | 前进 / 后退 |
| ← / → | 左转 / 右转 |
| 8 / 2 | 向上看 / 向下看 |
| P | 挖掘 / 攻击 |
| L | 放置方块 |
| 空格 | 跳跃 / 水中上浮 |
| M | 开门 / 关门 |
| 4 / 6 | 物品栏：选上一个 / 下一个方块 |
| ESC | 暂停 |

## 文件说明

- `src/main.ts` — 游戏入口
- `src/config.ts` — 所有可调参数（区块大小、视距、血量规则）
- `src/core/` — 游戏主循环（根：Game/Save/Appearance；子目录：actions 玩家操作 / scenes 玩法场景 / loops 周期系统）
- `src/world/` — 世界数据与地形生成（根：World/Chunk；子目录：blocks 方块表 / recipes 合成 / maps 场景地图 / terrain 地形 / economy 商店经济）
- `src/render/` — 画面渲染（根：Renderer/Quality；子目录：textures 纹理图集 / mesh 区块网格 / fx 特效）
- `src/player/` — 移动、物理、血量（根：Inventory；子目录：motion 运动 / stats 数值）
- `src/entities/` — 游戏实体（子目录：mobs 怪物 / summons 召唤物 / creatures 生物 / projectiles 投掷物 / objects 物件）
- `src/interact/` — 挖方块、放方块
- `src/ui/` — 菜单和屏幕上的界面（子目录：panels 面板 / hud 抬头显示 / touch 触屏 / account 账号）
- `admin.html` + `src/admin/` — 家长控制台（幼儿防沉迷管理，需管理员账号，独立构建入口）
- `docs/架构/架构文档.md` — 架构设计文档（模块划分与依赖铁律）
- `docs/架构/需求文档.md` — 游戏规则与玩法需求
- `docs/变更历史.md` — 每次迭代的变更记录、接口约定与验证存档
- `docs/数据库/schema演进.md` — 数据库 schema 变更留痕
- `docs/待办/画质优化待办.md` — 画质提升路线（Q0 + T1~T6 六批已落地，含审核修订记录）
- `docs/_prompts/` — 交给 auggie CLI 实现的分批提示词与索引
- `docs/进度/` — 每日工作日志与工作总结（按日期归档，10-14 起）
- `docs/README.md` — docs 目录完整清单索引
- `docs/原型/` — 界面改版设计稿（静态 HTML，浏览器直接打开）
