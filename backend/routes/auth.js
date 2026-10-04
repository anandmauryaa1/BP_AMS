import { Router } from 'express';
import { z } from 'zod';
import { connectToDatabase } from '../db.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { PayrollStructure } from '../models/PayrollStructure.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';
import { verifyPassword, hashPassword, createSessionToken, generateResetToken, hashResetToken, AUTH_COOKIE_NAME, authenticateToken, } from '../middleware/auth.js';
import { logAuditEvent } from '../services/audit.js';
import { sendPasswordResetEmail } from '../services/email.js';
const router = Router();
const LoginSchema = z.object({
    username: z.string().min(1, 'Username is required').trim().toLowerCase(),
    password: z.string().min(1, 'Password is required'),
});
const SetupSchema = z.object({
    employeeId: z.string().min(2).max(20).trim().toUpperCase(),
    username: z.string().min(3).max(30).trim().toLowerCase(),
    name: z.string().min(2).max(100).trim(),
    email: z.string().email().trim().toLowerCase(),
    password: z.string().min(8),
    department: z.string().min(2).default('Management'),
});
router.get('/setup', async (req, res) => {
    try {
        await connectToDatabase();
        const count = await User.countDocuments();
        return res.json({
            success: true,
            data: {
                setupRequired: count === 0,
            },
        });
    }
    catch (error) {
        console.error('[API:Auth:SetupCheck] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to check setup state' });
    }
});
router.post('/setup', async (req, res) => {
    try {
        await connectToDatabase();
        const count = await User.countDocuments();
        if (count > 0) {
            return res.status(400).json({ success: false, error: 'Initial setup has already been completed.' });
        }
        const parsed = SetupSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, error: parsed.error.errors[0]?.message || 'Invalid setup data' });
        }
        const { employeeId, username, name, email, password, department } = parsed.data;
        const passwordHash = await hashPassword(password);
        const admin = await User.create({
            employeeId,
            username,
            passwordHash,
            name,
            email,
            department,
            designation: 'Head of Operations',
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
            mustChangePassword: false,
        });
        return res.status(201).json({
            success: true,
            message: 'Initial administrator created successfully. You can now log in.',
            data: { username: admin.username },
        });
    }
    catch (error) {
        console.error('[API:Auth:Setup] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to complete initial setup' });
    }
});
router.post('/login', async (req, res) => {
    try {
        const parsed = LoginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, error: 'Invalid username or password' });
        }
        const { username, password } = parsed.data;
        await connectToDatabase();
        const user = await User.findOne({ username }).select('+passwordHash');
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials. Please verify your employee ID/username and password.',
            });
        }
        if (user.status !== 'ACTIVE') {
            return res.status(403).json({
                success: false,
                error: 'Account access has been deactivated. Please contact your Operations Administrator or HR.',
            });
        }
        const isPasswordValid = await verifyPassword(password, user.passwordHash || '');
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials. Please verify your employee ID/username and password.',
            });
        }
        const sessionPayload = {
            userId: user._id.toString(),
            employeeId: user.employeeId,
            username: user.username,
            name: user.name,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
        };
        const token = await createSessionToken(sessionPayload);
        await logAuditEvent({
            actorId: user._id.toString(),
            actorName: user.name,
            actorRole: user.role,
            action: 'USER_LOGIN',
            targetId: user._id.toString(),
            targetType: 'USER',
            ipAddress: req.ip,
        });
        res.cookie(AUTH_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 8 * 60 * 60 * 1000,
        });
        return res.json({
            success: true,
            message: `Authentication successful. Welcome back, ${user.name}!`,
            data: {
                token,
                user: {
                    employeeId: user.employeeId,
                    username: user.username,
                    name: user.name,
                    email: user.email,
                    department: user.department,
                    role: user.role,
                    mustChangePassword: user.mustChangePassword,
                },
            },
        });
    }
    catch (error) {
        console.error('[API:Login] Login error:', error);
        return res.status(500).json({ success: false, error: 'Authentication failed' });
    }
});
router.post('/logout', authenticateToken, async (req, res) => {
    if (req.user) {
        await logAuditEvent({
            actorId: req.user.userId,
            actorName: req.user.name,
            actorRole: req.user.role,
            action: 'USER_LOGOUT',
            targetId: req.user.userId,
            targetType: 'USER',
            ipAddress: req.ip,
        });
    }
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    return res.json({ success: true, message: 'Logged out successfully' });
});
router.get('/me', authenticateToken, async (req, res) => {
    try {
        await connectToDatabase();
        const user = await User.findById(req.user?.userId).lean();
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        const userPayload = {
            userId: user._id.toString(),
            employeeId: user.employeeId,
            username: user.username,
            name: user.name,
            email: user.email,
            department: user.department,
            role: user.role,
            status: user.status,
            mustChangePassword: user.mustChangePassword,
            createdAt: user.createdAt,
        };
        return res.json({
            success: true,
            data: {
                ...userPayload,
                user: userPayload,
            },
        });
    }
    catch (error) {
        console.error('[API:Me] Error fetching user profile:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch profile' });
    }
});

