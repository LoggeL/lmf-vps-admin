import { Request, Response, NextFunction } from 'express';
import { isSetupComplete } from '../db';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.authenticated) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

export function requireSetup(req: Request, res: Response, next: NextFunction) {
  if (!isSetupComplete()) {
    return res.status(403).json({ error: 'Setup required', needsSetup: true });
  }
  next();
}
