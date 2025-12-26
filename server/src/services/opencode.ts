import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

const OPENCODE_BIN = '/home/fedora/.opencode/bin/opencode';
const PORT = 3003;
const HOST = '127.0.0.1';
const LOG_PATH = '/app/server/data/opencode.log';

let serverProcess: ChildProcess | null = null;

export function startOpenCodeServer() {
  if (serverProcess) return;

  console.log('Starting OpenCode server...');
  
  // Ensure data directory exists
  const dataDir = path.dirname(LOG_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Ensure we have a valid environment
  const env = { 
    ...process.env,
    HOME: '/home/fedora',
  };

  serverProcess = spawn(OPENCODE_BIN, ['serve', '--port', String(PORT), '--hostname', HOST], {
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Pipe stdout/stderr to log file
  const logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' });
  serverProcess.stdout?.pipe(logStream);
  serverProcess.stderr?.pipe(logStream);

  serverProcess.on('error', (err) => {
    console.error('Failed to start OpenCode server:', err);
  });

  serverProcess.on('exit', (code) => {
    console.log(`OpenCode server exited with code ${code}`);
    serverProcess = null;
    // Restart logic? For now, maybe just log.
    setTimeout(startOpenCodeServer, 5000);
  });

  console.log(`OpenCode server started on http://${HOST}:${PORT}`);
}

export function getOpenCodeUrl() {
  return `http://${HOST}:${PORT}`;
}
