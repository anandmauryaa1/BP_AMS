import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { User } from '../models/User.js';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth.js';
import { notifyLeaveApplication, notifyLeaveDecision, notifyLeaveModified } from '../services/pushNotification.js';
import {
    sendLeaveApplicationEmails,
    sendLeaveDecisionEmail,
    sendAdminRecordedLeaveEmail,
    sendLeaveUpdatedEmail,
    sendLeaveDeletedEmail,
} from '../services/email.js';
import { logAuditEvent } from '../services/audit.js';
import { calculateEmployeeLeaveBalances } from '../services/leave-accrual-engine.js';

const router = Router();
router.use(authenticateToken);

const VALID_LEAVE_TYPES = ['CASUAL', 'SICK', 'EMERGENCY', 'UNPAID', 'OTHER'];
const VALID_LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

async function resolveEmployeeUser(identifier) {
    if (!identifier) return null;
    const empQuery = [{ employeeId: identifier }, { username: identifier }];
    if (typeof identifier === 'string' && identifier.match(/^[0-9a-fA-F]{24}$/)) {
        empQuery.push({ _id: identifier });
    }
    return User.findOne({ $or: empQuery }).select('_id employeeId username name email').lean();
}

function getActorInfo(req) {
    return {
        actorId: req.user?.userId || req.user?._id || 'ADMIN',
        actorName: req.user?.name || req.user?.username || 'Admin',
        actorRole: req.user?.role || 'ADMIN',
    };
}

function validateDateRange(startDate, endDate) {
    if (!startDate || !endDate) return 'Start date and end date are required';
    if (String(endDate) < String(startDate)) return 'End date cannot be earlier than start date';
    return null;
}

async function findOverlappingLeave(employeeId, startDate, endDate, excludeLeaveId = null) {
    const empCandidates = [employeeId, String(employeeId).toUpperCase()].filter(Boolean);
    const query = {
        employeeId: { $in: [...new Set(empCandidates)] },
        isDeleted: { $ne: true },
        status: { $in: ['PENDING', 'APPROVED'] },
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
    };
    if (excludeLeaveId) {
        query._id = { $ne: excludeLeaveId };
    }
    return LeaveRequest.findOne(query).lean();
}

async function fetchEnrichedLeaves(query) {
    const rawLeaves = await LeaveRequest.find(query).sort({ createdAt: -1 }).lean();

    const users = await User.find({}).select('_id employeeId username name').lean();
    const userMap = new Map();
    users.forEach((u) => {
        if (u._id) userMap.set(String(u._id), u.name);
        if (u.employeeId) userMap.set(String(u.employeeId), u.name);
        if (u.username) userMap.set(String(u.username), u.name);
    });

    return rawLeaves.map((l) => ({
        ...l,
        leaveType: l.leaveType || l.type || 'CASUAL',
        type: l.type || l.leaveType || 'CASUAL',
        employeeName: l.employeeName || userMap.get(String(l.employeeId)) || l.employeeId || 'Staff Member',
        reviewedBy: l.reviewedBy ? (userMap.get(String(l.reviewedBy)) || l.reviewedBy) : undefined,
    }));
}

router.get('/my', async (req, res) => {
    try {
        await connectToDatabase();
        const query = {
            $or: [{ employeeId: req.user?.employeeId }, { employeeId: req.user?.userId }],
            isDeleted: { $ne: true },
        };
        const leaves = await fetchEnrichedLeaves(query);
        return res.json({ success: true, data: leaves, leaves });
    } catch (error) {
        console.error('[API:Leaves:MY] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch your leave requests' });
    }
});

router.get('/balances', async (req, res) => {
    try {
        await connectToDatabase();
        const isManagerOrAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(req.user?.role);
        const targetId = isManagerOrAdmin && req.query.employeeId
            ? String(req.query.employeeId)
            : String(req.user?.employeeId || req.user?.userId);
        const year = req.query.year ? parseInt(String(req.query.year), 10) : new Date().getFullYear();

        const balances = await calculateEmployeeLeaveBalances(targetId, year);
        return res.json({ success: true, data: balances });
    } catch (error) {
        console.error('[API:Leaves:Balances] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch leave balances' });
    }
});

