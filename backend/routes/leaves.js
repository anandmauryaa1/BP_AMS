import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { User } from '../models/User.js';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth.js';
import { notifyLeaveApplication, notifyLeaveDecision } from '../services/pushNotification.js';
import { sendLeaveApplicationEmails, sendLeaveDecisionEmail } from '../services/email.js';

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
        
        const users = await User.find({}).select('_id employeeId username name').lean();
        const userMap = new Map();
        users.forEach(u => {
            if (u._id) userMap.set(String(u._id), u.name);
            if (u.employeeId) userMap.set(String(u.employeeId), u.name);
            if (u.username) userMap.set(String(u.username), u.name);
        });

        const leaves = rawLeaves.map((l) => ({
            ...l,
            leaveType: l.leaveType || l.type || 'CASUAL',
            type: l.type || l.leaveType || 'CASUAL',
            employeeName: l.employeeName || userMap.get(String(l.employeeId)) || l.employeeId || 'Staff Member',
            reviewedBy: l.reviewedBy ? (userMap.get(String(l.reviewedBy)) || l.reviewedBy) : undefined,
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
        let targetEmployeeEmail = req.user?.email;

        if (targetEmployeeId) {
            const empQuery = [
                { employeeId: targetEmployeeId },
                { username: targetEmployeeId }
            ];
            if (typeof targetEmployeeId === 'string' && targetEmployeeId.match(/^[0-9a-fA-F]{24}$/)) {
                empQuery.push({ _id: targetEmployeeId });
            }
            const empUser = await User.findOne({ $or: empQuery }).select('employeeId name email').lean();
            if (empUser) {
                targetEmployeeId = empUser.employeeId || targetEmployeeId;
                targetEmployeeName = empUser.name || targetEmployeeName;
                targetEmployeeEmail = empUser.email || targetEmployeeEmail;
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

        // 1. Send push notifications
        try {
            await notifyLeaveApplication({
                leave,
                employeeName: targetEmployeeName,
            });
        }
        catch (pushErr) {
            console.warn('[PushNotification:Leave] Non-fatal notification error:', pushErr);
        }

        // 2. Send emails to BOTH applying employee AND all admins
        try {
            const adminUsers = await User.find({
                role: { $in: ['ADMIN', 'SUPER_ADMIN'] },
                status: 'ACTIVE'
            }).select('email').lean();
            const adminEmails = adminUsers.map(a => a.email).filter(Boolean);

            await sendLeaveApplicationEmails({
                leave,
                employeeEmail: targetEmployeeEmail,
                employeeName: targetEmployeeName,
                adminEmails,
            });
        } catch (emailErr) {
            console.warn('[EmailNotification:Leave] Non-fatal email error:', emailErr);
        }

        return res.status(201).json({
            success: true,
            message: isPreApproved 
                ? 'Staff leave recorded and approved successfully. Notifications sent.'
                : 'Leave application submitted successfully. Confirmation and admin emails sent.',
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
            reviewedBy: req.user?.name || req.user?.username || 'Admin',
            reviewedAt: new Date(),
            rejectionsReason,
        }, { new: true });
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Leave request not found' });
        }

        // 1. Send push notification
        try {
            await notifyLeaveDecision({
                leave: updated,
                reviewerName: req.user?.name,
            });
        }
        catch (pushErr) {
            console.warn('[PushNotification:LeaveDecision] Non-fatal notification error:', pushErr);
        }

        // 2. Send email notification to employee
        try {
            const empUser = await User.findOne({
                $or: [
                    { employeeId: updated.employeeId },
                    { username: updated.employeeId }
                ]
            }).select('email name').lean();

            await sendLeaveDecisionEmail({
                leave: updated,
                employeeEmail: empUser?.email,
                employeeName: updated.employeeName,
                reviewerName: req.user?.name || req.user?.username || 'Administrator',
            });
        } catch (emailErr) {
            console.warn('[EmailNotification:LeaveDecision] Non-fatal email error:', emailErr);
        }

        return res.json({
            success: true,
            message: `Leave application status updated to ${status} successfully. Email notification sent.`,
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
