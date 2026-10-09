import { Router } from 'express';
import { z } from 'zod';
import { connectToDatabase } from '../db.js';
import { User } from '../models/User.js';
import { Attendance } from '../models/Attendance.js';
import { AuditLog } from '../models/AuditLog.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { Deliverable } from '../models/Deliverable.js';
import { authenticateToken, requireManagerOrAdmin, hashPassword } from '../middleware/auth.js';
import { logAuditEvent } from '../services/audit.js';
import { sendEmail, sendWelcomeEmail, sendAdminPasswordResetEmail } from '../services/email.js';
import { calculateLateCheckIn, getEmployeeShiftConfig } from '../services/attendance.js';
import { getTodayDateString } from '../utils/index.js';
const router = Router();
const CreateEmployeeSchema = z.object({
    employeeId: z.string().min(2).max(20).trim().toUpperCase(),
    username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(30)
        .regex(/^[a-zA-Z0-9._-]+$/, 'Username can only contain letters, numbers, dots, and hyphens')
        .trim()
        .toLowerCase(),
    name: z.string().min(2).max(100).trim(),
    email: z.string().email('Valid email address required').trim().toLowerCase(),
    phone: z.string().optional(),
    department: z.string().min(2).max(50).trim(),
    designation: z.string().optional(),
    role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE']).default('EMPLOYEE'),
    initialPassword: z.string().min(8).optional(),
    password: z.string().min(8).optional(),
    sendWelcomeEmail: z.boolean().default(true),
}).refine(data => data.initialPassword || data.password, {
    message: 'Initial password must be at least 8 characters long',
    path: ['initialPassword']
});
router.use(authenticateToken, requireManagerOrAdmin);
router.get('/employees', async (req, res) => {
    try {
        await connectToDatabase();
        const search = req.query.search || '';
        const department = req.query.department;
        const status = req.query.status;
        const role = req.query.role;
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '50', 10);
        const filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
                { employeeId: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { designation: { $regex: search, $options: 'i' } },
            ];
        }
        if (department && department !== 'ALL') {
            filter.department = department;
        }
        if (status && status !== 'ALL') {
            filter.status = status;
        }
        if (role && role !== 'ALL') {
            filter.role = role;
        }
        else if (!role) {
            filter.role = { $in: ['EMPLOYEE', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'] };
        }
        const totalEmployees = await User.countDocuments(filter);
        const employees = await User.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        return res.json({
            success: true,
            data: {
                employees,
                pagination: {
                    page,
                    limit,
                    totalEmployees,
                    totalPages: Math.ceil(totalEmployees / limit),
                },
            },
        });
    }
    catch (error) {
        console.error('[API:Admin:Employees:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch employees' });
    }
});
router.get('/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await connectToDatabase();
        const employee = await User.findOne({
            $or: [{ _id: id.length === 24 ? id : null }, { employeeId: id }],
        }).lean();
        if (!employee) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }
        return res.json({ success: true, data: employee });
    }
    catch (error) {
        console.error('[API:Admin:EmployeeGET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch employee' });
    }
});
router.post('/employees', async (req, res) => {
    try {
        const parsed = CreateEmployeeSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, error: parsed.error.errors[0]?.message || 'Invalid data' });
        }
        const { employeeId, username, name, email, phone, department, designation, role, initialPassword, sendWelcomeEmail: shouldSendEmail, } = parsed.data;
        const userRole = req.user?.role;
        if (userRole === 'MANAGER' && ['SUPER_ADMIN', 'ADMIN'].includes(role)) {
            return res.status(403).json({ success: false, error: 'Managers cannot create Administrator accounts' });
        }
        await connectToDatabase();
        const existingId = await User.findOne({ employeeId });
        if (existingId) {
            return res.status(400).json({ success: false, error: `Employee ID "${employeeId}" is already assigned` });
        }
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ success: false, error: `Username "${username}" is already taken` });
        }
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ success: false, error: `Email "${email}" is already registered` });
        }
        const passwordToUse = initialPassword || parsed.data.password;
        const passwordHash = await hashPassword(passwordToUse);
        const newEmployee = await User.create({
            employeeId,
            username,
            passwordHash,
            name,
            email,
            phone: phone || undefined,
            department,
            designation: designation || undefined,
            role,
            status: 'ACTIVE',
            mustChangePassword: true,
        });
        if (shouldSendEmail) {
            try {
                const emailResult = await sendWelcomeEmail({
                    to: newEmployee.email,
                    name: newEmployee.name,
                    username: newEmployee.username,
                    temporaryPassword: initialPassword,
                });
                if (!emailResult?.success) {
                    console.warn('[API:Admin] Welcome email was not delivered:', emailResult?.error);
                }
            } catch (err) {
                console.error('[API:Admin] Welcome email execution error:', err?.message);
            }
        }
        await logAuditEvent({
            actorId: req.user.userId,
            actorName: req.user.name,
            actorRole: req.user.role,
            action: 'EMPLOYEE_CREATED',
            targetId: newEmployee._id.toString(),
            targetType: 'USER',
            metadata: { employeeId, username, name, email, department, role },
            ipAddress: req.ip,
        });
        return res.status(201).json({
            success: true,
            message: 'Employee account created successfully',
            data: newEmployee,
        });
    }
    catch (error) {
        console.error('[API:Admin:Employees:POST] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to create employee' });
    }
});
const handleUpdateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        await connectToDatabase();
        const employee = await User.findById(id);
        if (!employee) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }
        const updates = req.body;
        if (updates.name)
            employee.name = updates.name.trim();
        if (updates.email)
            employee.email = updates.email.trim().toLowerCase();
        if (updates.phone !== undefined)
            employee.phone = updates.phone;
        if (updates.department)
            employee.department = updates.department.trim();
        if (updates.designation !== undefined)
            employee.designation = updates.designation;
        if (updates.role)
            employee.role = updates.role;
        if (updates.status) {
            const normalizedStatus = String(updates.status).trim().toUpperCase();
            if (['ACTIVE', 'INACTIVE'].includes(normalizedStatus)) {
                if (employee._id.toString() === req.user.userId && normalizedStatus === 'INACTIVE') {
                    return res.status(400).json({ success: false, error: 'Cannot deactivate your own currently active account' });
                }
                employee.status = normalizedStatus;
            }
        }
        await employee.save();
        await logAuditEvent({
            actorId: req.user.userId,
            actorName: req.user.name,
            actorRole: req.user.role,
            action: 'EMPLOYEE_UPDATED',
            targetId: employee._id.toString(),
            targetType: 'USER',
            metadata: updates,
            ipAddress: req.ip,
        });
        return res.json({ success: true, message: 'Employee updated successfully', data: employee });
    }
    catch (error) {
        console.error('[API:Admin:Employees:UPDATE] Error:', error);
        return res.status(500).json({ success: false, error: error?.message || 'Failed to update employee' });
    }
};

