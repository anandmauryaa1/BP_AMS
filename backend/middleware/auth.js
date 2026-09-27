import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { User } from '../models/User.js';
export const AUTH_COOKIE_NAME = 'auth_token';
const rawSecret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && (!rawSecret || rawSecret.length < 32)) {
    throw new Error('CRITICAL SECURITY CONFIGURATION: AUTH_SECRET must be set and at least 32 characters long in production!');
}
const JWT_SECRET = new TextEncoder().encode(rawSecret || 'fallback_development_auth_secret_minimum_32_chars_long_key!');
const TOKEN_EXPIRY = '8h';
export async function hashPassword(password) {
    try {
        const argon2 = await import('@node-rs/argon2');
        return await argon2.hash(password, {
            memoryCost: 19456,
            timeCost: 2,
            outputLen: 32,
            parallelism: 1,
            algorithm: 2,
        });
    }
    catch {
        try {
            const argon2Fallback = await import('argon2');
            return await argon2Fallback.hash(password, {
                type: argon2Fallback.argon2id,
                memoryCost: 19456,
                timeCost: 2,
            });
        }
        catch {
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
            return `pbkdf2:${salt}:${hash}`;
        }
    }
}
export async function verifyPassword(password, hash) {
    if (!hash)
        return false;
    if (hash.startsWith('pbkdf2:')) {
        const [, salt, originalHash] = hash.split(':');
        const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(originalHash, 'hex'));
    }
    try {
        const argon2 = await import('@node-rs/argon2');
        return await argon2.verify(hash, password);
    }
    catch {
        try {
            const argon2Fallback = await import('argon2');
            return await argon2Fallback.verify(hash, password);
        }
        catch {
            return false;
        }
    }
}
export function generateResetToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, tokenHash };
}
export function hashResetToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
export async function createSessionToken(payload) {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(TOKEN_EXPIRY)
        .sign(JWT_SECRET);
}
export async function verifySessionToken(token) {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload;
    }
    catch {
        return null;
    }
}
export async function authenticateToken(req, res, next) {
    try {
        let token = req.cookies?.[AUTH_COOKIE_NAME];
        if (!token && req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
        }
        const session = await verifySessionToken(token);
        if (!session) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
        }
        let dbUser = null;
        if (session.userId && session.userId.length === 24) {
            dbUser = await User.findById(session.userId).select('status role mustChangePassword').lean();
        }
        if (!dbUser && (session.employeeId || session.username)) {
            const query = [];
            if (session.employeeId)
                query.push({ employeeId: session.employeeId });
            if (session.username)
                query.push({ username: session.username });
            dbUser = await User.findOne({ $or: query }).select('status role mustChangePassword').lean();
            if (dbUser) {
                session.userId = dbUser._id.toString();
            }
        }
        if (!dbUser) {
            return res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
        }
        if (dbUser.status !== 'ACTIVE') {
            return res.status(403).json({ success: false, error: 'Forbidden: Account is deactivated' });
        }
        req.user = session;
        next();
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message || 'Authentication error' });
    }
}
export function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }
        if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
}
export const requireAdmin = requireRole('SUPER_ADMIN', 'ADMIN');
export const requireManagerOrAdmin = requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER');
