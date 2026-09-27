import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { Project } from '../models/Project.js';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth.js';
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
        const project = await Project.create({
            ...req.body,
            createdBy: req.user?.userId,
        });
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
router.put('/:id', requireManagerOrAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        return res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error('[API:Projects:PUT] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update project' });
    }
});
router.delete('/:id', requireManagerOrAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        const deleted = await Project.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        return res.json({ success: true, message: 'Project deleted successfully' });
    }
    catch (error) {
        console.error('[API:Projects:DELETE] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete project' });
    }
});
export default router;
