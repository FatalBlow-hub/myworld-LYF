-- 0003 游戏状态权威化（2026-10-18）：服务端权威岛币 + 家长强制项（禁创造 / 僵尸）+ 岛币审计
-- 风险等级：低（只新增两张表，不碰既有数据；岛币权威值首次同步时以存档里的值为起点）
CREATE TABLE IF NOT EXISTS game_state (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  coins INTEGER NOT NULL DEFAULT 0,           -- 权威岛币：控制台发放/扣除直接改，读档时覆盖客户端值
  ever_creative INTEGER NOT NULL DEFAULT 0,   -- 权威"曾开创造"：只增不减（客户端否认不掉），家长可清除
  creative_blocked INTEGER NOT NULL DEFAULT 0, -- 家长禁用创造：读档时强制 mode=survival
  zombie_forced INTEGER,                       -- 家长强制僵尸：NULL=不干预 / 0=关 / 1=开
  updated_at INTEGER NOT NULL
);

-- 岛币变化审计：客户端每 15 秒存一次档，这里只记"有变化"的那几次，控制台画曲线、异常暴涨留痕
CREATE TABLE IF NOT EXISTS coin_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  day TEXT NOT NULL,                 -- 服务器本地日期 'YYYY-MM-DD'
  reported INTEGER NOT NULL,         -- 客户端上报的岛币
  accepted INTEGER NOT NULL,         -- 服务端采信后的权威值
  delta INTEGER NOT NULL,            -- 本次变化量（accepted - reported 的差 = 被拦截的部分）
  reason TEXT NOT NULL,              -- init / save-sync / rejected-spike / admin-grant / admin-deduct
  created_at INTEGER NOT NULL
);
