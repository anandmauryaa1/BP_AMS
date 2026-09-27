import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { Attendance } from '../models/Attendance.js';
import { User } from '../models/User.js';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth.js';
import { getTodayAttendance, checkIn, startBreak, endBreak, checkOut, } from '../services/attendance.js';
import { getTodayDateString } from '../utils/index.js';
const router = Router();
router.use(authenticateToken);
router.get('/today', async (req, res) => {
    try {
        let employeeId = req.user?.employeeId || req.user?.userId;
        if (req.query.employeeId) {
            if (req.user?.role === 'EMPLOYEE' && req.query.employeeId !== req.user.employeeId && req.query.employeeId !== req.user.userId) {
                return res.status(403).json({ success: false, error: 'Forbidden: Cannot view other employee attendance' });
            }
            employeeId = req.query.employeeId;
        }
        if (!employeeId) {
            return res.status(400).json({ success: false, error: 'Employee ID is required' });
        }
        const attendance = await getTodayAttendance(employeeId, req.query.date);
        return res.json({
            success: true,
            data: attendance || {
                employeeId,
                date: req.query.date || getTodayDateString(),
                status: 'NOT_CHECKED_IN',
                breaks: [],
                sessions: [],
                totalWorkingMinutes: 0,
                totalBreakMinutes: 0,
            },
        });
    }
    catch (error) {
        console.error('[API:Attendance:Today] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch attendance' });
    }
});
router.post('/check-in', async (req, res) => {
    try {
        const employeeId = req.user?.employeeId;
        if (!employeeId) {
            return res.status(400).json({ success: false, error: 'User employee ID not found in session' });
        }
        const { location } = req.body || {};
        const result = await checkIn(employeeId, location);
        if (!result.success) {
            return res.status(400).json(result);
        }
        return res.json(result);
    }
    catch (error) {
        console.error('[API:Attendance:CheckIn] Error:', error);
        return res.status(500).json({ success: false, error: 'Check-in failed' });
    }
});
router.post(['/break-start', '/break/start'], async (req, res) => {
    try {
        const employeeId = req.user?.employeeId;
        if (!employeeId) {
            return res.status(400).json({ success: false, error: 'User employee ID not found in session' });
        }
        const result = await startBreak(employeeId);
        if (!result.success) {
            return res.status(400).json(result);
        }
        return res.json(result);
    }
    catch (error) {
        console.error('[API:Attendance:BreakStart] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to start break' });
    }
});
router.post(['/break-end', '/break/end'], async (req, res) => {
    try {
        const employeeId = req.user?.employeeId;
        if (!employeeId) {
            return res.status(400).json({ success: false, error: 'User employee ID not found in session' });
        }
        const result = await endBreak(employeeId);
        if (!result.success) {
            return res.status(400).json(result);
        }
        return res.json(result);
    }
    catch (error) {
        console.error('[API:Attendance:BreakEnd] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to end break' });
    }
});
router.post('/check-out', async (req, res) => {
    try {
        const employeeId = req.user?.employeeId;
        if (!employeeId) {
            return res.status(400).json({ success: false, error: 'User employee ID not found in session' });
        }
        const { location } = req.body || {};
        const result = await checkOut(employeeId, location);
        if (!result.success) {
            return res.status(400).json(result);
        }
        return res.json(result);
    }
    catch (error) {
        console.error('[API:Attendance:CheckOut] Error:', error);
        return res.status(500).json({ success: false, error: 'Check-out failed' });
    }
});
router.get('/monthly', async (req, res) => {
    try {
        let employeeId = req.user?.employeeId || req.user?.userId;
        if (req.query.employeeId) {
            if (req.user?.role === 'EMPLOYEE' && req.query.employeeId !== req.user.employeeId && req.query.employeeId !== req.user.userId) {
                return res.status(403).json({ success: false, error: 'Forbidden: Cannot view other employee monthly attendance' });
            }
            employeeId = req.query.employeeId;
        }
        const year = parseInt(req.query.year || new Date().getFullYear().toString(), 10);
        const month = parseInt(req.query.month || (new Date().getMonth() + 1).toString(), 10);
        const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
        await connectToDatabase();
        const records = await Attendance.find({
            employeeId,
            date: { $regex: `^${monthPrefix}` },
        }).sort({ date: 1 }).lean();
        return res.json({ success: true, data: records });
    }
    catch (error) {
        console.error('[API:Attendance:Monthly] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch monthly attendance' });
    }
});
router.get('/all', requireManagerOrAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        const date = req.query.date || getTodayDateString();
        const department = req.query.department;
        let userQuery = { status: 'ACTIVE' };
        if (department && department !== 'ALL') {
            userQuery.department = department;
        }
        const users = await User.find(userQuery).select('name employeeId department designation').lean();
        const empIds = users.map((u) => u.employeeId);
        const attendanceRecords = await Attendance.find({
            employeeId: { $in: empIds },
            date,
        }).lean();
        const attendanceMap = new Map(attendanceRecords.map((a) => [a.employeeId, a]));
        const combined = users.map((u) => {
            const att = attendanceMap.get(u.employeeId);
            return {
                employee: u,
                attendance: att || {
                    employeeId: u.employeeId,
                    date,
                    status: 'NOT_CHECKED_IN',
                    totalWorkingMinutes: 0,
                    totalBreakMinutes: 0,
                },
            };
        });
        return res.json({ success: true, data: combined });
    }
    catch (error) {
        console.error('[API:Attendance:All] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch attendance dashboard data' });
    }
});

router.post('/correction', async (req, res) => {
    try {
        await connectToDatabase();
        const { attendanceId, reason, requestedCheckIn, requestedCheckOut } = req.body;
        if (!attendanceId || !reason) {
            return res.status(400).json({ success: false, message: 'Attendance ID and correction reason are required' });
        }
        const attendance = await Attendance.findById(attendanceId);
        if (!attendance) {
            return res.status(404).json({ success: false, message: 'Attendance record not found' });
        }
        if (req.user?.role === 'EMPLOYEE' && attendance.employeeId !== req.user?.employeeId && attendance.employeeId !== req.user?.userId) {
            return res.status(403).json({ success: false, message: 'Forbidden: Cannot submit correction for other employees' });
        }
        attendance.correction = {
            requestedAt: new Date(),
            requestedCheckIn: requestedCheckIn ? new Date(requestedCheckIn) : undefined,
            requestedCheckOut: requestedCheckOut ? new Date(requestedCheckOut) : undefined,
            reason: String(reason).trim(),
            status: 'PENDING',
        };
        await attendance.save();
        return res.json({
            success: true,
            message: 'Correction request submitted for Admin review',
            data: attendance,
        });
    } catch (error) {
        console.error('[API:Attendance:Correction] Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to submit correction request' });
    }
});

export default router;
