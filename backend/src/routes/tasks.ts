import { Router, Request, Response } from 'express';
import { connectToDatabase } from '../db.js';
import { Task } from '../models/Task.js';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth.js';
import { recordTaskEvent, recordReviewEvent } from '../services/events.js';
import {
  notifyTaskScheduled,
  notifyTaskStatusUpdate,
  notifyTaskRescheduled,
  notifyTaskReassigned,
} from '../services/pushNotification.js';

const router = Router();

router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const { projectId, assignedTo, status, priority, taskType, search } = req.query;

    const query: any = {};
    if (projectId) query.projectId = projectId;
    if (assignedTo) query.assignedTo = assignedTo;
    if (status && status !== 'ALL') query.status = status;
    if (priority && priority !== 'ALL') query.priority = priority;
    if (taskType && taskType !== 'ALL') query.taskType = taskType;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const tasks = await Task.find(query)
      .populate('projectId', 'title code')
      .populate('assignedTo', 'name employeeId email department')
      .populate('deliverableId', 'title platform format')
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({ success: true, data: tasks });
  } catch (error: any) {
    console.error('[API:Tasks:GET] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
});

router.post('/', requireManagerOrAdmin, async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const taskData = req.body;

    const task = await Task.create({
      ...taskData,
      createdBy: req.user?.userId,
    });

    if (task.assignedTo) {
      await recordTaskEvent({
        taskId: task._id.toString(),
        employeeId: task.assignedTo.toString(),
        projectId: task.projectId.toString(),
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
    } catch (pushErr) {
      console.warn('[PushNotification:Task] Non-fatal notification error:', pushErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Task scheduled successfully. Assigned staff and managers have been notified.',
      data: task,
    });
  } catch (error: any) {
    console.error('[API:Tasks:POST] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to create task' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('[API:Tasks:GET_ID] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch task' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const oldTask = await Task.findById(id);

    if (!oldTask) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const oldStatus = oldTask.status;
    const updates = req.body;

    const updatedTask = await Task.findByIdAndUpdate(id, updates, { new: true })
      .populate('projectId', 'title code')
      .populate('assignedTo', 'name employeeId email department')
      .populate('deliverableId', 'title platform format');

    if (updatedTask && updates.status && updates.status !== oldStatus) {
      const empId = (updatedTask.assignedTo as any)?._id?.toString() || updatedTask.assignedTo?.toString() || req.user?.userId;
      const projId = (updatedTask.projectId as any)?._id?.toString() || updatedTask.projectId?.toString();

      let eventType: any = 'TASK_STARTED';
      if (updates.status === 'COMPLETED') eventType = 'TASK_COMPLETED';
      else if (updates.status === 'IN_PROGRESS') eventType = 'TASK_STARTED';
      else if (updates.status === 'BLOCKED') eventType = 'TASK_BLOCKED';
      else if (updates.status === 'READY_FOR_REVIEW') eventType = 'TASK_SUBMITTED';

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
      } else if (updates.status === 'COMPLETED') {
        await recordReviewEvent({
          taskId: String(id),
          projectId: projId,
          reviewerId: req.user?.userId || empId,
          employeeId: empId,
          status: 'APPROVED',
          notes: updates.reviewNotes || 'Approved and completed',
        });
      } else if (updates.status === 'REVISION') {
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
      } catch (pushErr) {
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
      } catch (pushErr) {
        console.warn('[PushNotification:TaskReassign] Non-fatal notification error:', pushErr);
      }
    }

    // Trigger notification if due date was rescheduled
    if (
      updates.dueDate &&
      (!oldTask.dueDate || new Date(updates.dueDate).getTime() !== new Date(oldTask.dueDate).getTime())
    ) {
      try {
        await notifyTaskRescheduled({
          task: updatedTask,
          rescheduledBy: req.user,
          oldDueDate: oldTask.dueDate,
          newDueDate: updates.dueDate,
        });
      } catch (pushErr) {
        console.warn('[PushNotification:TaskReschedule] Non-fatal notification error:', pushErr);
      }
    }

    return res.json({
      success: true,
      message: 'Task updated successfully and notifications dispatched.',
      data: updatedTask,
    });
  } catch (error: any) {
    console.error('[API:Tasks:PUT] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update task' });
  }
});

router.delete('/:id', requireManagerOrAdmin, async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const deleted = await Task.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    return res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error: any) {
    console.error('[API:Tasks:DELETE] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
});

export default router;
