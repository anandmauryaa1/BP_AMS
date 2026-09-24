import { Router, Request, Response } from 'express';
import { connectToDatabase } from '../db.js';
import { Series } from '../models/Series.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const { channelId } = req.query;
    const query: any = { isActive: true };
    if (channelId) query.channelId = channelId;

    const seriesList = await Series.find(query).sort({ title: 1 }).lean();
    return res.json({ success: true, data: seriesList });
  } catch (error: any) {
    console.error('[API:Series:GET] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch series' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const series = await Series.create(req.body);
    return res.status(201).json({ success: true, data: series });
  } catch (error: any) {
    console.error('[API:Series:POST] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to create series' });
  }
});

export default router;
