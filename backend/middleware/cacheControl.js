/**
 * Express middleware utilities for HTTP Cache-Control header management & Version Token Verification.
 */
import { cacheManager } from '../services/CacheManager.js';

/**
 * Configures sensitive/mutation routes to prevent intermediate caching while enabling Back/Forward Cache (bfcache).
 */
export function noCache(req, res, next) {
    res.setHeader('Cache-Control', 'private, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    next();
}

/**
 * Configures private user-specific caching for user dashboards, reports, and attendance views.
 * @param {number} maxAgeSeconds Max cache age in seconds (default: 60)
 * @param {number} staleWhileRevalidate Stale while revalidate time in seconds (default: 30)
 */
export function privateCache(maxAgeSeconds = 60, staleWhileRevalidate = 30) {
    return (req, res, next) => {
        if (req.method === 'GET') {
            res.setHeader(
                'Cache-Control',
                `private, max-age=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidate}`
            );
        }
        next();
    };
}

/**
 * Configures public shared caching for static/read-only metadata (projects, channels, plans).
 * @param {number} maxAgeSeconds Client max age (default: 300)
 * @param {number} sMaxAgeSeconds CDN/Proxy max age (default: 600)
 */
export function publicCache(maxAgeSeconds = 300, sMaxAgeSeconds = 600) {
    return (req, res, next) => {
        if (req.method === 'GET') {
            res.setHeader(
                'Cache-Control',
                `public, max-age=${maxAgeSeconds}, s-maxage=${sMaxAgeSeconds}`
            );
        }
        next();
    };
}

/**
 * Token Validation & ETag Middleware:
 * - Generates & returns unique Version Token (X-Cache-Token & ETag) when data is read.
 * - Checks incoming If-None-Match or X-Verify-Cache-Token; if verified, returns 304 Not Modified instantly.
 * - On mutation (POST, PUT, PATCH, DELETE), automatically rotates the token to invalidate cached copies.
 * 
 * @param {string} [namespace]
 */
export function tokenValidationMiddleware(namespace) {
    return (req, res, next) => {
        const routeNamespace = namespace || req.baseUrl.replace(/^\/api\/?/, '') || 'global';
        const serverToken = cacheManager.getVersionToken(routeNamespace);

        res.setHeader('X-Cache-Token', serverToken);
        res.setHeader('ETag', `"${serverToken}"`);

        // Check if client provided a cache token to verify
        if (req.method === 'GET') {
            const clientToken = req.headers['if-none-match'] || req.headers['x-verify-cache-token'] || req.query?.cacheToken;
            if (clientToken && cacheManager.verifyToken(routeNamespace, clientToken)) {
                return res.status(304).end();
            }
        }

        // Auto-rotate version token upon successful create/update/delete mutation
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            res.on('finish', () => {
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    cacheManager.rotateVersionToken(routeNamespace);
                }
            });
        }

        next();
    };
}
