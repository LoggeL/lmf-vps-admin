import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { Router } from 'express';
import { getOpenCodeUrl } from '../services/opencode';
import { requireAuth } from '../middleware/auth';
import express from 'express';

const router = Router();

// Parse JSON for this route since it comes before global express.json()
router.use(express.json());

// Proxy middleware configuration
const openCodeProxy = createProxyMiddleware({
  target: getOpenCodeUrl(),
  changeOrigin: true,
  pathRewrite: {
    '^/api/opencode': '' // Remove /api/opencode prefix
  },
  on: {
    proxyReq: fixRequestBody // Fix body after express.json() parsed it
  },
  logger: console
});

// Apply auth and then proxy
router.use(requireAuth, openCodeProxy);

export default router;
