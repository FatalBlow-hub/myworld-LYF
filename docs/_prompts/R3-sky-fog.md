# R3 — 天空渐变球与地平线雾（画质线第 4 批，T5）

## 目标

把「纯色背景 + 线性雾」换成**反面渲染的天空渐变球（随昼夜三段变色）+ 与地平线色严格对齐的线性雾**，
并顺手把相机跟随做对（出生点最远 20000 格）。

## 已拍板的决策（照做，不要自行发挥）

| 项 | 决策 |
| --- | --- |
| 天空 | 反面渲染球体（半径约 150，`side: BackSide`、`depthWrite: false`、`fog: false`），轻量 `ShaderMaterial` |
| 颜色 | 三个 uniform：天顶色 / 地平线色 / 太阳方向。白天深天蓝→浅青蓝；黄昏黎明地平线泛暖橙；深夜深蓝黑（三组颜色进 `config.ts`） |
| 昼夜插值 | 复用现有 `Renderer.setDaylight(k)`（`k = 1` 白天、`0` 深夜），三段插值；黄昏权重用 `Math.sin(k * PI)` 之类的权重函数，不要写死阈值堆 if |
| 雾 | **保留线性 `THREE.Fog`，禁止改 `FogExp2`**（视距只有 4 区块 = 64 格，指数雾要么遮不住区块边界、要么把中近景糊灰）。`near` / `far` 与视距绑定：`near ≈ VIEW_DISTANCE * CHUNK.SIZE * 0.65`、`far ≈ VIEW_DISTANCE * CHUNK.SIZE * 1.1` |
| 铁律 1 | `scene.fog.color` **必须等于天空球的地平线色**，远处未加载区块的切面才会无缝融进地平线 |
| 铁律 2 | 天空球**每帧跟随相机水平坐标**（`Renderer.updateCamera()` 里同步），否则出生在 ±20000 格时玩家会站在球外面 |
| 兼容 | 现有 `scene.background` 变成 `Color` 的昼夜渐变逻辑可以删掉或留作兜底，但**不要两套天空同时可见**；`setDaylight` 里原来的 `hemi` / `sun` 强度插值保留 |

## 允许改动的文件

- `src/config.ts` —— `SKY` 段（三组颜色、球半径、雾 near/far 系数）
- `src/render/Renderer.ts`（现 51 行）—— 天空球对象、`setDaylight` 改写、`updateCamera` 里跟随、`render()` 里如需每帧更新
- `src/core/DayCycle.ts` —— **仅在确有必要时**（例如需要把太阳方向传给渲染层），并在报告里说明

## 禁止

- 不改 `docs/`；不 git commit；不新增 npm 依赖；不动存档
- 不改雾的类型（线性 Fog 就是最终方案）
- 不往 `Game.ts` 加行（474/500）
- 不顺便做阴影、Bloom（R4/R5）

## 现有代码约定（必须遵守）

1. **依赖铁律**：`ui / interact / player → render / world → config`
2. 文件 ≤500 行；**注释中文、代码英文**
3. 魔法数字（颜色、半径、雾系数）全进 `config.ts`

## 关键入口（省得你找）

- `src/render/Renderer.ts`：构造函数里的 `scene.background = this.daySky.clone()` 与 `scene.fog = new THREE.Fog(0x87ceeb, 40, 90)`；`setDaylight(k)`；`updateCamera(x, y, z, yaw, pitch, roll)`
- `src/core/DayCycle.ts`：调用 `renderer.setDaylight(...)`
- `src/config.ts`：`VIEW_DISTANCE = 4`、`CHUNK.SIZE = 16`、`CHUNK.HEIGHT = 64`
- `SPAWN.RANGE = 20000`（为什么要跟随相机）

## 验收标准

1. `npm run build` 通过
2. 白天 / 黄昏 / 黑夜三种时段天空都是**天顶到地平线的平滑渐变**，黄昏有暖色霞光，不再是单一纯色
3. 远景：站在海边朝外看，未加载区块的切面**被地平线雾完全遮住**，看不出边界
4. 远坐标出生（可临时把 `SPAWN.RANGE` 调小/直接传送到远处验证）天空依然正常包裹，不是一片黑/一片亮
5. 跑动、跳跃、上下看时天空球不穿帮（旋转/位移都不露出球外）
6. 按 `H` 进出大厅、切昼夜时颜色过渡不跳变；FPS 与改动前基本持平

## 完成后

- 报告改了哪些文件、各做了什么（200 字以内）
- 手工冒烟步骤（照验收 1-6 逐条给操作）
- **不要 git commit**
