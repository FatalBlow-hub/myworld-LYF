# 项目概述 — 方块世界（Minecraft Web）

> 📅 2026-10-14 | 状态: 🚧 迭代中 | 标签: #项目概述 #游戏 #threejs
> **摘要**：Three.js 方块沙盒，含生存/创造、存档、合成、沼泽药水、账号登录，已部署上云。

### 简介
- 浏览器里玩的简化版《我的世界》：走动、挖方块、放方块、开关门，手机上有触屏虚拟按键
- 开局二选一：生存（血条，溺水/摔落扣血）或创造（无敌、背包全方块）
- 注册登录后一个账号一档，存服务器 SQLite；后端不在时自动退回浏览器本地模式

### 技术栈
- 前端：TypeScript / Three.js / Vite；纹理程序化生成（Canvas），无外部素材依赖
- 后端：`server/index.mjs`（纯 Node + better-sqlite3，零框架），数据全在 `server/data.db`

### 模块地图
- `world` 区块方块+地形+配方+容器 · `render` 面剔除网格+渲染 · `player` 键盘物理+背包
- `entities` 动物/怪物/掉落物/坦克 · `interact` 射线挖放 · `ui` 登录+菜单+HUD+面板+触屏
- `core/Game` 主循环装配 · `server` 静态托管+注册登录+存档接口

### 硬约定
- 依赖方向：`ui/interact/player → render/world → config`，禁止循环依赖
- 魔法数字集中在 `src/config.ts`；业务文件 ≤500 行；注释中文、代码英文
- 存档格式 v1；测试禁止动正式账号的存档和 localStorage
- 变更历史、接口约定、验证记录 → `docs/changelog.md`；架构细节 → `docs/architecture.md`

### 部署（云服务器）
- 腾讯云 `49.235.124.163`，本机 `ssh tencent` 直连（密钥 `~/.ssh/tencent_key`）
- 站点 `/www/wwwroot/minecraft-web/`；systemd 服务 `minecraft-web`（开机自启+崩溃重启），只听 `127.0.0.1:8787`
- 域名 `https://ms.7shu.asia` 由管理员配 Nginx 反代 → `127.0.0.1:8787`；证书/防火墙别碰
- 一键部署（已排除 node_modules/dist/.git/.playwright-mcp/saves/快照/data.db，不覆盖线上存档）：
  ```bash
  rsync -az --delete --exclude node_modules --exclude dist --exclude .git \
    --exclude .playwright-mcp --exclude saves --exclude 'saves-snapshot-*' \
    --exclude 存档快照 --exclude 'server/data.db*' \
    /Users/fatal_blow/minecraft-web/ tencent:/www/wwwroot/minecraft-web/ \
  && ssh tencent 'cd /www/wwwroot/minecraft-web && npm ci && npm run build && systemctl restart minecraft-web'
  ```
- 验证：`ssh tencent 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8787/'` 回 200 即正常
- 只改 `server/index.mjs` 不用 build，rsync + restart 即可；改了 `src/` 必须 `npm run build`

### 本地开发
- `npm run server`（后端 :8787）+ `npm run dev`（前端 :5174，/api 自动代理到后端）
- 验证：`npm run build`（含 TypeScript 检查，Vite 体积提示可忽略）
