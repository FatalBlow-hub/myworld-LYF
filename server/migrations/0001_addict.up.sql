-- 0001 幼儿防沉迷（2026-10-18）：每日在线时长表 + 每账号防沉迷配置 + users.is_admin 管理员标记
-- 风险等级：低（只新增表与带默认值的列，不碰既有数据）
CREATE TABLE IF NOT EXISTS playtime_daily (
  user_id INTEGER NOT NULL REFERENCES users(id),
  day TEXT NOT NULL,                        -- 服务器本地日期 'YYYY-MM-DD'，0 点自然换行重置
  seconds INTEGER NOT NULL DEFAULT 0,       -- 当天累计在线秒数（服务端按心跳墙上时间累加）
  bonus_seconds INTEGER NOT NULL DEFAULT 0, -- 家长当天临时加时（秒），当天有效不累计
  updated_at INTEGER NOT NULL,              -- 最近一次累计的时间戳（秒），兼作"上次心跳时间"
  PRIMARY KEY (user_id, day)                -- 一个账号一天一行；upsert 的 ON CONFLICT 靠它
);
CREATE TABLE IF NOT EXISTS addict_config (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  daily_limit_sec INTEGER NOT NULL DEFAULT 3600, -- 每日上限（秒），默认 1 小时
  enabled INTEGER NOT NULL DEFAULT 1,            -- 防沉迷开关（0=不限制）
  updated_at INTEGER NOT NULL
);
-- users.is_admin：管理员标记（控制台 /admin.html 用）。开放注册默认 0；
-- 管理员名单由启动环境变量 ADMIN_NAMES（逗号分隔）同步，不硬编码
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
