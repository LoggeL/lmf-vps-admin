import { Router } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { getSetting, setSetting, isSetupComplete, createAuthToken, validateAuthToken, deleteAuthToken } from '../db';

const router = Router();

// Check if setup is needed
router.get('/status', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const authenticated = !!req.session?.authenticated || (!!token && validateAuthToken(token));

  res.json({
    needsSetup: !isSetupComplete(),
    authenticated
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

  const token = uuidv4();
  createAuthToken(token);
  
  req.session!.authenticated = true;
  res.json({ success: true, token });
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

  const token = uuidv4();
  createAuthToken(token);

  req.session!.authenticated = true;
  res.json({ success: true, token });
});

// Logout
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (token) {
    deleteAuthToken(token);
  }
  
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
