# R4 — 跟随式平行光软阴影（画质线第 5 批，T4）

## 目标

开启阳光阴影：地形、树木、建筑、**活物 / 载具 / 掉落物**在白天投出软阴影，夜晚与低档位自动关闭。
**不需要子区块拆分**（已确认 `T4-pre` 是伪前置）。

## 已拍板的决策（照做，不要自行发挥）

| 项 | 决策 |
| --- | --- |
| 开关 | 按 R0 的质量档位：`renderer.shadowMap.enabled = quality.shadows`；类型 `PCFSoftShadowMap` |
| 太阳 | `sun.castShadow`（档位关时 false）；`scene.add(sun.target)`；正交相机覆盖玩家周围约 40~48 格，`near ≈ 10`、`far ≈ 160`；`mapSize` 取档位表（高档 2048 / 中档 1024） |
| 跟随 | `sun` 与 `sun.target` **按玩家整格坐标跟随**（每移动一格才更新，避免影子边缘抖动/闪烁）；太阳方向保持固定倾角 |
| 抗伪影 | `sun.shadow.bias ≈ -0.0005`、`sun.shadow.normalBias ≈ 0.03`；参数进 `config.ts` |
| 夜晚 | `setDaylight(k)` 里当 `k` 过低（例如 < 0.15）时关掉阴影投射省 GPU，白天再开 |
| 网格 | 区块 opaque 网格 `castShadow` / `receiveShadow` 都开；`glow` 网格只 `receiveShadow`；**水面 `receiveShadow = true` 但 `castShadow = false`**（否则湖面投出一块实心黑影） |
| 实体 | `src/entities/` 的 `Animal.ts` / `Zombie.ts` / `Tank.ts` / `ItemDrop.ts` 里身体部件网格开 `castShadow`，否则活物"飘"在地上 |
| 花草阴影 | `opaqueMat` 带 `alphaTest: 0.5` 且 R2 给它挂过风摆注入。**必须验证花草/树叶/梯子的阴影不是实心方片**；如果是，用 `customDepthMaterial`（同样带 `map` + `alphaTest` + 同一套风摆位移）解决，并把结论记进报告 |

## 允许改动的文件

- `src/config.ts` —— `SHADOW` 段（正交范围、`mapSize`、`bias`、`normalBias`、夜晚关闭阈值）
- `src/render/Renderer.ts` —— shadowMap 开关、`sun` 配置、跟随逻辑（`updateCamera` 里）、`setDaylight` 联动
- `src/render/ChunkMeshCache.ts` —— 三类网格的 `castShadow` / `receiveShadow`
- `src/entities/Animal.ts`、`src/entities/Zombie.ts`、`src/entities/Tank.ts`、`src/entities/ItemDrop.ts` —— 开投影
- 其他 —— **仅在确有必要时**，并说明理由

## 禁止

- 不改 `docs/`；不 git commit；不新增 npm 依赖；不动存档
- **不做子区块 16³ 拆分**（已确认是伪前置：正交阴影相机与区块包围盒无关，拆了反而让 Draw Call 从 ~81 涨到 180+）
- 不引入 CSM / SSAO（视距只有 4 区块，纯属浪费）
- 不往 `Game.ts` 加行

## 现有代码约定（必须遵守）

1. **依赖铁律**：`ui / interact / player → render / world → config`（`entities` 可以依赖 `render` 的 `scene`，照现有写法）
2. 文件 ≤500 行；**注释中文、代码英文**
3. 魔法数字全进 `config.ts`
4. 低档位（`LOW`，软渲染兜底）**必须能完全关掉阴影**并正常游玩

## 关键入口（省得你找）

- `src/render/Renderer.ts`：`sun`（`DirectionalLight`，位置 `(50, 100, 30)`，注释里写了"未加 target 到 scene"）、`setDaylight(k)`、`updateCamera(...)`、`render()`
- `src/render/ChunkMeshCache.ts`：`rebuildDirty()` 里 `new THREE.Mesh(...)` 的三处
- `src/render/Quality.ts`（R0 新增）：档位状态与自适应降档（降档时也要同步关掉阴影相关开关）
- `src/render/ChunkMesher.ts` 的 `opaqueMat` 风摆注入（R2 加的）：若要做 `customDepthMaterial`，位移函数必须与它完全一致

## 验收标准

1. `npm run build` 通过
2. 白天：树下、墙边、屋檐下、方块之间有明显软阴影；玩家与动物脚下有影子
3. **花草/树叶/梯子的阴影是镂空的**，不是实心方片；若确实做不到，在报告里写明尝试过什么、当前观感如何
4. 走动超过 100 格：阴影**不消失、不闪烁、不出现块状跳变**（跟随与纹素对齐生效）
5. 天黑了阴影自动关闭（可用 `setDaylight` 相关调试开关或等昼夜循环验证），画面无异常
6. 方块表面**无摩尔纹/条带**（`bias` / `normalBias` 合适）；湖面不投出实心黑影
7. 低档位下阴影整关，FPS 明显回升；中/高档位 FPS 与改动前对比有记录
8. 按 `H` 进出大厅后阴影照常

## 完成后

- 报告改了哪些文件、各做了什么（200 字以内）
- 手工冒烟步骤（照验收 1-8 逐条给操作）
- 记录 `renderer.info.render.calls` 与 FPS 的前后对比
- **不要 git commit**
