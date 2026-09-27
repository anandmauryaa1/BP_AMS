import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { Plan, WeeklyPlan, MonthlyPlan } from '../models/Plan.js';
import { User } from '../models/User.js';
import { Task } from '../models/Task.js';
import { authenticateToken } from '../middleware/auth.js';
import { getTodayDateString } from '../utils/index.js';
import { notifyDailyPlanSubmitted } from '../services/pushNotification.js';

const router = Router();
router.use(authenticateToken);

// ==========================================
// 1. DAILY PLANS
// ==========================================

router.get('/daily', async (req, res) => {
    try {
        await connectToDatabase();
        const date = req.query.date || getTodayDateString();
        const isManagerOrAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(req.user?.role);
        const requestedEmployeeId = req.query.employeeId || req.query.userId;

        // If an Admin/Manager accesses without a specific employee filter, return all daily plans for that date
        if (isManagerOrAdmin && !requestedEmployeeId) {
            const dailyPlans = await Plan.find({ date })
                .populate('userId', 'name role designation employeeId')
                .populate('assignedTaskIds', 'title status priority taskType')
                .sort({ updatedAt: -1 })
                .lean();

            return res.json({
                success: true,
                data: {
                    dailyPlans,
                    count: dailyPlans.length,
                },
                dailyPlans,
            });
        }

        // Single employee lookup (requested employee or logged-in user)
        const targetEmpId = requestedEmployeeId || req.user?.employeeId || req.user?.userId;
        const targetQuery = [
            { employeeId: targetEmpId },
        ];
        if (typeof targetEmpId === 'string' && targetEmpId.match(/^[0-9a-fA-F]{24}$/)) {
            targetQuery.push({ userId: targetEmpId });
            targetQuery.push({ _id: targetEmpId });
        }
        if (req.user?.userId && typeof req.user.userId === 'string' && req.user.userId.match(/^[0-9a-fA-F]{24}$/)) {
            targetQuery.push({ userId: req.user.userId });
        }

        const plan = await Plan.findOne({
            date,
            $or: targetQuery,
        })
        .populate('userId', 'name role designation employeeId')
        .populate('assignedTaskIds', 'title status priority taskType')
        .lean();

        // Also fetch active tasks assigned to employee for today
        const myTasksToday = await Task.find({
            $or: [
                { assignedToEmployeeId: targetEmpId },
                ...(req.user?.userId && req.user.userId.match(/^[0-9a-fA-F]{24}$/) ? [{ assignedTo: req.user.userId }] : [])
            ],
            status: { $ne: 'DONE' },
        }).limit(10).lean();

        const myQueue = plan?.assignedTaskIds || plan?.employeeAssignments || [];

        return res.json({
            success: true,
            data: {
                ...(plan || {}),
                plan,
                dailyPlans: plan ? [plan] : [],
                myQueue,
                myTasksToday,
                focusGoal: plan?.focusGoal || '',
            },
            plan,
            dailyPlans: plan ? [plan] : [],
        });
    } catch (error) {
        console.error('[API:Plans:Daily:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch plan' });
    }
});

