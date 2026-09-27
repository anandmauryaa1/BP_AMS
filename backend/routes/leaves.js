import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { User } from '../models/User.js';
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
        const rawLeaves = await LeaveRequest.find(query).sort({ createdAt: -1 }).lean();
        const leaves = rawLeaves.map((l) => ({
            ...l,
            leaveType: l.leaveType || l.type || 'CASUAL',
            type: l.type || l.leaveType || 'CASUAL',
            employeeName: l.employeeName || l.employeeId || 'Staff Member',
        }));
        return res.json({ 
            success: true, 
            data: leaves,
            leaves,
        });
    }
    catch (error) {
        console.error('[API:Leaves:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch leave requests' });
    }
});

router.post('/', async (req, res) => {
    try {
        await connectToDatabase();
        const isManagerOrAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(req.user?.role);
        
        let targetEmployeeId = (isManagerOrAdmin && req.body.employeeId) 
            ? req.body.employeeId 
            : (req.user?.employeeId || req.user?.userId);
        let targetEmployeeName = req.body.employeeName || req.user?.name || 'Staff Member';

        if (targetEmployeeId) {
            const empQuery = [
                { employeeId: targetEmployeeId },
                { userId: targetEmployeeId },
                { username: targetEmployeeId }
            ];
            if (typeof targetEmployeeId === 'string' && targetEmployeeId.match(/^[0-9a-fA-F]{24}$/)) {
                empQuery.push({ _id: targetEmployeeId });
            }
            const empUser = await User.findOne({ $or: empQuery }).lean();
            if (empUser) {
                targetEmployeeId = empUser.employeeId || targetEmployeeId;
                targetEmployeeName = empUser.name || targetEmployeeName;
            }
        }

        const leaveType = (req.body.leaveType || req.body.type || 'CASUAL').toUpperCase();
        const status = (isManagerOrAdmin && req.body.status) ? req.body.status : 'PENDING';
        const isPreApproved = status === 'APPROVED';

        const leave = await LeaveRequest.create({
            ...req.body,
            employeeId: targetEmployeeId,
            employeeName: targetEmployeeName,
            leaveType,
            type: leaveType,
            status,
            reviewedBy: isPreApproved ? (req.user?.name || req.user?.userId || 'Admin') : undefined,
            reviewedAt: isPreApproved ? new Date() : undefined,
            reviewNotes: req.body.reviewNotes || (isPreApproved ? 'Pre-authorized by Admin/Manager' : undefined),
        });

        try {
            await notifyLeaveApplication({
                leave,
                employeeName: targetEmployeeName,
            });
        }
        catch (pushErr) {
            console.warn('[PushNotification:Leave] Non-fatal notification error:', pushErr);
        }

        return res.status(201).json({
            success: true,
            message: isPreApproved 
                ? 'Staff leave recorded and approved successfully.'
                : 'Leave application submitted successfully. Your reporting manager has been notified.',
            data: leave,
        });
    }
    catch (error) {
        console.error('[API:Leaves:POST] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to submit leave request' });
    }
});
const handleUpdateLeave = async (req, res) => {
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
        console.error('[API:Leaves:UPDATE] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update leave request' });
    }
};

router.put('/:id', requireManagerOrAdmin, handleUpdateLeave);
router.patch('/:id', requireManagerOrAdmin, handleUpdateLeave);
export default router;
