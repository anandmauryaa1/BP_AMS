import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { WorkSession } from '../models/WorkSession.js';
import { Task } from '../models/Task.js';
import { authenticateToken } from '../middleware/auth.js';
import { recordTaskEvent } from '../services/events.js';
const router = Router();
router.use(authenticateToken);
router.get('/current', async (req, res) => {
    try {
        await connectToDatabase();
        const employeeId = req.user?.employeeId || req.user?.userId;
        const currentSession = await WorkSession.findOne({
            $or: [{ employeeId }, { employeeId: req.user?.userId }],
            endTime: { $exists: false },
        })
            .populate('projectId', 'title code')
            .populate('taskId', 'title')
            .lean();
        return res.json({ success: true, data: currentSession });
    }
    catch (error) {
        console.error('[API:WorkSessions:Current] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch current work session' });
    }
});
router.post('/start', async (req, res) => {
    try {
        await connectToDatabase();
        const employeeId = req.user?.employeeId || req.user?.userId;
        const { projectId, taskId, projectTitle } = req.body;
        if (!projectId) {
            return res.status(400).json({ success: false, error: 'Project ID is required' });
        }
        // Stop existing open session if any
        const openSession = await WorkSession.findOne({
            $or: [{ employeeId }, { employeeId: req.user?.userId }],
            endTime: { $exists: false },
        });
        if (openSession) {
            const now = new Date();
            const mins = Math.max(0, Math.round((now.getTime() - new Date(openSession.startTime).getTime()) / 60000));
            openSession.endTime = now;
            openSession.durationMinutes = mins;
            await openSession.save();
        }
        const newSession = await WorkSession.create({
            employeeId,
            projectId,
            taskId: taskId || undefined,
            projectTitle: projectTitle || 'Project Session',
            startTime: new Date(),
        });
        if (taskId) {
            await recordTaskEvent({
                taskId,
                employeeId: employeeId,
                projectId,
                eventType: 'TASK_STARTED',
            });
            await Task.findByIdAndUpdate(taskId, { status: 'IN_PROGRESS' });
        }
        return res.status(201).json({ success: true, data: newSession });
    }
    catch (error) {
        console.error('[API:WorkSessions:Start] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to start work session' });
    }
});
router.post('/stop', async (req, res) => {
    try {
        await connectToDatabase();
        const employeeId = req.user?.employeeId || req.user?.userId;
        const openSession = await WorkSession.findOne({
            $or: [{ employeeId }, { employeeId: req.user?.userId }],
            endTime: { $exists: false },
        });
        if (!openSession) {
            return res.status(400).json({ success: false, error: 'No active work session found to stop' });
        }
        const now = new Date();
        const mins = Math.max(0, Math.round((now.getTime() - new Date(openSession.startTime).getTime()) / 60000));
        openSession.endTime = now;
        openSession.durationMinutes = mins;
        await openSession.save();
        if (openSession.taskId) {
            await recordTaskEvent({
                taskId: openSession.taskId.toString(),
                employeeId: employeeId,
                projectId: openSession.projectId.toString(),
                eventType: 'TASK_PAUSED',
                metadata: { durationMinutes: mins },
            });
        }
        return res.json({ success: true, data: openSession });
    }
    catch (error) {
        console.error('[API:WorkSessions:Stop] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to stop work session' });
    }
});
export default router;
