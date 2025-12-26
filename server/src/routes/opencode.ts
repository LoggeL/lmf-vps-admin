import { createProxyMiddleware } from 'http-proxy-middleware';
import { Router } from 'express';
import { getOpenCodeUrl } from '../services/opencode';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Proxy middleware configuration
const openCodeProxy = createProxyMiddleware({
  target: getOpenCodeUrl(),
  changeOrigin: true,
  pathRewrite: {
    '^/api/opencode': '' // Remove /api/opencode prefix
  },
  ws: true, // Enable WebSocket proxying
  onProxyReq: (proxyReq, req: any, res) => {
    // Inject directory param if provided in query or headers?
    // The OpenCode API expects 'directory' query param.
    // The frontend should send it.
    
    // Security: Ensure we are authenticated (handled by requireAuth wrapper)
  },
  logLevel: 'debug'
});

// Apply auth and then proxy
router.use(requireAuth, openCodeProxy);

export default router;
