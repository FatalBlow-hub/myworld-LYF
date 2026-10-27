# S1 — 四季树冠四态变色 + 树叶采集规则 + 柳树与柳絮孢子（四季线第 1 批）

## 目标

按用户 2026-10-27 下发的「岛屿四季系统」设定，本批做四块，全部只在**自由岛世界**生效（大厅/竞技场不做）：

1. **树冠四季四态变色**：换季时树冠外观即时切换 —— 春=翠绿、夏=粉樱花、秋=橙黄枫叶、冬=绿底 + 白积雪点
2. **树叶采集规则**：挖树冠时按当前季节决定掉落物（春夏冬掉普通树叶方块、夏掉樱花花瓣、秋掉枫叶）
3. **柳树**：沙滩专属树、垂挂柳条造型、三阶段树苗（只能种沙子）、地形生成在沙滩
4. **柳絮孢子**：春季柳树附近生成、随风水平漂移 + 缓缓下落、碰方块沿边缘绕行、1 分钟后消散、玩家靠近直接入包、怪物不能拾取、不受水流影响

## 已拍板的决策（照做，不要自行发挥）

### 贴图与配色

| 项 | 决策 |
| --- | --- |
| 新贴图文件 | **新建** `src/render/SeasonLeafTextures.ts`，导出 `SEASON_LEAF_TILE_NAMES: string[]` 与 `SEASON_LEAF_PAINTERS: Record<string, Painter>` |
| 春季 | 用现有本色贴图（`leaves_apple` / `leaves_peach` / `leaves_orange` / `leaves_pear` / `leaves_persimmon` / `leaves_banana` / `leaves` / `leaves_willow`），**不新增** |
| 夏季 | 全部树冠统一一张新贴图 `leaves_sakura`（粉底 + 深粉花瓣点）。**不要**按树种分 8 张，夏季整岛统一粉樱花是设定原意 |
| 秋季 | 用现有 `leaves_<key>_autumn` 六张；**普通树叶**与**柳树叶**需要新增 `leaves_plain_autumn`、`leaves_willow_autumn`（橙黄 + 少量红叶点） |
| 冬季 | 每树一张新贴图 `leaves_<key>_winter`（各自底色 + 顶部/边缘白色积雪点）；普通树叶 `leaves_plain_winter`、柳树 `leaves_willow_winter` |
| 贴图总数 | 新增 12 张：`leaves_sakura`、6 张 `leaves_<key>_winter`、`leaves_plain_autumn`、`leaves_plain_winter`、`leaves_willow_autumn`、`leaves_willow_winter` |
| 画法 | 复用 `TextureUtils` 的 16px 格子画法；同族贴图用**参数化 painter 工厂**（底色 + 花色 + 雪点开关），禁止 12 段复制粘贴 |

### `SeasonLeaves.ts` 改造

| 项 | 决策 |
| --- | --- |
| 数据结构 | `LEAF_SKINS` 改成 `{ id: number; spring: string; summer: string; autumn: string; winter: string }[]` |
| 覆盖范围 | 6 种果树叶 + 普通树叶 `LEAVES` + 柳树叶 `WILLOW_LEAVES`（共 8 条） |
| 换季判定 | 保留模块级 `applied` 去抖（同季节重复调用返回 false） |
| 坑 | 现有实现只改 `tex.top/side`，本批沿用；**不要**改 `tex.bottom/front` |

### 树叶采集掉落

| 项 | 决策 |
| --- | --- |
| 实现位置 | `src/core/PlayerActions.ts` 的挖方块结算处（`updateMining`，紧邻现有 186-196 的「挖树叶掉水果」逻辑）。**不要改** `BlockPicker.mine()` 的签名 |
| 春夏冬 | 保持现有行为：掉 1 个树叶方块本体 |
| 夏季 | 挖**任何一种树冠**（普通树叶 / 6 种果树树叶 / 柳树叶）→ 掉 1 个「樱花花瓣」（337），**不再掉树叶方块** |
| 秋季 | 同上 → 掉 1 个「枫叶」（338），不掉树叶方块 |
| 水果 | 现有 15% / 5% 掉果逻辑**原样保留**（季节门禁不变） |
| 概率 | 花瓣/枫叶 **100% 掉 1 个**（设定原文「采集：掉落樱花树叶」没有概率，按必掉处理） |
| 连带 | 原树叶方块掉落要**吞掉**，否则一次挖出两样 |

### 柳树