router.put('/employees/:id', handleUpdateEmployee);
router.patch('/employees/:id', handleUpdateEmployee);
router.post('/employees/:id/reset-password', async (req, res) => {
    try {
        const { id } = req.params;
        const newPassword = req.body.newPassword || req.body.temporaryPassword;
        const sendEmailNotification = req.body.sendEmailNotification ?? true;
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ success: false, error: 'New password must be at least 8 characters long' });
        }
        await connectToDatabase();
        const employee = await User.findById(id);
        if (!employee) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }
        employee.passwordHash = await hashPassword(newPassword);
        employee.mustChangePassword = true;
        await employee.save();

        if (sendEmailNotification && employee.email) {
            try {
                const emailResult = await sendAdminPasswordResetEmail({
                    to: employee.email,
                    name: employee.name,
                    temporaryPassword: newPassword,
                });
                if (!emailResult?.success) {
                    console.warn('[API:Admin] Admin reset password email was not delivered:', emailResult?.error);
                }
            } catch (err) {
                console.error('[API:Admin] Admin reset password email execution error:', err?.message);
            }
        }

        await logAuditEvent({
            actorId: req.user.userId,
            actorName: req.user.name,
            actorRole: req.user.role,
            action: 'EMPLOYEE_PASSWORD_RESET_BY_ADMIN',
            targetId: employee._id.toString(),
            targetType: 'USER',
            ipAddress: req.ip,
        });
        return res.json({ success: true, message: 'Password reset successfully' });
    }
    catch (error) {
        console.error('[API:Admin:ResetPassword] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to reset employee password' });
    }
});
router.delete('/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await connectToDatabase();
        const employee = await User.findById(id);
        if (!employee) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }
        await User.findByIdAndDelete(id);
        await logAuditEvent({
            actorId: req.user.userId,
            actorName: req.user.name,
            actorRole: req.user.role,
            action: 'EMPLOYEE_DELETED',
            targetId: employee._id.toString(),
            targetType: 'USER',
            metadata: { username: employee.username, email: employee.email },
            ipAddress: req.ip,
        });
        return res.json({ success: true, message: 'Employee deleted successfully' });
    }
    catch (error) {
        console.error('[API:Admin:Employees:DELETE] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete employee' });
    }
});
router.get('/reports', async (req, res) => {
    try {
        await connectToDatabase();
        const todayStr = getTodayDateString();
        const startDate = req.query.startDate || todayStr;
        const endDate = req.query.endDate || todayStr;

        const totalEmployees = await User.countDocuments({ status: 'ACTIVE' });
        const todayAttendances = await Attendance.find({ date: todayStr }).lean();
        const currentlyWorking = todayAttendances.filter(a => a.status === 'PRESENT').length;
        const currentlyOnBreak = todayAttendances.filter(a => a.status === 'ON_BREAK').length;
        const completedAttendance = todayAttendances.filter(a => a.status === 'COMPLETED').length;
        const presentToday = currentlyWorking + currentlyOnBreak + completedAttendance;
        const absentToday = Math.max(0, totalEmployees - presentToday);
        const lateToday = todayAttendances.filter(a => a.isLate || (a.lateMinutes && a.lateMinutes > 0)).length;
        const pendingCorrectionsCount = await Attendance.countDocuments({ 'correction.status': 'PENDING' });

        const dashboardMetrics = {
            totalEmployees,
            presentToday,
            absentToday,
            lateToday,
            currentlyWorking,
            currentlyOnBreak,
            completedAttendance,
            pendingCorrectionsCount,
        };

        // 2. Production pipeline live metrics
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const [
            activeProjectsCount,
            publishedProjectsCount,
            totalTasksCount,
            pendingTasksCount,
            tasksDueTodayCount,
            overdueTasksCount,
            scheduledDeliverablesCount,
            publishedDeliverablesCount,
            ytFullCount,
            ytShortCount,
            igReelCount,
            fbReelCount,
        ] = await Promise.all([
            Project.countDocuments({ status: { $nin: ['PUBLISHED', 'CANCELLED', 'ARCHIVED'] } }),
            Project.countDocuments({ status: { $in: ['PUBLISHED', 'COMPLETED'] } }),
            Task.countDocuments({}),
            Task.countDocuments({ status: { $nin: ['COMPLETED', 'CANCELLED'] } }),
            Task.countDocuments({
                dueDate: { $gte: startOfToday, $lte: endOfToday },
                status: { $nin: ['COMPLETED', 'CANCELLED'] },
            }),
            Task.countDocuments({
                dueDate: { $lt: startOfToday },
                status: { $nin: ['COMPLETED', 'CANCELLED'] },
            }),
            Deliverable.countDocuments({ status: { $in: ['SCHEDULED', 'PLANNED', 'IN_PRODUCTION', 'READY_FOR_REVIEW'] } }),
            Deliverable.countDocuments({ status: 'PUBLISHED' }),
            Deliverable.countDocuments({ platform: 'YOUTUBE', format: 'FULL_VIDEO', status: 'PUBLISHED' }),
            Deliverable.countDocuments({ platform: 'YOUTUBE', format: 'SHORT_VIDEO', status: 'PUBLISHED' }),
            Deliverable.countDocuments({ platform: 'INSTAGRAM', status: 'PUBLISHED' }),
            Deliverable.countDocuments({ platform: 'FACEBOOK', status: 'PUBLISHED' }),
        ]);

        const productionMetrics = {
            activeProjectsCount,
            publishedProjectsCount,
            totalTasksCount,
            pendingTasksCount,
            tasksDueTodayCount,
            overdueTasksCount,
            scheduledDeliverablesCount,
            publishedDeliverablesCount,
            productionOutput: {
                youtubeVideos: ytFullCount,
                youtubeShorts: ytShortCount,
                instagramReels: igReelCount,
                facebookReels: fbReelCount,
            },
        };

        // 3. Historical range analytics for report export
        const attendanceRecords = await Attendance.find({
            date: { $gte: startDate, $lte: endDate },
        }).lean();
        const users = await User.find({ status: 'ACTIVE' }).select('name employeeId department').lean();
        const userMap = new Map(users.map((u) => [u.employeeId, u]));
        const deptMap = {};

        for (const u of users) {
            if (u.department) {
                deptMap[u.department] = 0;
            }
        }

        const records = [];
        for (const att of attendanceRecords) {
            const u = userMap.get(att.employeeId);
            const dept = u?.department || 'Unassigned';
            const mins = att.totalWorkingMinutes || 0;
            deptMap[dept] = (deptMap[dept] || 0) + mins;
            records.push({
                _id: att._id,
                employeeId: att.employeeId,
                employeeName: u?.name || att.employeeName || att.employeeId,
                department: dept,
                date: att.date,
                status: att.status,
                checkIn: att.checkIn,
                checkOut: att.checkOut,
                totalWorkingMinutes: mins,
                totalBreakMinutes: att.totalBreakMinutes || 0,
                isLate: Boolean(att.isLate || (att.lateMinutes && att.lateMinutes > 0)),
                lateMinutes: att.lateMinutes || 0,
                scheduledShiftStart: att.scheduledShiftStart || '09:30',
                lateGraceMinutes: att.lateGraceMinutes || 15,
            });
        }
        const departmentBreakdown = Object.entries(deptMap).map(([department, totalMinutes]) => ({
            department,
            totalMinutes,
            totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        }));

        return res.json({
            success: true,
            data: {
                dashboardMetrics,
                productionMetrics,
                rangeAnalytics: {
                    startDate,
                    endDate,
                    departmentBreakdown,
                    records,
                },
            },
        });
    }
    catch (error) {
        console.error('[API:Admin:Reports] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch admin reports' });
    }
});

