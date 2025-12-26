import { Router } from 'express';
import { getApps, getApp, deleteApp as dbDeleteApp, getDeployments } from '../db';
import { deployApp, updateApp as updateAppService } from '../services/deployer';
import { startContainer, stopContainer, restartContainer, getContainerLogs, removeContainer } from '../services/docker';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// List all apps
router.get('/', (req, res) => {
  const apps = getApps();
  res.json(apps);
});

// Get single app
router.get('/:id', (req, res) => {
  const app = getApp(req.params.id);
  if (!app) {
    return res.status(404).json({ error: 'App not found' });
  }
  res.json(app);
});

// Get app deployments
router.get('/:id/deployments', (req, res) => {
  const deployments = getDeployments(req.params.id);
  res.json(deployments);
});

// Deploy new app
router.post('/', async (req, res) => {
  const { githubUrl, name, domain, port, envVars } = req.body;

  if (!githubUrl || !name || !domain || !port) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const appId = await deployApp({
      githubUrl,
      name,
      domain,
      port: parseInt(port),
      envVars
    });
    res.json({ success: true, appId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update app (git pull + rebuild)
router.post('/:id/update', async (req, res) => {
  try {
    await updateAppService(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start container
router.post('/:id/start', async (req, res) => {
  const app = getApp(req.params.id) as any;
  if (!app) return res.status(404).json({ error: 'App not found' });

  try {
    await startContainer(app.container_name);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Stop container
router.post('/:id/stop', async (req, res) => {
  const app = getApp(req.params.id) as any;
  if (!app) return res.status(404).json({ error: 'App not found' });

  try {
    await stopContainer(app.container_name);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Restart container
router.post('/:id/restart', async (req, res) => {
  const app = getApp(req.params.id) as any;
  if (!app) return res.status(404).json({ error: 'App not found' });

  try {
    await restartContainer(app.container_name);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get logs
router.get('/:id/logs', async (req, res) => {
  const app = getApp(req.params.id) as any;
  if (!app) return res.status(404).json({ error: 'App not found' });

  try {
    const logs = await getContainerLogs(app.container_name, 200);
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete app
router.delete('/:id', async (req, res) => {
  const app = getApp(req.params.id) as any;
  if (!app) return res.status(404).json({ error: 'App not found' });

  try {
    // Stop and remove container
    try {
      await removeContainer(app.container_name, true);
    } catch {}

    // Delete from database
    dbDeleteApp(req.params.id);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
