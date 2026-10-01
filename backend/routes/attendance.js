import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { Attendance } from '../models/Attendance.js';
import { User } from '../models/User.js';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth.js';
import { getTodayAttendance, checkIn, startBreak, endBreak, checkOut, } from '../services/attendance.js';
import { getTodayDateString } from '../utils/index.js';
import { validateGeofenceCheckIn } from '../services/geofence-service.js';

const router = Router();
router.use(authenticateToken);

async function resolveEmployeeId(req) {
    if (req.user?.employeeId) {
        return String(req.user.employeeId).toUpperCase();
    }
    if (req.user?.userId) {
        await connectToDatabase();
        const user = await User.findById(req.user.userId).select('employeeId').lean();
        if (user?.employeeId) {
            return String(user.employeeId).toUpperCase();
        }
    }
    return null;
}

function parseYearAndMonth(yearQuery, monthQuery) {
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;

    if (monthQuery && typeof monthQuery === 'string' && monthQuery.includes('-')) {
        const parts = monthQuery.split('-');
        const parsedY = parseInt(parts[0], 10);
        const parsedM = parseInt(parts[1], 10);
        if (!isNaN(parsedY)) year = parsedY;
        if (!isNaN(parsedM)) month = parsedM;
    } else {
        if (yearQuery) {
            const parsedY = parseInt(yearQuery, 10);
            if (!isNaN(parsedY)) year = parsedY;
        }
        if (monthQuery) {
            const parsedM = parseInt(monthQuery, 10);
            if (!isNaN(parsedM)) month = parsedM;
        }
    }
    return { year, month, monthPrefix: `${year}-${String(month).padStart(2, '0')}` };
}

router.get('/today', async (req, res) => {
    try {
        let employeeId = await resolveEmployeeId(req);
        if (req.query.employeeId) {
            const targetEmpId = String(req.query.employeeId).toUpperCase();
            if (req.user?.role === 'EMPLOYEE' && targetEmpId !== employeeId && req.query.employeeId !== req.user?.userId) {
                return res.status(403).json({ success: false, error: 'Forbidden: Cannot view other employee attendance' });
            }
            employeeId = targetEmpId;
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
        const employeeId = await resolveEmployeeId(req);
        if (!employeeId) {
            return res.status(400).json({ success: false, error: 'User employee ID not found in session' });
        }
        const { location } = req.body || {};

        // Digital Geofence Validation
        if (location && location.latitude && location.longitude) {
            const geofenceResult = await validateGeofenceCheckIn(location.latitude, location.longitude, req.ip);
            if (!geofenceResult.isValid) {
                return res.status(400).json({
                    success: false,
                    error: geofenceResult.error || 'Digital Check-in denied: Outside approved office geofence boundary.',
                    geofenceDetails: geofenceResult,
                });
            }
        }

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
        const employeeId = await resolveEmployeeId(req);
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
        const employeeId = await resolveEmployeeId(req);
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
        const employeeId = await resolveEmployeeId(req);
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

const handleMonthlyOrHistory = async (req, res) => {
    try {
        let employeeId = await resolveEmployeeId(req);
        if (req.query.employeeId) {
            const targetEmpId = String(req.query.employeeId).toUpperCase();
            if (req.user?.role === 'EMPLOYEE' && targetEmpId !== employeeId && req.query.employeeId !== req.user?.userId) {
                return res.status(403).json({ success: false, error: 'Forbidden: Cannot view other employee attendance' });
            }
            employeeId = targetEmpId;
        }

        if (!employeeId) {
            return res.status(400).json({ success: false, error: 'Employee ID could not be identified' });
        }

        const { monthPrefix } = parseYearAndMonth(req.query.year, req.query.month);

        await connectToDatabase();
        const records = await Attendance.find({
            employeeId,
            date: { $regex: `^${monthPrefix}` },
        }).sort({ date: 1 }).lean();

        let totalWorkingMinutes = 0;
        let totalBreakMinutes = 0;
        let presentDays = 0;
        let completedDays = 0;

        records.forEach((r) => {
            totalWorkingMinutes += (r.totalWorkingMinutes || 0);
            totalBreakMinutes += (r.totalBreakMinutes || 0);
            if (['PRESENT', 'COMPLETED', 'ON_BREAK'].includes(r.status)) {
                presentDays++;
            }
            if (r.status === 'COMPLETED') {
                completedDays++;
            }
        });

        const summary = {
            totalDays: records.length,
            presentDays,
            completedDays,
            totalWorkingMinutes,
            totalBreakMinutes,
        };

        return res.json({
            success: true,
            data: {
                records,
                summary,
            },
            records,
            summary,
        });
    }
    catch (error) {
        console.error('[API:Attendance:History] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch attendance history' });
    }
};

router.get('/monthly', handleMonthlyOrHistory);
router.get('/history', handleMonthlyOrHistory);

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
        const userEmpId = await resolveEmployeeId(req);
        if (req.user?.role === 'EMPLOYEE' && attendance.employeeId !== userEmpId && attendance.employeeId !== req.user?.userId) {
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
