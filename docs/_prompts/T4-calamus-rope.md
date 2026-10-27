# T4 — 菖蒲叶改荷叶 + 绳索拴动物

## 目标

两件事，都在自由岛世界生效：

1. **菖蒲叶（360，用户口述"蒲昌叶"）贴图改成荷叶**：外形与荷叶一致，材质样貌**不能像麦子/草类植物**（现贴图偏水草感）
2. **绳索（393）**：2 木棍合成 1 根；拿着绳索对准动物按 M 拴住（之后动物跟着玩家走），再对被拴住的动物按 M 解除（恢复自由行动）

## 已拍板的决策（照做，不要自行发挥）

### 菖蒲叶贴图

| 项 | 决策 |
| --- | --- |
| 改哪里 | `src/render/SeasonFoodTextures.ts` 的 `calamus` painter（现有 L41 附近） |
| 画法 | 一片**圆整的荷叶**：深绿叶盘 + 从中心放射的浅色叶脉 + 边缘一圈墨绿描边 + 一个缺口（荷叶的豁口），占满 16×16。**禁止**画成细长草叶/麦穗/水草条 |
| 其他 | 不改方块 ID / 属性 / 生成规则 / 配方（菖蒲叶仍长夏季水面，香囊 3 叶、护盾 5 叶不变） |

### 绳索

| 项 | 决策 |
| --- | --- |
| ID | `ROPE = 393`（376 工作台、377~392 料理已占，别动） |
| 新文件 | **新建** `src/world/blocks.rope.ts`：`ROPE` + `ROPE_BLOCKS`（`item: true`，贴图 `rope`）+ 在 `blocks.data.ts` 做 3 处登记（import、`export *`、BLOCKS spread）+ `ALL_ITEMS` 加 `ROPE` |
| 配方 | `木棍×2 → 绳索×1`，**普通**工作台/背包就能做（道具类配方，**不加** `bench`），追加到 `RECIPES` 末尾 |
| 贴图 | **新建** `src/render/RopeTextures.ts`：`ROPE_TILE_NAMES`（`'rope'`）+ `ROPE_PAINTERS`：一段盘起来的麻绳（棕黄股绳交错）。`Textures.ts` 只允许 3 处（import / `TILE_NAMES` 末尾展开 / `Object.assign(PAINTERS, ...)` 加 `ROPE_PAINTERS`） |
| 手册 | 配方自动进手册（`Tutorials.ts` 不用改配方部分）；**另加一条手写说明**：`list.push` 到 `Tutorials.ts` 末尾——「使用：拿着绳索对准动物按 M 拴住，动物会跟着你走；再按 M 一次放开」 |
| 交互键 | **按 M**（与"蒲公英驯服羊"同一按键，`MobCombat.ts:70` 的 `door` 分支），不要用左键（左键是攻击） |
| 可拴对象 | `Animal` 全部种类（牛/猪/羊/三种鸟：`instanceof Animal`），**不含**僵尸/鱼/小战士 |

### 拴住后的行为

| 项 | 决策 |
| --- | --- |
| 字段 | `Animal` 加 `leashed = false`（放在 `tamed` / `waiting` 附近，`Animal.ts:66`） |
| 跟随 | 把 `Animal.update()` 里 `if (this.tamed && ...)` 的条件改成 `if ((this.tamed \|\| this.leashed) && ...)`：**复用**现有跟随逻辑（`ANIMAL.FOLLOW_DIST` 5 格内不动、超过就按 `FOLLOW_SPEED` 跟上、超过 `TELEPORT_DIST` 25 格传送过来） |
| 与驯服的区别 | `tamed` 是驯服（蒲公英喂羊），`leashed` 只是牵着走，**两者互不影响**：拴住的动物 `tamed` 仍为 false；被拴住的动物按蒲公英喂它照样能驯服 |
| 原地等待 | `waiting` 只对 `tamed` 生效，**拴住不受 `waiting` 影响**：leashed 时即使 `waiting` 为 true 也照样跟着走（跟随条件里要把 waiting 判定收紧成 `this.tamed && this.waiting` 才停下） |
| 持久化 | `Save.ts` 里动物记录加 `leashed` 字段（保存/读取/存档应用三处，照抄 `tamed` / `waiting` 的写法，**缺省 false 兼容旧档**） |
| 不自动消失 | `Mobs.ts` 的 `keepNear(this.animals, (a) => a.tamed)` 过滤条件加 `\|\| a.leashed`，拴住的动物不被清理 |
| 提示 | 拴住：`拴住了，它会跟着你走`；解除：`绳子解开了，动物自由了`；没拿绳索对准动物按 M → 保持现有"驯服羊"分支不变；**绳索不消耗** |

### 交互链路

