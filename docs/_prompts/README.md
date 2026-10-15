# 交给 auggie 的提示词索引

> 📅 2026-10-15 | 状态: 🚧 持续追加 | 标签: #提示词 #auggie #索引
> **摘要**：按里程碑/批次切分的实现提示词清单；每条由 auggie（`gemini-4-argon`）执行、我复核冒烟后提交。

- [用法](#用法)
- [小岛生存与联机（M 系列）](#小岛生存与联机m-系列)
- [画质线（Q/R 系列）](#画质线qr-系列)

## 用法

- 命令模板（工作区 `e:/myworld`）：
  ```bash
  auggie -if docs/_prompts/<文件> -m gemini-4-argon --print -w e:/myworld --max-turns N --quiet
  ```
- 只读调研/审核轮次加 `-a`（禁止改文件）；写实现轮次不加
- 输出落 `_auggie/out/<同名>.md`（该目录已在 `.gitignore` 里）
- 每个提示词必须写清：目标与验收标准、**允许改动的文件范围**、禁止项、现有代码约定、完成后报告格式；
  auggie **一律不许 git commit**（提交由我按批复核后做）

## 小岛生存与联机（M 系列）

- `M0-net.md` — 联机 WebSocket 骨架（连接注册、心跳、在线名单）
- `M1a-hunger.md` — 饥饿系统（7 格鸡腿、`O` 键开关、归零扣血）
- `M2a-crops.md` — 南瓜/西瓜作物与 1:3 转化（含苗期、`L` 播种）
- `M2b-islands.md` — 三种专属岛与水果（苹果/桃子/橙子 + 速度加成）
- `M3a-hall.md` — 大厅场景（`H` 键进出、平台/桌子/栅栏）
- `M3b-queue.md` — 大厅排队与随机匹配
- `M4-visit.md` — 好友访岛（申请、双重验证、挖掘权限、临时副本）

## 画质线（Q/R 系列）

先审核、后实现；方案与结论见 `docs/画质优化待办.md`。

- `Q1-graphics-review.md` — 只读审核画质方案（产出 5 处事实偏差 + 修订后任务清单）
- `R0-quality-base.md` — 渲染底座：三档质量档位（纯自动）+ 共享时钟 `clock` + 顶点通道 `color` / `aEffect`
- `R1-ao.md` — 逐顶点 AO + 面方向明暗（顺带修「星空床/星空地毯夜里不发光」）
- `R2-water-plants.md` — 水面波浪波光 + 植物随机化风摆（T1 + T3 同批）
- `R3-sky-fog.md` — 天空渐变球 + 地平线雾对齐（保留线性 `Fog`）
- `R4-shadows.md` — 跟随式平行光软阴影（含实体投影、自定义深度材质，**无需子区块拆分**）
- `R5-bloom.md` — HIGH 档轻量 Bloom（`samples: 4` 保抗锯齿）
