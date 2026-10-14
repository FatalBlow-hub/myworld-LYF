# M1a — 饥饿系统（方块世界 / 小岛生存 A2 A3 A4 A5）

## 目标

给游戏加一套**可开关的饥饿系统**：`O` 键开关、7 格鸡腿条、每 60 秒掉 1 格、归零后每 2 秒扣 1 血、吃东西回饥饿。
食物效果表同时扩展成「饥饿变化 + 血量变化」双值（为 A8 南瓜片/西瓜片、A11 三种水果预留）。

## 已拍板的决策（不要改，照做）

| 项 | 决策 |
| --- | --- |
| 开关 | `O` 键切换；**每档独立**，随存档保存；关闭时**暂停消耗、保留当前值**（不回满） |
| 容量 | 7 格 |
| 消耗 | 开启后每 **60 秒** -1 格 |
| 饿到 0 | 每 **2 秒** 扣 1 点生命值（走统一伤害入口） |
| 死亡重生 | 饥饿**回满 7 格** |
| 食物表 | 由 `EAT_HP: Record<number, number>` 扩成 `{ hunger, hp }` 双值表 |
| 速度加成 | 复用 `body.speedBoostT` 计时；倍率做成常量（橙子 3 秒 ×1.25 在 A11 阶段接，本期只留字段与函数） |

## 允许改动的文件

- `src/config.ts` —— 加 `HUNGER` 常量段（格数、消耗间隔、饿到 0 的扣血间隔与伤害）、`KEYS` 加 `toggleHunger: ['KeyO']`、食物表改造
- **新增** `src/player/Hunger.ts` —— 饥饿模块（7 格、计时、开关、归零判定）
- `src/player/Health.ts` —— 重生时把饥饿复位（或提供 `onRespawn` 钩子，由 Game 调）
- `src/ui/Hud.ts` —— 血条下方加 7 个鸡腿图标
- `src/core/Survival.ts` —— `eatKey()` 接饥饿恢复；新增处理 `O` 键
- `src/core/Game.ts` —— 装配 `Hunger`、每帧 update、存档读写
- `src/core/Save.ts` —— `SaveData` 加 `hunger?: number` 与 `hungerOn?: boolean`

## 禁止

- 不改 `docs/` 下任何文档
- 不动 `server/data.db`、不动真实存档、不写 localStorage 测试之外的东西
- 不新增 npm 依赖
- 不动 `src/render/`、`src/world/` 的现有结构（本期不加方块）
- 不改 `ui/PanelStack.ts` 的设计（面板开合仍由它管）

## 现有代码约定（必须遵守，违反会被打回）

1. **依赖铁律**：`ui / interact / player → render / world → config`；`player` 层**不依赖** `ui` 与 `core`。提示语与 HUD 更新在 `Game` 里做。
2. **伤害只走统一入口** `src/player/damage.ts` 的 `hurtPlayer(health, amount)`，返回 `{ hurt, died }`；提示与重生由调用方（`Game`）处理。
3. **存档有版本体系**：`Save.ts` 里 `SAVE_VERSION` / `isSupportedSave()` / `migrateSave()`。新增字段**必须**是可选字段（老档没有），并在 `migrateSave()` 里给默认值（老档读进来：饥饿 7 格满、开关关闭）。不要改 `SAVE_VERSION` 的值。
4. **魔法数字集中**在 `config.ts`，不要在业务里写 7、60、2 这类裸数字。
5. **文件 ≤500 行**；注释中文、代码英文；新增模块顶部写"模块名 + 一句话职责"的注释块。
6. **面板与按键**：`Game.tick` 里面板由 `panels.handleFrame(dt, controller)` 接管；`O` 键这种游戏内按键放在面板判定**之后**，用 `controller.take('toggleHunger')`。
7. 现有按键表在 `config.ts:212-235`（`KEYS`），`type Action = keyof typeof KEYS`。

## 关键现状（省得你找）

- `src/config.ts:82` —— `export const EAT_HP: Record<number, number>`（食物 → 血量变化），`Health.eat()` 用它
- `src/player/Health.ts:117` —— `eat(itemId): number | null`
- `src/core/Survival.ts` —— `eatKey(body)` 处理 `E` 键吃喝（含药水瓶分支）
- `src/core/Game.ts` —— `begin()` 里 new 各模块；`tick()` 里每帧 `survival.eatKey(body)`、`health.update(...)`
- `src/core/Save.ts` —— `SaveData` 接口；`buildSave()` / `applySave()`；`SAVE_VERSION` 体系
- `src/ui/Hud.ts` —— 血条（心形）渲染，照它的方式画鸡腿

## 验收标准

1. `npm run build` 通过（含 tsc 类型检查）
2. 按 `O`：弹提示"饥饿模式已开启 / 已关闭"，状态进存档，刷新后保持
3. 开启后每 60 秒掉 1 格；归零后每 2 秒 -1 血，血空走正常重生流程
4. 关闭时饥饿值冻结不变
5. 吃食物同时回饥饿与血（数值按新表）；吃不能吃的东西提示不变
6. 老存档（无 hunger 字段）读进来：7 格满、开关关闭，不报错
7. HUD 血条下方显示 7 个鸡腿，掉格有视觉变化

## 完成后

- 报告改了哪些文件、每个文件做了什么（200 字以内）
- 说明手工冒烟步骤（怎么在浏览器里验证上面 7 条）
- 不要 git commit（提交由我来做）
