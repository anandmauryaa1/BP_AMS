import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { connectToDatabase } from './db.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import analyticsRouter from './routes/analytics.js';
import attendanceRouter from './routes/attendance.js';
import tasksRouter from './routes/tasks.js';
import projectsRouter from './routes/projects.js';
import deliverablesRouter from './routes/deliverables.js';
import leavesRouter from './routes/leaves.js';
import notificationsRouter from './routes/notifications.js';
import plansRouter from './routes/plans.js';
import channelsRouter from './routes/channels.js';
import seriesRouter from './routes/series.js';
import workSessionsRouter from './routes/work-sessions.js';
const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
// Enable trust proxy for proxied requests (e.g. Next.js rewrites)
app.set('trust proxy', 1);
// Security Headers
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
// Rate Limiting
const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 requests per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many authentication requests. Please try again later.' },
    validate: { xForwardedForHeader: false },
});
const globalRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 300, // 300 requests per IP per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Rate limit exceeded. Please slow down.' },
    validate: { xForwardedForHeader: false },
});
app.use('/api', globalRateLimiter);
const allowedOrigins = [CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'].filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Database connection middleware for Serverless & traditional environments
app.use(async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (err) {
        console.error('[Database Middleware Error]:', err);
        res.status(500).json({
            success: false,
            error: 'Database connection failed. Please ensure MONGODB_URI is configured.',
        });
    }
});
// Apply rate limiting specifically to sensitive auth routes
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/forgot-password', authRateLimiter);
app.use('/api/auth/reset-password', authRateLimiter);
// Mount API Routers
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/deliverables', deliverablesRouter);
app.use('/api/leaves', leavesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/plans', plansRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/series', seriesRouter);
app.use('/api/work-sessions', workSessionsRouter);
// Health check & diagnostic endpoint
app.get(['/', '/health', '/api/health'], (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.json({
        success: isDbConnected,
        status: isDbConnected ? 'API operational & Database connected' : 'Database disconnected or connecting',
        dbConnected: isDbConnected,
        dbState: mongoose.connection.readyState, // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
        dbName: mongoose.connection.name || process.env.MONGODB_DB_NAME || 'attendance_db',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    });
});
// Centralized Global Error Handler Middleware
app.use((err, req, res, next) => {
    console.error(`[Global Error Handler] [${req.method} ${req.url}]:`, err);
    const statusCode = err.status || err.statusCode || 500;
    const isProd = process.env.NODE_ENV === 'production';
    res.status(statusCode).json({
        success: false,
        error: isProd && statusCode === 500
            ? 'An internal server error occurred. Please try again or contact IT support if the problem persists.'
            : err.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        path: req.originalUrl || req.url,
        ...(isProd ? {} : { stack: err.stack }),
    });
});
let serverInstance = null;
// Start Server
async function startServer() {
    try {
        await connectToDatabase();
        console.log('Connected to MongoDB database successfully.');
        serverInstance = app.listen(PORT, () => {
            console.log(`Attendance API Server running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Graceful Shutdown
function gracefulShutdown(signal) {
    console.log(`[Server] ${signal} received. Initiating graceful shutdown...`);
    if (serverInstance) {
        serverInstance.close(async () => {
            console.log('[Server] HTTP server closed.');
            try {
                await mongoose.connection.close();
                console.log('[Server] MongoDB connection closed.');
                process.exit(0);
            }
            catch (err) {
                console.error('[Server] Error closing MongoDB connection:', err);
                process.exit(1);
            }
        });
    }
    else {
        process.exit(0);
    }
}
// Only listen directly when running in non-serverless environments (local dev, VPS, Docker)
if (process.env.VERCEL !== '1' && !process.env.NOW_REGION) {
    startServer();
}

export default app;
