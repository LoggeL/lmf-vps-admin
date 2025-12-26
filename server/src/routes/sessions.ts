import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getOpenCodeUrl } from '../services/opencode';

const router = Router();
router.use(requireAuth);

const OPENCODE_API = getOpenCodeUrl();

// List sessions from OpenCode
router.get('/', async (req, res) => {
  try {
    const directory = req.query.directory || '/home/fedora';
    const response = await fetch(`${OPENCODE_API}/session?directory=${encodeURIComponent(String(directory))}`);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch sessions from OpenCode' });
    }
    
    const sessions = await response.json();
    res.json(sessions);
  } catch (err) {
    console.error('Error fetching sessions:', err);
    res.status(500).json({ error: 'OpenCode server unavailable' });
  }
});

// Create session via OpenCode
router.post('/', async (req, res) => {
  try {
    const { directory = '/home/fedora', model, initialPrompt } = req.body;
    
    // Create the session
    const createResponse = await fetch(`${OPENCODE_API}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directory })
    });
    
    if (!createResponse.ok) {
      return res.status(createResponse.status).json({ error: 'Failed to create session' });
    }
    
    const session = await createResponse.json();
    
    // If initial prompt provided, send it as the first message
    if (initialPrompt && initialPrompt.trim()) {
      try {
        const messageUrl = `${OPENCODE_API}/session/${session.id}/message?directory=${encodeURIComponent(directory)}`;
        await fetch(messageUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parts: [{ type: 'text', text: initialPrompt }],
            ...(model && { providerID: model.split('/')[0], modelID: model.split('/')[1] })
          })
        });
      } catch (msgErr) {
        console.error('Error sending initial prompt:', msgErr);
        // Don't fail - session was created, just couldn't send initial message
      }
    }
    
    res.json(session);
  } catch (err) {
    console.error('Error creating session:', err);
    res.status(500).json({ error: 'OpenCode server unavailable' });
  }
});

// Get session details
router.get('/:id', async (req, res) => {
  try {
    const response = await fetch(`${OPENCODE_API}/session/${req.params.id}`);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Session not found' });
    }
    
    const session = await response.json();
    res.json(session);
  } catch (err) {
    console.error('Error fetching session:', err);
    res.status(500).json({ error: 'OpenCode server unavailable' });
  }
});

// Delete session
router.delete('/:id', async (req, res) => {
  try {
    const response = await fetch(`${OPENCODE_API}/session/${req.params.id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to delete session' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting session:', err);
    res.status(500).json({ error: 'OpenCode server unavailable' });
  }
});

export default router;
