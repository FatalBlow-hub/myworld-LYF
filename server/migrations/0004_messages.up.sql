-- 0004 大厅留言板 + 信箱：评论公开、私信只给收件人看
CREATE TABLE IF NOT EXISTS board_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,            -- 已在前端/后端截断并压掉换行（最多 80 字）
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_board_posts_created ON board_posts(created_at DESC);

CREATE TABLE IF NOT EXISTS mails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id INTEGER NOT NULL REFERENCES users(id),
  to_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mails_to ON mails(to_id, created_at DESC);