| 项 | 决策 |
| --- | --- |
| 落点 | `MobCombat.ts:70` 现在是 `mob.mob instanceof Animal && mob.mob.kind === 'sheep'` 才调 `useSheep`。改成：**先判断绳索**——`mob.mob instanceof Animal` 且手上是 `ROPE` → 调新的 `useAnimalRope(a)`；不满足绳索条件时**保持原有羊驯服分支不变** |
| 新方法 | `Survival.ts` 加 `useAnimalRope(animal: Animal)`，写法照抄同文件 `useSheep`（208-227） |
| 装配 | `MobCombat` 的 deps 加可选 `useAnimalRope?: (a: Animal) => void`，`Game.ts` 传 `this.survival!.useAnimalRope`（装配 ≤3 行） |
| 手持判定 | `const held = this.inventory.hotbar[this.slot()]; if (held?.id === ROPE) {...}`（写法照抄 `PlayerActions.ts:144` 的 `wantsLiquid`） |

## 允许改动的文件

- `src/world/blocks.rope.ts`（**新增**）
- `src/world/blocks.data.ts`（3 处登记 + `ALL_ITEMS`）
- `src/render/RopeTextures.ts`（**新增**）
- `src/render/Textures.ts`（只允许上表 3 处）
- `src/render/SeasonFoodTextures.ts`（只改 `calamus` painter）
- `src/world/Recipes.ts`（末尾追加绳索配方 1 条）
- `src/world/Tutorials.ts`（末尾 push 1 条使用说明）
- `src/entities/Animal.ts`（`leashed` 字段 + 跟随条件 + waiting 收紧，≤8 行）
- `src/entities/Mobs.ts`（`keepNear` 过滤条件加一项，≤1 行）
- `src/core/Save.ts`（动物 `leashed` 存取三处，照抄 `tamed`）
- `src/core/Survival.ts`（新增 `useAnimalRope`，≤12 行）
- `src/core/MobCombat.ts`（绳索分支，≤10 行）
- `src/core/Game.ts`（装配 `useAnimalRope`，≤3 行）

## 禁止

- 不改 `docs/`；不 git commit；不新增 npm 依赖；不改存档版本号
- 不改动物 AI 其他部分（游荡、繁殖、生长、受伤、羽毛羊毛掉落）
- 不画绳索牵引线/绳子模型（本批不做 3D 牵引绳，靠 HUD 提示 + 跟随行为表达）
- 不改驯服羊逻辑（蒲公英/`useSheep`/`waiting` 的既有语义）
- 不碰僵尸、鱼、小战士的交互
- 不改菖蒲叶的生成概率、属性、配方
- 不改 `PlayerActions.ts`

## 现有代码约定

1. 依赖铁律：`ui / interact / player → render / world → config`；`world` 不许 import `core`
2. 文件 ≤500 行；注释中文、代码英文；新文件顶部写模块职责注释块
3. `blocks.*.ts` 之间不许 import 运行时值（循环依赖），ID 写字面量
4. `RECIPES` / `Tutorials.ts` 的 push 一律**追加到末尾**（手册下标是存档键）

## 关键入口（省得你找）

- `src/entities/Animal.ts`：字段（51-86）、`update()` 跟随分支（138-213，重点 155-191）、`tryMove`（216-221）
- `src/entities/Mobs.ts`：`keepNear`（211）、每帧 update（100-103）
- `src/core/Save.ts`：动物存档（115 / 327 / 401 三处，照抄 `tamed`）
- `src/core/Survival.ts`：`useSheep`（208-227，范本）
- `src/core/MobCombat.ts`：`update()`（26-73，重点 70-72）
- `src/render/SeasonFoodTextures.ts`：`SEASON_FOOD_TILE_NAMES`（7-10）、`SEASON_FOOD_PAINTERS`（24-30）、`calamus` painter（41 附近）
- `src/render/Textures.ts`：`TILE_NAMES`（33-124）、painter 合并行（447）

## 验收标准

1. `npm run build` 通过
2. 夏季水面上能看到菖蒲叶，样子是一片圆荷叶（有叶脉、有豁口），不像草/麦子
3. 2 木棍在 2×2 背包就能合成绳索；手册能看到这条配方和使用说明
4. 拿绳索对准一头牛按 M：HUD 提示"拴住了"，牛开始跟着玩家走（玩家走远它跟上，超过 25 格直接传送到身边）
5. 再对准这头牛按 M：提示"绳子解开了"，牛恢复闲逛、不再跟人
6. 拴住羊之后喂蒲公英仍能驯服；驯服的羊按 M 仍是"原地等待/跟上"切换，不受绳索影响
7. 拴住的动物：存档退出再进，仍然处于被拴状态并继续跟随；拴住的动物不会因远离玩家被自动清理
8. 不拿绳索对准羊按 M：仍是原来的驯服/等待交互
9. 老存档（没有 `leashed` 字段）正常读档

## 完成后

- 报告：改了哪些文件、各做了什么（250 字以内）
- 说明新增贴图 key、`Save.ts` 三处改动的具体位置
- **不要 git commit**
