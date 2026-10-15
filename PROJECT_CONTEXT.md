# 项目概述 — 方块世界（Minecraft Web）

> 📅 2026-10-16 | 状态: 🚧 迭代中 | 标签: #项目概述 #游戏 #threejs
> **摘要**：Three.js 方块沙盒，生存/创造、存档、合成、联机大厅，已上云，桌面/手机双 UI。

### 目录
- [简介](#简介)
- [技术栈](#技术栈)
- [模块地图](#模块地图)
- [硬约定](#硬约定)
- [部署（云服务器）](#部署云服务器)
- [本地开发](#本地开发)

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
- `ui/Platform` 平台判定（手机还是桌面），决定要不要虚拟按键、走哪套 UI 布局

### 硬约定
- 依赖方向：`ui/interact/player → render/world → config`，禁止循环依赖
- 魔法数字集中在 `src/config.ts`；业务文件 ≤500 行；注释中文、代码英文
- 存档格式 v1；测试禁止动正式账号的存档和 localStorage
- 桌面/手机版共用同一份 `src/main.ts` 入口与同一份 bundle：平台判定统一走 `ui/Platform.ts`（`?touch=1` > 手机版域名 > 触屏设备），域名规则写 `config.ts` 的 `MOBILE`，禁止再写 `'ontouchstart' in window` 这类裸判定；UI 差异用 CSS 的 `.is-mobile` 分支或 JS 里的 `isMobile()`，不要复制第二份 UI 代码
- 变更历史、接口约定、验证记录 → `docs/变更历史.md`；架构细节 → `docs/架构/架构文档.md`
- 游戏规则与玩法需求 → `docs/架构/需求文档.md`；docs 完整清单 → `docs/README.md`

### 部署（云服务器）
- 腾讯云 `49.235.124.163`（OpenCloudOS，登录用户 root）；本机是 Windows，在 `~/.ssh/config` 里配了别名，`ssh mc` 直连（专用密钥 `~/.ssh/id_ed25519_mc`，只给这台服务器用，和 GitHub 那两把分开）
- 站点 `/www/wwwroot/minecraft-web/`；systemd 服务 `minecraft-web`（开机自启+崩溃重启），只听 `127.0.0.1:8787`
- Nginx 配置在 `/www/server/nginx/conf/nginx.conf`（宝塔装的），改完用 `nginx -t` 校验
- 手机版入口：另一个域名（如 `m.7shu.asia`）加一条 A 记录指向本机，Nginx 加一个 `server_name` 反代到同一个 `127.0.0.1:8787` 即可，前端按域名自动切手机 UI，**不需要第二份代码或第二个 html**
- ⚠️ 域名要用**一级子域**：证书是 `*.7shu.asia` 通配（Let's Encrypt，2026-12-14 到期），只覆盖一层；`m.ms.7shu.asia` 这种三层域名会被浏览器判证书不匹配，除非再签一张。到期前记得验证 `certbot renew --dry-run`
- 子域共用登录态已配好（2026-10-16）：`/etc/systemd/system/minecraft-web.service.d/env.conf` 里写 `Environment=COOKIE_DOMAIN=.7shu.asia`（drop-in，不破坏原 unit）；`systemctl show minecraft-web -p Environment` 应同时看到 `HOST PORT COOKIE_DOMAIN` 三项，说明与原 unit 的变量合并生效
- 域名 `https://ms.7shu.asia` 由管理员配 Nginx 反代 → `127.0.0.1:8787`；证书/防火墙别碰
- 部署（本机 Windows 没有 rsync，改用 scp；本地构建，只传产物和改动的后端文件，不碰 `data.db`/`saves`）：
  ```powershell
  npm run build
  scp -r dist mc:/www/wwwroot/minecraft-web/                  # 前端产物（含 dist/index.html）
  scp server/index.mjs mc:/www/wwwroot/minecraft-web/server/  # 改了后端才传
  ssh mc 'systemctl restart minecraft-web; curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8787/'
  ```
- 只有在服务器上改了 `server/` 其他文件或动了 npm 依赖时，才需要 `ssh mc 'cd /www/wwwroot/minecraft-web && npm ci && npm run build'`
- 回滚：每次部署前先把旧 dist 与 `server/index.mjs` 备份到服务器 `/root/mc-backup/` 下，出问题原样拷回再 restart
- 验证：`ssh mc 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8787/'` 回 200 即正常
- ⚠️ **踩坑**：`ssh mc '远端命令'` 的命令串里**不要出现 `$`**（哪怕外层是单引号，`$(date ...)`、变量都会被本机 PowerShell 层改坏，远端会报 `No such file or directory`）。远端需要动态值就用固定字符串，或先把脚本 scp 上去再执行
- 手机版验证：浏览器开手机版域名（或任意域名加 `?touch=1`）→ 登录开局 → 左下有摇杆、右侧有「挖/放」按钮即切换成功
- 只改 `server/` 里的文件不用 build，scp + restart 即可；改了 `src/` 或 `index.html` 必须先在本机 `npm run build` 再传 dist

### 本地开发
- `npm run server`（后端 :8787）+ `npm run dev`（前端 :5174，/api 自动代理到后端）
- 调手机版 UI：开发地址加 `?touch=1`（`http://localhost:5174/?touch=1`），或 DevTools 切到手机设备模拟
- 验证：`npm run build`（含 TypeScript 检查，Vite 体积提示可忽略）
