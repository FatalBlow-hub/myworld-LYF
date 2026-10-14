# M2b — 三种专属岛屿与水果（小岛生存 A9 A10 A11）

## 目标

给每个存档分配一座**专属岛屿**（苹果岛 / 桃子岛 / 橙子岛，新建档时随机一种），岛上树叶挖掉有 1% 概率掉本岛专属水果，三种水果各有食用加成（含橙子的 3 秒 1.25 倍加速）。

## 已拍板的决策（照做）

| 项 | 决策 |
| --- | --- |
| 岛怎么定 | **一个账号一座固定岛**：新建档时随机一种，写进存档；读档保持不变。老档（没有该字段）读进来时随机补一种 |
| 岛屿差异 | 本期**只做「岛名 + 专属水果」**，不改地形群系（三种地形差异留到后面联机阶段做，避免本期范围爆炸） |
| 岛名提示 | 开局时 HUD 弹一次「你来到了苹果岛！」（peach/orange 同理） |
| 树叶掉水果 | **挖掉树叶时**判定 1% 掉本岛水果；不受工具影响；只在「自己的岛」生效 |
| 水果效果 | 苹果 +1 饥饿 +1.5 血；桃子 +2 饥饿 +0.5 血；橙子 +1 饥饿 +1 血 + **3 秒移动速度 ×1.25** |
| 血量可以小数 | `Health.hp` 允许小数（心形显示用 ceil，无需改显示逻辑） |
| 橙子加速 | `player/Hunger.ts` 的 `applySpeedBoost(body, seconds, mult)` 目前**忽略了倍率参数**，本期把它接上：给 `PlayerBody` 加速度倍率字段（默认 1），`Physics` 里用它替代固定倍率，并进存档（老档没有就是 1） |

## 允许改动的文件

- `src/world/blocks.data.ts` —— 加 `APPLE` / `PEACH` / `ORANGE` 三个物品 ID（接在现有 ID 段末尾）与属性
- `src/config.ts` —— `EAT_HP` 加三条（苹果/桃子/橙子）；岛类型常量段（`ISLAND_TYPES`：id → 中文名 → 水果 ID）
- `src/player/Hunger.ts` —— `applySpeedBoost` 真正使用 `mult` 参数
- `src/player/Physics.ts` —— `PlayerBody` 加速度倍率字段并在移动计算里使用
- `src/core/Save.ts` —— `SaveData` 加 `islandType?`；`buildSave` 写、`applySave` 读、`migrateSave` 给老档随机默认值；速度倍率进存档
- `src/core/Game.ts` —— 新档随机岛 + 提示；把「当前岛的水果」传给 `PlayerActions`
- `src/core/PlayerActions.ts` —— `updateMining()` 挖到树叶时按 1% 掉本岛水果（掉落走 `entities/drops.ts` 的统一入口）
- `src/ui/Hud.ts` —— 开局岛名提示（复用现有 `showMessage`，不要新做 UI）
- `src/render/IslandTextures.ts` —— 加苹果/桃子/橙子三张 16×16 贴图（并入现有导出）

## 禁止

- 不改 `docs/` 下任何文件
- 不动真实存档 / localStorage / `server/data.db`
- 不新增 npm 依赖
- 不改存档格式版本号（新字段一律可选 + `migrateSave` 默认值）
- 不做地形群系差异、不做树叶变色、不做联机相关内容（那些是后面的活）

## 现有代码约定（必须遵守）

1. **依赖铁律**：`ui / interact / player → render / world → config`；`world` 不许反向依赖上层；`config` 不许依赖任何层（所以 `EAT_HP` 里仍用物品 ID 字面量 + 注释标明名字，照现有写法）
2. **掉落只走** `entities/drops.ts` 的 `spawnDrop(sink, id, count, x, y, z)`
3. **贴图组织照 `render/BagTextures.ts` / `render/IslandTextures.ts`**：导出 `Record<string, Painter>`，在 `Textures.ts` 里 `Object.assign` + `TILE_NAMES` 登记
4. **魔法数字进 config**（1% 概率、3 秒、1.25 倍都不要裸写）
5. **文件 ≤500 行**；注释中文、代码英文
6. 现有作物转化倍率等常量在 `config.ts` 的 `CROP` 段（照它加 `ISLAND` 段）

## 验收标准

1. `npm run build` 通过（tsc 零报错）
2. 新建存档：HUD 提示「你来到了X岛！」；存档里有 `islandType`；刷新读档后岛不变
3. 老存档（无 `islandType`）读进来：随机补一种，不报错
4. 挖树叶约 1% 掉本岛水果（多挖几片能看到）
5. 吃苹果 +1 饥饿 +1.5 血；吃桃子 +2 饥饿 +0.5 血；吃橙子 +1 饥饿 +1 血并提示加速，3 秒内移动明显变快
6. 创造模式背包里能看到三种水果，贴图正常、无洋红占位、控制台无 `[贴图] 缺少 painter` 警告
7. 加速状态进存档（吃橙子后立刻保存刷新，剩余加速不丢）

## 完成后

- 报告改了哪些文件、各做了什么（200 字以内）
- 手工冒烟步骤（对应验收 1-7）
- **不要 git commit**（提交由我来做）
