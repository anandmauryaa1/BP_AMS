import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { EmployeeDocument } from '../models/EmployeeDocument.js';
import { ExitClearance } from '../models/ExitClearance.js';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// --- DIGITAL DOCUMENT VAULT ---
router.get('/documents', async (req, res) => {
    try {
        await connectToDatabase();
        const query = {};
        if (req.user?.role === 'EMPLOYEE') {
            query.employeeId = String(req.user.employeeId).toUpperCase();
        } else if (req.query.employeeId) {
            query.employeeId = String(req.query.employeeId).toUpperCase();
        }

        const docs = await EmployeeDocument.find(query).sort({ createdAt: -1 }).lean();
        return res.json({ success: true, data: docs });
    } catch (error) {
        console.error('[API:HCM:Documents:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch employee documents' });
    }
});

router.post('/documents', async (req, res) => {
    try {
        await connectToDatabase();
        const empId = req.user?.role === 'EMPLOYEE'
            ? String(req.user.employeeId).toUpperCase()
            : String(req.body.employeeId || req.user?.employeeId).toUpperCase();

        const doc = await EmployeeDocument.create({
            ...req.body,
            employeeId: empId,
            uploadedBy: req.user?.name || req.user?.userId,
        });

        return res.status(201).json({ success: true, data: doc });
    } catch (error) {
        console.error('[API:HCM:Documents:POST] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to upload document' });
    }
});

// --- EXIT CLEARANCE & OFFBOARDING (FnF) ---
router.get('/exit-clearance', async (req, res) => {
    try {
        await connectToDatabase();
        const query = {};
        if (req.user?.role === 'EMPLOYEE') {
            query.employeeId = String(req.user.employeeId).toUpperCase();
        } else if (req.query.employeeId) {
            query.employeeId = String(req.query.employeeId).toUpperCase();
        }

        const clearances = await ExitClearance.find(query).sort({ createdAt: -1 }).lean();
        return res.json({ success: true, data: clearances });
    } catch (error) {
        console.error('[API:HCM:ExitClearance:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch exit clearances' });
    }
});

router.post('/exit-clearance', async (req, res) => {
    try {
        await connectToDatabase();
        const empId = String(req.body.employeeId || req.user?.employeeId).toUpperCase();
        const clearance = await ExitClearance.create({
            ...req.body,
            employeeId: empId,
            employeeName: req.body.employeeName || req.user?.name,
        });

        return res.status(201).json({ success: true, data: clearance });
    } catch (error) {
        console.error('[API:HCM:ExitClearance:POST] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to submit exit clearance' });
    }
});

router.patch('/exit-clearance/:id', requireManagerOrAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        const updated = await ExitClearance.findByIdAndUpdate(
            req.params.id,
            { ...req.body },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, error: 'Exit clearance record not found' });
        }

        return res.json({ success: true, data: updated });
    } catch (error) {
        console.error('[API:HCM:ExitClearance:PATCH] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update exit clearance' });
    }
});

export default router;
