-- 末日 100 天 后端数据模型
-- 在 CF 后台创建 D1 之后，跑：
--   npm run db:apply:local   # 本地 wrangler dev 用的副本
--   npm run db:apply:remote  # 生产 D1

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL COLLATE NOCASE,
  pin_salt TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS slots (
  user_id TEXT NOT NULL,
  slot_id INTEGER NOT NULL CHECK (slot_id BETWEEN 1 AND 5),
  state_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, slot_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
