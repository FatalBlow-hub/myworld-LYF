# M2a — 南瓜/西瓜作物与转化（小岛生存 A1 A6 A7 A8）

## 目标

加入**南瓜**与**西瓜**两种作物：自然生成 → 按 `L` 播种 → 4 阶段生长 → 结果 → 按 1:3 无限转化（果→片→籽）→ 片可吃。胡萝卜沿用现有种植机制补进同一套流程。

## 已拍板的决策（照做，不要自行发挥）

| 项 | 决策 |
| --- | --- |
| 自然生成 | 草方块上按概率生成植株：胡萝卜 1%、南瓜 0.5%、西瓜 0.5%（用 `TerrainGen` 现成的 `hash()` 概率手法） |
| 播种 | `L` 键：手里拿南瓜籽/西瓜籽对着草地或泥土种下；胡萝卜沿用现有 `plantCarrot` |
| 生长阶段 | 4 阶段：种子刚种下（小苗）→ 幼苗 → 带叶大苗 → 结果，**每 60 秒长一级**；生长要自动推进（不用再按键） |
| 打掉苗期 | **什么都不掉**（防止刷种子）；只有结果的南瓜/西瓜打掉才掉果实 |
| 南瓜/西瓜本体 | 实心方块；**本体不能直接吃**，只能切成片 |
| 转化 | 1 南瓜 → 3 南瓜片；1 南瓜片 → 3 南瓜籽；西瓜同规则。在**背包 2×2 与工作台都能用**（合成表 + 拆解表，复用现有 `RECIPES` / `UNCRAFT` 机制，N 个换 3N 个按比例） |
| 食用 | 南瓜片 +2 饥饿 +1 血；西瓜片 +1 饥饿 +1 血（写进 `config.ts` 的 `EAT_HP` 双值表） |
| 贴图 | 16×16 Canvas 程序化像素风，与现有贴图一个路子；新开 `src/render/IslandTextures.ts`，不要往 `Textures.ts` 里堆 |

## 允许改动的文件

- `src/world/blocks.data.ts` —— 加新方块 ID 与属性（南瓜/西瓜/南瓜片/西瓜片/南瓜籽/西瓜籽/各 3 个苗期方块）
- `src/world/Recipes.ts` —— 加 4 条转化（合成 + 拆解）
- `src/world/TerrainGen.ts` —— 草方块概率生成植株
- `src/core/PlayerActions.ts` —— `placeItem()` 加南瓜籽/西瓜籽播种分支；挖到结果方块走现有掉落
- `src/world/WorldCycles.ts`（或现有作物生长的位置）—— 苗期 60 秒长一级
- `src/config.ts` —— `EAT_HP` 加两条；如需新常量（生长间隔）进 `HUNGER` 同级的常量段
- `src/render/IslandTextures.ts`（新增）—— 新贴图 painter
- `src/render/Textures.ts` —— 只加 `import` + `Object.assign` + `TILE_NAMES` 登记（照 `BagTextures.ts` 的做法）
- `src/ui/Hud.ts` / 其他文件 —— **仅在确有必要时**，并在报告里说明理由

## 禁止

- 不改 `docs/` 下任何文件（包括 README、变更历史、架构评审、小岛生存文档）
- 不动 `server/data.db`、真实存档、localStorage
- 不新增 npm 依赖
- 不改 `player/Hunger.ts` 已定下的行为（O 键开关、7 格、60 秒消耗）
- 不改存档格式版本号；如果必须给存档加字段（本阶段应该不需要），走 `migrateSave()` 可选字段 + 默认值

## 现有代码约定（必须遵守）

1. **依赖铁律**：`ui / interact / player → render / world → config`；`world` 层不许反向依赖 `player/ui/core/render`
2. **伤害只走** `player/damage.ts` 的 `hurtPlayer()`
3. **新方块命名**：ID 常量接在 `blocks.data.ts` 现有 ID 段末尾（当前最大 ID 223，黄金系列之后）；中文名简洁（南瓜/西瓜/南瓜片/西瓜片/南瓜籽/西瓜籽/南瓜苗…）
4. **魔法数字进 config.ts**（60 秒、3 倍、概率 0.01/0.005 都不要裸写）
5. **文件 ≤500 行**；注释中文、代码英文；新模块顶部写"模块名 + 一句话职责"
6. **贴图文件组织照 `render/BagTextures.ts`**：导出 `Record<string, Painter>`，在 `Textures.ts` 里 `Object.assign(PAINTERS, ...)` + `TILE_NAMES` 里登记名字（图集缺名字会导致世界渲染坏掉，参考竹子那次教训）

## 关键入口（省得你找）

- 现有种植：`src/interact/BlockPicker.ts` 的 `plantSeed()`（水稻）/ `plantCarrot()`（胡萝卜）
- 现有作物生长表：`blocks.data.ts` 的 `CROP_NEXT`；世界周期：`src/world/WorldCycles.ts` 的 `update(dt, world)`
- 草方块/植株生成：`src/world/TerrainGen.ts`（找 `hash(...) < ORE.xxx_CHANCE` 的写法照抄）
- 放置分发：`src/core/PlayerActions.ts` 的 `placeItem()`
- 合成表：`src/world/Recipes.ts` 的 `RECIPES` / `UNCRAFT`
- 食物表：`src/config.ts` 的 `EAT_HP: Record<number, FoodEffect>`
- 贴图合并范式：`src/render/Textures.ts` 里 `Object.assign(PAINTERS, ..., BAG_PAINTERS, BAMBOO_PAINTERS)` 与 `TILE_NAMES` 的 `'bamboo', 'bamboo_shoot'` 两行

## 验收标准

1. `npm run build` 通过（tsc 零报错）
2. 新世界草方块上能长出胡萝卜/南瓜/西瓜植株（概率分别约 1% / 0.5% / 0.5%，肉眼扫一片草地能看到几种）
3. 拿南瓜籽/西瓜籽对草地按 `L` 能种下；60 秒一级，4 阶段后结果
4. 打掉苗期不掉东西；打掉结果的南瓜/西瓜掉果实
5. 背包 2×2 里 1 南瓜 → 3 片、1 片 → 3 籽；西瓜同；工作台同样可行
6. 吃南瓜片：+2 饥饿 +1 血；吃西瓜片：+1 饥饿 +1 血（提示语带饥饿数值）
7. 新方块在世界里贴图正常（不是洋红占位），`console` 无 `[贴图] 缺少 painter` 警告

## 完成后

- 报告改了哪些文件、各做了什么（200 字以内）
- 手工冒烟步骤（照验收 1-7 逐条给操作）
- **不要 git commit**（提交由我来做）
