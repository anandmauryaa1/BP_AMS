import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { Series } from '../models/Series.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
    try {
        await connectToDatabase();
        const { channelId } = req.query;
        const query = {
            status: { $ne: 'INACTIVE' },
            isActive: { $ne: false },
        };
        if (channelId) {
            query.channelId = channelId;
        }

        const seriesList = await Series.find(query).sort({ name: 1 }).lean();
        const formatted = seriesList.map((s) => ({
            ...s,
            isActive: s.isActive !== false && s.status !== 'INACTIVE',
        }));

        return res.json({ 
            success: true, 
            data: formatted,
            series: formatted,
        });
    } catch (error) {
        console.error('[API:Series:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch series' });
    }
});

router.post('/', async (req, res) => {
    try {
        await connectToDatabase();
        const series = await Series.create({
            ...req.body,
            status: 'ACTIVE',
            isActive: true,
        });
        return res.status(201).json({ 
            success: true, 
            data: series,
            series,
        });
    } catch (error) {
        console.error('[API:Series:POST] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to create series' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await connectToDatabase();
        await Series.findByIdAndUpdate(req.params.id, {
            status: 'INACTIVE',
            isActive: false,
        });
        return res.json({ success: true, message: 'Series deleted successfully' });
    } catch (error) {
        console.error('[API:Series:DELETE] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete series' });
    }
});

export default router;
