import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';

const dbPath = '/app/server/data/opencode.db';
const db = new Database(dbPath);

const apps = [
  {
    name: 'skript',
    github_url: 'https://github.com/Kolpingtheater-Ramsen/Skript.git',
    domain: 'skript.logge.top',
    container_name: 'skript',
    stack_path: '/opt/stacks/skript',
    port: 5000
  },
  {
    name: 'coop-sudoku',
    github_url: 'https://github.com/LoggeL/coop-sudoku.git',
    domain: 'sudoku.logge.top',
    container_name: 'coop-sudoku',
    stack_path: '/opt/stacks/coop-sudoku',
    port: 3001
  }
];

const insertStmt = db.prepare(`
  INSERT INTO apps (id, name, github_url, domain, container_name, stack_path, port, created_at, updated_at)
  SELECT ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
  WHERE NOT EXISTS (SELECT 1 FROM apps WHERE name = ?)
`);

apps.forEach(app => {
  const id = uuid();
  console.log(`Importing ${app.name}...`);
  const result = insertStmt.run(id, app.name, app.github_url, app.domain, app.container_name, app.stack_path, app.port, app.name);
  if (result.changes > 0) {
    console.log(`Inserted ${app.name}`);
  } else {
    console.log(`Skipped ${app.name} (already exists)`);
  }
});

console.log('Done.');