router.get('/attendance', async (req, res) => {
    try {
        await connectToDatabase();
        const date = req.query.date || getTodayDateString();
        const department = req.query.department;
        const status = req.query.status;
        const punctuality = req.query.punctuality; // 'ALL' | 'LATE' | 'ON_TIME'
        const employeeId = req.query.employeeId;
        const limit = parseInt(req.query.limit || '100', 10);
        const page = parseInt(req.query.page || '1', 10);

        let userQuery = { status: 'ACTIVE' };
        if (department && department !== 'ALL') {
            userQuery.department = department;
        }
        if (employeeId) {
            userQuery.$or = [
                { employeeId: { $regex: employeeId, $options: 'i' } },
                { name: { $regex: employeeId, $options: 'i' } },
            ];
        }

        const users = await User.find(userQuery).select('name employeeId department designation role').lean();
        const empIds = users.map((u) => u.employeeId);

        let attQuery = { date, employeeId: { $in: empIds } };
        if (status && status !== 'ALL') {
            attQuery.status = status;
        }

        const attendances = await Attendance.find(attQuery).lean();
        const attMap = new Map(attendances.map((a) => [a.employeeId, a]));

        let records = users.map((u) => {
            const att = attMap.get(u.employeeId);
            if (att) {
                return {
                    _id: att._id,
                    employeeId: u.employeeId,
                    employeeName: u.name,
                    department: u.department,
                    designation: u.designation,
                    date: att.date,
                    status: att.status,
                    checkIn: att.checkIn,
                    checkOut: att.checkOut,
                    totalWorkingMinutes: att.totalWorkingMinutes || 0,
                    totalBreakMinutes: att.totalBreakMinutes || 0,
                    isLate: Boolean(att.isLate || (att.lateMinutes && att.lateMinutes > 0)),
                    lateMinutes: att.lateMinutes || 0,
                    scheduledShiftStart: att.scheduledShiftStart || '09:30',
                    lateGraceMinutes: att.lateGraceMinutes || 15,
                    correction: att.correction,
                    breaks: att.breaks || [],
                    sessions: att.sessions || [],
                };
            }
            return {
                _id: u._id.toString(),
                employeeId: u.employeeId,
                employeeName: u.name,
                department: u.department,
                designation: u.designation,
                date,
                status: 'NOT_CHECKED_IN',
                checkIn: null,
                checkOut: null,
                totalWorkingMinutes: 0,
                totalBreakMinutes: 0,
                isLate: false,
                lateMinutes: 0,
                scheduledShiftStart: '09:30',
                lateGraceMinutes: 15,
                correction: null,
                breaks: [],
                sessions: [],
            };
        });

        if (status && status !== 'ALL') {
            records = records.filter((r) => r.status === status);
        }

        if (punctuality === 'LATE' || req.query.isLate === 'true') {
            records = records.filter((r) => r.isLate || (r.lateMinutes && r.lateMinutes > 0));
        } else if (punctuality === 'ON_TIME') {
            records = records.filter((r) => r.status !== 'NOT_CHECKED_IN' && !r.isLate && (!r.lateMinutes || r.lateMinutes === 0));
        }

        const totalRecords = records.length;
        const paginatedRecords = records.slice((page - 1) * limit, page * limit);

        return res.json({
            success: true,
            data: {
                records: paginatedRecords,
                pagination: {
                    totalRecords,
                    page,
                    limit,
                    totalPages: Math.ceil(totalRecords / limit),
                },
            },
        });
    }
    catch (error) {
        console.error('[API:Admin:Attendance:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch attendance records' });
    }
});

