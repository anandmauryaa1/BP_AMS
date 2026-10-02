import { Router } from 'express';
import { realTimeService } from '../services/RealTimeService.js';
import { verifySessionToken, AUTH_COOKIE_NAME } from '../middleware/auth.js';
import { User } from '../models/User.js';

const router = Router();

/**
 * GET /api/realtime/stream
 * Server-Sent Events (SSE) connection endpoint.
 * Multi-role clients (Employee, Manager, Admin) maintain an open connection here
 * to receive instantaneous updates across all system entities.
 */
router.get(['/', '/stream'], async (req, res) => {
    // 1. Resolve token from cookie, Authorization header, or query param
    let token = req.cookies?.[AUTH_COOKIE_NAME] || req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token && req.query?.token) {
        token = String(req.query.token);
    }

    let userSession = null;
    if (token) {
        try {
            userSession = await verifySessionToken(token);
        } catch {
            userSession = null;
        }
    }

    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const userId = userSession?.userId ? String(userSession.userId) : null;
    const employeeId = userSession?.employeeId ? String(userSession.employeeId) : null;
    const role = userSession?.role || 'GUEST';

    // 2. Configure SSE HTTP response headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // 3. Register client in realTimeService
    const clientData = {
        id: clientId,
        userId,
        employeeId,
        role,
        res,
        connectedAt: Date.now(),
    };
    realTimeService.addClient(clientId, clientData);

    // 4. Send initial connection acknowledgment
    res.write(`event: CONNECTED\ndata: ${JSON.stringify({ status: 'connected', clientId, role, time: Date.now() })}\n\n`);

    // 5. Handle client disconnect / socket close
    req.on('close', () => {
        realTimeService.removeClient(clientId);
    });

    req.on('end', () => {
        realTimeService.removeClient(clientId);
    });
});

/**
 * GET /api/realtime/stats
 * Diagnostic stats for connected clients
 */
router.get('/stats', (req, res) => {
    return res.json({
        success: true,
        activeClients: realTimeService.getActiveCount(),
    });
});

export default router;
