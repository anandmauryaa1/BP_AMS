import { Router, Request, Response } from 'express';
import { connectToDatabase } from '../db.js';
import { Notification } from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const notifications = await Notification.find({
      userId: req.user?.userId,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({ success: true, data: notifications });
  } catch (error: any) {
    console.error('[API:Notifications:GET] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

const markAllRead = async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    await Notification.updateMany({ userId: req.user?.userId, isRead: false }, { isRead: true });
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('[API:Notifications:ReadAll] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to mark all as read' });
  }
};

router.put('/read-all', markAllRead);
router.patch('/', markAllRead);

router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?.userId },
      { isRead: true },
      { new: true }
    );
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[API:Notifications:MarkRead] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
});

export default router;
