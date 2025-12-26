import { Request, Response, NextFunction } from 'express';
import { isSetupComplete, validateAuthToken } from '../db';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.authenticated) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (validateAuthToken(token)) {
      return next();
    }
  }

  return res.status(401).json({ error: 'Unauthorized' });
}

export function requireSetup(req: Request, res: Response, next: NextFunction) {
  if (!isSetupComplete()) {
    return res.status(403).json({ error: 'Setup required', needsSetup: true });
  }
  next();
}
