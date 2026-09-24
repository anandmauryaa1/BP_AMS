import { Router, Request, Response } from 'express';
import { connectToDatabase } from '../db.js';
import { Channel } from '../models/Channel.js';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const channels = await Channel.find({ isActive: true }).sort({ name: 1 }).lean();
    return res.json({ success: true, data: channels });
  } catch (error: any) {
    console.error('[API:Channels:GET] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch channels' });
  }
});

router.post('/', requireManagerOrAdmin, async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const channel = await Channel.create(req.body);
    return res.status(201).json({ success: true, data: channel });
  } catch (error: any) {
    console.error('[API:Channels:POST] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to create channel' });
  }
});

export default router;
