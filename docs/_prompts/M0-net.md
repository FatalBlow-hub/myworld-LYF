# M0 — 联机骨架（WebSocket 长连接）

## 目标

给游戏铺上**实时通信的底子**：浏览器与游戏服务器建立 WebSocket 长连接，能收发 JSON 消息、有心跳与自动重连、HUD 显示连接状态。**本期只做"管道"，不做排队/匹配/同步**（那些是 M3 以后的活）。

## 背景（必读）

- 服务端 `server/index.mjs`：纯 Node ESM，`node:http` 的 `createServer`，端口 8787（`HOST`/`PORT` 常量），提供 `/api/auth/*`、`/api/save/*`。数据库用 `better-sqlite3`。
- 前端是 Vite + TypeScript，开发时 `/api` 已代理到 8787（见 `vite.config.ts`）。
- 客户端现有分层：`src/core/Game.ts` 装配一切；`src/ui/Hud.ts` 有 `showMessage()`。

## 已拍板的决策（照做）

| 项 | 决策 |
| --- | --- |
| 库 | **允许且仅允许**新增一个依赖 `ws`（服务端 WebSocket 库，Node 生态标准做法） |
| 挂载方式 | 在现有 HTTP server 上处理 `upgrade` 事件，**不新开端口**（公网只开一个口，Nginx 反代省事） |
| 客户端目录 | 新建 `src/net/`：`Protocol.ts`（消息类型定义，纯类型）+ `Client.ts`（连接管理）。这一层是基础设施，`core` 与 `ui` 可以用它 |
| 消息格式 | JSON：`{ t: '消息类型', ...payload }`，`t` 用字符串字面量联合类型收口 |
| 心跳 | 客户端每 **10 秒**发 `ping`；服务端回 `pong`；客户端 **30 秒**没收到任何消息判定掉线 → 自动重连（间隔 3 秒，指数退避到 30 秒封顶） |
| 身份 | 连接建立后客户端发 `hello`（带当前账号名，没有就 `guest-随机数`）；服务端回 `welcome` + 当前在线名单；有人上下线时广播 `online` / `offline` |
| 断线表现 | HUD 固定位置显示连接状态灯：绿=已连接、黄=重连中、红=已断开（文字即可，如「联机 ●」/「联机 ○ 重连中…」） |
| 不做的 | 房间、队列、岛屿匹配、世界同步、访客申请 —— 一律不做，只留消息类型命名空间 |

## 允许改动的文件

- `server/index.mjs` —— 挂 WebSocket（建议逻辑放新文件 `server/ws.mjs`，由 index 引入并传入 http server）
- `server/ws.mjs`（新增）—— 连接管理、心跳超时清理、在线名单
- `src/net/Protocol.ts`（新增）—— 消息类型
- `src/net/Client.ts`（新增）—— 连接/收发/心跳/重连/在线名单缓存
- `src/core/Game.ts` —— `start()` 里建立连接，把在线名单变化转给 HUD
- `src/ui/Hud.ts` —— 连接状态灯（一个 DOM 元素，别大改结构）
- `vite.config.ts` —— 开发服把 `/ws` 代理到 8787 并开 `ws: true`
- `package.json` —— 加 `ws` 依赖（**只此一个**）

## 禁止

- 不改 `docs/` 下任何文件
- 不动 `server/data.db`、真实存档、localStorage
- 不加 `ws` 以外的任何依赖
- 不改现有玩法逻辑（`core/Game.ts` 只加"建立连接 + 把状态给 HUD"，不许动 tick 流程）
- 不做房间/队列/同步/权限

## 现有代码约定（必须遵守）

1. 服务端是 **ESM + 纯 Node**（`import { createServer } from 'node:http'`），注释中文
2. 客户端文件 ≤500 行；注释中文、代码英文；新模块顶部写"模块名 + 一句话职责"
3. 客户端连接状态变化**不许刷屏**：只在状态真正变化时 `showMessage`
4. 服务端每个连接要能清理（断开时从在线名单移除，心跳超时也要清）

## 验收标准

1. `npm install` 后 `npm run build` 通过（tsc 零报错）
2. `npm run server` + `npm run dev` 都跑起来：浏览器控制台能看到连接成功日志，HUD 显示「联机 ●」
3. 两个浏览器标签页都打开：A 上线后 B 的在线名单里出现 A；A 关掉标签页，B 收到 `offline`
4. 关掉 `npm run server`：HUD 变「联机 ○ 重连中…」；重新起服务，HUD 自动恢复「联机 ●」（不用刷新页面）
5. 断线重连不刷屏（`showMessage` 只在状态变化时出现）
6. 服务端日志能看到连接/断开，且进程不会因为客户端直接关标签页而崩溃或泄漏

## 完成后

- 报告改了哪些文件、各做了什么（200 字以内）
- 手工冒烟步骤（怎么起服务、怎么验证 1-6）
- **不要 git commit**（提交由我来做）
