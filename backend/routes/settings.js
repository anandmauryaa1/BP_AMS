import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { SystemSettings } from '../models/SystemSettings.js';
import { User } from '../models/User.js';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// --- ADMIN SETTINGS API ---

// GET /api/settings/admin - Fetch system-wide configurations
router.get('/admin', requireManagerOrAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        let settings = await SystemSettings.findOne({ key: 'global_config' }).lean();
        if (!settings) {
            settings = await SystemSettings.create({ key: 'global_config' });
        }
        return res.json({ success: true, settings });
    } catch (error) {
        console.error('[API:Settings:Admin:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch admin settings' });
    }
});

// POST /api/settings/admin - Save/Update system configurations
router.post('/admin', requireManagerOrAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        const payload = {
            companyName: req.body.companyName,
            companyLegalName: req.body.companyLegalName,
            taxId: req.body.taxId,
            epfCode: req.body.epfCode,
            esicCode: req.body.esicCode,
            companyEmail: req.body.companyEmail,
            companyPhone: req.body.companyPhone,
            companyAddress: req.body.companyAddress,
            shiftStartTime: req.body.shiftStartTime,
            shiftEndTime: req.body.shiftEndTime,
            lateGraceMinutes: parseInt(req.body.lateGraceMinutes || 15, 10),
            autoCheckoutHours: parseInt(req.body.autoCheckoutHours || 12, 10),
            payCycleDay: parseInt(req.body.payCycleDay || 1, 10),
            currencySymbol: req.body.currencySymbol || '₹',
            maxLoanSalaryPct: parseFloat(req.body.maxLoanSalaryPct || 25),
            maxLoanTenureMonths: parseInt(req.body.maxLoanTenureMonths || 12, 10),
            annualCasualLeaves: parseInt(req.body.annualCasualLeaves || 12, 10),
            annualSickLeaves: parseInt(req.body.annualSickLeaves || 12, 10),
            annualEarnedLeaves: parseInt(req.body.annualEarnedLeaves || 15, 10),
            requireSickLeaveAttachmentDays: parseInt(req.body.requireSickLeaveAttachmentDays || 2, 10),
            allowEmployeeLoanRequests: Boolean(req.body.allowEmployeeLoanRequests),
            allowSelfCheckin: Boolean(req.body.allowSelfCheckin),
            emailNotificationsEnabled: Boolean(req.body.emailNotificationsEnabled),
        };

        const updated = await SystemSettings.findOneAndUpdate(
            { key: 'global_config' },
            payload,
            { new: true, upsert: true }
        );

        return res.json({ success: true, settings: updated, message: 'Admin settings saved successfully!' });
    } catch (error) {
        console.error('[API:Settings:Admin:POST] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to save admin settings' });
    }
});


// --- EMPLOYEE PERSONAL SETTINGS API ---

// GET /api/settings/employee - Fetch employee personal settings & preferences
router.get('/employee', async (req, res) => {
    try {
        await connectToDatabase();
        const userId = req.user?.userId || req.user?._id;
        const user = await User.findById(userId).lean();
        if (!user) {
            return res.status(404).json({ success: false, error: 'User profile not found' });
        }

        const employeeSettings = {
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            department: user.department,
            designation: user.designation,
            employeeId: user.employeeId,
            emailNotifications: user.emailNotifications !== false,
            taskAlerts: user.taskAlerts !== false,
            payslipAlerts: user.payslipAlerts !== false,
            theme: user.theme || 'dark',
            bankName: user.bankName || '',
            accountNumber: user.accountNumber || '',
            ifscCode: user.ifscCode || '',
            emergencyContactName: user.emergencyContactName || '',
            emergencyContactPhone: user.emergencyContactPhone || '',
        };

        return res.json({ success: true, settings: employeeSettings });
    } catch (error) {
        console.error('[API:Settings:Employee:GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch employee settings' });
    }
});

// POST /api/settings/employee - Save employee personal settings
router.post('/employee', async (req, res) => {
    try {
        await connectToDatabase();
        const userId = req.user?.userId || req.user?._id;

        const updatePayload = {
            phone: req.body.phone,
            emailNotifications: Boolean(req.body.emailNotifications),
            taskAlerts: Boolean(req.body.taskAlerts),
            payslipAlerts: Boolean(req.body.payslipAlerts),
            theme: req.body.theme || 'dark',
            bankName: req.body.bankName,
            accountNumber: req.body.accountNumber,
            ifscCode: req.body.ifscCode,
            emergencyContactName: req.body.emergencyContactName,
            emergencyContactPhone: req.body.emergencyContactPhone,
        };

        const updatedUser = await User.findByIdAndUpdate(userId, updatePayload, { new: true }).lean();

        return res.json({
            success: true,
            message: 'Your personal preferences & bank settings have been updated!',
            user: {
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                emailNotifications: updatedUser.emailNotifications,
                theme: updatedUser.theme,
                bankName: updatedUser.bankName,
                accountNumber: updatedUser.accountNumber,
                ifscCode: updatedUser.ifscCode,
                emergencyContactName: updatedUser.emergencyContactName,
                emergencyContactPhone: updatedUser.emergencyContactPhone,
            }
        });
    } catch (error) {
        console.error('[API:Settings:Employee:POST] Error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to save settings' });
    }
});

export default router;
