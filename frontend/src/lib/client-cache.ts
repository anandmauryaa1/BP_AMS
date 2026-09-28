/**
 * Client-side response cache using localStorage + memory.
 * Provides near-instant data re-renders between page visits.
 *
 * Usage:
 *   const { data, refresh } = useClientCache('admin-projects', () => fetch('/api/projects').then(r=>r.json()), 60);
 */

const memoryCache: Map<string, { data: any; ts: number }> = new Map();

/** Get from memory cache (fastest). */
function memGet(key: string, ttlMs: number): any | null {
  const entry = memoryCache.get(key);
  if (entry && Date.now() - entry.ts < ttlMs) return entry.data;
  return null;
}

/** Set in memory + localStorage. */
function memSet(key: string, data: any) {
  memoryCache.set(key, { data, ts: Date.now() });
  try {
    localStorage.setItem(`_bpams_cache_${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota exceeded */ }
}

/** Get from localStorage (fast, survives page reload). */
function localGet(key: string, ttlMs: number): any | null {
  try {
    const raw = localStorage.getItem(`_bpams_cache_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < ttlMs) return data;
  } catch { /* ignore */ }
  return null;
}

/**
 * Fetch with layered cache: memory → localStorage → network.
 * @param key     cache key
 * @param fetcher async function that returns data
 * @param ttlSecs cache TTL in seconds (default 60)
 */
export async function cachedFetch<T = any>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSecs = 60
): Promise<T> {
  const ttlMs = ttlSecs * 1000;

  // 1. Memory (fastest, ~0ms)
  const mem = memGet(key, ttlMs);
  if (mem !== null) return mem;

  // 2. localStorage (fast, ~1-2ms)
  if (typeof window !== 'undefined') {
    const local = localGet(key, ttlMs);
    if (local !== null) {
      memoryCache.set(key, { data: local, ts: Date.now() });
      return local;
    }
  }

  // 3. Network (slow, full fetch)
  const data = await fetcher();
  memSet(key, data);
  return data;
}

/** Invalidate a cache key (force refetch on next call). */
export function invalidateCache(key: string) {
  memoryCache.delete(key);
  try { localStorage.removeItem(`_bpams_cache_${key}`); } catch { /* ignore */ }
}

/** Invalidate all cache keys matching a prefix. */
export function invalidateCachePrefix(prefix: string) {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }
  if (typeof window === 'undefined') return;
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i) || '';
    if (k.startsWith(`_bpams_cache_${prefix}`)) toRemove.push(k);
  }
  toRemove.forEach(k => localStorage.removeItem(k));
}
