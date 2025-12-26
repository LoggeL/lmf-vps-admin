import { Router } from 'express';
import { listDnsRecords, createDnsRecord, updateDnsRecord, deleteDnsRecord, getCloudflareConfig, setCloudflareConfig } from '../services/cloudflare';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// Get Cloudflare config status
router.get('/config', (req, res) => {
  const config = getCloudflareConfig();
  res.json({
    configured: !!(config.token && config.zoneId),
    zoneId: config.zoneId ? `${config.zoneId.substring(0, 8)}...` : null
  });
});

// Set Cloudflare config
router.post('/config', (req, res) => {
  const { token, zoneId } = req.body;
  if (!token || !zoneId) {
    return res.status(400).json({ error: 'Token and zone ID required' });
  }
  setCloudflareConfig(token, zoneId);
  res.json({ success: true });
});

// List DNS records
router.get('/', async (req, res) => {
  try {
    const records = await listDnsRecords();
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create DNS record
router.post('/', async (req, res) => {
  const { name, content, type, proxied } = req.body;
  if (!name || !content) {
    return res.status(400).json({ error: 'Name and content required' });
  }

  try {
    const record = await createDnsRecord(name, content, type || 'A', proxied !== false);
    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update DNS record
router.put('/:id', async (req, res) => {
  const { name, content, type, proxied } = req.body;

  try {
    const record = await updateDnsRecord(req.params.id, { name, content, type, proxied });
    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete DNS record
router.delete('/:id', async (req, res) => {
  try {
    await deleteDnsRecord(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
