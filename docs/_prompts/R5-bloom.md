# R5 — HIGH 档轻量 Bloom 泛光（画质线第 6 批，T6，可选收尾）

## 目标

给夜空里的**发光方块（星空系列 / 三种能灯）与发光怪物**加一层克制的光晕。
只在 `HIGH` 档开启，白天雪地与白羊毛不许过曝。

## 已拍板的决策（照做，不要自行发挥）

| 项 | 决策 |
| --- | --- |
| 用什么 | `EffectComposer` + `RenderPass` + `UnrealBloomPass` + `OutputPass`，全部来自已安装的 `three`（**不新增 npm 依赖**） |
| 砍掉什么 | **`Reflector`（多高度水体不适配）、`SSAOPass`（`overrideMaterial` 会毁掉 `alphaTest` 花草与半透明水面，且 R1 顶点 AO 已覆盖）一律不做** |
| 抗锯齿 | 创建 RenderTarget **必须带 `samples: 4`**（WebGL2 MSAA），否则接入后处理会立刻丢掉全局抗锯齿 |
| 参数 | `threshold ≈ 0.88`、`strength ≈ 0.35`、`radius ≈ 0.3`，进 `config.ts` |
| 只亮该亮的 | `glowMat` 的颜色调成略大于 1 的 HDR 值（如 `(1.35, 1.35, 1.45)`），让白天雪地/沙子/白羊毛不触发泛光 |
| 档位 | 仅 `HIGH` 档开启；`MEDIUM` / `LOW` 走原来的直渲路径（`renderer.render()`），自适应降档时也要能关掉 composer |
| 色彩空间 | 接了 composer 后必须保证最终输出走 sRGB（`OutputPass`），画面不许发灰 |
| 水面 | 水面高光触发轻微泛光是可以接受的（好看的波光），但 `threshold` 不得为了它调低 |

## 允许改动的文件

- `src/config.ts` —— `BLOOM` 段
- `src/render/Renderer.ts` —— composer 的创建/销毁、`render()` 分支（高档走 composer、其余直渲）、随档位切换
- `src/render/ChunkMeshCache.ts` —— 仅允许改 `glowMat` 的颜色（如果确实需要 HDR 值）
- 其他 —— **仅在确有必要时**，并说明理由

## 禁止

- 不改 `docs/`；不 git commit；不新增 npm 依赖；不动存档
- 不做 `Reflector` / `SSAO` / 其他任何额外后处理
- 不往 `Game.ts` 加行

## 现有代码约定（必须遵守）

1. **依赖铁律**：`ui / interact / player → render / world → config`
2. 文件 ≤500 行；**注释中文、代码英文**
3. 参数全进 `config.ts`

## 关键入口（省得你找）

- `src/render/Renderer.ts`：`render()`（现为 `this.renderer.render(this.scene, this.camera)`）、R0 加的档位逻辑
- `src/render/ChunkMeshCache.ts`：`glowMat`（`MeshBasicMaterial`）
- 发光方块清单：`blocks.data.ts` 里 `glow: true` 的（`STAR_WOOL` / `STAR_TABLE` / `STAR_DYE_TABLE` / `CARPET_STAR` / `BED_STAR` / `MANG_LAMP` / `STAR_LAMP` / `HYDROGEN_LAMP`）

## 验收标准

1. `npm run build` 通过
2. 夜晚摆星能灯 / 芒能灯 / 氢能灯 / 星空羊毛 / 星空工作台：有柔和光晕，星星系列方块边缘发光不糊成一团
3. **白天**看雪地、沙子、白羊毛：**不过曝、不发白**（阈值合适）
4. 方块边缘与改动前相比**没有明显锯齿劣化**（`samples: 4` 生效）
5. 整体色调不发灰（sRGB 正确）
6. 切到 MEDIUM / LOW 档（可临时改探测结果验证）后 composer 被旁路，画面回到直渲且 FPS 回升
7. 按 `H` 进出大厅、开关背包面板后画面正常

## 完成后

- 报告改了哪些文件、各做了什么（200 字以内）
- 手工冒烟步骤（照验收 1-7 逐条给操作）
- 记录高档位开关 Bloom 的 FPS 差
- **不要 git commit**