router.get('/', async (req, res) => {
    try {
        await connectToDatabase();
        const { employeeId, status, includeDeleted } = req.query;
        const isManagerOrAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(req.user?.role);
        const query = {};

        if (employeeId) {
            if (req.user?.role === 'EMPLOYEE' && employeeId !== req.user.employeeId && employeeId !== req.user.userId) {
                return res.status(403).json({ success: false, error: 'Forbidden: Cannot view other employee leaves' });
            }
            query.$or = [{ employeeId }, { employeeId: String(employeeId) }];
        } else if (req.user?.role === 'EMPLOYEE') {
            query.$or = [{ employeeId: req.user.employeeId }, { employeeId: req.user.userId }];
        }

        if (isManagerOrAdmin && status === 'DELETED') {
            query.isDeleted = true;
        } else if (isManagerOrAdmin && includeDeleted === 'true') {
            if (status && status !== 'ALL') {
                query.status = status;
            }
        } else {
            query.isDeleted = { $ne: true };
            if (status && status !== 'ALL') {
                query.status = status;
            }
        }

        const leaves = await fetchEnrichedLeaves(query);

        return res.json({
            success: true,
            data: leaves,
            leaves,
        });
    } catch (error) {
        console.error('[API:Leaves:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch leave requests' });
    }
});

router.post('/', async (req, res) => {
    try {
        await connectToDatabase();
        const isManagerOrAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(req.user?.role);
        const { actorId, actorName, actorRole } = getActorInfo(req);

        const dateError = validateDateRange(req.body.startDate, req.body.endDate);
        if (dateError) {
            return res.status(400).json({ success: false, error: dateError });
        }
        if (!req.body.reason || !String(req.body.reason).trim()) {
            return res.status(400).json({ success: false, error: 'Leave reason is required' });
        }

        const requestedTarget = isManagerOrAdmin && req.body.employeeId ? req.body.employeeId : null;
        let targetEmployeeId = requestedTarget || req.user?.employeeId || req.user?.userId;
        let targetEmployeeName = req.body.employeeName || req.user?.name || 'Staff Member';
        let targetEmployeeEmail = req.user?.email;

        const empUser = await resolveEmployeeUser(targetEmployeeId);
        if (empUser) {
            targetEmployeeId = empUser.employeeId || targetEmployeeId;
            targetEmployeeName = empUser.name || targetEmployeeName;
            targetEmployeeEmail = empUser.email || targetEmployeeEmail;
        }

        const normalizedType = String(req.body.leaveType || req.body.type || 'CASUAL').toUpperCase();
        const leaveType = VALID_LEAVE_TYPES.includes(normalizedType) ? normalizedType : 'CASUAL';
        const requestedStatus = String(req.body.status || '').toUpperCase();
        const status = isManagerOrAdmin && VALID_LEAVE_STATUSES.includes(requestedStatus) ? requestedStatus : 'PENDING';
        const isPreDecided = isManagerOrAdmin && status !== 'PENDING';
        const isCreatedForEmployee = Boolean(
            isManagerOrAdmin && requestedTarget && String(targetEmployeeId) !== String(req.user?.employeeId)
        );

        if (['PENDING', 'APPROVED'].includes(status)) {
            const conflict = await findOverlappingLeave(targetEmployeeId, req.body.startDate, req.body.endDate);
            if (conflict) {
                return res.status(409).json({
                    success: false,
                    error: `Overlapping ${conflict.status.toLowerCase()} leave already exists for ${conflict.startDate} to ${conflict.endDate}.`,
                });
            }
        }

        const leave = await LeaveRequest.create({
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            reason: String(req.body.reason).trim(),
            employeeId: targetEmployeeId,
            employeeName: targetEmployeeName,
            leaveType,
            type: leaveType,
            status,
            reviewedBy: isPreDecided ? actorName : undefined,
            reviewedAt: isPreDecided ? new Date() : undefined,
            reviewNotes: req.body.reviewNotes
                ? String(req.body.reviewNotes).trim()
                : (status === 'APPROVED' ? 'Pre-authorized by Admin/Manager' : undefined),
        });

        await logAuditEvent({
            actorId: String(actorId),
            actorName,
            actorRole,
            action: 'LEAVE_CREATED',
            targetId: leave._id.toString(),
            targetType: 'LEAVE_REQUEST',
            metadata: {
                employeeId: targetEmployeeId,
                employeeName: targetEmployeeName,
                leaveType,
                startDate: leave.startDate,
                endDate: leave.endDate,
                status,
                createdByAdmin: isCreatedForEmployee,
            },
            ipAddress: req.ip,
        });

        if (isCreatedForEmployee) {
            // Admin created leave on behalf of employee -> notify & email employee directly
            try {
                await notifyLeaveModified({
                    employeeId: targetEmployeeId,
                    action: 'CREATED',
                    leave,
                    actorName,
                });
            } catch (pushErr) {
                console.warn('[PushNotification:LeaveCreate] Non-fatal notification error:', pushErr);
            }

            try {
                await sendAdminRecordedLeaveEmail({
                    leave,
                    employeeEmail: targetEmployeeEmail,
                    employeeName: targetEmployeeName,
                    adminName: actorName,
                });
            } catch (emailErr) {
                console.warn('[EmailNotification:LeaveCreate] Non-fatal email error:', emailErr);
            }
        } else {
            // Self-application -> notify admins and email both employee & admins
            try {
                await notifyLeaveApplication({ leave, employeeName: targetEmployeeName });
            } catch (pushErr) {
                console.warn('[PushNotification:Leave] Non-fatal notification error:', pushErr);
            }

            try {
                const adminUsers = await User.find({
                    role: { $in: ['ADMIN', 'SUPER_ADMIN'] },
                    status: 'ACTIVE',
                }).select('email').lean();
                const adminEmails = adminUsers.map((a) => a.email).filter(Boolean);

                await sendLeaveApplicationEmails({
                    leave,
                    employeeEmail: targetEmployeeEmail,
                    employeeName: targetEmployeeName,
                    adminEmails,
                });
            } catch (emailErr) {
                console.warn('[EmailNotification:Leave] Non-fatal email error:', emailErr);
            }
        }

        return res.status(201).json({
            success: true,
            message: isCreatedForEmployee
                ? 'Staff leave recorded and reminder email sent to employee.'
                : 'Leave application submitted successfully. Confirmation and admin emails sent.',
            data: leave,
        });
    } catch (error) {
        console.error('[API:Leaves:POST] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to submit leave request' });
    }
});

