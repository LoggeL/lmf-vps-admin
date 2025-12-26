-- Schema for LMF VPS Admin
-- Using CREATE TABLE IF NOT EXISTS to preserve data on restart

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS apps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  github_url TEXT,
  domain TEXT,
  container_name TEXT,
  stack_path TEXT,
  port INTEGER,
  env_vars TEXT,
  webhook_secret TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS deployments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id TEXT REFERENCES apps(id) ON DELETE CASCADE,
  status TEXT,
  commit_hash TEXT,
  logs TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, -- OpenCode Session ID (ses_...)
  name TEXT,
  working_dir TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active DATETIME
);

CREATE TABLE IF NOT EXISTS session_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  token TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME
);
