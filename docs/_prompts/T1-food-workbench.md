# T1 — 美食工作台 + 配方「美食/道具」分区（美食 DIY 手册第 1 批：机制）

## 目标

按用户 2026-10-28 下发的设定做「美食工作台」机制，本批**只做机制与工作台本体，不做具体料理**（料理下一批 T2）：

1. 新增独立功能方块 **376 美食工作台**：和普通工作台完全分开，两块功能互不通用
2. `Recipe` 增加 `bench?: 'food'` 字段；**全部美食配方只能放在美食工作台上做**；普通工作台 / 2×2 背包格子**做不了任何美食配方**；反过来美食工作台也**不能做任何道具类配方**
3. 美食工作台**仅在自由岛屿生效**（`scene === 'island' | 'visit'`）：在极限挑战（`arena`）、CS 大赛（`cs`）、灵魂虚空（`void`）、大厅（`hall`）里既不能放置、按 M 也开不了面板（给 HUD 提示）

## 已拍板的决策（照做，不要自行发挥）

### 新方块 376 美食工作台

| 项 | 决策 |
| --- | --- |
| 新文件 | **新建** `src/world/blocks.cooking.ts`，顶部写「模块名 + 一句话职责」注释 |
| 导出 | `export const FOOD_TABLE = 376`、`export const COOKING_BLOCKS: Record<number, BlockDef>` |
| 方块属性 | `solid: true, seeThrough: false, hardness: 1.2`，贴图 `food_table_top` / `food_table_side`（参考 `CRAFTING_TABLE = 14` 在 `blocks.data.ts:57,521` 的写法） |
| 合成配方 | `木板×4 + 铁粒×2` → 美食工作台×1（普通工作台就能做，放 `RECIPES` 末尾；这是**道具类**配方，**不加** `bench`） |
| 与工作台的相处 | 不改 `CRAFTING_TABLE / STAR_TABLE / GOLD_CRAFT_TABLE` 的任何现有行为 |

### 配方分区机制

| 项 | 决策 |
| --- | --- |
| 字段 | `Recipe` 加 `bench?: 'food'`；含义 =「只能在美食工作台做」。**已有的 6 种季节/自制食物（春卷 359 / 丰收拼盘 363 / 圣诞甜饼 367 及其 quiet 展开条、309~314 六种自制吃食）全部补 `bench: 'food'`**——用户明确说了"所有美食配方只能美食工作台合成" |
| 匹配函数 | `matchCraft(counts, grid, bench)` 增加第三参 `bench: 'none' \| 'food'`（缺省 `'none'`，保持旧调用兼容）。规则：`r.bench === 'food'` 的配方**只**在 `bench === 'food'` 时参与匹配；没有 `bench` 的配方在 `bench === 'food'` 时**一律跳过**。`matchByEnough(counts, bench)` 同步加同一参数与同一过滤 |
| 拆解 | **拆解逻辑不加 bench 过滤**（拆成品回原料不算"制作美食"），`UNCRAFT` 与配方反查拆解在两种台都能用 |
| Panel | `Panel` 类加 `benchMode: 'none' \| 'table' \| 'food'`（默认 `'none'`）；`open()` 设 `'none'`，`openTable()` 设 `'table'`，**新增** `openFoodTable()` 设 `'food'`；`craftGrid()` 在 `'table'` 和 `'food'` 下都返回 `inv.craftBig`（3×3）；`currentMatch()` 调 `matchCraft(counts, this.craftGrid(), this.benchMode)` |
| 面板标题 | `'food'` 模式下把面板标题/提示文案改成「美食工作台（只能做美食）」；两种模式标题不能一样。文案照抄现有 `buildContent()` 里的写法，**不要**新增 i18n 框架 |
| 交互入口 | `PlayerActions.ts:433` 的 else-if 链加一支：`id === FOOD_TABLE` → 先做场景校验，通过才 `this.d.panel.openFoodTable()`；不通过 `hud.showMessage('美食工作台只能在自由岛上用', 2)` |
| 场景校验 | `PlayerActionDeps` 加 `scene: () => SceneMode`（`SceneMode` 从 `core/Game` import type；`Game.ts` 装配行传 `() => this.scene`，≤3 行）。新增私有方法 `private benchAllowed(): boolean { const s = this.d.scene(); return s === 'island' || s === 'visit' }` |
| 放置限制 | `placeItem`（或等价的放方块入口）里对 `FOOD_TABLE` 也做同一校验：不允许放时给 HUD 提示且**不放** |

### 贴图与登记