router.patch('/attendance', async (req, res) => {
    try {
        await connectToDatabase();
        const { attendanceId, status, checkIn, checkOut, reason } = req.body;
        if (!attendanceId) {
            return res.status(400).json({ success: false, error: 'Attendance ID is required' });
        }
        let record = await Attendance.findById(attendanceId);
        if (!record) {
            const user = await User.findById(attendanceId).lean();
            if (user) {
                const todayStr = getTodayDateString();
                const checkInDate = checkIn ? new Date(checkIn) : new Date();
                const shiftCfg = await getEmployeeShiftConfig(user.employeeId, todayStr);
                const lateCalc = calculateLateCheckIn(checkInDate, shiftCfg.shiftStartTime, shiftCfg.graceMinutes);
                record = await Attendance.create({
                    employeeId: user.employeeId,
                    date: todayStr,
                    status: status || 'PRESENT',
                    checkIn: checkInDate,
                    checkOut: checkOut ? new Date(checkOut) : null,
                    isLate: lateCalc.isLate,
                    lateMinutes: lateCalc.lateMinutes,
                    scheduledShiftStart: lateCalc.scheduledShiftStart,
                    lateGraceMinutes: lateCalc.lateGraceMinutes,
                });
            } else {
                return res.status(404).json({ success: false, error: 'Attendance record not found' });
            }
        } else {
            if (status) record.status = status;
            if (checkIn !== undefined) {
                record.checkIn = checkIn ? new Date(checkIn) : null;
                if (record.checkIn) {
                    const shiftCfg = await getEmployeeShiftConfig(record.employeeId, record.date);
                    const lateCalc = calculateLateCheckIn(record.checkIn, shiftCfg.shiftStartTime, shiftCfg.graceMinutes);
                    record.isLate = lateCalc.isLate;
                    record.lateMinutes = lateCalc.lateMinutes;
                    record.scheduledShiftStart = lateCalc.scheduledShiftStart;
                    record.lateGraceMinutes = lateCalc.lateGraceMinutes;
                } else {
                    record.isLate = false;
                    record.lateMinutes = 0;
                }
            }
            if (checkOut !== undefined) record.checkOut = checkOut ? new Date(checkOut) : null;
            if (record.checkIn && record.checkOut) {
                const diffMs = record.checkOut.getTime() - record.checkIn.getTime();
                record.totalWorkingMinutes = Math.max(0, Math.floor(diffMs / 60000) - (record.totalBreakMinutes || 0));
            }
            await record.save();
        }

        await logAuditEvent({
            actorId: req.user.userId,
            actorName: req.user.name,
            actorRole: req.user.role,
            action: 'ATTENDANCE_MANUAL_CORRECTION',
            targetId: record._id.toString(),
            targetType: 'ATTENDANCE',
            metadata: { reason, status, checkIn, checkOut },
            ipAddress: req.ip,
        });

        return res.json({ success: true, message: 'Attendance record updated successfully', data: record });
    }
    catch (error) {
        console.error('[API:Admin:Attendance:PATCH] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update attendance record' });
    }
});

