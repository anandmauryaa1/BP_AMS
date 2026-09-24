import { Router, Request, Response } from 'express';
import { connectToDatabase } from '../db.js';
import { Plan } from '../models/Plan.js';
import { authenticateToken } from '../middleware/auth.js';
import { getTodayDateString } from '../utils/index.js';

const router = Router();

router.use(authenticateToken);

router.get('/daily', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const date = (req.query.date as string) || getTodayDateString();
    const employeeId = (req.query.employeeId as string) || req.user?.employeeId;

    const plan = await Plan.findOne({
      $or: [{ employeeId }, { employeeId: req.user?.userId }],
      date,
    }).lean();

    return res.json({ success: true, data: plan });
  } catch (error: any) {
    console.error('[API:Plans:GET] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch plan' });
  }
});

router.post('/daily', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const date = req.body.date || getTodayDateString();
    const employeeId = req.user?.employeeId || req.user?.userId;

    const plan = await Plan.findOneAndUpdate(
      { $or: [{ employeeId }, { employeeId: req.user?.userId }], date },
      { ...req.body, employeeId, date },
      { upsert: true, new: true }
    );

    return res.json({ success: true, data: plan });
  } catch (error: any) {
    console.error('[API:Plans:POST] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to save daily plan' });
  }
});

router.put('/daily', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const date = req.body.date || getTodayDateString();
    const employeeId = req.user?.employeeId || req.user?.userId;

    const plan = await Plan.findOneAndUpdate(
      { $or: [{ employeeId }, { employeeId: req.user?.userId }], date },
      { ...req.body },
      { new: true }
    );

    return res.json({ success: true, data: plan });
  } catch (error: any) {
    console.error('[API:Plans:PUT] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update plan' });
  }
});

export default router;