| 项 | 决策 |
| --- | --- |
| 树种 | `TREE_SPECIES` 末尾追加 `willow`，`sandOnly: true`、`trunk: 4`、`dyMin: -1`、`dyMax: 1`、`canopyR: 3` |
| 树干 | 新增方块 339「柳树干」，`TreeSpecies` 加可选字段 `wood?: number`（缺省用 `WOOD`），柳树填 339 |
| 果实 | 柳树不结正常果实：`fruit: 0`，并在 `FRUIT_OF_LEAF` 派生时**过滤掉 `fruit <= 0`**（否则会映射到 AIR） |
| 造型 | `Trees.ts` 加 `willowBlocks(sp, rand)`：树干 4 格 + 树冠一坨 + 从树冠边缘 8 个方位随机向下垂 2~3 格柳叶（垂枝长度每方向独立随机） |
| 分派 | `treeBlocks()` 里 `sp.palm ? palmBlocks : sp.willow ? willowBlocks : fruitBlocks`（用 `key === 'willow'` 判断，不要新增布尔字段） |
| 地形 | `TerrainGen.ts` 沙滩分支（现有椰子树那段 228-234 附近）**新增**柳树分支：`beachSand` 时按 `WILLOW.CHANCE` 概率生成柳树。**禁止改动已有 `hash(...)` 常量与椰子树概率** |
| 种植 | `PlayerActions` 的 `sandOnly` 判定已通用，**不要改** |
| 访客 | 柳树叶要进 `FRUIT_LEAF_IDS`（自动，因为来自 `TREE_SPECIES`）；新增的柳树干/柳树叶**不用**进 `VISIT_LIST_BLOCKS` |

### 柳絮孢子

| 项 | 决策 |
| --- | --- |
| 新模块 | **新建** `src/render/Fluff.ts`，`class Fluff`，Sprite 池（`THREE.Sprite` + 现画 CanvasTexture），**不要**改 `Snowfall.ts` |
| 上限 | 同屏最多 `FLUFF.MAX = 40` 颗 |
| 生成 | 春季 + 玩家所在格附近 8 格内有柳树叶时，每 `FLUFF.SPAWN_EVERY = 1.2` 秒生成 1 颗，位置取随机柳叶方块上方 0.5 格 |
| 寿命 | 每颗固定 `FLUFF.LIFE = 60` 秒，到点直接移除（不落地、不变成掉落物） |
| 运动 | 水平随机风向（每颗独立相位），叠加正弦缓慢转向；下落速度 `FLUFF.FALL = 0.15` 格/秒 |
| 绕方块 | 每帧预测下一位置：目标格是实心就**只走其中一个轴**（贴边滑行）；两轴都堵则反向。**绝对不能**进入实心格 |
| 拾取 | 玩家中心到粒子距离 < `FLUFF.PICK_DIST = 1.2` 时调 hook 入包；背包满则**保留粒子**并弹一次「背包满了」提示（每分钟最多提示一次） |
| 怪物 | 天然满足：本模块只跟玩家距离判定，不接触 mob |
| 水流 | 天然满足：粒子不参与流体逻辑，**不要**加流体判断 |
| 激活范围 | 只有 `scene === 'island'` 或 `scene === 'visit'` 且 `seasonOf(day.date) === 'spring'` 才激活 |
| 装配 | `Game.ts` 只加**装配行**：字段 + 构造 `new Fluff(...)` + 主循环 `fluffTick(dt, body)` + `clearScene()` 里 `fluff.clear()`，合计 ≤ 25 行。实现全部在 `Fluff.ts` |

### 柳絮腰包与柳条

| 项 | 决策 |
| --- | --- |
| 柳絮腰包 346 | 6 格：`WAISTBAG_CAPACITY[346] = 6`；`BagTextures.ts` 加一种柳絮配色（浅黄绿）的画法；`WAISTBAG_TEXTURES` 登记 |
| 柳条 345 | 纯物品（`item: true`），本批只做物品与贴图，配方下一批接 |
| 创造面板 | 337/338/344/345/346 全部登记进 `ALL_ITEMS`（`blocks.data.ts` 手写清单） |
| 掉落物颜色 | 337/338/344/345 加进 `ItemDrop.ts` 的 `guessColor`，否则地上是灰方块 |

## ID 分配（连续占号，后续批次从 348 起，禁止占用下列号段）

| ID | 内容 |
| --- | --- |
| 338 | 樱花花瓣（item） |
| 339 | 枫叶（item） |
| 340 | 柳树干（solid 方块） |
| 341 | 柳树叶（solid 方块） |
| 342 / 343 / 344 | 柳树苗 阶段 1 / 2 / 3 |
| 345 | 柳絮孢子（item） |
| 346 | 柳条（item） |
| 347 | 柳絮腰包（item，6 格） |

> ⚠️ **337 已被白萝卜占用，不要碰**（2026-10-27 实测，radish.ts 的 `WHITE_RADISH = 337`）。
> 348 已被下一批（红焰大赛箱）预定，本批**不要用**。

## 允许改动的文件

