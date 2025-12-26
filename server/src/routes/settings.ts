import { Router } from 'express';
import { getSetting, setSetting } from '../db';
import { requireAuth } from '../middleware/auth';
import { getOpenCodeUrl } from '../services/opencode';

const router = Router();
router.use(requireAuth);

const OPENCODE_API = getOpenCodeUrl();

// Fetch models from OpenCode
async function fetchModelsFromOpenCode() {
  try {
    const response = await fetch(`${OPENCODE_API}/provider`);
    if (!response.ok) return [];
    
    const data = await response.json();
    const models: { id: string; name: string; provider: string }[] = [];
    
    // Parse the provider response
    if (data.all && Array.isArray(data.all)) {
      for (const provider of data.all) {
        if (provider.models) {
          for (const [modelKey, modelData] of Object.entries(provider.models)) {
            const model = modelData as any;
            models.push({
              id: `${provider.id}/${model.id}`,
              name: model.name || model.id,
              provider: provider.name || provider.id
            });
          }
        }
      }
    }
    
    return models;
  } catch (err) {
    console.error('Error fetching models from OpenCode:', err);
    return [];
  }
}

// Get settings
router.get('/', async (req, res) => {
  const models = await fetchModelsFromOpenCode();
  
  res.json({
    discordWebhook: getSetting('discord_webhook') ? '••••••••' : null,
    cloudflareConfigured: !!(getSetting('cloudflare_token') && getSetting('cloudflare_zone_id')),
    defaultModel: getSetting('default_model') || '',
    availableModels: models
  });
});

// Update default model
router.post('/model', (req, res) => {
  const { model } = req.body;
  if (!model) {
    return res.status(400).json({ error: 'Model is required' });
  }
  setSetting('default_model', model);
  res.json({ success: true });
});

// Update Discord webhook
router.post('/discord', (req, res) => {
  const { webhookUrl } = req.body;
  setSetting('discord_webhook', webhookUrl || '');
  res.json({ success: true });
});

// Test Discord webhook
router.post('/discord/test', async (req, res) => {
  const webhookUrl = getSetting('discord_webhook');
  if (!webhookUrl) {
    return res.status(400).json({ error: 'Discord webhook not configured' });
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '🧪 Test Notification',
          description: 'LMF VPS Admin is connected!',
          color: 0x00ff00,
          timestamp: new Date().toISOString()
        }]
      })
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
