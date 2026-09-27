import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { Notification } from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';
import { VAPID_PUBLIC_KEY, savePushSubscription, removePushSubscription, notifyUser, } from '../services/pushNotification.js';
const router = Router();
// Public VAPID key for browser registration
router.get('/vapid-public-key', (req, res) => {
    return res.json({
        success: true,
        data: { publicKey: VAPID_PUBLIC_KEY },
    });
});
router.use(authenticateToken);
router.post('/subscribe', async (req, res) => {
    try {
        const { subscription } = req.body || {};
        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({ success: false, error: 'Subscription object with endpoint and keys is required' });
        }
        const saved = await savePushSubscription({
            userId: req.user.userId,
            employeeId: req.user?.employeeId,
            role: req.user.role,
            subscription,
            userAgent: req.headers['user-agent'],
        });
        return res.status(201).json({
            success: true,
            message: 'Web push notification device registered successfully.',
            data: { id: saved._id },
        });
    }
    catch (error) {
        console.error('[API:Notifications:Subscribe] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to register push subscription' });
    }
});
router.post('/unsubscribe', async (req, res) => {
    try {
        const { endpoint } = req.body || {};
        if (!endpoint) {
            return res.status(400).json({ success: false, error: 'Endpoint is required' });
        }
        await removePushSubscription(endpoint);
        return res.json({ success: true, message: 'Unsubscribed from push notifications successfully.' });
    }
    catch (error) {
        console.error('[API:Notifications:Unsubscribe] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to remove push subscription' });
    }
});
router.post('/test', async (req, res) => {
    try {
        await notifyUser(req.user.userId, {
            title: '🔔 Push Notifications Active',
            message: `Test notification for ${req.user.name}. You will now receive instant task and shift updates!`,
            type: 'TASK_ASSIGNED',
            link: '/dashboard',
        });
        return res.json({
            success: true,
            message: 'Test push notification dispatched to your registered devices.',
        });
    }
    catch (error) {
        console.error('[API:Notifications:Test] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to send test push notification' });
    }
});
router.get('/', async (req, res) => {
    try {
        await connectToDatabase();
        const notifications = await Notification.find({
            userId: req.user?.userId,
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        return res.json({ success: true, data: notifications });
    }
    catch (error) {
        console.error('[API:Notifications:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
    }
});
const markAllRead = async (req, res) => {
    try {
        await connectToDatabase();
        await Notification.updateMany({ userId: req.user?.userId, isRead: false }, { isRead: true });
        return res.json({ success: true, message: 'All notifications marked as read' });
    }
    catch (error) {
        console.error('[API:Notifications:ReadAll] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to mark all as read' });
    }
};
router.put('/read-all', markAllRead);
router.patch('/', markAllRead);
router.put('/:id/read', async (req, res) => {
    try {
        await connectToDatabase();
        const updated = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user?.userId }, { isRead: true }, { new: true });
        return res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error('[API:Notifications:MarkRead] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
    }
});
export default router;
