-- 0005 玩家偏好设置（自定义按键等）：一账号一行，settings 是不透明的 JSON 大字段
CREATE TABLE IF NOT EXISTS user_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  settings TEXT NOT NULL DEFAULT '{}',  -- JSON：{ keymap: {mine:["KeyF"]}, ... }，以后加新偏好不用改表
  updated_at INTEGER NOT NULL
);
