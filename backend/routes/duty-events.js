import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { DutyEvent } from '../models/DutyEvent.js';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// GET /api/duty-events - List duty events (WFH / OD)
router.get('/', async (req, res) => {
    try {
        await connectToDatabase();
        const { employeeId, eventType, status } = req.query;
        const query = {};

        if (req.user?.role === 'EMPLOYEE') {
            query.employeeId = req.user.employeeId || req.user.userId;
        } else if (employeeId) {
            query.employeeId = String(employeeId).toUpperCase();
        }

        if (eventType && eventType !== 'ALL') query.eventType = eventType;
        if (status && status !== 'ALL') query.status = status;

        const events = await DutyEvent.find(query).sort({ startDate: -1 }).lean();
        return res.json({ success: true, data: events });
    } catch (error) {
        console.error('[API:DutyEvents:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch duty events' });
    }
});

// POST /api/duty-events - Submit WFH / On-Duty request
router.post('/', async (req, res) => {
    try {
        await connectToDatabase();
        const empId = req.user?.employeeId || req.user?.userId;
        const empName = req.user?.name || 'Employee';

        const event = await DutyEvent.create({
            ...req.body,
            employeeId: empId.toUpperCase(),
            employeeName: empName,
            status: 'PENDING',
        });

        return res.status(201).json({ success: true, data: event });
    } catch (error) {
        console.error('[API:DutyEvents:POST] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to submit duty event request' });
    }
});

// PATCH /api/duty-events/:id - Approve or Reject Duty Event (Manager/Admin)
router.patch('/:id', requireManagerOrAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        const { status, reviewNotes } = req.body;

        const updated = await DutyEvent.findByIdAndUpdate(
            req.params.id,
            {
                status,
                reviewNotes,
                reviewedBy: req.user?.name || req.user?.userId,
                reviewedAt: new Date(),
            },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, error: 'Duty event not found' });
        }

        return res.json({ success: true, data: updated });
    } catch (error) {
        console.error('[API:DutyEvents:PATCH] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update duty event status' });
    }
});

export default router;
