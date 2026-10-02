import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { Deliverable } from '../models/Deliverable.js';
import { authenticateToken } from '../middleware/auth.js';
import { recordReviewEvent } from '../services/events.js';
import { realTimeService } from '../services/RealTimeService.js';
const router = Router();
router.use(authenticateToken);
router.get('/', async (req, res) => {
    try {
        await connectToDatabase();
        const { projectId, channelId, platform, status, assignedTo } = req.query;
        const query = {};
        if (projectId)
            query.projectId = projectId;
        if (channelId)
            query.channelId = channelId;
        if (platform && platform !== 'ALL')
            query.platform = platform;
        if (status && status !== 'ALL')
            query.status = status;
        if (assignedTo)
            query.assignedTo = assignedTo;
        const deliverables = await Deliverable.find(query)
            .populate('projectId', 'title code')
            .populate('channelId', 'name platform')
            .populate('assignedTo', 'name employeeId email')
            .sort({ updatedAt: -1 })
            .lean();
        return res.json({ success: true, data: deliverables });
    }
    catch (error) {
        console.error('[API:Deliverables:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch deliverables' });
    }
});
router.post('/', async (req, res) => {
    try {
        await connectToDatabase();
        const body = { ...req.body };

        // Map frontend 'type' field to the model's 'format' enum field
        const typeToFormatMap = {
            YOUTUBE_MAIN_VIDEO: 'FULL_VIDEO',
            YOUTUBE_LONGFORM: 'FULL_VIDEO',
            YOUTUBE_SHORTS: 'SHORT_VIDEO',
            INSTAGRAM_REEL: 'REEL',
            INSTAGRAM_POST: 'POST',
            INSTAGRAM_CAROUSEL: 'CAROUSEL',
            INSTAGRAM_STORY: 'STORY',
            FACEBOOK_VIDEO: 'FULL_VIDEO',
            FACEBOOK_REEL: 'REEL',
            COMMUNITY_POST: 'POST',
            THUMBNAIL_PRIMARY: 'OTHER',
            TIKTOK_VIDEO: 'SHORT_VIDEO',
            TWITTER_VIDEO: 'SHORT_VIDEO',
        };
        const VALID_FORMATS = ['FULL_VIDEO', 'SHORT_VIDEO', 'REEL', 'POST', 'CAROUSEL', 'STORY', 'OTHER'];

        if (body.type && !body.format) {
            body.format = typeToFormatMap[body.type.toUpperCase()] || 
                          (VALID_FORMATS.includes(body.type.toUpperCase()) ? body.type.toUpperCase() : 'OTHER');
        } else if (body.format && !VALID_FORMATS.includes(body.format.toUpperCase())) {
            body.format = typeToFormatMap[body.format.toUpperCase()] || 'OTHER';
        }
        delete body.type;

        // Map scheduledReleaseDate → scheduledAt
        if (body.scheduledReleaseDate && !body.scheduledAt) {
            body.scheduledAt = body.scheduledReleaseDate;
        }
        delete body.scheduledReleaseDate;
        delete body.targetDurationSeconds;
        delete body.aspectRatio;

        const deliverable = await Deliverable.create(body);
        try {
            realTimeService.broadcast('DELIVERABLE_CREATED', {
                deliverable,
                projectId: deliverable.projectId,
                createdBy: req.user,
            });
        } catch (rtErr) {
            console.warn('[RealTime:DeliverableCreate] Non-fatal broadcast error:', rtErr);
        }
        return res.status(201).json({ success: true, data: deliverable });
    }
    catch (error) {
        console.error('[API:Deliverables:POST] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to create deliverable' });
    }
});


router.get('/:id', async (req, res) => {
    try {
        await connectToDatabase();
        const deliverable = await Deliverable.findById(req.params.id)
            .populate('projectId', 'title code')
            .populate('channelId', 'name platform')
            .populate('assignedTo', 'name employeeId email')
            .lean();
        if (!deliverable) {
            return res.status(404).json({ success: false, error: 'Deliverable not found' });
        }
        return res.json({ success: true, data: deliverable });
    }
    catch (error) {
        console.error('[API:Deliverables:GET_ID] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch deliverable' });
    }
});
const handleUpdateDeliverable = async (req, res) => {
    try {
        await connectToDatabase();
        const { id } = req.params;
        const oldDeliv = await Deliverable.findById(id);
        if (!oldDeliv) {
            return res.status(404).json({ success: false, error: 'Deliverable not found' });
        }
        const updates = req.body;
        const updated = await Deliverable.findByIdAndUpdate(id, updates, { new: true })
            .populate('projectId', 'title code')
            .populate('channelId', 'name platform')
            .populate('assignedTo', 'name employeeId email');
        if (updated && updates.status && updates.status !== oldDeliv.status) {
            const empId = updated.assignedTo?._id?.toString() || updated.assignedTo?.toString() || req.user?.userId;
            const projId = updated.projectId?._id?.toString() || updated.projectId?.toString();
            let reviewStatus = null;
            if (updates.status === 'NEEDS_REVIEW' || updates.status === 'READY_FOR_REVIEW')
                reviewStatus = 'SUBMITTED';
            else if (['APPROVED', 'SCHEDULED', 'PUBLISHED'].includes(updates.status))
                reviewStatus = 'APPROVED';
            else if (updates.status === 'REVISION')
                reviewStatus = 'REVISION_REQUIRED';
            if (reviewStatus && projId && empId) {
                await recordReviewEvent({
                    deliverableId: String(id),
                    projectId: projId,
                    reviewerId: req.user?.userId || empId,
                    employeeId: empId,
                    status: reviewStatus,
                    notes: updates.reviewNotes || `Status updated to ${updates.status}`,
                });
            }
        }

        // Broadcast real-time update across all connected clients
        try {
            realTimeService.broadcast('DELIVERABLE_UPDATED', {
                deliverable: updated,
                deliverableId: updated._id,
                projectId: updated.projectId?._id || updated.projectId,
                status: updated.status,
                updatedBy: req.user,
            });
        } catch (rtErr) {
            console.warn('[RealTime:DeliverableUpdate] Non-fatal broadcast error:', rtErr);
        }

        return res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error('[API:Deliverables:UPDATE] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update deliverable' });
    }
};

router.put('/:id', handleUpdateDeliverable);
router.patch('/:id', handleUpdateDeliverable);
router.delete('/:id', async (req, res) => {
    try {
        await connectToDatabase();
        const deleted = await Deliverable.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Deliverable not found' });
        }
        try {
            realTimeService.broadcast('DELIVERABLE_DELETED', {
                deliverableId: req.params.id,
                projectId: deleted.projectId,
                deletedBy: req.user,
            });
        } catch (rtErr) {
            console.warn('[RealTime:DeliverableDelete] Non-fatal broadcast error:', rtErr);
        }
        return res.json({ success: true, message: 'Deliverable deleted successfully' });
    }
    catch (error) {
        console.error('[API:Deliverables:DELETE] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete deliverable' });
    }
});
export default router;