const handleUpdateLeave = async (req, res) => {
    try {
        await connectToDatabase();
        const existing = await LeaveRequest.findById(req.params.id);
        if (!existing || existing.isDeleted) {
            return res.status(404).json({ success: false, error: 'Leave request not found' });
        }

        const { actorId, actorName, actorRole } = getActorInfo(req);
        const body = req.body || {};

        const nextStartDate = body.startDate ?? existing.startDate;
        const nextEndDate = body.endDate ?? existing.endDate;
        const dateError = validateDateRange(nextStartDate, nextEndDate);
        if (dateError) {
            return res.status(400).json({ success: false, error: dateError });
        }

        const nextLeaveType = body.leaveType || body.type
            ? String(body.leaveType || body.type).toUpperCase()
            : (existing.leaveType || existing.type || 'CASUAL');
        if (!VALID_LEAVE_TYPES.includes(nextLeaveType)) {
            return res.status(400).json({ success: false, error: 'Invalid leave type' });
        }

        const nextStatus = body.status ? String(body.status).toUpperCase() : existing.status;
        if (!VALID_LEAVE_STATUSES.includes(nextStatus)) {
            return res.status(400).json({ success: false, error: 'Invalid leave status' });
        }

        const nextReason = body.reason !== undefined ? String(body.reason).trim() : existing.reason;
        if (!nextReason) {
            return res.status(400).json({ success: false, error: 'Leave reason cannot be empty' });
        }

        let nextEmployeeId = existing.employeeId;
        let nextEmployeeName = existing.employeeName;
        let targetUser = await resolveEmployeeUser(existing.employeeId);

        if (body.employeeId && String(body.employeeId) !== String(existing.employeeId)) {
            const reassignedUser = await resolveEmployeeUser(body.employeeId);
            if (reassignedUser) {
                nextEmployeeId = reassignedUser.employeeId || body.employeeId;
                nextEmployeeName = reassignedUser.name || body.employeeName || nextEmployeeId;
                targetUser = reassignedUser;
            } else {
                nextEmployeeId = body.employeeId;
                nextEmployeeName = body.employeeName || body.employeeId;
            }
        }

        if (['PENDING', 'APPROVED'].includes(nextStatus)) {
            const conflict = await findOverlappingLeave(nextEmployeeId, nextStartDate, nextEndDate, existing._id);
            if (conflict) {
                return res.status(409).json({
                    success: false,
                    error: `Overlapping ${conflict.status.toLowerCase()} leave already exists for ${conflict.startDate} to ${conflict.endDate}.`,
                });
            }
        }

        const incomingReviewNotes = body.reviewNotes !== undefined
            ? String(body.reviewNotes).trim()
            : (body.rejectionsReason !== undefined ? String(body.rejectionsReason).trim() : existing.reviewNotes);
        const incomingEditNotes = body.editNotes !== undefined ? String(body.editNotes).trim() : undefined;

        const changesSummary = [];
        if (String(nextEmployeeId) !== String(existing.employeeId)) changesSummary.push('Employee');
        if (nextLeaveType !== (existing.leaveType || existing.type)) changesSummary.push('Leave Type');
        if (nextStartDate !== existing.startDate || nextEndDate !== existing.endDate) changesSummary.push('Dates');
        if (nextReason !== existing.reason) changesSummary.push('Reason');
        if (nextStatus !== existing.status) changesSummary.push(`Status (${existing.status} -> ${nextStatus})`);
        if (incomingReviewNotes !== existing.reviewNotes) changesSummary.push('Review Notes');

        const isPureDecision =
            existing.status === 'PENDING' &&
            ['APPROVED', 'REJECTED'].includes(nextStatus) &&
            changesSummary.every((c) => c.startsWith('Status') || c === 'Review Notes');

        const beforeSnapshot = {
            employeeId: existing.employeeId,
            leaveType: existing.leaveType,
            startDate: existing.startDate,
            endDate: existing.endDate,
            reason: existing.reason,
            status: existing.status,
            reviewNotes: existing.reviewNotes,
        };

        existing.employeeId = nextEmployeeId;
        existing.employeeName = nextEmployeeName;
        existing.leaveType = nextLeaveType;
        existing.type = nextLeaveType;
        existing.startDate = nextStartDate;
        existing.endDate = nextEndDate;
        existing.reason = nextReason;
        existing.status = nextStatus;
        existing.reviewNotes = incomingReviewNotes;
        existing.updatedBy = actorName;
        if (incomingEditNotes !== undefined) {
            existing.editNotes = incomingEditNotes;
        }
        if (nextStatus !== beforeSnapshot.status) {
            existing.reviewedBy = actorName;
            existing.reviewedAt = new Date();
        }

        const updated = await existing.save();

        await logAuditEvent({
            actorId: String(actorId),
            actorName,
            actorRole,
            action: 'LEAVE_UPDATED',
            targetId: updated._id.toString(),
            targetType: 'LEAVE_REQUEST',
            metadata: {
                before: beforeSnapshot,
                after: {
                    employeeId: updated.employeeId,
                    leaveType: updated.leaveType,
                    startDate: updated.startDate,
                    endDate: updated.endDate,
                    reason: updated.reason,
                    status: updated.status,
                    reviewNotes: updated.reviewNotes,
                },
                changesSummary,
                editNotes: updated.editNotes,
            },
            ipAddress: req.ip,
        });

        try {
            if (isPureDecision) {
                await notifyLeaveDecision({ leave: updated, reviewerName: actorName });
            } else {
                await notifyLeaveModified({
                    employeeId: updated.employeeId,
                    action: 'UPDATED',
                    leave: updated,
                    actorName,
                });
            }
        } catch (pushErr) {
            console.warn('[PushNotification:LeaveUpdate] Non-fatal notification error:', pushErr);
        }

        try {
            if (!targetUser) {
                targetUser = await resolveEmployeeUser(updated.employeeId);
            }
            if (isPureDecision) {
                await sendLeaveDecisionEmail({
                    leave: updated,
                    employeeEmail: targetUser?.email,
                    employeeName: updated.employeeName,
                    reviewerName: actorName,
                });
            } else {
                await sendLeaveUpdatedEmail({
                    leave: updated,
                    employeeEmail: targetUser?.email,
                    employeeName: updated.employeeName,
                    adminName: actorName,
                    changesSummary,
                });
            }
        } catch (emailErr) {
            console.warn('[EmailNotification:LeaveUpdate] Non-fatal email error:', emailErr);
        }

        return res.json({
            success: true,
            message: isPureDecision
                ? `Leave application status updated to ${nextStatus}. Email notification sent.`
                : 'Leave record updated successfully. Reminder email sent to employee.',
            data: updated,
        });
    } catch (error) {
        console.error('[API:Leaves:UPDATE] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update leave request' });
    }
};

