import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, 'opencode.db'));
db.pragma('journal_mode = WAL');

// Initialize schema
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

export function isSetupComplete(): boolean {
  return getSetting('admin_password_hash') !== null;
}

// Apps
export function getApps() {
  return db.prepare('SELECT * FROM apps ORDER BY created_at DESC').all();
}

export function getApp(id: string) {
  return db.prepare('SELECT * FROM apps WHERE id = ?').get(id);
}

export function createApp(app: {
  id: string;
  name: string;
  github_url: string;
  domain: string;
  container_name: string;
  stack_path: string;
  port: number;
  env_vars?: string;
  webhook_secret?: string;
}) {
  db.prepare(`
    INSERT INTO apps (id, name, github_url, domain, container_name, stack_path, port, env_vars, webhook_secret, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(app.id, app.name, app.github_url, app.domain, app.container_name, app.stack_path, app.port, app.env_vars || '', app.webhook_secret || '');
}

export function updateApp(id: string, updates: Partial<{ name: string; domain: string; port: number; env_vars: string }>) {
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  db.prepare(`UPDATE apps SET ${fields}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);
}

export function deleteApp(id: string) {
  db.prepare('DELETE FROM apps WHERE id = ?').run(id);
}

// Deployments
export function createDeployment(appId: string, status: string, commitHash?: string) {
  const result = db.prepare(`
    INSERT INTO deployments (app_id, status, commit_hash, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `).run(appId, status, commitHash || '');
  return result.lastInsertRowid;
}

export function updateDeployment(id: number | bigint, status: string, logs?: string) {
  db.prepare('UPDATE deployments SET status = ?, logs = ? WHERE id = ?').run(status, logs || '', id);
}

export function getDeployments(appId: string) {
  return db.prepare('SELECT * FROM deployments WHERE app_id = ? ORDER BY created_at DESC LIMIT 20').all(appId);
}

export function getSessions() {
  return db.prepare('SELECT * FROM sessions ORDER BY created_at DESC').all();
}

export function getSession(id: string) {
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
}

export function createSession(session: { id: string; name: string; working_dir?: string }) {
  db.prepare(`
    INSERT INTO sessions (id, name, working_dir, created_at, last_active)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run(session.id, session.name, session.working_dir || '/home/fedora');
}

export function deleteSession(id: string) {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

export function updateSessionStatus(id: string, status: string) {
  db.prepare('UPDATE sessions SET status = ?, last_active = datetime("now") WHERE id = ?').run(status, id);
}

export function addSessionMessage(sessionId: string, role: string, content: string) {
  db.prepare('INSERT INTO session_messages (session_id, role, content) VALUES (?, ?, ?)').run(sessionId, role, content);
}

// Auth Tokens
export function createAuthToken(token: string, days = 30): void {
  db.prepare("INSERT INTO auth_tokens (token, expires_at) VALUES (?, datetime('now', ?))")
    .run(token, `+${days} days`);
}

export function validateAuthToken(token: string): boolean {
  const row = db.prepare('SELECT 1 FROM auth_tokens WHERE token = ? AND expires_at > datetime("now")')
    .get(token);
  return !!row;
}

export function deleteAuthToken(token: string): void {
  db.prepare('DELETE FROM auth_tokens WHERE token = ?').run(token);
}

export default db;