router.get('/initial-state', authenticateToken, async (req, res) => {
    try {
        await connectToDatabase();
        const userId = req.user?.userId;
        const employeeId = req.user?.employeeId;

        const [user, notifications, unreadCount, structure] = await Promise.all([
            User.findById(userId).lean(),
            Notification.find({
                $or: [
                    { userId: String(userId) },
                    ...(employeeId ? [{ userId: String(employeeId) }] : [])
                ]
            }).sort({ createdAt: -1 }).limit(10).lean(),
            Notification.countDocuments({
                $or: [
                    { userId: String(userId), read: false, isRead: { $ne: true } },
                    ...(employeeId ? [{ userId: String(employeeId), read: false, isRead: { $ne: true } }] : [])
                ]
            }),
            PayrollStructure.findOne({
                $or: [
                    ...(employeeId ? [{ employeeId: String(employeeId).toUpperCase() }, { employeeId: String(employeeId) }] : []),
                    ...(userId ? [{ userId: String(userId) }, { employeeId: String(userId) }] : [])
                ]
            }).lean()
        ]);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const userPayload = {
            userId: user._id.toString(),
            employeeId: user.employeeId,
            username: user.username,
            name: user.name,
            email: user.email,
            department: user.department,
            role: user.role,
            status: user.status,
            mustChangePassword: user.mustChangePassword,
            createdAt: user.createdAt,
        };

        return res.json({
            success: true,
            data: {
                user: userPayload,
                notifications: notifications || [],
                unreadCount: unreadCount || 0,
                structureSummary: structure ? {
                    monthlyGross: structure.monthlyGross,
                    annualCtc: structure.annualCtc || structure.ctc,
                    hourlyRate: structure.hourlyRate,
                    calculationType: structure.calculationType,
                } : null
            }
        });
    } catch (error) {
        console.error('[API:InitialState] Error fetching initial state:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch initial state' });
    }
});
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }
        await connectToDatabase();
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (user && user.status === 'ACTIVE') {
            const { token, tokenHash } = generateResetToken();
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
            await PasswordResetToken.create({
                userId: user._id,
                tokenHash,
                expiresAt,
            });
            await sendPasswordResetEmail({
                to: user.email,
                name: user.name,
                token,
            });
            await logAuditEvent({
                actorId: user._id.toString(),
                actorName: user.name,
                actorRole: user.role,
                action: 'PASSWORD_RESET_REQUESTED',
                targetId: user._id.toString(),
                targetType: 'USER',
                ipAddress: req.ip,
            });
        }
        return res.json({
            success: true,
            message: 'If an active account exists with that email, a password reset link has been sent.',
        });
    }
    catch (error) {
        console.error('[API:ForgotPassword] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to process request' });
    }
});
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password || password.length < 6) {
            return res.status(400).json({ success: false, error: 'Valid token and password (min 6 chars) are required' });
        }
        await connectToDatabase();
        const tokenHash = hashResetToken(token);
        const resetDoc = await PasswordResetToken.findOne({
            tokenHash,
            used: false,
            expiresAt: { $gt: new Date() },
        });
        if (!resetDoc) {
            return res.status(400).json({ success: false, error: 'Invalid or expired password reset token' });
        }
        const user = await User.findById(resetDoc.userId);
        if (!user || user.status !== 'ACTIVE') {
            return res.status(400).json({ success: false, error: 'User not found or account deactivated' });
        }
        user.passwordHash = await hashPassword(password);
        user.mustChangePassword = false;
        await user.save();
        resetDoc.used = true;
        await resetDoc.save();
        await logAuditEvent({
            actorId: user._id.toString(),
            actorName: user.name,
            actorRole: user.role,
            action: 'PASSWORD_RESET_COMPLETED',
            targetId: user._id.toString(),
            targetType: 'USER',
            ipAddress: req.ip,
        });
        return res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
    }
    catch (error) {
        console.error('[API:ResetPassword] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to reset password' });
    }
});
const handleChangePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'Current password and new password (min 6 chars) required' });
        }
        await connectToDatabase();
        const user = await User.findById(req.user?.userId).select('+passwordHash');
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        const isValid = await verifyPassword(currentPassword, user.passwordHash || '');
        if (!isValid) {
            return res.status(400).json({ success: false, error: 'Current password is incorrect' });
        }
        user.passwordHash = await hashPassword(newPassword);
        user.mustChangePassword = false;
        await user.save();
        await logAuditEvent({
            actorId: user._id.toString(),
            actorName: user.name,
            actorRole: user.role,
            action: 'PASSWORD_CHANGED',
            targetId: user._id.toString(),
            targetType: 'USER',
            ipAddress: req.ip,
        });
        const sessionPayload = {
            userId: user._id.toString(),
            employeeId: user.employeeId,
            username: user.username,
            name: user.name,
            role: user.role,
            mustChangePassword: false,
        };
        const token = await createSessionToken(sessionPayload);
        res.cookie(AUTH_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 8 * 60 * 60 * 1000, // 8 hours
        });
        return res.json({ success: true, message: 'Password changed successfully', data: { token } });
    }
    catch (error) {
        console.error('[API:ChangePassword] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to change password' });
    }
};

router.put('/change-password', authenticateToken, handleChangePassword);
router.post('/change-password', authenticateToken, handleChangePassword);
export default router;
