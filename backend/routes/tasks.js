import { Router } from 'express';
import mongoose from 'mongoose';
import { connectToDatabase } from '../db.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth.js';
import { recordTaskEvent, recordReviewEvent } from '../services/events.js';
import { notifyTaskScheduled, notifyTaskStatusUpdate, notifyTaskRescheduled, notifyTaskReassigned, } from '../services/pushNotification.js';
import { escapeRegExp, resolveUserObjectId } from '../utils/index.js';
const router = Router();
router.use(authenticateToken);
router.get('/', async (req, res) => {
    try {
        await connectToDatabase();
        const { projectId, assignedTo, status, priority, taskType, search, myTasks } = req.query;
        const query = {};
        if (projectId)
            query.projectId = projectId;
        if (myTasks === 'true' && req.user?.userId) {
            query.assignedTo = req.user.userId;
        } else if (assignedTo === 'unassigned' || assignedTo === 'none') {
            query.assignedTo = { $in: [null, undefined] };
        } else if (assignedTo) {
            const resolvedId = await resolveUserObjectId(assignedTo, User);
            if (resolvedId) {
                query.assignedTo = resolvedId;
            }
        }
        if (status && status !== 'ALL')
            query.status = status;
        if (priority && priority !== 'ALL')
            query.priority = priority;
        if (taskType && taskType !== 'ALL')
            query.taskType = taskType;
        if (search) {
            const safeSearch = escapeRegExp(String(search));
            query.$or = [
                { title: { $regex: safeSearch, $options: 'i' } },
                { description: { $regex: safeSearch, $options: 'i' } },
            ];
        }
        const tasks = await Task.find(query)
            .populate('projectId', 'title code')
            .populate('assignedTo', 'name employeeId email department')
            .populate('deliverableId', 'title platform format')
            .sort({ updatedAt: -1 })
            .lean();
        return res.json({ success: true, data: tasks, tasks });
    }
    catch (error) {
        console.error('[API:Tasks:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
    }
});
router.post('/', requireManagerOrAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        const taskData = { ...req.body };

        // 1. Auto-generate unique taskId if missing
        if (!taskData.taskId) {
            taskData.taskId = `TSK-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        }

        // 2. Set assignedBy from current authenticated user
        taskData.assignedBy = req.user?.userId;
        taskData.assignedByName = req.user?.name || req.user?.username || 'Administrator';

        // 3. Resolve assignedTo and assignedToName
        const rawAssignee = taskData.assignedTo || taskData.assigneeId;
        if (rawAssignee && rawAssignee !== 'unassigned') {
            const assigneeQuery = [];
            if (mongoose.Types.ObjectId.isValid(rawAssignee) && String(rawAssignee).length === 24) {
                assigneeQuery.push({ _id: rawAssignee });
            }
            assigneeQuery.push({ employeeId: String(rawAssignee) });
            assigneeQuery.push({ username: String(rawAssignee) });

            const assigneeUser = await User.findOne({ $or: assigneeQuery }).lean();
            if (assigneeUser) {
                taskData.assignedTo = assigneeUser._id;
                taskData.assignedToName = assigneeUser.name;
            } else if (mongoose.Types.ObjectId.isValid(rawAssignee)) {
                taskData.assignedTo = rawAssignee;
            } else {
                taskData.assignedTo = undefined;
                taskData.assignedToName = undefined;
            }
        } else {
            taskData.assignedTo = undefined;
            taskData.assignedToName = undefined;
        }

        // 4. Clean up projectId and deliverableId if empty string or null
        if (!taskData.projectId || taskData.projectId === '' || taskData.projectId === 'undefined') {
            delete taskData.projectId;
        }
        if (!taskData.deliverableId || taskData.deliverableId === '' || taskData.deliverableId === 'undefined') {
            delete taskData.deliverableId;
        }

        // 5. Clean up dates
        if (taskData.dueDate && typeof taskData.dueDate === 'string') {
            taskData.dueDate = new Date(taskData.dueDate);
        }
        if (taskData.startDate && typeof taskData.startDate === 'string') {
            taskData.startDate = new Date(taskData.startDate);
        }

        const task = await Task.create({
            ...taskData,
            createdBy: req.user?.userId,
        });

        if (task.assignedTo) {
            await recordTaskEvent({
                taskId: task._id.toString(),
                employeeId: task.assignedTo.toString(),
                projectId: task.projectId ? task.projectId.toString() : undefined,
                eventType: 'TASK_CREATED',
                metadata: { title: task.title, priority: task.priority },
            });
        }
        // Trigger instant Web Push notification to assigned employee and managers
        try {
            await notifyTaskScheduled({
                task,
                creatorName: req.user?.name,
            });
        }
        catch (pushErr) {
            console.warn('[PushNotification:Task] Non-fatal notification error:', pushErr);
        }
        return res.status(201).json({
            success: true,
            message: 'Task scheduled successfully. Assigned staff and managers have been notified.',
            data: task,
        });
    }
    catch (error) {
        console.error('[API:Tasks:POST] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to create task' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        await connectToDatabase();
        const task = await Task.findById(req.params.id)
            .populate('projectId', 'title code')
            .populate('assignedTo', 'name employeeId email department')
            .populate('deliverableId', 'title platform format')
            .lean();
        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }
        return res.json({ success: true, data: task });
    }
    catch (error) {
        console.error('[API:Tasks:GET_ID] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch task' });
    }
});
const handleUpdateTask = async (req, res) => {
    try {
        await connectToDatabase();
        const { id } = req.params;
        const oldTask = await Task.findById(id);
        if (!oldTask) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }
        const oldStatus = oldTask.status;
        const updates = { ...req.body };

        const rawAssignee = updates.assignedTo !== undefined ? updates.assignedTo : updates.assigneeId;
        if (rawAssignee !== undefined) {
            if (!rawAssignee || rawAssignee === 'unassigned' || rawAssignee === '') {
                updates.assignedTo = null;
                updates.assignedToName = null;
            } else {
                const assigneeQuery = [];
                if (mongoose.Types.ObjectId.isValid(rawAssignee) && String(rawAssignee).length === 24) {
                    assigneeQuery.push({ _id: rawAssignee });
                }
                assigneeQuery.push({ employeeId: String(rawAssignee) });
                assigneeQuery.push({ username: String(rawAssignee) });

                const assigneeUser = await User.findOne({ $or: assigneeQuery }).lean();
                if (assigneeUser) {
                    updates.assignedTo = assigneeUser._id;
                    updates.assignedToName = assigneeUser.name;
                } else if (mongoose.Types.ObjectId.isValid(rawAssignee)) {
                    updates.assignedTo = rawAssignee;
                }
            }
        }

        if (updates.projectId === '' || updates.projectId === 'null') {
            updates.projectId = null;
        }
        const updatedTask = await Task.findByIdAndUpdate(id, updates, { new: true })
            .populate('projectId', 'title code')
            .populate('assignedTo', 'name employeeId email department')
            .populate('deliverableId', 'title platform format');
        if (updatedTask && updates.status && updates.status !== oldStatus) {
            const empId = updatedTask.assignedTo?._id?.toString() || updatedTask.assignedTo?.toString() || req.user?.userId;
            const projId = updatedTask.projectId?._id?.toString() || updatedTask.projectId?.toString();
            let eventType = 'TASK_STARTED';
            if (updates.status === 'COMPLETED')
                eventType = 'TASK_COMPLETED';
            else if (updates.status === 'IN_PROGRESS')
                eventType = 'TASK_STARTED';
            else if (updates.status === 'BLOCKED')
                eventType = 'TASK_BLOCKED';
            else if (updates.status === 'READY_FOR_REVIEW')
                eventType = 'TASK_SUBMITTED';
            await recordTaskEvent({
                taskId: String(id),
                employeeId: empId,
                projectId: projId,
                eventType,
                metadata: { oldStatus, newStatus: updates.status },
            });
            if (updates.status === 'READY_FOR_REVIEW') {
                await recordReviewEvent({
                    taskId: String(id),
                    projectId: projId,
                    reviewerId: req.user?.userId || empId,
                    employeeId: empId,
                    status: 'SUBMITTED',
                    notes: updates.reviewNotes || 'Submitted for review',
                });
            }
            else if (updates.status === 'COMPLETED') {
                await recordReviewEvent({
                    taskId: String(id),
                    projectId: projId,
                    reviewerId: req.user?.userId || empId,
                    employeeId: empId,
                    status: 'APPROVED',
                    notes: updates.reviewNotes || 'Approved and completed',
                });
            }
            else if (updates.status === 'REVISION') {
                await recordReviewEvent({
                    taskId: String(id),
                    projectId: projId,
                    reviewerId: req.user?.userId || empId,
                    employeeId: empId,
                    status: 'REVISION_REQUIRED',
                    notes: updates.reviewNotes || 'Revision required',
                });
            }
        }
        if (updates.status) {
            try {
                await notifyTaskStatusUpdate({
                    task: updatedTask,
                    updatedBy: req.user,
                    status: updates.status,
                    notes: updates.reviewNotes,
                });
            }
            catch (pushErr) {
                console.warn('[PushNotification:TaskUpdate] Non-fatal notification error:', pushErr);
            }
        }
        // Trigger notification if task was reassigned to a different staff member
        if (updates.assignedTo && String(updates.assignedTo) !== String(oldTask.assignedTo)) {
            try {
                await notifyTaskReassigned({
                    task: updatedTask,
                    newAssigneeId: String(updates.assignedTo),
                    previousAssigneeId: oldTask.assignedTo ? String(oldTask.assignedTo) : undefined,
                    reassignedBy: req.user,
                });
            }
            catch (pushErr) {
                console.warn('[PushNotification:TaskReassign] Non-fatal notification error:', pushErr);
            }
        }
        // Trigger notification if due date was rescheduled
        if (updates.dueDate &&
            (!oldTask.dueDate || new Date(updates.dueDate).getTime() !== new Date(oldTask.dueDate).getTime())) {
            try {
                await notifyTaskRescheduled({
                    task: updatedTask,
                    rescheduledBy: req.user,
                    oldDueDate: oldTask.dueDate,
                    newDueDate: updates.dueDate,
                });
            }
            catch (pushErr) {
                console.warn('[PushNotification:TaskReschedule] Non-fatal notification error:', pushErr);
            }
        }
        return res.json({
            success: true,
            message: 'Task updated successfully and notifications dispatched.',
            data: updatedTask,
        });
    }
    catch (error) {
        console.error('[API:Tasks:UPDATE] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update task' });
    }
};

router.put('/:id', handleUpdateTask);
router.patch('/:id', handleUpdateTask);
router.put('/:id/status', handleUpdateTask);
router.patch('/:id/status', handleUpdateTask);
router.delete('/:id', requireManagerOrAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        const deleted = await Task.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }
        return res.json({ success: true, message: 'Task deleted successfully' });
    }
    catch (error) {
        console.error('[API:Tasks:DELETE] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete task' });
    }
});
export default router;
