# M4 — 好友访岛完整流程（小岛生存 B7 B8 B9 B10）

## 目标

把「去好友的岛」做通：输入对方名字发申请 → 对方屏幕收到提醒 → 同意/拒绝 → **双重验证**（双方都没开过创造模式）→ 岛主设置访客挖掘权限（三种模式 + 水果例外开关）→ 访客进入对方的岛，按权限挖掘。

> 本期仍是**客户端权威**（访客的世界是对方存档的本地副本，改动不落盘到对方服务器存档）。真正的服务端权威校验是 M5 的活，本期的权限只保证"正常玩法下挖不动"。

## 已拍板的决策（照做）

| 项 | 决策 |
| --- | --- |
| 谁在线才能申请 | **必须在线**；不在线时提示「对方不在线」，不做离线留言 |
| 双重验证 | 双方存档的 **`everCreative`** 都必须为 false。该字段本期新增：**只要选过或切到过创造模式就置 true**，随存档保存（老档默认 false） |
| 挖掘权限 | 两个控件：①模式三选一 `none`（什么都不能挖）/ `all`（都能挖）/ `list`（只能挖指定清单）②**水果例外开关**（只在 `none` / `all` 下生效）：`none`+例外 = 只有水果不能挖；`all`+例外 = 只有水果能挖 |
| 指定清单（`list` 模式） | 树叶、南瓜、西瓜、小麦（`RICE_MATURE` 那一系列成熟作物）、胡萝卜、**访客所在岛的水果**（注意：是*访客自己的*岛水果还是*岛主的*岛水果 —— 取**岛主的**岛水果，因为那是他岛上的树） |
| 权限执行位置 | 客户端：挖方块前校验（`PlayerActions.updateMining` 入口处），不通过就提示「访客权限不允许挖这个方块」并清进度。**放置方块对访客一律禁止**（需求没提，按最保守处理） |
| 访客世界 | 从服务器拉岛主的存档当作**临时副本**加载（visit 场景），离开后丢弃；访客的挖掘**不写回**岛主存档 |
| 拉取接口 | 服务端新增 `GET /api/visit/world?name=<岛主名>`：需登录态 + 已有同意的访问票据，返回对方存档 JSON |
| 访问票据 | 服务端在同意时生成一次性 `ticket`（随机串，5 分钟有效），只允许该访客用一次 |
| 拒绝/超时 | 岛主点拒绝或 60 秒无响应 → 访客提示「对方拒绝/未响应」，本次申请作废 |

## 消息协议（追加到 `src/net/Protocol.ts` 与 `server/ws.mjs`）

| 方向 | 消息 | 说明 |
| --- | --- | --- |
| C→S | `visit.request { to }` | 访客发起申请 |
| S→C | `visit.incoming { from }` | 推给岛主：有人想上岛 |
| C→S | `visit.reply { to, accept, perm?, ticket? }` | 岛主同意/拒绝（同意时带权限配置） |
| S→C | `visit.approved { owner, perm }` | 访客收到：可以去，凭 ticket 拉世界 |
| S→C | `visit.denied { reason }` | 拒绝 / 验证失败（`creative`）/ 超时 / 不在线 |

## 允许改动的文件

- `server/ws.mjs` —— 申请转发、票据、超时清理、双验证（读两边存档的 everCreative）
- `server/index.mjs` —— 新增 `GET /api/visit/world`（校验票据 + 登录态）
- `src/net/Protocol.ts`、`src/net/Client.ts` —— 新增访岛消息
- `src/ui/HallMenu.ts` —— 「去好友的岛」改成打开输入框（一个简单 overlay，输入名字 + 确定/取消）
- **新增** `src/ui/VisitMenu.ts` —— 岛主的两个界面：①收到申请的提醒（同意/拒绝）②同意后的权限设置（三选一 + 水果例外勾选 + 确认）
- `src/core/Game.ts` —— `pickFriendIsland()`（发申请）、收到批准后拉世界并进入 visit 场景（`visitOwner`）、岛主侧弹窗编排
- `src/core/PlayerActions.ts` —— 挖方块前的权限校验；访客禁止放置
- `src/core/Save.ts` —— 加 `everCreative`（可选字段 + `migrateSave` 默认 false）、`islandType` 已在
- `src/world/blocks.data.ts` 或 `src/config.ts` —— 权限判定要用的方块清单（树叶/南瓜/西瓜/作物/胡萝卜）
- `src/ui/PanelStack.ts` 注册新的两个面板（在 `Game.begin()` 里注册）

## 禁止

- 不改 `docs/` 下任何文件
- 不动 `server/data.db` 的账号数据（新增的票据放内存即可，不要建表）
- 不新增 npm 依赖
- 不做服务端权威挖掘校验（M5）
- 不让访客的改动写回岛主存档

## 现有代码约定（必须遵守）

1. 依赖铁律：`ui / interact / player → render / world → config`；服务端与客户端不互相 import
2. `player` 层不许依赖 `ui`/`core`：权限校验如果要用到 `visitPerm`，通过 `PlayerActions` 的 deps 注入
3. 文件 ≤500 行；注释中文、代码英文；新模块顶部写"模块名 + 一句话职责"
4. 面板一律走 `PanelStack`；场景三态 `island/hall/visit` 已有，本期 visit 要区分「随机陌生岛」与「好友岛」（加个 `visitOwner: string | null`）
5. 存档新字段一律可选 + `migrateSave()` 默认值；不要动 `SAVE_VERSION` 的值
6. 挖方块入口只有 `PlayerActions.updateMining()`；放置只有 `placeItem()`

## 验收标准

1. `npm run build` 通过（tsc 零报错）
2. 两个标签页（A、B）都开局并进大厅：A 点「去好友的岛」输入 B 的名字 → B 屏幕弹出提醒（显示 A 的名字）
3. B 点拒绝 → A 收到「对方拒绝」
4. B 点同意且双方都没开过创造模式 → B 弹权限设置（三选一 + 水果例外），选「只能挖清单」并确认 → A 进入 B 的岛，能看到 B 的房子
5. A 试着挖清单外的方块（比如石头）：挖不动并提示；挖树叶/南瓜/胡萝卜：能挖（在清单内）
6. 反例：B 的存档曾进过创造模式（`everCreative = true`）→ A 收到「验证失败」，进不去
7. A 在 B 的岛上放置方块被禁止（提示）
8. A 按 H 回大厅；B 的岛存档**没有被 A 的挖掘改动**（B 重新进自己的岛，房子和地形原样）

## 完成后

- 报告改了哪些文件、各做了什么（200 字以内）
- 手工冒烟步骤（双标签页怎么验 1-8）
- **不要 git commit**（提交由我来做）
