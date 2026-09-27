import { Router } from 'express';
import { z } from 'zod';
import { connectToDatabase } from '../db.js';
import { User } from '../models/User.js';
import { Attendance } from '../models/Attendance.js';
import { AuditLog } from '../models/AuditLog.js';
import { authenticateToken, requireManagerOrAdmin, hashPassword } from '../middleware/auth.js';
import { logAuditEvent } from '../services/audit.js';
import { sendWelcomeEmail } from '../services/email.js';
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
    initialPassword: z.string().min(8, 'Initial password must be at least 8 characters long'),
    sendWelcomeEmail: z.boolean().default(true),
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
        const passwordHash = await hashPassword(initialPassword);
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
            sendWelcomeEmail({
                to: newEmployee.email,
                name: newEmployee.name,
                username: newEmployee.username,
                temporaryPassword: initialPassword,
            }).catch((err) => console.error('[API:Admin] Welcome email failed:', err));
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
router.put('/employees/:id', async (req, res) => {
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
        if (updates.status)
            employee.status = updates.status;
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
        console.error('[API:Admin:Employees:PUT] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update employee' });
    }
});
router.post('/employees/:id/reset-password', async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
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
        const startDate = req.query.startDate || new Date().toISOString().split('T')[0];
        const endDate = req.query.endDate || new Date().toISOString().split('T')[0];
        const attendanceRecords = await Attendance.find({
            date: { $gte: startDate, $lte: endDate },
        }).lean();
        const users = await User.find({ status: 'ACTIVE' }).select('name employeeId department').lean();
        const userMap = new Map(users.map((u) => [u.employeeId, u]));
        const deptMap = {};
        const records = [];
        for (const att of attendanceRecords) {
            const u = userMap.get(att.employeeId);
            const dept = u?.department || 'Unassigned';
            const mins = att.totalWorkingMinutes || 0;
            deptMap[dept] = (deptMap[dept] || 0) + mins;
            records.push({
                employeeId: att.employeeId,
                employeeName: u?.name || att.employeeName || att.employeeId,
                department: dept,
                date: att.date,
                status: att.status,
                checkIn: att.checkIn,
                checkOut: att.checkOut,
                totalWorkingMinutes: mins,
                totalBreakMinutes: att.totalBreakMinutes || 0,
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
router.get('/audit-logs', async (req, res) => {
    try {
        await connectToDatabase();
        const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100).lean();
        return res.json({ success: true, data: logs });
    }
    catch (error) {
        console.error('[API:Admin:AuditLogs] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
    }
});
export default router;