| 项 | 决策 |
| --- | --- |
| 新贴图文件 | **新建** `src/render/CookingTextures.ts`，导出 `COOKING_TILE_NAMES: string[]`（本批只有 `'food_table_top'`、`'food_table_side'`）与 `COOKING_PAINTERS: Record<string, Painter>`；画法参考 `ShopTextures.ts` 里工作台/机器的画法，16px、木质台面 + 放着一口锅/餐盘，一眼能看出是做饭的台子 |
| `render/Textures.ts` | **只允许** 3 处：import、`TILE_NAMES` 末尾展开 `...COOKING_TILE_NAMES`、`Object.assign(PAINTERS, ...)` 加 `COOKING_PAINTERS`。**禁止**在 `Textures.ts` 写新 painter 本体 |
| `blocks.data.ts` | 只加 import + `export * from './blocks.cooking'` + BLOCKS 表末尾 `...COOKING_BLOCKS` + `ALL_ITEMS` 加 `FOOD_TABLE`，**禁止**加业务逻辑 |
| 手册分类 | 美食工作台本身是方块 → 手册自动归「建筑方块」，**不用**动 `manualCats.ts`（T2 才会动） |

## ID 分配

| ID | 内容 |
| --- | --- |
| 376 | 美食工作台（solid 方块，本批） |
| 377~392 | 预留给 T2 的 16 个食材/料理 |
| 393 | 预留给 T4 的绳索 |

> 375 = AK47 是当前最大 ID；376 起往上堆，禁止回头占用 165-210 / 224-229 空段。

## 允许改动的文件

- `src/world/blocks.cooking.ts`（**新增**）
- `src/world/blocks.data.ts`（仅 4 处登记，见上表）
- `src/world/Recipes.ts`（加 `bench` 字段 + 工作台配方 + 给既有美食配方补 `bench: 'food'`，**必须追加到数组末尾**，手册下标是存档键）
- `src/ui/Panel.ts`（`benchMode` + `openFoodTable()` + `currentMatch` 传参 + 标题文案）
- `src/core/PlayerActions.ts`（else-if 分支 + `benchAllowed` + `scene` dep + 放置限制，合计 ≤25 行）
- `src/core/Game.ts`（只允许 `scene: () => this.scene` 装配行 ≤3 行）
- `src/render/CookingTextures.ts`（**新增**）
- `src/render/Textures.ts`（只允许上表 3 处）

## 禁止

- 不改 `docs/`；不 git commit；不新增 npm 依赖；不改存档版本号
- 不做任何具体料理、食材、食用效果、售价（T2 的事）
- 不改 `Inventory.ts` / `RecipeBook.ts` / `Tutorials.ts` / `manualCats.ts`
- 不动 `CRAFTING_TABLE / STAR_TABLE / GOLD_CRAFT_TABLE` 的现有交互
- 不改任何已有配方的 `needs` 数量（只加 `bench` 字段）

## 现有代码约定（必须遵守）

1. 依赖铁律：`ui / interact / player → render / world → config`，`world` 不许 import `core`
2. 文件 ≤500 行；注释中文、代码英文；新文件顶部写模块职责注释块
3. 魔法数字进 `config.ts`（本批不需要新常量）
4. `blocks.*.ts` 之间不许 import 运行时值（循环依赖），ID 写字面量

## 关键入口（省得你找）

- `src/world/Recipes.ts`：`Recipe` 接口（48-59）、`matchCraft`（361-420）、`matchByEnough`（342-358）、季节美食配方展开（244-262）
- `src/ui/Panel.ts`：`bigMode`（33/59-77）、`craftGrid()`（242-244）、`currentMatch()`（264-272）、`open()`/`openTable()`（274-291）
- `src/core/PlayerActions.ts`：依赖接口 `PlayerActionDeps`（40-89）、工作台 else-if（430-441）、`placeItem`（在 `useBlock` 附近，自行定位）
- `src/world/blocks.data.ts`：BLOCKS 表末尾 spread（489-506）、`ALL_ITEMS`（767-845）
- `src/render/Textures.ts`：`TILE_NAMES`（33-124）、painter 合并行（447）
- `src/render/ShopTextures.ts`：机器/方块贴图画法参考（126-170）

## 验收标准

1. `npm run build` 通过（含 TypeScript 检查，无未使用变量告警）
2. 普通工作台按 M：面板标题是原来的 3×3 大合成台，放「10 稻粒 + 1 面粉」之类的材料**什么都合不出来**（面粉还没做，用已有食物代替，如 2 熟肉→火腿不存在，总之确认已有美食配方在普通台合不出）
3. 2×2 背包合成同样合不出美食配方
4. 美食工作台按 M：标题变成「美食工作台（只能做美食）」，3×3；放木板/铁粒**什么都合不出来**
5. 用 `木板×4 + 铁粒×2` 在普通工作台能做出美食工作台；摆到草地上能挖掉、能再放
6. 进极限挑战 / CS 大赛 / 灵魂虚空 / 大厅：放不下美食工作台（有 HUD 提示），背包里带着也开不了面板
7. 在好友岛（visit）能正常放置与使用

## 完成后

- 报告：改了哪些文件、各做了什么（250 字以内）
- 说明新增了哪些贴图 key、有没有踩到 `Textures.ts` 洋红占位告警
- **不要 git commit**
