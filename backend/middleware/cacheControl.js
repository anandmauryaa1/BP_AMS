/**
 * Express middleware utilities for HTTP Cache-Control header management.
 */

/**
 * Disables caching for sensitive/mutation routes.
 */
export function noCache(req, res, next) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
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
