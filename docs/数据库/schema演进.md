# Schema 演进 — 方块世界服务端

> 📅 2026-10-18 | 状态: 🚧 持续更新 | 标签: #数据库 #schema #迁移
> **摘要**：data.db 的表结构变更留痕，与 server/migrations/ 迁移脚本一一对应

## 约定

- 权威全量 schema：`server/schema.sql`（新建库直接依据）
- 增量迁移：`server/migrations/NNN-xxx.up.sql` + 同名 `.down.sql`（回滚），由 `server/migrate.mjs` 启动时幂等执行
- 改 schema 必须走迁移脚本，禁止手动改库；变更在此表留痕一行

## 变更记录

| 版本 | 日期 | 变更 | 迁移脚本 | 风险 | 关联里程碑 |
| --- | --- | --- | --- | --- | --- |
| 0001 | 2026-10-18 | 幼儿防沉迷：新增 `playtime_daily`（当天累计在线秒数 + 家长加时）、`addict_config`（每账号每日上限/开关）；`users` 加 `is_admin`（管理员标记，名单由 `ADMIN_NAMES` 环境变量同步） | `migrations/0001_addict.up.sql` | 低（只加表加列，带默认值，不碰既有数据） | 幼儿防沉迷 + 家长控制台 |
| 0000 | 2026-10-14 | 初始 schema：`users` / `sessions` / `saves`（账号系统上云时成型，原以内联 DDL 建表，本次整理补录） | —（已在线运行） | — | 账号系统上云 |

## 回滚方式

```bash
node server/migrate.mjs --down 0001   # 删两张防沉迷表；users.is_admin 保守保留（删列高风险，见 down 脚本注释）
```

注意：回滚要搭配回滚旧代码一起用，新代码读不到表会报错。