router.post('/daily', async (req, res) => {
    try {
        await connectToDatabase();
        const date = req.body.date || getTodayDateString();

        // 1. Resolve target employee for whom the plan is being dispatched
        let targetUserId = req.body.userId;
        let targetUser = null;
        if (targetUserId) {
            const query = [];
            if (typeof targetUserId === 'string' && targetUserId.match(/^[0-9a-fA-F]{24}$/)) {
                query.push({ _id: targetUserId });
            }
            query.push({ employeeId: targetUserId });
            query.push({ userId: targetUserId });
            targetUser = await User.findOne({ $or: query }).lean();
        } else if (req.user?.userId) {
            targetUser = await User.findById(req.user.userId).lean();
        }

        const employeeId = targetUser ? targetUser.employeeId : (req.body.employeeId || req.user?.employeeId);
        const resolvedUserId = targetUser ? targetUser._id : (req.body.userId || req.user?.userId);
        const employeeName = targetUser ? targetUser.name : (req.body.employeeName || req.user?.name);

        // 2. Filter and sanitize assignedTaskIds
        let assignedTaskIds = req.body.assignedTaskIds || [];
        if (Array.isArray(assignedTaskIds)) {
            assignedTaskIds = assignedTaskIds.filter(id => id && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/));
        } else {
            assignedTaskIds = [];
        }

        // 3. Manager information
        const managerId = req.user?.userId || req.user?._id || resolvedUserId;
        const managerName = req.user?.name || 'Manager';

        // 4. Upsert filter
        const filterOr = [];
        if (resolvedUserId && typeof resolvedUserId === 'string' && resolvedUserId.match(/^[0-9a-fA-F]{24}$/)) {
            filterOr.push({ userId: resolvedUserId });
        }
        if (employeeId) {
            filterOr.push({ employeeId });
        }
        if (filterOr.length === 0) {
            filterOr.push({ employeeId: 'UNKNOWN' });
        }

        const updateData = {
            date,
            userId: resolvedUserId,
            employeeId,
            employeeName,
            managerId,
            managerName,
            focusGoal: req.body.focusGoal || '',
            assignedTaskIds,
            notes: req.body.notes || '',
            ...(req.body.employeeAssignments ? { employeeAssignments: req.body.employeeAssignments } : {})
        };

        const plan = await Plan.findOneAndUpdate(
            { date, $or: filterOr },
            { $set: updateData },
            { upsert: true, new: true, runValidators: false }
        )
        .populate('userId', 'name role designation employeeId')
        .populate('assignedTaskIds', 'title status priority taskType')
        .lean();

        // 5. If tasks were assigned, ensure their assignedTo reflects the target employee
        if (targetUser && assignedTaskIds.length > 0) {
            await Task.updateMany(
                { _id: { $in: assignedTaskIds } },
                { 
                    $set: { 
                        assignedTo: targetUser._id, 
                        assignedToName: targetUser.name, 
                        assignedToEmployeeId: targetUser.employeeId 
                    } 
                }
            );
        }

        // 6. Notify managers / employee
        try {
            await notifyDailyPlanSubmitted({
                employeeName: employeeName || 'Staff Member',
                date,
                plannedTasksCount: assignedTaskIds.length,
            });
        } catch (pushErr) {
            console.warn('[PushNotification:Plan] Non-fatal notification error:', pushErr);
        }

        return res.status(201).json({
            success: true,
            message: 'Daily production plan recorded and employee queue dispatched successfully.',
            data: plan,
        });
    } catch (error) {
        console.error('[API:Plans:Daily:POST] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to save daily plan' });
    }
});

router.put('/daily', async (req, res) => {
    try {
        await connectToDatabase();
        const date = req.body.date || getTodayDateString();
        const employeeId = req.user?.employeeId || req.user?.userId;
        const plan = await Plan.findOneAndUpdate(
            { $or: [{ employeeId }, { userId: req.user?.userId }], date },
            { ...req.body },
            { new: true, runValidators: false }
        );
        return res.json({
            success: true,
            message: 'Daily production plan updated successfully.',
            data: plan,
        });
    } catch (error) {
        console.error('[API:Plans:Daily:PUT] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update plan' });
    }
});

// ==========================================
// 2. WEEKLY PLANS
// ==========================================

router.get('/weekly', async (req, res) => {
    try {
        await connectToDatabase();
        const weeklyPlans = await WeeklyPlan.find()
            .populate('projects', 'title status')
            .populate('tasks', 'title status priority')
            .sort({ weekStartDate: -1 })
            .lean();

        return res.json({
            success: true,
            data: {
                weeklyPlans,
                count: weeklyPlans.length,
            },
            weeklyPlans,
        });
    } catch (error) {
        console.error('[API:Plans:Weekly:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch weekly plans' });
    }
});

// ==========================================
// 3. MONTHLY CHANNEL TARGETS
// ==========================================

router.get('/monthly', async (req, res) => {
    try {
        await connectToDatabase();
        const monthlyPlans = await MonthlyPlan.find()
            .populate('channelId', 'name platform')
            .sort({ year: -1, month: -1 })
            .lean();

        return res.json({
            success: true,
            data: {
                monthlyPlans,
                count: monthlyPlans.length,
            },
            monthlyPlans,
        });
    } catch (error) {
        console.error('[API:Plans:Monthly:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch monthly plans' });
    }
});

router.post('/monthly', async (req, res) => {
    try {
        await connectToDatabase();
        const { channelId, year, month, targetLongformVideos, targetShortsReels, primaryFocus } = req.body;
        
        if (!channelId || !year || !month) {
            return res.status(400).json({ success: false, error: 'Channel, year, and month are required.' });
        }

        const plan = await MonthlyPlan.findOneAndUpdate(
            { channelId, year, month },
            {
                channelId,
                year,
                month,
                targetLongformVideos: Number(targetLongformVideos) || 0,
                targetShortsReels: Number(targetShortsReels) || 0,
                primaryFocus: primaryFocus || '',
                managerId: req.user?.userId,
                managerName: req.user?.name,
            },
            { upsert: true, new: true, runValidators: false }
        ).populate('channelId', 'name platform').lean();

        return res.status(201).json({
            success: true,
            message: 'Monthly channel target saved successfully.',
            data: plan,
        });
    } catch (error) {
        console.error('[API:Plans:Monthly:POST] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to save monthly plan' });
    }
});

export default router;
