import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WriteThroughCache, cacheManager } from '../services/CacheManager.js';

describe('Write-Through Cache System', () => {
    let cache;

    beforeEach(() => {
        cache = new WriteThroughCache({ defaultTtl: 10, maxSize: 5 });
    });

    describe('1. Read-Through Strategy & Single Flight', () => {
        it('should fetch from source on cache miss, cache it, and serve from cache on subsequent calls', async () => {
            const mockFetcher = vi.fn().mockResolvedValue({ id: '101', name: 'Alpha Project' });

            // 1st call: Cache miss -> executes fetcher
            const result1 = await cache.readThrough('project:101', mockFetcher);
            expect(result1).toEqual({ id: '101', name: 'Alpha Project' });
            expect(mockFetcher).toHaveBeenCalledTimes(1);

            // 2nd call: Cache hit -> does NOT execute fetcher
            const result2 = await cache.readThrough('project:101', mockFetcher);
            expect(result2).toEqual({ id: '101', name: 'Alpha Project' });
            expect(mockFetcher).toHaveBeenCalledTimes(1);

            const stats = cache.getStats();
            expect(stats.hits).toBe(1);
            expect(stats.misses).toBe(1);
            expect(stats.hitRatio).toBe(0.5);
        });

        it('should deduplicate concurrent requests for the same key (anti-stampede / single-flight)', async () => {
            let callCount = 0;
            const slowFetcher = vi.fn().mockImplementation(async () => {
                callCount++;
                await new Promise((resolve) => setTimeout(resolve, 50));
                return { loaded: true, count: callCount };
            });

            // Fire 5 concurrent requests for the exact same key
            const promises = [
                cache.readThrough('item:concurrent', slowFetcher),
                cache.readThrough('item:concurrent', slowFetcher),
                cache.readThrough('item:concurrent', slowFetcher),
                cache.readThrough('item:concurrent', slowFetcher),
                cache.readThrough('item:concurrent', slowFetcher),
            ];

            const results = await Promise.all(promises);
            expect(slowFetcher).toHaveBeenCalledTimes(1);
            for (const res of results) {
                expect(res).toEqual({ loaded: true, count: 1 });
            }
        });
    });

    describe('2. Write-Through Strategy', () => {
        it('should write to persistent storage and immediately update cache on success', async () => {
            const dbMock = new Map();
            const writer = vi.fn().mockImplementation(async (data) => {
                dbMock.set(data.id, data);
                return data;
            });

            const user = { id: 'u1', name: 'Alice Developer', role: 'ADMIN' };

            const writeResult = await cache.writeThrough('user:u1', user, writer);
            expect(writeResult).toEqual(user);
            expect(writer).toHaveBeenCalledWith(user);
            expect(dbMock.get('u1')).toEqual(user);

            // Direct cache read should now immediately hit without any DB call
            const cachedUser = cache.get('user:u1');
            expect(cachedUser).toEqual(user);

            const stats = cache.getStats();
            expect(stats.writes).toBe(1);
            expect(stats.writeFailures).toBe(0);
        });

        it('should not update cache and should invalidate stale cache if DB write fails', async () => {
            cache.set('user:u2', { id: 'u2', name: 'Old Stale Name' });

            const failingWriter = vi.fn().mockRejectedValue(new Error('DB connection failed'));

            await expect(
                cache.writeThrough('user:u2', { id: 'u2', name: 'New Name' }, failingWriter)
            ).rejects.toThrow('DB connection failed');

            // Stale cache should be cleaned up / invalidated
            expect(cache.get('user:u2')).toBeNull();

            const stats = cache.getStats();
            expect(stats.writeFailures).toBe(1);
        });
    });

    describe('3. Update-Through & Delete-Through Strategy', () => {
        it('should update primary store and update cache via updateThrough', async () => {
            const dbItem = { id: 't1', title: 'Original Task', completed: false };

            const updater = vi.fn().mockImplementation(async () => {
                dbItem.completed = true;
                return { ...dbItem };
            });

            const updated = await cache.updateThrough('task:t1', updater);
            expect(updated.completed).toBe(true);
            expect(cache.get('task:t1')).toEqual({ id: 't1', title: 'Original Task', completed: true });
        });

        it('should delete from store and remove from cache via deleteThrough', async () => {
            cache.set('task:t2', { id: 't2', title: 'Task to Delete' });

            const deleter = vi.fn().mockResolvedValue({ success: true });

            await cache.deleteThrough('task:t2', deleter);
            expect(deleter).toHaveBeenCalledTimes(1);
            expect(cache.get('task:t2')).toBeNull();
            expect(cache.has('task:t2')).toBe(false);

            const stats = cache.getStats();
            expect(stats.deletes).toBe(1);
        });
    });

    describe('4. TTL & LRU Eviction Logic', () => {
        it('should respect TTL expiration', async () => {
            cache.set('temp:key', 'quick_value', 0.05); // 50ms TTL
            expect(cache.get('temp:key')).toBe('quick_value');

            await new Promise((resolve) => setTimeout(resolve, 70));
            expect(cache.get('temp:key')).toBeNull();
            expect(cache.has('temp:key')).toBe(false);
        });

        it('should evict least recently used entries when reaching maxSize', () => {
            // Cache maxSize is 5
            cache.set('k1', 1);
            cache.set('k2', 2);
            cache.set('k3', 3);
            cache.set('k4', 4);
            cache.set('k5', 5);

            // Access k1 so k2 becomes the oldest unaccessed
            cache.get('k1');

            // Add 6th item
            cache.set('k6', 6);

            expect(cache.get('k6')).toBe(6);
            expect(cache.get('k1')).toBe(1); // Still here because accessed
            expect(cache.get('k2')).toBeNull(); // Evicted!

            const stats = cache.getStats();
            expect(stats.evictions).toBe(1);
        });
    });

    describe('5. Bulk Invalidation & Pattern Invalidation', () => {
        it('should invalidate specific keys', () => {
            cache.set('a', 1);
            cache.set('b', 2);
            cache.set('c', 3);

            cache.invalidate(['a', 'b']);
            expect(cache.get('a')).toBeNull();
            expect(cache.get('b')).toBeNull();
            expect(cache.get('c')).toBe(3);
        });

        it('should invalidate keys by prefix', () => {
            cache.set('project:1', { id: 1 });
            cache.set('project:2', { id: 2 });
            cache.set('user:1', { id: 1 });

            const removed = cache.invalidatePrefix('project:');
            expect(removed).toBe(2);
            expect(cache.get('project:1')).toBeNull();
            expect(cache.get('project:2')).toBeNull();
            expect(cache.get('user:1')).toEqual({ id: 1 });
        });

        it('should invalidate keys matching regular expressions', () => {
            cache.set('report:daily:2026-09-01', {});
            cache.set('report:daily:2026-09-02', {});
            cache.set('report:monthly:2026-09', {});

            const removed = cache.invalidatePattern(/^report:daily:/);
            expect(removed).toBe(2);
            expect(cache.get('report:daily:2026-09-01')).toBeNull();
            expect(cache.get('report:monthly:2026-09')).toEqual({});
        });
    });

    describe('6. Mongoose Model Adapter Factory', () => {
        it('should wrap Mongoose Model operations in a write-through repository', async () => {
            const mockDb = new Map();

            const MockModel = {
                modelName: 'Shift',
                findById: (id) => ({
                    populate: () => ({
                        select: () => ({
                            lean: () => ({
                                exec: async () => mockDb.get(id.toString()) || null
                            })
                        })
                    }),
                    select: () => ({
                        lean: () => ({
                            exec: async () => mockDb.get(id.toString()) || null
                        })
                    }),
                    lean: () => ({
                        exec: async () => mockDb.get(id.toString()) || null
                    }),
                    exec: async () => mockDb.get(id.toString()) || null
                }),
                create: async (data) => {
                    const doc = { _id: 'shift_123', ...data };
                    mockDb.set('shift_123', doc);
                    return doc;
                },
                findByIdAndUpdate: (id, updateData) => ({
                    exec: async () => {
                        const existing = mockDb.get(id) || { _id: id };
                        const updated = { ...existing, ...updateData };
                        mockDb.set(id, updated);
                        return updated;
                    }
                }),
                findByIdAndDelete: (id) => ({
                    exec: async () => {
                        const doc = mockDb.get(id);
                        mockDb.delete(id);
                        return doc;
                    }
                })
            };

            const shiftCache = cache.createModelCache(MockModel, { defaultTtl: 30 });

            // 1. Create (Write-Through)
            const created = await shiftCache.create({ name: 'Morning Shift', startTime: '09:00' });
            expect(created._id).toBe('shift_123');
            expect(cache.get('Shift:shift_123')).toEqual(created);

            // 2. FindById (Read-Through hit)
            const fetched = await shiftCache.findById('shift_123');
            expect(fetched).toEqual(created);

            // 3. FindByIdAndUpdate (Write-Through)
            const updated = await shiftCache.findByIdAndUpdate('shift_123', { name: 'Early Morning Shift' });
            expect(updated.name).toBe('Early Morning Shift');
            expect(cache.get('Shift:shift_123').name).toBe('Early Morning Shift');

            // 4. FindByIdAndDelete (Delete-Through)
            await shiftCache.findByIdAndDelete('shift_123');
            expect(cache.get('Shift:shift_123')).toBeNull();
        });
    });

    describe('7. Singleton CacheManager', () => {
        it('should maintain a shared singleton instance across the application', () => {
            expect(cacheManager).toBeInstanceOf(WriteThroughCache);
            cacheManager.set('singleton_test', 42);
            expect(cacheManager.get('singleton_test')).toBe(42);
            cacheManager.del('singleton_test');
        });
    });
});
