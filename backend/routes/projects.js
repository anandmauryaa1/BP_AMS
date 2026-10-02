import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { Project } from '../models/Project.js';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth.js';
import { realTimeService } from '../services/RealTimeService.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
    try {
        await connectToDatabase();
        const { status, category, department } = req.query;
        const query = {};
        if (status && status !== 'ALL')
            query.status = status;
        if (category && category !== 'ALL')
            query.category = category;
        if (department && department !== 'ALL')
            query.department = department;
        const projects = await Project.find(query)
            .populate('managerId', 'name employeeId email')
            .populate('leadAssigneeId', 'name employeeId email department')
            .populate('teamMembers', 'name employeeId email department')
            .sort({ updatedAt: -1 })
            .lean();
        return res.json({ success: true, data: projects });
    }
    catch (error) {
        console.error('[API:Projects:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch projects' });
    }
});
router.post('/', requireManagerOrAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        const payload = { ...req.body };

        if (!payload.title || typeof payload.title !== 'string' || !payload.title.trim()) {
            return res.status(400).json({ success: false, error: 'Project title is required' });
        }
        payload.title = payload.title.trim();

        // Clean empty string ObjectIds to prevent Mongoose CastErrors
        if (!payload.channelId || payload.channelId === '') {
            delete payload.channelId;
        }
        if (Array.isArray(payload.channelIds)) {
            payload.channelIds = payload.channelIds.filter(id => id && typeof id === 'string' && id.trim() !== '');
            if (payload.channelIds.length === 0) delete payload.channelIds;
        }
        if (!payload.seriesId || payload.seriesId === '') {
            delete payload.seriesId;
        }
        if (!payload.leadAssigneeId || payload.leadAssigneeId === '') {
            delete payload.leadAssigneeId;
        }
        if (!payload.code || typeof payload.code !== 'string' || payload.code.trim() === '') {
            delete payload.code;
        } else {
            payload.code = payload.code.trim().toUpperCase();
        }
        if (!payload.projectId || typeof payload.projectId !== 'string' || payload.projectId.trim() === '') {
            delete payload.projectId;
        } else {
            payload.projectId = payload.projectId.trim().toUpperCase();
        }

        payload.createdBy = req.user?.userId || req.user?.employeeId || payload.createdBy;
        if (!payload.managerId && req.user?.userId) {
            payload.managerId = req.user.userId;
        }
        if (!payload.managerName && req.user?.name) {
            payload.managerName = req.user.name;
        }

        const project = await Project.create(payload);
        try {
            realTimeService.broadcast('PROJECT_CREATED', {
                project,
                createdBy: req.user,
            });
        } catch (rtErr) {
            console.warn('[RealTime:ProjectCreate] Non-fatal broadcast error:', rtErr);
        }
        return res.status(201).json({ success: true, data: project });
    }
    catch (error) {
        console.error('[API:Projects:POST] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to create project' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        await connectToDatabase();
        const project = await Project.findById(req.params.id)
            .populate('managerId', 'name employeeId email')
            .populate('leadAssigneeId', 'name employeeId email department')
            .populate('teamMembers', 'name employeeId email department')
            .lean();
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        return res.json({ success: true, data: project });
    }
    catch (error) {
        console.error('[API:Projects:GET_ID] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch project' });
    }
});
const handleUpdateProject = async (req, res) => {
    try {
        await connectToDatabase();
        const updateData = { ...req.body };
        if (updateData.channelId === '') updateData.channelId = null;
        if (updateData.seriesId === '') updateData.seriesId = null;
        if (updateData.leadAssigneeId === '') updateData.leadAssigneeId = null;
        if (Array.isArray(updateData.channelIds)) {
            updateData.channelIds = updateData.channelIds.filter(id => id && typeof id === 'string' && id.trim() !== '');
        }

        const updated = await Project.findByIdAndUpdate(req.params.id, updateData, { new: true })
            .populate('managerId', 'name employeeId email')
            .populate('leadAssigneeId', 'name employeeId email department')
            .populate('teamMembers', 'name employeeId email department');
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        // Broadcast real-time update across all connected users
        try {
            realTimeService.broadcast('PROJECT_UPDATED', {
                project: updated,
                projectId: updated._id,
                updatedBy: req.user,
                status: updated.status,
                leadAssigneeId: updated.leadAssigneeId,
            });
        } catch (rtErr) {
            console.warn('[RealTime:ProjectUpdate] Non-fatal broadcast error:', rtErr);
        }

        return res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error('[API:Projects:UPDATE] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update project' });
    }
};

router.put('/:id', requireManagerOrAdmin, handleUpdateProject);
router.patch('/:id', requireManagerOrAdmin, handleUpdateProject);
router.delete('/:id', requireManagerOrAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        const deleted = await Project.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        try {
            realTimeService.broadcast('PROJECT_DELETED', {
                projectId: req.params.id,
                deletedBy: req.user,
            });
        } catch (rtErr) {
            console.warn('[RealTime:ProjectDelete] Non-fatal broadcast error:', rtErr);
        }
        return res.json({ success: true, message: 'Project deleted successfully' });
    }
    catch (error) {
        console.error('[API:Projects:DELETE] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete project' });
    }
});
export default router;
