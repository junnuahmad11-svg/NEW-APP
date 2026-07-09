import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { portalService } from '../services/portal.service';

export const accountsRoutes = Router();

// GET /api/accounts?type=RD
accountsRoutes.get('/', requireAuth, async (req: Request, res: Response) => {
  const accountType = (req.query.type as string) || 'RD';
  const validTypes = ['RD', 'TD', 'MIS', 'KVP', 'NSC'];

  if (!validTypes.includes(accountType)) {
    return res.status(400).json({ error: 'Invalid account type' });
  }

  try {
    const session = (req as any).session;
    const accounts = await portalService.fetchAccounts(session.cookieJar, accountType);
    res.json({ success: true, accounts, type: accountType });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});
