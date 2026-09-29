import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { Shift } from '../models/Shift.js';
import { ShiftRoster } from '../models/ShiftRoster.js';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth.js';
import { processBulkShiftRoster } from '../services/shift-roster-parser.js';
import { publicCache } from '../middleware/cacheControl.js';

const router = Router();
router.use(authenticateToken);

// GET /api/shifts - Fetch all active shifts
router.get('/', publicCache(300, 600), async (req, res) => {
    try {
        await connectToDatabase();
        const shifts = await Shift.find({ isActive: true }).sort({ code: 1 }).lean();
        return res.json({ success: true, data: shifts });
    } catch (error) {
        console.error('[API:Shifts:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch shifts' });
    }
});

// POST /api/shifts - Create/Update Shift (Admin/Manager)
router.post('/', requireManagerOrAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        const shift = await Shift.findOneAndUpdate(
            { code: req.body.code.toUpperCase() },
            { ...req.body, code: req.body.code.toUpperCase() },
            { new: true, upsert: true }
        );
        return res.status(201).json({ success: true, data: shift });
    } catch (error) {
        console.error('[API:Shifts:POST] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to save shift' });
    }
});

// GET /api/shifts/roster - Get shift rosters
router.get('/roster', async (req, res) => {
    try {
        await connectToDatabase();
        const { employeeId, startDate, endDate } = req.query;
        const query = {};
        if (employeeId) query.employeeId = String(employeeId).toUpperCase();
        if (startDate && endDate) query.date = { $gte: String(startDate), $lte: String(endDate) };

        const rosters = await ShiftRoster.find(query).populate('shiftId').lean();
        return res.json({ success: true, data: rosters });
    } catch (error) {
        console.error('[API:Shifts:Roster:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch shift rosters' });
    }
});

// POST /api/shifts/roster/bulk-upload - Bulk Roster Import (Excel JSON)
router.post('/roster/bulk-upload', requireManagerOrAdmin, async (req, res) => {
    try {
        const { rosterRows } = req.body;
        const result = await processBulkShiftRoster(rosterRows, req.user?.name || req.user?.userId);
        return res.json({ success: true, data: result });
    } catch (error) {
        console.error('[API:Shifts:Roster:BulkUpload] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to process bulk roster' });
    }
});

export default router;