router.patch('/attendance/correction/:id', async (req, res) => {
    try {
        await connectToDatabase();
        const { id } = req.params;
        const { decision, reviewNotes } = req.body;
        const record = await Attendance.findById(id);
        if (!record || !record.correction) {
            return res.status(404).json({ success: false, error: 'Attendance correction request not found' });
        }
        record.correction.status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        record.correction.reviewedBy = req.user.name;
        record.correction.reviewedAt = new Date();
        record.correction.reviewNotes = reviewNotes || '';

        if (decision === 'APPROVE') {
            if (record.correction.requestedCheckIn) {
                record.checkIn = record.correction.requestedCheckIn;
                const shiftCfg = await getEmployeeShiftConfig(record.employeeId, record.date);
                const lateCalc = calculateLateCheckIn(record.checkIn, shiftCfg.shiftStartTime, shiftCfg.graceMinutes);
                record.isLate = lateCalc.isLate;
                record.lateMinutes = lateCalc.lateMinutes;
                record.scheduledShiftStart = lateCalc.scheduledShiftStart;
                record.lateGraceMinutes = lateCalc.lateGraceMinutes;
            }
            if (record.correction.requestedCheckOut) {
                record.checkOut = record.correction.requestedCheckOut;
            }
            record.status = record.checkOut ? 'COMPLETED' : 'PRESENT';
            if (record.checkIn && record.checkOut) {
                const diffMs = new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime();
                record.totalWorkingMinutes = Math.max(0, Math.floor(diffMs / 60000) - (record.totalBreakMinutes || 0));
            }
        }
        await record.save();

        await logAuditEvent({
            actorId: req.user.userId,
            actorName: req.user.name,
            actorRole: req.user.role,
            action: `ATTENDANCE_CORRECTION_${decision}`,
            targetId: record._id.toString(),
            targetType: 'ATTENDANCE',
            metadata: { decision, reviewNotes },
            ipAddress: req.ip,
        });

        return res.json({ success: true, message: `Correction request ${decision === 'APPROVE' ? 'approved' : 'rejected'}` });
    }
    catch (error) {
        console.error('[API:Admin:Attendance:Correction] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to process correction request' });
    }
});