- `src/world/blocks.trees.ts` —— 柳树 species + 柳树干/叶/苗方块定义 + `wood?` 字段 + `FRUIT_OF_LEAF` 过滤
- `src/world/blocks.leafdrops.ts`（**新增**）—— 337 / 338 两个纯物品定义
- `src/world/blocks.willow.ts`（**新增**）—— 344 / 345 / 346 物品定义（339/340/341-343 也可以放这里，二选一但不要重复）
- `src/world/blocks.data.ts` —— 只加 import + `...` 展开 + `WAISTBAG_CAPACITY`/`WAISTBAG_TEXTURES` 各 1 行 + `ALL_ITEMS` 登记，**禁止**加业务逻辑
- `src/world/Trees.ts` —— `willowBlocks()` + 分派
- `src/world/SeasonLeaves.ts` —— 四态改造
- `src/world/TerrainGen.ts` —— 沙滩柳树分支
- `src/render/SeasonLeafTextures.ts`（**新增**）—— 12 张新贴图 painter
- `src/render/WillowTextures.ts`（**新增**）—— 柳树干/柳叶/柳树苗/柳絮孢子/柳条/柳絮腰包贴图
- `src/render/BagTextures.ts` —— 柳絮腰包配色
- `src/render/Textures.ts` —— **只允许** import + `TILE_NAMES` 展开 + `Object.assign(PAINTERS, ...)` 三处，禁止写新 painter 本体
- `src/render/Fluff.ts`（**新增**）—— 柳絮粒子
- `src/core/PlayerActions.ts` —— 树叶季节掉率（≤15 行）
- `src/core/Game.ts` —— **只允许装配行 ≤25 行**
- `src/config.ts` —— 新增 `WILLOW` / `FLUFF` 两段常量 + `ISLAND` 里加花瓣/枫叶掉率（若需要）
- `src/entities/ItemDrop.ts` —— `guessColor` 加 4 个新物品颜色

## 禁止

- 不改 `docs/`；不 git commit；不新增 npm 依赖；不改存档版本号
- 不动 `Snowfall.ts` / `HallMap.ts` / `Challenge.ts` / `Recipes.ts` / `Tutorials.ts`
- 不做配方（下一批）、不做旅者 NPC、不做大赛
- 不往 `Game.ts` 写实现逻辑（只装配）
- 不改任何已有 `hash()` 常量、不改椰子树生成概率
- 不新增 `LEAVES` 之外的"普通树叶"变种（普通树叶四季变色直接改它自己的贴图 key）

## 现有代码约定（必须遵守）

1. **依赖铁律**：`ui / interact / player → render / world → config`，`world` 不许 import `core`
2. 文件 ≤500 行；注释中文、代码英文；新文件顶部写「模块名 + 一句话职责」
3. 魔法数字进 `config.ts`
4. `TREE_SPECIES` 的派生表（`SPECIES_BY_LEAF` / `SAPLING_*` / `FRUIT_LEAF_IDS`）是 `Object.fromEntries` 自动生成，**不要**手工再写一遍
5. `blocks.trees.ts` 不许 import `blocks.data.ts` 的运行时值（循环依赖），ID 写字面量
6. `Tutorials.ts` / `RECIPES` 的下标是存档键，本批不碰

## 关键入口（省得你找）

- `src/world/SeasonLeaves.ts`：`LEAF_SKINS`（15-22）、`applySeasonLeaves`（28-40）
- `src/world/blocks.trees.ts`：`TreeSpecies`（47-69）、`TREE_SPECIES`（72-80）、派生表（83-111）、`TREE_BLOCKS`（118-140）
- `src/world/Trees.ts`：`treeBlocks`（15-17）、`fruitBlocks`（20-36）、`palmBlocks`（39-56）
- `src/world/TerrainGen.ts`：椰子树沙滩分支（228-234，判据 `beachSand`）
- `src/core/PlayerActions.ts`：挖树叶掉果（186-196）
- `src/render/Textures.ts`：`TILE_NAMES`（28-110）、`PAINTERS` 合并（433）
- `src/core/Game.ts`：`applySeasonLeaves(season)`（410-416 与 469-477）、`snowTick`（479-490）、`clearScene`（788-810）
- `src/render/Snowfall.ts`：Sprite 池写法（137-174）可参考，但**不要改它**

## 验收标准

1. `npm run build` 通过（含 TypeScript 检查）
2. 把存档日期改到 3/6/9/12 月各进一次：树冠分别是翠绿 / 粉樱花 / 橙黄 / 绿底带白点；**换季即时生效**，不用重开
3. 春夏冬挖树冠掉 1 个树叶方块；夏季挖掉「樱花花瓣」、秋季掉「枫叶」，且**不同时掉树叶方块**
4. 沙滩上能看到柳树，造型有下垂柳条；草地/泥土上种柳树苗长不出来（`sandOnly`），沙子上能长成
5. 柳树苗三阶段都能正常长大（打掉退回阶段一）
6. 春季在柳树旁站 1 分钟：能看到柳絮飘、会绕开方块、不会穿进方块、约 60 秒后消失；走过去自动进包
7. 背包满时柳絮不消失（留在原地，提示一次）
8. 夏/秋/冬在柳树旁**看不到**柳絮
9. 大厅 / 灵魂虚空里不生成柳絮，`npm run build` 无未使用变量告警
10. 老存档能正常读（新方块 ID 不改变已有地形基线的现象只允许出现在沙滩）

## 完成后

- 报告：改了哪些文件、各做了什么（250 字以内）
- 手工冒烟：按验收 2-8 逐条给操作步骤（改存档日期怎么改）
- 说明：新增了哪些贴图 key、有没有踩到 `Textures.ts` 洋红占位
- **不要 git commit**
