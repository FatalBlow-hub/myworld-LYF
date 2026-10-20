-- 方块世界服务端权威 schema（全量 DDL，新建库的直接依据）
-- 增量迁移看 migrations/，变更留痕看 docs/数据库/schema演进.md

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  pass TEXT NOT NULL,             -- 存 "盐:哈希" 的十六进制串，绝不存明文
  created_at INTEGER NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0, -- 0001：管理员标记（控制台用），名单由 ADMIN_NAMES 同步
  banned INTEGER NOT NULL DEFAULT 0    -- 0002：封停标记（家长停用账号；1 = 不许登录、在线的踢下线）
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires INTEGER NOT NULL        -- 过期时间戳（秒）
);

CREATE TABLE IF NOT EXISTS saves (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),   -- 一个账号一档 → user_id 即主键
  data TEXT NOT NULL,
  backup TEXT,                    -- 被覆盖前的上一份，后悔药
  updated_at INTEGER NOT NULL
);

-- 0001 幼儿防沉迷：当天累计在线秒数 + 家长加时（0 点换行重置）
CREATE TABLE IF NOT EXISTS playtime_daily (
  user_id INTEGER NOT NULL REFERENCES users(id),
  day TEXT NOT NULL,                        -- 服务器本地日期 'YYYY-MM-DD'
  seconds INTEGER NOT NULL DEFAULT 0,       -- 当天累计在线秒数（心跳累加）
  bonus_seconds INTEGER NOT NULL DEFAULT 0, -- 家长当天临时加时（秒）
  updated_at INTEGER NOT NULL,              -- 最近一次累计的时间戳（秒），兼作"上次心跳时间"
  PRIMARY KEY (user_id, day)                -- 一个账号一天一行；upsert 的 ON CONFLICT 靠它
);

-- 0001 幼儿防沉迷：每账号配置（缺省行 = 默认 1 小时 + 开启）
CREATE TABLE IF NOT EXISTS addict_config (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  daily_limit_sec INTEGER NOT NULL DEFAULT 3600, -- 每日上限（秒）
  enabled INTEGER NOT NULL DEFAULT 1,            -- 防沉迷开关（0=不限制）
  updated_at INTEGER NOT NULL
);

-- 0003 游戏状态权威化：权威岛币 + 家长强制项（禁创造 / 僵尸）；账号级一行
CREATE TABLE IF NOT EXISTS game_state (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  coins INTEGER NOT NULL DEFAULT 0,            -- 权威岛币（控制台发放/扣除直接改，读档覆盖客户端）
  ever_creative INTEGER NOT NULL DEFAULT 0,    -- 权威"曾开创造"，只增不减，家长可清除
  creative_blocked INTEGER NOT NULL DEFAULT 0, -- 家长禁用创造：读档强制 survival
  zombie_forced INTEGER,                        -- 家长强制僵尸：NULL=不干预 / 0=关 / 1=开
  updated_at INTEGER NOT NULL
);

-- 0003 岛币变化审计（只记有变化的存档同步；异常暴涨留痕）
CREATE TABLE IF NOT EXISTS coin_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  day TEXT NOT NULL,
  reported INTEGER NOT NULL,
  accepted INTEGER NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,              -- init / save-sync / rejected-spike / admin-grant / admin-deduct
  created_at INTEGER NOT NULL
);

-- 0004 大厅留言板：公开评论（谁都能看，登录才能发）
CREATE TABLE IF NOT EXISTS board_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_board_posts_created ON board_posts(created_at DESC);

-- 0004 信箱：玩家之间的私信（只有收件人能看到）
CREATE TABLE IF NOT EXISTS mails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id INTEGER NOT NULL REFERENCES users(id),
  to_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mails_to ON mails(to_id, created_at DESC);

-- 迁移记录表（migrate.mjs 维护，保证迁移幂等）
CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
