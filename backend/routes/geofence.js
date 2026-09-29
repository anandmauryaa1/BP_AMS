import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { OfficeLocation } from '../models/OfficeLocation.js';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth.js';
import { validateGeofenceCheckIn } from '../services/geofence-service.js';

const router = Router();
router.use(authenticateToken);

// GET /api/geofence - Fetch all office locations
router.get('/', async (req, res) => {
    try {
        await connectToDatabase();
        const locations = await OfficeLocation.find({ isActive: true }).sort({ name: 1 }).lean();
        return res.json({ success: true, data: locations });
    } catch (error) {
        console.error('[API:Geofence:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch office locations' });
    }
});

// POST /api/geofence - Create/Update Office Geofence (Admin)
router.post('/', requireManagerOrAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        const location = await OfficeLocation.findOneAndUpdate(
            { code: req.body.code.toUpperCase() },
            { ...req.body, code: req.body.code.toUpperCase() },
            { new: true, upsert: true }
        );
        return res.status(201).json({ success: true, data: location });
    } catch (error) {
        console.error('[API:Geofence:POST] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to save office location' });
    }
});

// POST /api/geofence/verify - Test check-in geofence validation
router.post('/verify', async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const result = await validateGeofenceCheckIn(latitude, longitude, req.ip);
        return res.json({ success: true, data: result });
    } catch (error) {
        console.error('[API:Geofence:Verify] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Geofence validation failed' });
    }
});

export default router;
