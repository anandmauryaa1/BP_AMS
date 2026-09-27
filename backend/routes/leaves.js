import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth.js';
import { notifyLeaveApplication, notifyLeaveDecision } from '../services/pushNotification.js';
const router = Router();
router.use(authenticateToken);
router.get('/', async (req, res) => {
    try {
        await connectToDatabase();
        const { employeeId, status } = req.query;
        const query = {};
        if (employeeId) {
            if (req.user?.role === 'EMPLOYEE' && employeeId !== req.user.employeeId && employeeId !== req.user.userId) {
                return res.status(403).json({ success: false, error: 'Forbidden: Cannot view other employee leaves' });
            }
            query.$or = [{ employeeId }, { employeeId: String(employeeId) }];
        }
        else if (req.user?.role === 'EMPLOYEE') {
            query.$or = [{ employeeId: req.user.employeeId }, { employeeId: req.user.userId }];
        }
        if (status && status !== 'ALL')
            query.status = status;
        const leaves = await LeaveRequest.find(query).sort({ createdAt: -1 }).lean();
        return res.json({ success: true, data: leaves });
    }
    catch (error) {
        console.error('[API:Leaves:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch leave requests' });
    }
});
router.post('/', async (req, res) => {
    try {
        await connectToDatabase();
        const empId = req.user?.employeeId || req.user?.userId;
        const leave = await LeaveRequest.create({
            ...req.body,
            employeeId: empId,
            status: 'PENDING',
        });
        try {
            await notifyLeaveApplication({
                leave,
                employeeName: req.user?.name || 'Staff Member',
            });
        }
        catch (pushErr) {
            console.warn('[PushNotification:Leave] Non-fatal notification error:', pushErr);
        }
        return res.status(201).json({
            success: true,
            message: 'Leave application submitted successfully. Your reporting manager has been notified.',
            data: leave,
        });
    }
    catch (error) {
        console.error('[API:Leaves:POST] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to submit leave request' });
    }
});
router.put('/:id', requireManagerOrAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        const { status, rejectionsReason } = req.body;
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Status must be APPROVED or REJECTED' });
        }
        const updated = await LeaveRequest.findByIdAndUpdate(req.params.id, {
            status,
            reviewedBy: req.user?.userId,
            reviewedAt: new Date(),
            rejectionsReason,
        }, { new: true });
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Leave request not found' });
        }
        try {
            await notifyLeaveDecision({
                leave: updated,
                reviewerName: req.user?.name,
            });
        }
        catch (pushErr) {
            console.warn('[PushNotification:LeaveDecision] Non-fatal notification error:', pushErr);
        }
        return res.json({
            success: true,
            message: `Leave application status updated to ${status} successfully.`,
            data: updated,
        });
    }
    catch (error) {
        console.error('[API:Leaves:PUT] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update leave request' });
    }
});
export default router;