const handleDeleteLeave = async (req, res) => {
    try {
        await connectToDatabase();
        const rawReason = req.body?.deletionReason || req.body?.reason || req.query?.reason || '';
        const deletionReason = String(rawReason).trim();

        if (deletionReason.length < 3) {
            return res.status(400).json({
                success: false,
                error: 'A short message explaining why this leave is being deleted is required (min 3 characters).',
            });
        }

        const existing = await LeaveRequest.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Leave request not found' });
        }
        if (existing.isDeleted) {
            return res.status(400).json({ success: false, error: 'Leave request is already deleted' });
        }

        const { actorId, actorName, actorRole } = getActorInfo(req);
        const previousStatus = existing.status;

        existing.isDeleted = true;
        existing.status = 'CANCELLED';
        existing.deletedBy = actorName;
        existing.deletedAt = new Date();
        existing.deletionReason = deletionReason;
        await existing.save();

        await logAuditEvent({
            actorId: String(actorId),
            actorName,
            actorRole,
            action: 'LEAVE_DELETED',
            targetId: existing._id.toString(),
            targetType: 'LEAVE_REQUEST',
            metadata: {
                employeeId: existing.employeeId,
                employeeName: existing.employeeName,
                leaveType: existing.leaveType,
                startDate: existing.startDate,
                endDate: existing.endDate,
                previousStatus,
                originalReason: existing.reason,
                deletionReason,
            },
            ipAddress: req.ip,
        });

        try {
            await notifyLeaveModified({
                employeeId: existing.employeeId,
                action: 'DELETED',
                leave: existing,
                actorName,
                reason: deletionReason,
            });
        } catch (pushErr) {
            console.warn('[PushNotification:LeaveDelete] Non-fatal notification error:', pushErr);
        }

        try {
            const empUser = await resolveEmployeeUser(existing.employeeId);
            await sendLeaveDeletedEmail({
                leave: existing,
                employeeEmail: empUser?.email,
                employeeName: existing.employeeName || empUser?.name,
                adminName: actorName,
                deletionReason,
            });
        } catch (emailErr) {
            console.warn('[EmailNotification:LeaveDelete] Non-fatal email error:', emailErr);
        }

        return res.json({
            success: true,
            message: 'Leave removed with reason logged and employee notified via email.',
            data: existing,
        });
    } catch (error) {
        console.error('[API:Leaves:DELETE] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete leave request' });
    }
};

