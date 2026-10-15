# R1 — 体素顶点 AO + 面方向明暗（画质线第 2 批，T2）

## 目标

给完整方块面加**逐顶点环境光遮蔽（AO）+ 面方向明暗**，让墙角、台阶缝、树冠下立刻出现柔和明暗过渡；
顺带修掉「星空床 / 星空地毯夜里不发光」的既有 Bug。**本批不动任何贴图、不注入着色器。**

## 已拍板的决策（照做，不要自行发挥）

| 项 | 决策 |
| --- | --- |
| AO 采样 | 每个面的顶点沿法线偏移到相邻空气格后，看该格的**两个侧邻 + 对角邻**共 3 个格；遮挡判定复用现成的 `opaqueCube()`（花草/水/玻璃/台阶等不算硬遮挡，免得把地面染黑） |
| AO 公式 | `occ = (side1 && side2) ? 3 : (side1 + side2 + corner)`，`occ` 取 0~3 |
| AO 曲线 | `AO_CURVE = [1.0, 0.82, 0.65, 0.5]`（进 `config.ts`，不许裸写） |
| 面方向明暗 | 顶面 1.0 / ±z 侧面 0.86 / ±x 侧面 0.76 / 底面 0.6（进 `config.ts`，如 `FACE_SHADE`） |
| 写入位置 | 顶点色 `color`（R0 已建好通道）：`color = ao[顶点] * faceShade`，三个通道同值 |
| 三角剖分 | `pushQuad` 在 `ao[0] + ao[2] < ao[1] + ao[3]` 时**翻转对角线**（`1-2-3 / 0-1-3`），否则会出现体素 AO 经典的黑三角伪影 |
| 范围收敛 | **只给 `meshChunk` 主循环里的完整方块 6 个面**算逐顶点 AO；`emitBox`（异形方块）只乘面方向明暗、不算邻居 AO；`emitCross` / `emitPlainBox` 保持全白 1.0 |
| 顶点法线 | **禁止插值平滑**（会把方块变成圆滚滚的充气枕头），法线保持轴对齐 |
| 发光方块 | `glow` 几何体顶点色恒为 1.0（夜里满亮），不吃 AO |
| 手感 | 顶点色是乘在 diffuse 上的常量明暗，会整体压暗背光面 —— 这是 MC 风预期效果，不要用光照强度去补偿 |

## 允许改动的文件

- `src/config.ts` —— `AO_CURVE`、`FACE_SHADE`
- `src/render/ChunkMesher.ts` —— `pushQuad` 扩展可选参数（`ao` / `shade`，默认 `[1,1,1,1]` / `1`，带默认值可让 `emitCross`、`emitPlainBox` 不改调用处）、新增邻居采样函数、主循环把算好的值传进去
- `src/render/ChunkMeshCache.ts` —— 三个材质开 `vertexColors: true`
- `src/ui/*`、其他文件 —— **仅在确有必要时**，并在报告里说明理由

## 禁止

- 不改 `docs/`；不 git commit；不新增 npm 依赖；不动存档
- 不注入着色器、不加波浪/风摆/阴影/Bloom（R2 起）
- 不做顶点法线插值平滑
- 不动贴图（13 个 painter 文件一行都不许改）
- 不许把 AO 逻辑写进 `ui` 层，也不许往 `Game.ts` 加行

## 现有代码约定（必须遵守）

1. **依赖铁律**：`ui / interact / player → render / world → config`
2. 文件 ≤500 行（`ChunkMesher.ts` 现 205 行，别一次堆爆）；**注释中文、代码英文**
3. 魔法数字一律进 `config.ts`
4. `GeoArrays` 的 `color` 数组长度必须与 `pos` 严格对齐（每顶点 3 个），否则 `BufferGeometry` 会因属性长度不一致报错

## 关键入口（省得你找）

- `src/render/ChunkMesher.ts`：`FACES` / `pushQuad` / `toGeometry` / `opaqueCube()` / `meshChunk()` 主循环、`emitBox()`、`emitCross()`、`emitPlainBox()`
- `src/render/ChunkMeshCache.ts`：`opaqueMat` / `waterMat`（`MeshLambertMaterial`）、`glowMat`（`MeshBasicMaterial`）
- **顺手修的 Bug**：`meshChunk()` 里 `if (def.shape || def.doorPanel) { ... emitBox(solid, ...) }` 写死了 `solid`，
  导致 `glow: true` 的 `CARPET_STAR`（`shape: 'carpet'`）与 `BED_STAR`（`shape: 'bed'`）进了不发光材质 → 改成 `def.glow ? glow : solid`

## 验收标准

1. `npm run build` 通过（tsc 零报错）
2. 同视角对比：墙角 / 台阶缝 / 树干与地面交界 / 洞穴口有明显但柔和的明暗过渡，**没有黑色三角块状伪影**
3. 方块的 6 个面亮度方向正确（顶面最亮、底面最暗）
4. 花草、庄稼、树叶的透明区域**没有被染黑或出现方形暗块**
5. 夜里摆一个星空床 + 星空地毯：**正常发光**（修 Bug 生效）
6. 按 `H` 进出大厅后依然正常；FPS 与改动前基本持平
7. 创造模式按 `9` 开背包仍正常（222 格左右、无洋红占位、无缺 painter 警告）

## 完成后

- 报告改了哪些文件、各做了什么（200 字以内）
- 手工冒烟步骤（照验收 1-7 逐条给操作）
- **不要 git commit**
