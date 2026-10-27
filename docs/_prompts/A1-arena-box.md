# A1 — 红焰大赛箱 + 极限季节挑战（大赛线第 1 批）

## 目标

按用户 2026-10-27 下发的「CS大赛/红焰大赛箱」设定，本批只做**入口 + 极限季节挑战**，CS 大赛本批不实现（面板上灰掉写「即将开放」）：

1. 大厅里出现**两格高**的「红焰大赛箱」，玩家对着它按 `M` 打开大赛面板
2. 面板两个玩法卡片：**极限季节挑战**（本批可用）、**全年 CS 大赛**（灰掉占位）
3. 极限季节挑战两种图：
   - **冰天雪地**（仅春季、冬季开放）：120 秒，雪原地图，遵循普通岛屿规则
   - **星空的世界**（仅夏季、秋季开放）：120 秒，全虚空地图，**掉下去不死亡**（传回平台）
4. 报名费 2 岛币；开局血量置 1；背包清空（含腰包与腰包内物品）；存活到时间结束奖励 10 岛币；中途死亡不退费

## 已拍板的决策（照做，不要自行发挥）

### 大赛箱方块

| 项 | 决策 |
| --- | --- |
| ID | **347**「红焰大赛箱」，`blocks.arena.ts` 新建（不要塞进 851 行的 `blocks.data.ts`） |
| 外观 | 红底 + 火焰纹路 + 顶部金边；`render/ArenaTextures.ts` 新建，导出 `ARENA_PAINTERS` |
| 高度 | 占两格：`HallMap.buildHall()` 里 `MACHINES` 加可选 `tall?: boolean`，为真时在 `floorY+1` 与 `floorY+2` 各写一次 |
| 位置 | `HALL.MACHINES` 末尾加 `{ id: 347, x: 6, z: 1, tall: true }` |
| 挖掘 | 大厅里本来就挖不动，不需要额外处理；给 `hardness: 9999` |
| 交互 | `PlayerActions` 的 `door` 键分支（现有 339-361 的 if 链）加 `if (id === ARENA_BOX) this.d.openArena()`，照 `openShop` 的注入写法 |

### 面板

| 项 | 决策 |
| --- | --- |
| 新面板 | **新建** `src/ui/ArenaPanel.ts`，照 `ui/ShopPanel.ts` 的结构（`open()` / `close()` / 回调） |
| 内容 | 两张卡：极限季节挑战（含两个子模式：冰天雪地 / 星空的世界）、全年 CS 大赛（灰显「即将开放」） |
| 卡片信息 | 存活 120 秒 / 报名 2 岛币 / 存活奖励 10 岛币 / 开局赠送清单 / 当前季节是否开放 + 不开放的原因 |
| 二次确认 | 点「报名进入」后按钮变「再点一次确认报名（2 岛币）」5 秒内有效，超时复位。防止误触扣钱 |
| 岛币不足 | 按钮灰掉 + 提示「还差 N 岛币」（创造模式 `inventory.infinite` 视为不扣钱） |

### 竞技场场景与地图

| 项 | 决策 |
| --- | --- |
| 场景 | `SceneMode` 加 `'arena'`（现在四态 `island/hall/visit/void`） |
| 地图模块 | **新建** `src/world/ArenaMaps.ts`，照 `HallMap.buildHall` / `VoidRealm.buildVoidRealm` 的做法：`world.terrainGen = false` + 手写 `chunk.data` |
| 雪原图 | 24×24 雪地平台（`SNOW` 顶面 + `DIRT` 下面两层），四周 2 格高雪块围墙（防跑出去），出生点平台中央 |
| 虚空图 | 11×11 石台（`STONE`）悬在 `y = ARENA.FLOOR_Y`，四周全空。掉到 `FLOOR_Y - 8` 以下 → **传回平台中心**，不扣血不死亡 |
| 清理 | 进/出竞技场都走 `clearScene()` + `chunkMeshes.rebuildDirty(world)` |

### 极限挑战规则

