# R2 — 水面波浪与波光 + 植物随机化与风摆（画质线第 3 批，T1 + T3）

## 目标

① 液面（水 / 五种泽液 / 喷泉水）起伏并起波光，**玻璃与冰块绝对不许变形**；
② 19 种 `shape: 'cross'` 花草庄稼随机错落、随风轻摆，**根茎钉死在土里/水里**。
两项同批做，因为它们都改 `ChunkMeshCache` 的材质构造与 `clear()`，分两批会反复改同一处。

## 已拍板的决策（照做，不要自行发挥）

### T1 液面

| 项 | 决策 |
| --- | --- |
| 材质 | 保留 `MeshLambertMaterial` + `onBeforeCompile` 注入（**不要**换 `ShaderMaterial`、**不要**换 `MeshStandardMaterial`），新建 `src/render/WaterMaterial.ts` 封装 `createWaterMaterial(texture, clock)` |
| 液面判定 | **用逐顶点 `aEffect` 权重**（R0 已建通道）。**禁用** `fract(position.y)` 之类的坐标巧合判别 —— 五种 `SWAMP_*` 泽液顶面在整数高度，会被误判成玻璃而永远静止 |
| 打标位置 | `meshChunk` 主循环里，方块属于液体族（`WATER` + `SWAMP_LIGHT/MID/PHANTOM/DEEP/DROWN`）时，只给它**朝上的暴露面**（`face.n[1] === 1` 且上方不是同族液体）的 4 个顶点写 `effect = 1`；喷泉水面走 `emitPlainBox(water, ...)` 单独传标记 |
| 顶点位移 | 按世界坐标 `xz` + `clock.value` 叠 2 个正弦波，振幅合计约 0.03 格；只对 `aEffect > 0` 生效 |
| 片段 | 同上函数解析求导得波面法线，叠加两层滚动 UV 的亮斑 + Blinn-Phong 高光（`pow(max(dot(N,H),0),48)`）+ 轻微菲涅尔；乘 `aEffect` 掩码，玻璃/冰走原样 |
| 参数 | 频率、振幅、高光强度全进 `config.ts`（新增 `WATER_FX` 段） |
| 不动的东西 | 保留 `transparent: true` + `depthWrite: false`，不动透明排序；`WATER_TOP_DIP` 的既有下沉逻辑保留 |
| 程序缓存 | `mat.customProgramCacheKey = () => 'voxel-water-v1'` **必须写**（否则可能与 T3 注入的普通材质串用同一 program） |

### T3 植物

| 项 | 决策 |
| --- | --- |
| 随机化 | `emitCross` 用世界坐标 `(wx, wz)` 的**确定性哈希**（`Math.imul` 混算），给每株一个固定随机角 + 格子内微移（**不许越出格子 AABB**，否则射线拾取与高亮框对不上）；随机高度 `0.82 ~ 1.0` **只给** `TALL_GRASS` / `DANDELION` / `POPPY` / `SEAWEED` 四种野生植物 |
| 农作物 | `RICE_*` / `CARROT_*` / `PUMPKIN_STAGE*` / `MELON_STAGE*` / `BAMBOO_SHOOT_PLANT` **一律原高度**（玩家靠高度判断熟没熟）；但**风摆照常**（越矮摆得越轻，天然合理） |
| 风摆权重 | `emitCross` 里**底边 2 个顶点写 `effect = 0`、顶边 2 个顶点写 `effect = 1`**（背面那份 `pushQuad` 的 effect 数组要跟着反序）。禁用「靠法线/UV 猜顶点位置」的写法 |
| 风摆注入 | 给 `opaqueMat` 挂 `onBeforeCompile`，顶点着色器按 `clock.value` + 世界坐标相位摆动，`transformed.xz += sin(...) * 幅度 * aEffect`；**玻璃/地形/实心方块 `effect` 恒 0，绝不参与位移** |
| 参数 | 摆幅（约 0.05~0.06 格）、频率进 `config.ts`（`WIND_FX` 段） |
| 程序缓存 | `opaqueMat.customProgramCacheKey = () => 'voxel-opaque-sway-v1'`（与水分开） |
| 贴图 | **一行都不改**。不要做「多层花瓣」（现有贴图是含根茎的整株侧视图，叠层会像素穿插打架） |

### 两项共同

| 项 | 决策 |
| --- | --- |
| 时钟 | 用 `ChunkMeshCache` 持有的 `clock`（R0 已建）；`clear()` 重建材质后仍绑同一个 clock 与同一套 uniform 对象 |
| 阴影 | 本批**不做**阴影；风摆后的阴影一致性留给 R4，在报告里记一句即可 |

## 允许改动的文件

- `src/config.ts` —— `WATER_FX` / `WIND_FX` 常量段、野草随机高度名单（若需要）
- `src/render/WaterMaterial.ts`（**新增**）
- `src/render/ChunkMesher.ts` —— 液面打标、`emitCross` 随机化与 effect 权重、`emitPlainBox` 传标记
- `src/render/ChunkMeshCache.ts` —— 用 `createWaterMaterial` 建 `waterMat`、给 `opaqueMat` 挂风摆注入、`clear()` 同步改
- `src/ui/*` / 其他 —— **仅在确有必要时**，并说明理由

## 禁止

- 不改 `docs/`；不 git commit；不新增 npm 依赖；不动存档
- 不改任何贴图文件
- 不做阴影、Bloom、天空球（R3/R4/R5）
- 不往 `Game.ts` 加行；不把动画状态塞进 `ui`

## 现有代码约定（必须遵守）

1. **依赖铁律**：`ui / interact / player → render / world → config`
2. 文件 ≤500 行；**注释中文、代码英文**；`WaterMaterial.ts` 顶部写「模块名 + 一句话职责」
3. 魔法数字进 `config.ts`
4. 注入着色器时**必须**同时设 `customProgramCacheKey`

## 关键入口（省得你找）

- `src/render/ChunkMeshCache.ts`：构造里建 `waterMat` / `opaqueMat`，`clear()` 里 `dispose()` 后重建（必须继续绑同一个 clock）
- `src/render/ChunkMesher.ts`：`meshChunk()` 主循环（水的 `WATER_TOP_DIP` 下沉就在这儿）、`emitCross()`、`emitPlainBox()`
- `src/world/blocks.data.ts`：`WATER`（404 行附近）、`SWAMP_*`、19 个 `shape: 'cross'` 方块的清单
- 三个顶点通道：`pos` / `normal` / `uv` / `color` / `aEffect`（R0 建的）

## 验收标准

1. `npm run build` 通过
2. 海面/泽液/喷泉水**动起来**，有波光；**玻璃窗与冰块完全静止、与原样一致**
3. 花草庄稼随风轻摆：**根部不动、顶部摆**；矮苗摆动幅度明显小于成株
4. 野生花草每株角度/高度不同但**位置固定**（走开再回来长得一样），射线挖掘高亮框与植物**对齐**
5. 背包 2×2 与工作台照常工作；挖/放方块后新网格的动画照常生效
6. 按 `H` 进出大厅后动画依然生效（验证 `clear()` 后材质与 clock/uniform 没丢）
7. FPS 与改动前基本持平；控制台无 three 的 program 相关 warning

## 完成后

- 报告改了哪些文件、各做了什么（200 字以内）
- 手工冒烟步骤（照验收 1-7 逐条给操作）
- **不要 git commit**
