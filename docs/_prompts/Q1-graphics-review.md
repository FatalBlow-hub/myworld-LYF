# Q1 — 画质优化方案审核（只读，禁止改任何文件）

你是本项目的资深图形工程师 + 技术评审。任务：审核 `docs/画质优化待办.md` 这份画质提升路线清单，
对照 `e:/myworld` 的**真实代码**逐条挑战它，指出不妥之处，并给出更好的实现方案。

**本轮是只读审核：禁止修改 / 新建 / 删除任何文件（包括 `docs/` 下所有 md 与源码），禁止任何 git 操作。**
你的产出只有一份报告（打印到 stdout 即可，落盘由我来做）。

## 一、项目背景（可直接采信）

- 浏览器方块沙盒（简化版 MC），Three.js + TypeScript + Vite；纹理全部是 Canvas 程序化生成的 16×16 像素画，无外部美术资产
- 代码约定：依赖方向 `ui/interact/player → render/world → config`，禁止循环依赖；魔法数字集中在 `src/config.ts`；
  业务文件 ≤500 行；**注释中文、代码英文**；不新增 npm 依赖；存档格式改动必须走 `migrateSave()`
- 玩家设备不确定，可能有无独显的机器
- 渲染层现状（我已核实，你可再确认）：
  - 区块网格 16×64×16 整根柱子，**没有做子区块拆分**（全仓搜不到 SubChunk / section 相关符号）
  - 三个材质（`opaqueMat` / `waterMat` / `glowMat`）在 `src/render/ChunkMeshCache.ts` 构造函数里创建，`clear()` 里重建
  - 用的是 `MeshLambertMaterial` + `alphaTest: 0.5`；水为 `transparent + depthWrite:false`
  - `renderer.shadowMap` 从未启用；`scene.fog = new THREE.Fog(0x87ceeb, 40, 90)`
  - 花草 / 水稻走 `src/render/ChunkMesher.ts` 的 `emitCross()`（两张 45° 交叉薄片、正反各画一遍）

## 二、需要你读的代码（按需扩展）

- `docs/画质优化待办.md`（被审对象）、`docs/架构/架构文档.md`、`docs/小岛生存-需求评估与开发文档.md`（并行开发线）
- `src/render/ChunkMesher.ts`、`src/render/ChunkMeshCache.ts`、`src/render/Renderer.ts`、`src/render/Textures.ts`
- `src/world/blocks.data.ts`（`shape: 'cross'` 的方块清单）、`src/config.ts`（画质相关常量现状）
- `src/core/Game.ts`（主循环，看 uTime / 每帧更新挂在哪儿合适）

## 三、审核要求

对文档里的 **T1 水面动画 / T2 AO / T3 花朵风摆 / T4 阴影 / T5 天空与雾 / 阶段三后处理 / T4-pre 子区块拆分**
逐项输出四段：

1. **判断**：保留 / 需修改 / 有更优替代 / 建议删掉（并说明理由）
2. **事实核对**：文档对该项的"现状描述"与真实代码是否一致？有错就直接指出（引用文件 + 符号名，**不要写行号**）
3. **更优做法**：具体到 API 名、材质类型选择、uniform 名、数据结构、参数取值
4. **风险 / 代价 / 可拆性**：性能代价、对现有功能的回归风险、能否拆成可独立验收的小任务（能拆就给出拆法）

## 四、必须明确回答的 8 个问题

1. **前置决策「风格定调」**：文档建议「精致像素风」。你同意吗？如果同意，具体到实现上意味着哪些约束（贴图是否要加分辨率/边缘处理、是否允许引入法线贴图、材质该不该换 `MeshStandardMaterial`）？
2. **前置决策「自动降级质量档位」**：推荐的检测方式与档位划分（档位对象放哪儿、谁读、怎么影响 `setPixelRatio` / 抗锯齿 / 视距 / 阴影 / 后处理）；是否该做成 `src/config.ts` 里的 `QUALITY` 档位表 + 一个统一的读取入口？有没有比 `WEBGL_debug_renderer_info` 更可靠的判断（如实测帧时间自适应）。
3. **T4 阴影是否必须先有子区块拆分**？有没有不需要拆分子区块、成本更低的阴影方案（例如 `DirectionalLight` + 较小范围的 shadow camera、只让太阳光对实体/玩家投影、CSM、或用 SSAO/烘焙假阴影替代）？如果有，请给出推荐顺序。
4. **T1 水面的实现选择**：`onBeforeCompile` 注入 vs 自己写 `ShaderMaterial` 继承光照 vs 换成 `MeshStandardMaterial`。用 `onBeforeCompile` 时必须处理 three 的 program cache（`customProgramCacheKey`）、以及共享材质被所有区块网格复用、`uTime` 由谁每帧更新、`dispose()`/`clear()` 重建材质时 uniform 会不会丢。请给出推荐写法与注意事项。
5. **T2 AO**：经典体素 AO（每顶点看三个邻居）在这个 `pushQuad` 结构里怎么落最干净？顶点色属性名、`GeoArrays` 要加哪些字段、`toGeometry` 要改什么？要不要顺带做 smooth lighting（面法线插值）？AO 与顶点色在 `MeshLambertMaterial` 下是否生效、与 `glowMat`（`MeshBasicMaterial`）是否冲突？
6. **T3 与并行线的冲突是否已失效**：文档写"T3 必须早于小岛 A7（南瓜/西瓜作物）"，但小岛 A7 已经完成并**已经在用 `emitCross`**。请核对当前 `shape: 'cross'` 的方块清单（含作物苗期），重新回答：现在改 `emitCross` 会波及哪些已有内容？风摆要不要排除苗期/水稻？改动是"只改 Mesher 不动贴图"还是需要配合新字段？
7. **阶段三后处理的必要性**：`Reflector` / `SSAOPass` / `Bloom` 在这个项目里哪些值得做、哪些纯属浪费？如果做，`EffectComposer` 会不会与现有 `transparent + depthWrite:false` 的水面排序打架？
8. **整体排期**：文档给的顺序是「性能优化（含子区块）→ 小岛 A+M0 → 画质 T1/T2/T3 → T4/T5 → 后处理」，而性能优化与联机 M0~M4 现在**都已落地**。请给出**修订后的实际可开工顺序**，并说明理由。

## 五、输出格式（中文 markdown 报告）

- 结论优先，别复述文档原文，只写你的判断与依据
- 依据一律引用 `文件 + 符号名`，**不要写行号**（`src/` 正在并行改动）
- 最后必须给一张「修订后的任务清单」表：`编号 | 任务 | 前置依赖 | 涉及文件 | 收益 | 风险 | 验收方式 | 建议拆成几个提示词`
- 如果结论是"文档整体没问题"，也要说清哪几项你确认过、依据是什么

## 六、禁止

- 不改动任何文件、不 git 提交、不安装依赖、不启动 dev server
- 不为了"给建议"而虚构不存在的 API 或代码；不确定就明说不确定