| 项 | 决策 |
| --- | --- |
| 报名费 | `ARENA.FEE = 2` 岛币，进图前扣，**不退** |
| 存活奖励 | `ARENA.REWARD = 10` 岛币，撑满 120 秒才发 |
| 时长 | `ARENA.SECONDS = 120` |
| 开局血量 | `health.hp = 1`（满血 20） |
| 背包处理 | 进图前**整包快照**（`hotbar` / `storage` / `armor` / `waistbag` / `craftIn` / `craftBig` / `held` 全克隆）→ 全部清空 → 结算时**原样还原**（腰包与腰包里的东西自动一起收纳/返还） |
| 饥饿 | 进图时 `hunger.enabled = false`（不消耗饥饿），退出时恢复原值；吃东西仍能回血 |
| 赠送·冰天雪地 | 生肉×5（`RAW_MEAT`）、稻粒×4（`RICE_GRAIN`，即设定里的「麦粒」）、雪花剑（`SWORD_SNOW`）、寒冰瓶×3（`POTION_ICE`） |
| 赠送·星空 | 幻药瓶（`POTION_PHANTOM`）、铁剑（`SWORD_IRON`）、稻粒×3（`RICE_GRAIN`） |
| 刷怪 | 每 `ARENA.SPAWN_EVERY = 12` 秒在玩家 8~14 格外刷 1 只：前 40 秒 `normal`、40~80 秒 `blood`、80 秒后 `star`。`noLoot = true`、`inChallenge = true`（复用现有标记：只认玩家） |
| 死亡 | 血量 ≤ 0 → 结束挑战：**不退报名费、不发奖**，背包原样还原，传回大厅 |
| 存活 | 倒计时归零 → `onCoins(+10)` → 背包还原 → 传回大厅 |
| 放弃 | 面板里「放弃挑战」按 M 确认 / 按 `H` 回大厅：都算失败（不退费、照常还原背包） |
| 结算后 | `health.hp = HEALTH.MAX_HP`，`hunger.value = HUNGER.MAX` |
| 倒计时显示 | `Hud.setArenaTimer(sec | null)` 新增一个顶部计时文本；实现方式自选（复用现有提示容器或新建 span），**不要**破坏原有 HUD 布局 |
| HUD 播报 | 每 10 秒播一次「剩余 XX 秒」，最后 10 秒每秒播一次 |

### 存档（重要，别踩）

| 项 | 决策 |
| --- | --- |
| 自动存档 | `Game.saveNow()` 里加一条：`scene === 'arena'` 直接 return。**否则**竞技场里空背包会被 `saveCarryOnly` 写进档，玩家真存档被清空 |
| 存档字段 | 竞技场**不进存档**：不记录进行中的比赛，退出游戏＝本次报名作废（不给补发奖励）。报告里要写清这条口径 |
| 岛币 | 报名/奖励都走 `Game.addCoins()`，不要自己改 `coins` 字段 |

## ID 分配

| ID | 内容 |
| --- | --- |
| 348 | 红焰大赛箱（solid 方块，两格高） |

> ⚠️ 337 是白萝卜、338~347 是四季树冠与柳树一族（S1），都已被占用。
> 349 起留给下一批（CS 大赛/柳条陷阱），本批**不要用**。

## 允许改动的文件

- `src/world/blocks.arena.ts`（**新增**）—— 347 方块定义
- `src/world/blocks.data.ts` —— 只加 import + `...` 展开 + `ALL_ITEMS` 登记（3 行）
- `src/world/ArenaMaps.ts`（**新增**）—— 两张图的地形
- `src/world/HallMap.ts` —— `tall` 机器支持（≤8 行）
- `src/render/ArenaTextures.ts`（**新增**）—— 大赛箱贴图
- `src/render/Textures.ts` —— **只允许** import + `TILE_NAMES` 展开 + `Object.assign(PAINTERS, ...)` 三处
- `src/core/Arena.ts`（**新增**）—— 挑战状态机（报名/快照/倒计时/刷怪/结算）
- `src/core/PlayerActions.ts` —— door 分支 1 个 if + 依赖接口 1 个回调（≤10 行）
- `src/core/Game.ts` —— **只允许装配行 ≤40 行**：字段、`openArena()`、`enterArena()`、`leaveArena()`、`respawn()` 分支、`saveNow()` 早退、主循环 `arena.update()`、`clearScene()` 里 `arena.clear()`。**实现全部在 `core/Arena.ts`**
- `src/ui/ArenaPanel.ts`（**新增**）
- `src/ui/Hud.ts` —— `setArenaTimer`（≤15 行）
- `src/config.ts` —— 新增 `ARENA` 一段常量（不进 `HALL`，避免继续撑大）
- `src/core/Calendar.ts` 只读（`seasonOf` 已够用，不用改）

