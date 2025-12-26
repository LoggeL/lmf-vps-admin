import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import cors from 'cors';
import path from 'path';

import authRoutes from './routes/auth';
import appsRoutes from './routes/apps';
import dnsRoutes from './routes/dns';
import sessionsRoutes from './routes/sessions';
import opencodeRoutes from './routes/opencode';
import systemRoutes from './routes/system';
import webhooksRoutes from './routes/webhooks';
import settingsRoutes from './routes/settings';

import { startOpenCodeServer } from './services/opencode';
import { streamContainerLogs, getContainerLogs } from './services/docker';
import { getApp } from './db';

// Start OpenCode Server
startOpenCodeServer();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// Session configuration
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  console.warn('WARNING: SESSION_SECRET not set. Using insecure default. Do not use in production!');
}

const sessionMiddleware = session({
  secret: sessionSecret || 'lmf-vps-admin-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS directly
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
});

app.use(cors({ origin: true, credentials: true }));
app.use(sessionMiddleware);

// OpenCode proxy MUST be before express.json() to properly forward request bodies
app.use('/api/opencode', opencodeRoutes);

app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/apps', appsRoutes);
app.use('/api/dns', dnsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/settings', settingsRoutes);

// Serve static files in production
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// SPA fallback
app.get('/{*splat}', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(publicPath, 'index.html'));
  }
});

// Socket.IO authentication
io.use((socket, next) => {
  sessionMiddleware(socket.request as any, {} as any, next as any);
});

io.on('connection', (socket) => {
  const session = (socket.request as any).session;
  
  if (!session?.authenticated) {
    socket.disconnect();
    return;
  }

  console.log('WebSocket connected:', socket.id);

  // Stream container logs
  socket.on('logs:subscribe', async (appId: string) => {
    const app = getApp(appId) as any;
    if (!app) return;

    socket.join(`logs:${appId}`);

    try {
      const logs = await getContainerLogs(app.container_name, 100);
      socket.emit('logs:data', logs);
    } catch (err) {
      socket.emit('logs:error', 'Failed to get logs');
    }
  });

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3002;

httpServer.listen(PORT, () => {
  console.log(`LMF VPS Admin running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  httpServer.close();
  process.exit(0);
});