const handleSelfCancelLeave = async (req, res) => {
    try {
        await connectToDatabase();
        const existing = await LeaveRequest.findById(req.params.id);
        if (!existing || existing.isDeleted) {
            return res.status(404).json({ success: false, error: 'Leave request not found' });
        }

        const isManagerOrAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(req.user?.role);
        const isOwner =
            String(existing.employeeId) === String(req.user?.employeeId) ||
            String(existing.employeeId) === String(req.user?.userId);

        if (!isOwner && !isManagerOrAdmin) {
            return res.status(403).json({ success: false, error: 'Forbidden: Cannot cancel another employee leave' });
        }
        if (existing.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                error: 'Only PENDING leave requests can be cancelled. Please contact an administrator.',
            });
        }

        const { actorId, actorName, actorRole } = getActorInfo(req);
        existing.status = 'CANCELLED';
        existing.updatedBy = actorName;
        if (req.body?.reason) {
            existing.editNotes = String(req.body.reason).trim();
        }
        await existing.save();

        await logAuditEvent({
            actorId: String(actorId),
            actorName,
            actorRole,
            action: 'LEAVE_CANCELLED',
            targetId: existing._id.toString(),
            targetType: 'LEAVE_REQUEST',
            metadata: {
                employeeId: existing.employeeId,
                startDate: existing.startDate,
                endDate: existing.endDate,
                reason: req.body?.reason || 'Cancelled by employee',
            },
            ipAddress: req.ip,
        });

        return res.json({
            success: true,
            message: 'Pending leave request cancelled successfully.',
            data: existing,
        });
    } catch (error) {
        console.error('[API:Leaves:CANCEL] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to cancel leave request' });
    }
};

router.patch('/:id/cancel', handleSelfCancelLeave);
router.put('/:id', requireManagerOrAdmin, handleUpdateLeave);
router.patch('/:id', requireManagerOrAdmin, handleUpdateLeave);
router.delete('/:id', requireManagerOrAdmin, handleDeleteLeave);

export default router;