## 禁止

- 不改 `docs/`；不 git commit；不新增 npm 依赖；不改 `SAVE_VERSION`
- **不做 CS 大赛**：不写枪、子弹、CS 商店、CS 币、1v1/3v3
- 不动 `Challenge.ts`（挑战房是另一套玩法，别改它的行为）
- 不动 `Snowfall.ts` / 树相关文件 / 配方 / 手册
- 不在 `Game.ts` 里写业务逻辑
- 不做服务端改动（`server/` 一行都不许动）

## 现有代码约定（必须遵守）

1. **依赖铁律**：`ui / interact / player → render / world → config`；`core` 可以开 UI 面板
2. 文件 ≤500 行；注释中文、代码英文；新文件顶部写「模块名 + 一句话职责」
3. 魔法数字进 `config.ts`
4. 所有玩家扣血走 `player/damage.ts` 的 `hurtPlayer`（别自己减 `hp`）
5. 场景切换必须走 `clearScene()` + `panels.closeAll()`，照 `enterHall()` / `enterVoid()` 的写法
6. 依赖注入写回调，不要 new `Game` 里的东西

## 关键入口（省得你找）

- `src/config.ts`：`HALL`（526-546，含 `MACHINES`）、`CHALLENGE`（314-319）、`HALL.SPAWN`
- `src/world/HallMap.ts`：`buildHall()`（9-44，机器摆放在 37-40）
- `src/world/VoidRealm.ts`：9×9 虚空平台写法可照抄
- `src/core/PlayerActions.ts`：door 分支（339-361）
- `src/core/Game.ts`：`SceneMode`（75）、`enterHall`（812-829）、`enterVoid`（862-874）、`leaveHall`（844-860）、`clearScene`（788-810）、`respawn`（1061-1074）、`saveNow`（743-786）、`addCoins`（541-545）、主循环里 `update` 的调用顺序
- `src/core/Hunger`（`player/Hunger.ts`）：`enabled` / `value`
- `src/player/Health.ts`：`hp` 字段 + `respawn()` 方法
- `src/ui/ShopPanel.ts`：面板结构模板
- `src/entities/Zombie.ts`：`ZombieKind`、`noLoot` / `inChallenge` 标记

## 验收标准

1. `npm run build` 通过（含 TypeScript 检查）
2. 大厅里 `(6,1)` 位置出现**两格高**的红焰大赛箱，外观占满两格、没有缝隙
3. 对着箱子按 `M` 打开面板；两张卡都在，CS 大赛显示「即将开放」且点不动
4. 春/冬时「冰天雪地」可报名、「星空的世界」灰掉（反之夏/秋相反），卡片上写明原因
5. 点报名 → 按钮变二次确认 → 再点扣 2 岛币进图；岛币不足时按钮灰掉并提示差额
6. 进图后：血量 1 点、背包空、赠品齐全（冰天雪地 4 样 / 星空 3 样）、顶部有倒计时
7. 冰天雪地：雪地 + 围墙，能正常走动跳；雪原外跑不出去
8. 星空：悬空石台，掉出去会传回台面、**不掉血不死**
9. 中途被怪打死：回到大厅、背包**原样**回来（腰包和腰包里的东西都在）、不退报名费
10. 撑满 120 秒：岛币 +10、背包原样回来、回大厅、血量与饥饿恢复满
11. 竞技场里等 20 秒不报错；期间自动存档**没有**把空背包写进档（退出重进背包还在）
12. 大厅里原有 5 台机器、挑战房、灵魂传送门、访岛全部照常
13. 老存档能正常读

## 完成后

- 报告：改了哪些文件、各做了什么（250 字以内）
- 手工冒烟：按验收 2-11 逐条给操作步骤（含怎么改存档日期测季节门禁）
- 明确回答：竞技场里的「不掉落死亡」是怎么实现的、自动存档早退加在哪一行
- **不要 git commit**
