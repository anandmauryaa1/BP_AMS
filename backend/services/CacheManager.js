/**
 * CacheManager & Write-Through Cache Service
 * 
 * Provides an in-memory high-performance caching layer with:
 * - Write-Through Cache (sync writes to DB + Cache simultaneously)
 * - Read-Through Cache with stampede/thundering-herd protection (in-flight deduplication)
 * - Delete-Through & Update-Through operations
 * - Prefix & Pattern-based invalidation
 * - TTL & LRU auto-eviction
 * - Mongoose Model Adapter for effortless write-through repository pattern
 * - Real-time Cache telemetry & metrics
 */

export class WriteThroughCache {
    /**
     * @param {Object} options
     * @param {number} [options.defaultTtl=60] Default TTL in seconds
     * @param {number} [options.maxSize=5000] Maximum number of keys before LRU eviction
     */
    constructor(options = {}) {
        this.defaultTtl = options.defaultTtl || 60;
        this.maxSize = options.maxSize || 5000;
        this.cache = new Map();
        this.inFlightRequests = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            writes: 0,
            writeFailures: 0,
            deletes: 0,
            evictions: 0,
        };
    }

    /**
     * Set a value directly into the cache.
     * @param {string} key
     * @param {any} value
     * @param {number} [ttlSeconds]
     */
    set(key, value, ttlSeconds = this.defaultTtl) {
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this._evictOldest();
        }

        const expiresAt = Date.now() + ttlSeconds * 1000;
        // Delete and re-set to preserve insertion/access order for LRU behavior
        this.cache.delete(key);
        this.cache.set(key, { value, expiresAt });
    }

    /**
     * Get a value from the cache.
     * @param {string} key
     * @returns {any|null}
     */
    get(key) {
        const item = this.cache.get(key);
        if (!item) {
            this.stats.misses++;
            return null;
        }

        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }

        // Refresh position in Map for LRU
        this.cache.delete(key);
        this.cache.set(key, item);

        this.stats.hits++;
        return item.value;
    }

    /**
     * Check if a key exists and is not expired.
     * @param {string} key
     * @returns {boolean}
     */
    has(key) {
        const item = this.cache.get(key);
        if (!item) return false;
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }

    /**
     * Remove a key from the cache.
     * @param {string} key
     * @returns {boolean}
     */
    del(key) {
        return this.cache.delete(key);
    }

    /**
     * Clear all cached keys.
     */
    flush() {
        this.cache.clear();
        this.inFlightRequests.clear();
    }

    /**
     * Evict oldest expired or least-recently-used item.
     * @private
     */
    _evictOldest() {
        const now = Date.now();
        // First look for any expired item to evict
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiresAt) {
                this.cache.delete(key);
                this.stats.evictions++;
                return;
            }
        }
        // If none expired, evict first (least recently used/accessed)
        const firstKey = this.cache.keys().next().value;
        if (firstKey !== undefined) {
            this.cache.delete(firstKey);
            this.stats.evictions++;
        }
    }

    /**
     * Read-Through Strategy:
     * Attempts to read from cache. On miss, executes `fetcher()`,
     * caches the result, and returns it.
     * Includes single-flight stampede protection to prevent dogpiling.
     * 
     * @template T
     * @param {string} key
     * @param {() => Promise<T>} fetcher
     * @param {Object} [options]
     * @param {number} [options.ttlSeconds]
     * @returns {Promise<T>}
     */
    async readThrough(key, fetcher, options = {}) {
        const ttl = options.ttlSeconds !== undefined ? options.ttlSeconds : this.defaultTtl;

        // 1. Fast path: Cache hit
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }

        // 2. Thundering-herd prevention (Single Flight)
        if (this.inFlightRequests.has(key)) {
            return this.inFlightRequests.get(key);
        }

        // 3. Initiate fetcher
        const fetchPromise = (async () => {
            try {
                const data = await fetcher();
                if (data !== undefined && data !== null) {
                    this.set(key, data, ttl);
                }
                return data;
            } finally {
                this.inFlightRequests.delete(key);
            }
        })();

        this.inFlightRequests.set(key, fetchPromise);
        return fetchPromise;
    }

    /**
     * Write-Through Strategy:
     * Executes `writer(data)` to persist to primary store (e.g., Database).
     * If the write succeeds, the cache is immediately updated with the saved result.
     * If the write fails, the cache is NOT polluted, maintaining strict consistency.
     * 
     * @template T
     * @param {string} key
     * @param {T} data
     * @param {(data: T) => Promise<any>} writer
     * @param {Object} [options]
     * @param {number} [options.ttlSeconds]
     * @returns {Promise<any>}
     */
    async writeThrough(key, data, writer, options = {}) {
        const ttl = options.ttlSeconds !== undefined ? options.ttlSeconds : this.defaultTtl;

        try {
            // 1. Write synchronously to primary store
            const result = await writer(data);

            // 2. On DB write success, update cache
            const valueToCache = result !== undefined ? result : data;
            this.set(key, valueToCache, ttl);
            this.stats.writes++;

            return result;
        } catch (error) {
            this.stats.writeFailures++;
            // Invalidate existing stale cache for this key if primary write failed
            this.cache.delete(key);
            throw error;
        }
    }

    /**
     * Update-Through Strategy:
     * Executes `updater()` against primary store, then updates cache with result.
     * 
     * @param {string} key
     * @param {() => Promise<any>} updater
     * @param {Object} [options]
     * @param {number} [options.ttlSeconds]
     * @returns {Promise<any>}
     */
    async updateThrough(key, updater, options = {}) {
        const ttl = options.ttlSeconds !== undefined ? options.ttlSeconds : this.defaultTtl;

        try {
            const result = await updater();
            if (result !== undefined && result !== null) {
                this.set(key, result, ttl);
            } else {
                this.cache.delete(key);
            }
            this.stats.writes++;
            return result;
        } catch (error) {
            this.stats.writeFailures++;
            this.cache.delete(key);
            throw error;
        }
    }

    /**
     * Delete-Through Strategy:
     * Executes `deleter()` against primary store, then deletes from cache on success.
     * 
     * @param {string} key
     * @param {() => Promise<any>} deleter
     * @returns {Promise<any>}
     */
    async deleteThrough(key, deleter) {
        try {
            const result = await deleter();
            this.cache.delete(key);
            this.stats.deletes++;
            return result;
        } catch (error) {
            // If primary delete failed, delete from cache to avoid ghost reads
            this.cache.delete(key);
            throw error;
        }
    }

    /**
     * Invalidate a specific key or list of keys.
     * @param {string|string[]} keys
     */
    invalidate(keys) {
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) {
            this.cache.delete(k);
        }
    }

    /**
     * Invalidate all keys matching a prefix.
     * @param {string} prefix
     * @returns {number} Number of keys removed
     */
    invalidatePrefix(prefix) {
        let count = 0;
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }

    /**
     * Invalidate all keys matching a regular expression.
     * @param {RegExp} regex
     * @returns {number} Number of keys removed
     */
    invalidatePattern(regex) {
        let count = 0;
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }

    /**
     * Returns real-time metrics and telemetry.
     */
    getStats() {
        const totalRequests = this.stats.hits + this.stats.misses;
        const hitRatio = totalRequests > 0 ? (this.stats.hits / totalRequests) : 0;
        return {
            ...this.stats,
            size: this.cache.size,
            maxSize: this.maxSize,
            totalRequests,
            hitRatio: Number(hitRatio.toFixed(4)),
        };
    }

    /**
     * Reset telemetry counters.
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            writes: 0,
            writeFailures: 0,
            deletes: 0,
            evictions: 0,
        };
    }

    /**
     * Factory to wrap a Mongoose Model with Write-Through caching.
     * 
     * @param {import('mongoose').Model} Model
     * @param {Object} [options]
     * @param {string} [options.prefix] Custom cache prefix (defaults to modelName)
     * @param {number} [options.defaultTtl=120] Default TTL in seconds
     * @param {string} [options.keyField='_id'] Field used as identifier
     */
    createModelCache(Model, options = {}) {
        const prefix = options.prefix || Model.modelName || 'doc';
        const ttl = options.defaultTtl || 120;
        const keyField = options.keyField || '_id';

        const getKey = (id) => `${prefix}:${id.toString()}`;

        return {
            /**
             * Find document by ID (Read-Through)
             */
            findById: async (id, queryOptions = {}) => {
                const key = getKey(id);
                return this.readThrough(key, async () => {
                    let query = Model.findById(id);
                    if (queryOptions.populate) {
                        query = query.populate(queryOptions.populate);
                    }
                    if (queryOptions.select) {
                        query = query.select(queryOptions.select);
                    }
                    if (queryOptions.lean !== false) {
                        query = query.lean();
                    }
                    return query.exec();
                }, { ttlSeconds: ttl });
            },

            /**
             * Create document (Write-Through)
             */
            create: async (data) => {
                const doc = await Model.create(data);
                const id = doc[keyField] || doc._id;
                if (id) {
                    const key = getKey(id);
                    const plainDoc = typeof doc.toObject === 'function' ? doc.toObject() : doc;
                    this.set(key, plainDoc, ttl);
                    this.stats.writes++;
                }
                // Invalidate query collections for this model prefix
                this.invalidatePrefix(`${prefix}:list`);
                return doc;
            },

            /**
             * Update document by ID (Write-Through)
             */
            findByIdAndUpdate: async (id, updateData, mongooseOptions = { new: true, lean: true }) => {
                const key = getKey(id);
                return this.writeThrough(key, updateData, async () => {
                    const updated = await Model.findByIdAndUpdate(id, updateData, mongooseOptions).exec();
                    this.invalidatePrefix(`${prefix}:list`);
                    return updated;
                }, { ttlSeconds: ttl });
            },

            /**
             * Delete document by ID (Delete-Through)
             */
            findByIdAndDelete: async (id) => {
                const key = getKey(id);
                return this.deleteThrough(key, async () => {
                    const deleted = await Model.findByIdAndDelete(id).exec();
                    this.invalidatePrefix(`${prefix}:list`);
                    return deleted;
                });
            },

            /**
             * Invalidate single or all cached items for this model
             */
            invalidate: (id) => {
                if (id) {
                    this.del(getKey(id));
                } else {
                    this.invalidatePrefix(`${prefix}:`);
                }
            }
        };
    }
}

/**
 * CacheManager Singleton
 * Inherits and provides the default application-wide Write-Through Cache instance.
 */
class CacheManager extends WriteThroughCache {
    static instance = null;

    constructor(options = {}) {
        if (CacheManager.instance) {
            return CacheManager.instance;
        }
        super(options);
        CacheManager.instance = this;
    }

    static getInstance(options) {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager(options);
        }
        return CacheManager.instance;
    }
}

export const cacheManager = CacheManager.getInstance();
export default CacheManager;
