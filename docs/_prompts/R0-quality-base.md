# R0 — 渲染底座：质量档位 + 共享时钟 + 顶点属性通道（画质线第 1 批）

## 目标

在不改变**任何现有画面观感**的前提下，为后续画质任务（T2 AO / T1 水 / T3 风摆 / T5 天空 / T4 阴影 / T6 Bloom）铺好三条底座：
**① 三档质量档位（纯自动）② 全渲染层共享的动画时钟 ③ 顶点属性通道 `color` + `aEffect`**。

本批结束后：画面与改动前**逐像素一致**，`npm run build` 通过，控制台能看到当前档位。

## 已拍板的决策（照做，不要自行发挥）

| 项 | 决策 |
| --- | --- |
| 档位划分 | 三档 `high` / `medium` / `low`，参数表放 `src/config.ts`（`QUALITY_PRESETS`） |
| 档位判定 | **纯自动，不加设置项**：启动期探测显卡字符串定初档 + 运行期帧时间滑窗自适应降档（只降不升） |
| 参数表 | `pixelRatioMax` 2 / 1.5 / 1；`antialias` true / true / false；`viewDistance` 4 / 4 / 3；`shadows` true / true / false；`shadowMapSize` 2048 / 1024 / 0；`bloom` true / false / false；`ao`/`waterWave`/`windSway` 三档全 true |
| 启动探测规则 | 软渲染 `SwiftShader\|llvmpipe\|Software\|Microsoft Basic Render` → low；`Intel.*HD\|UHD Graphics\|Mali-\|Adreno \(TM\) [1-5]` → medium；其余 high。读不到字符串就 high |
| 降档阈值 | 最近 90 帧平均帧耗 > 35ms（< 28 FPS）→ 降一档；只降不升；只允许降一次/次 |
| 时钟 | `Renderer` 上 `readonly clock = { value: 0 }`，`render()` 里每帧 `clock.value = (performance.now() * 0.001) % 3600`（取模防 float32 精度抖动） |
| 时钟消费 | `ChunkMeshCache` 构造时注入该 clock，**`clear()` 重建材质后必须继续用同一个引用**（进出大厅会走 `clear()`） |
| 顶点通道 | `GeoArrays` 增 `color: number[]`（每顶点 3 个，本批全填 1）与 `effect: number[]`（每顶点 1 个，本批全填 0）；`toGeometry()` 无条件写入 `color` 与 `aEffect` 两个 attribute |
| 材质 | 三个材质都开 `vertexColors: true`（本批顶点色全 1，观感应无变化）；**本批不注入任何着色器** |
| `Game.ts` | **零新增行**：只允许改构造 `ChunkMeshCache` 那一行（传 clock）。当前 474 行，红线 500 |

## 允许改动的文件

- `src/config.ts` —— 新增 `QUALITY_PRESETS` / `QUALITY_TIER` 类型 / 降档阈值常量（放在文件末尾新的「渲染质量」区段，别打散既有区段）
- `src/render/Quality.ts`（**新增**）—— 只依赖 `three` + `config`：`detectQualityTier()`（脱离真实 renderer 也能探测：用临时 canvas 拿一次 `webgl2`/`webgl` 上下文读 `UNMASKED_RENDERER_WEBGL`，读完即丢）与帧时间滑窗自适应的小状态机
- `src/render/Renderer.ts`（现仅 51 行，空间充裕）—— 应用档位（`setPixelRatio` / `antialias` 在构造 `WebGLRenderer` 前定档）、暴露 `clock`、每帧推进 clock、帧时间自适应触发时重设 `setPixelRatio`
- `src/render/ChunkMeshCache.ts` —— 构造签名加 clock、持有它、`clear()` 后复用
- `src/core/Game.ts` —— **只改 `new ChunkMeshCache(...)` 那一行**
- `src/render/ChunkMesher.ts` —— 只加 `GeoArrays` 两个数组 + `pushQuad` 填充 + `toGeometry` 两个 attribute

## 禁止

- 不改 `docs/` 下任何文件；不 git commit；不新增 npm 依赖
- 不动存档格式、`server/data.db`、真实账号数据、`localStorage`
- 不注入 `onBeforeCompile`、不加 AO、不做波浪/风摆（那是 R1/R2 的事）
- 不把渲染状态塞进 `Game.ts`（行数红线）
- 不引入魔数：像素比、阈值、档位参数全进 `config.ts`

## 现有代码约定（必须遵守）

1. **依赖铁律**：`ui / interact / player → render / world → config`；`render`/`world` 不许反向依赖 `ui`/`core`
2. 文件 ≤500 行；**注释中文、代码英文**；新模块顶部写「模块名 + 一句话职责」
3. 魔法数字集中在 `src/config.ts`
4. 档位必须能安全降级：探测失败、上下文拿不到、`UNMASKED_RENDERER_WEBGL` 缺失都按 high 处理，不许抛异常

## 关键入口（省得你找）

- `src/render/Renderer.ts` 构造：`new THREE.WebGLRenderer({ antialias: true })`、`setPixelRatio(Math.min(devicePixelRatio, 2))`、`camera = new THREE.PerspectiveCamera(75, ..., 0.1, 200)`、`setDaylight(k)`
- `src/core/Game.ts` 第 ~87 行：`this.chunkMeshes = new ChunkMeshCache(this.renderer.scene, this.atlas);`
- `src/render/ChunkMesher.ts`：`GeoArrays` / `pushQuad` / `toGeometry`
- `src/render/ChunkMeshCache.ts`：构造函数建三个材质、`clear()` 销毁并重建三个材质
- 视距：`config.ts` 的 `VIEW_DISTANCE = 4`（本批**不要**真的改视距取值，只把值放进档位表备用）

## 验收标准

1. `npm run build` 通过（tsc 零报错）
2. 浏览器里画质与改动前**肉眼无差别**（顶点色全 1、无着色器注入）
3. 控制台有且仅有一条当前档位日志（如 `[画质] 档位 high`），刷新后仍在
4. 按 `H` 进出大厅（会走 `ChunkMeshCache.clear()`）画面正常、无报错
5. 若机器能触发降档（可临时把阈值改成 1ms 验证后改回），确认 `setPixelRatio` 生效且不崩

## 完成后

- 报告改了哪些文件、各做了什么（200 字以内）
- 手工冒烟步骤（照验收 1-5 逐条给操作）
- **不要 git commit**（提交由我来做）
