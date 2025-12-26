import { Router } from 'express';
import crypto from 'crypto';
import { getApps } from '../db';
import { updateApp } from '../services/deployer';
import { notifyAppUpdated } from '../services/discord';

const router = Router();

// GitHub webhook for auto-updates
router.post('/github/:appId', async (req, res) => {
  const { appId } = req.params;
  const apps = getApps() as any[];
  const app = apps.find(a => a.id === appId);

  if (!app) {
    return res.status(404).json({ error: 'App not found' });
  }

  // Verify webhook signature if secret is set
  if (app.webhook_secret) {
    const signature = req.headers['x-hub-signature-256'] as string;
    if (signature) {
      const hmac = crypto.createHmac('sha256', app.webhook_secret);
      const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
      if (signature !== digest) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }
  }

  // Check if it's a push event
  const event = req.headers['x-github-event'];
  if (event !== 'push') {
    return res.json({ message: 'Ignored non-push event' });
  }

  // Check if it's the main/master branch
  const ref = req.body.ref;
  if (!ref?.includes('main') && !ref?.includes('master')) {
    return res.json({ message: 'Ignored non-main branch' });
  }

  // Trigger update
  try {
    await updateApp(appId);
    await notifyAppUpdated(app.name);
    res.json({ success: true, message: 'Update triggered' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
