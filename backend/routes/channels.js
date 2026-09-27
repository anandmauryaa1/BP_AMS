import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { Channel } from '../models/Channel.js';
import { Series } from '../models/Series.js';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
    try {
        await connectToDatabase();
        const rawChannels = await Channel.find({
            status: { $ne: 'INACTIVE' },
            isActive: { $ne: false },
        }).sort({ name: 1 }).lean();

        const channels = await Promise.all(
            rawChannels.map(async (c) => {
                const seriesCount = await Series.countDocuments({
                    channelId: c._id,
                    status: { $ne: 'INACTIVE' },
                    isActive: { $ne: false },
                });
                return {
                    ...c,
                    isActive: c.isActive !== false && c.status !== 'INACTIVE',
                    seriesCount,
                };
            })
        );

        return res.json({ 
            success: true, 
            data: channels,
            channels,
        });
    } catch (error) {
        console.error('[API:Channels:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch channels' });
    }
});

router.post('/', requireManagerOrAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        const payload = {
            ...req.body,
            status: 'ACTIVE',
            isActive: true,
            handle: req.body.handle || (req.body.code ? `@${req.body.code.toLowerCase()}` : `@${req.body.name.replace(/\s+/g, '').toLowerCase()}`),
        };
        const channel = await Channel.create(payload);
        return res.status(201).json({ 
            success: true, 
            data: channel,
            channel,
        });
    } catch (error) {
        console.error('[API:Channels:POST] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to create channel' });
    }
});

router.delete('/:id', requireManagerOrAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        await Channel.findByIdAndUpdate(req.params.id, {
            status: 'INACTIVE',
            isActive: false,
        });
        return res.json({ success: true, message: 'Channel deleted successfully' });
    } catch (error) {
        console.error('[API:Channels:DELETE] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete channel' });
    }
});

export default router;
