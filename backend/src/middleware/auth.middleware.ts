import { Request, Response, NextFunction } from 'express';
import { sessionService } from '../services/session.service';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId =
    req.headers['x-session-id'] as string || req.body?.sessionId;

  if (!sessionId) {
    return res.status(401).json({ error: 'No session provided', code: 'SESSION_MISSING' });
  }

  const session = sessionService.getSession(sessionId);
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid', code: 'SESSION_EXPIRED' });
  }

  // Attach session data to request
  (req as any).session = session;
  (req as any).sessionId = sessionId;
  next();
}
