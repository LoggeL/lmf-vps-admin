import { Router } from 'express';
import bcrypt from 'bcrypt';
import { getSetting, setSetting, isSetupComplete } from '../db';

const router = Router();

// Check if setup is needed
router.get('/status', (req, res) => {
  res.json({
    needsSetup: !isSetupComplete(),
    authenticated: !!req.session?.authenticated
  });
});

// First-run setup
router.post('/setup', async (req, res) => {
  if (isSetupComplete()) {
    return res.status(400).json({ error: 'Setup already complete' });
  }

  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const hash = await bcrypt.hash(password, 10);
  setSetting('admin_password_hash', hash);

  req.session!.authenticated = true;
  res.json({ success: true });
});

// Login
router.post('/login', async (req, res) => {
  const { password } = req.body;
  const hash = getSetting('admin_password_hash');

  if (!hash) {
    return res.status(400).json({ error: 'Setup required' });
  }

  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  req.session!.authenticated = true;
  res.json({ success: true });
});

// Logout
router.post('/logout', (req, res) => {
  req.session?.destroy(() => {});
  res.json({ success: true });
});

// Change password
router.post('/change-password', async (req, res) => {
  if (!req.session?.authenticated) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { currentPassword, newPassword } = req.body;
  const hash = getSetting('admin_password_hash');

  if (!hash) {
    return res.status(400).json({ error: 'No password set' });
  }

  const valid = await bcrypt.compare(currentPassword, hash);
  if (!valid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  setSetting('admin_password_hash', newHash);

  res.json({ success: true });
});

export default router;