router.post('/test-email', async (req, res) => {
    try {
        const { toEmail } = req.body || {};
        const recipient = toEmail || req.user?.email || process.env.ADMIN_EMAIL || process.env.SMTP_USER;
        const result = await sendEmail({
            to: recipient,
            subject: 'BP AMS System - Email Delivery Test',
            text: `This is a test notification dispatched by ${req.user.name} on ${new Date().toLocaleString()}. If you received this, SMTP email is working correctly.`,
            html: `
                <div style="font-family: sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 500px;">
                    <h3 style="color: #2563eb; margin: 0 0 12px 0;">BP AMS Email Verification</h3>
                    <p style="color: #334155; margin: 0 0 16px 0;">This email confirms that the notification transport configured in BP AMS is communicating successfully with Gmail SMTP.</p>
                    <p style="font-size: 12px; color: #64748b; margin: 0;">Dispatched by: <strong>${req.user.name}</strong> (${req.user.role})<br>Timestamp: ${new Date().toISOString()}</p>
                </div>
            `,
        });
        if (result.success) {
            return res.json({ success: true, message: `Test email successfully delivered to ${recipient}` });
        } else {
            return res.status(500).json({ success: false, error: result.error });
        }
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/audit-logs', async (req, res) => {
    try {
        await connectToDatabase();
        const { action, search, limit = 100, page = 1 } = req.query;
        const query = {};
        if (action && action !== 'ALL') {
            query.action = action;
        }
        if (search && typeof search === 'string' && search.trim() !== '') {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [
                { actorName: regex },
                { actorRole: regex },
                { action: regex },
                { targetType: regex },
                { targetId: regex },
                { ipAddress: regex }
            ];
        }
        const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 100), 500);
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const skip = (pageNum - 1) * limitNum;

        const [logs, total] = await Promise.all([
            AuditLog.find(query).sort({ timestamp: -1, createdAt: -1 }).skip(skip).limit(limitNum).lean(),
            AuditLog.countDocuments(query)
        ]);

        const formattedLogs = logs.map(l => ({
            ...l,
            createdAt: l.createdAt || l.timestamp || new Date(),
            timestamp: l.timestamp || l.createdAt || new Date()
        }));

        return res.json({
            success: true,
            data: { logs: formattedLogs, total },
            logs: formattedLogs,
            total
        });
    }
    catch (error) {
        console.error('[API:Admin:AuditLogs] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
    }
});
export default router;
