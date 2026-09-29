/**
 * CacheManager Singleton
 * In-memory transient caching service with TTL support.
 */
class CacheManager {
    static instance = null;
    cache = new Map();

    constructor() {
        if (CacheManager.instance) {
            return CacheManager.instance;
        }
        CacheManager.instance = this;
    }

    static getInstance() {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager();
        }
        return CacheManager.instance;
    }

    set(key, value, ttlSeconds = 60) {
        const expiresAt = Date.now() + ttlSeconds * 1000;
        this.cache.set(key, { value, expiresAt });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return item.value;
    }

    del(key) {
        this.cache.delete(key);
    }

    flush() {
        this.cache.clear();
    }
}

export const cacheManager = CacheManager.getInstance();
export default CacheManager;
