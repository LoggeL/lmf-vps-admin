import Database from 'better-sqlite3';

const dbPath = '/app/server/data/opencode.db';
const db = new Database(dbPath);

const token = 'hppnOSPg3WlbuqQEBGk78AMKSBk5wFKrRMVHCk30';
const zoneId = 'ddae24a1e049611d4a7cbc52ca6e6242';

const insertStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

console.log('Configuring Cloudflare...');
insertStmt.run('cloudflare_token', token);
insertStmt.run('cloudflare_zone_id', zoneId);

console.log('Cloudflare DNS configuration updated successfully.');
