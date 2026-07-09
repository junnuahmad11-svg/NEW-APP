import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { portalService } from '../services/portal.service';

export const dashboardRoutes = Router();

dashboardRoutes.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session;
    const data = await portalService.fetchDashboardData(session.cookieJar);
    res.json({ success: true, data });
  } catch (error: any) {
    if (error.message?.includes('session')) {
      return res.status(401).json({ error: 'Session expired', code: 'SESSION_EXPIRED' });
    }
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});
