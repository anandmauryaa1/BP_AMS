interface ClientCacheEntry<T = any> {
  data: T;
  cacheToken?: string;
  leaseExpiresAt: number;
  staleExpiresAt: number;
  isLeased?: boolean;
  leaseLockedUntil?: number;
}

const memoryCache: Map<string, ClientCacheEntry> = new Map();
const inFlightClientRequests: Map<string, Promise<any>> = new Map();

/** Get from memory cache with Lease Caching semantics. */
function memGetLeased<T>(key: string): { data: T; cacheToken?: string; isFresh: boolean; isStale: boolean } | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (now < entry.leaseExpiresAt) {
    return { data: entry.data, cacheToken: entry.cacheToken, isFresh: true, isStale: false };
  }
  if (now < entry.staleExpiresAt) {
    return { data: entry.data, cacheToken: entry.cacheToken, isFresh: false, isStale: true };
  }
  return null;
}

/** Set in memory + localStorage using lease duration and max stale tolerance. */
function memSetLeased(key: string, data: any, leaseDurationSecs = 30, maxStaleSecs = 3600, cacheToken?: string) {
  const now = Date.now();
  const token = cacheToken || (data && (data._cacheToken || data.cacheToken || data.dataVersion)) || undefined;
  const entry: ClientCacheEntry = {
    data,
    cacheToken: token,
    leaseExpiresAt: now + leaseDurationSecs * 1000,
    staleExpiresAt: now + maxStaleSecs * 1000,
    isLeased: false,
    leaseLockedUntil: 0,
  };
  memoryCache.set(key, entry);
  try {
    localStorage.setItem(`_bpams_cache_${key}`, JSON.stringify(entry));
  } catch { /* quota exceeded */ }
}

/** Get from localStorage (survives page reload). */
function localGetLeased<T>(key: string): { data: T; cacheToken?: string; isFresh: boolean; isStale: boolean } | null {
  try {
    const raw = localStorage.getItem(`_bpams_cache_${key}`);
    if (!raw) return null;
    const entry: ClientCacheEntry<T> = JSON.parse(raw);
    const now = Date.now();
    if (now < (entry.leaseExpiresAt || 0)) {
      memoryCache.set(key, entry);
      return { data: entry.data, cacheToken: entry.cacheToken, isFresh: true, isStale: false };
    }
    if (now < (entry.staleExpiresAt || 0)) {
      memoryCache.set(key, entry);
      return { data: entry.data, cacheToken: entry.cacheToken, isFresh: false, isStale: true };
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Fetch with Lease Caching semantics:
 * - Fresh Lease Hit: Returns cached data (~0ms).
 * - Stale Lease Hit: Returns cached data immediately and renews lease in background (zero UI waiting).
 * - Cold Cache: Deduplicates concurrent calls via Single-Flight.
 * 
 * @param key               cache key
 * @param fetcher           async function that returns data
 * @param leaseDurationSecs soft expiration window in seconds (default 30s)
 * @param maxStaleSecs      maximum stale tolerance in seconds (default 1 hour)
 */
export async function cachedFetch<T = any>(
  key: string,
  fetcher: () => Promise<T>,
  leaseDurationSecs = 30,
  maxStaleSecs = 3600
): Promise<T> {
  const now = Date.now();

  // 1. Memory Lease Check (fastest, ~0ms)
  const mem = memGetLeased<T>(key);
  if (mem) {
    if (mem.isFresh) {
      return mem.data;
    }
    // Stale lease: trigger background renewal if lease lock is free
    const entry = memoryCache.get(key);
    if (entry && (!entry.isLeased || now > (entry.leaseLockedUntil || 0))) {
      entry.isLeased = true;
      entry.leaseLockedUntil = now + 10000;
      fetcher()
        .then((fresh) => {
          if (fresh !== undefined && fresh !== null) {
            memSetLeased(key, fresh, leaseDurationSecs, maxStaleSecs);
          } else if (entry) {
            entry.isLeased = false;
          }
        })
        .catch(() => {
          if (entry) entry.isLeased = false;
        });
    }
    return mem.data;
  }

  // 2. LocalStorage Lease Check (~1-2ms)
  if (typeof window !== 'undefined') {
    const local = localGetLeased<T>(key);
    if (local) {
      if (local.isFresh) {
        return local.data;
      }
      // Stale lease: trigger background renewal
      fetcher()
        .then((fresh) => {
          if (fresh !== undefined && fresh !== null) {
            memSetLeased(key, fresh, leaseDurationSecs, maxStaleSecs);
          }
        })
        .catch(() => {});
      return local.data;
    }
  }

  // 3. Cold Cache Miss: Single-flight network fetch
  if (inFlightClientRequests.has(key)) {
    return inFlightClientRequests.get(key)!;
  }

  const promise = (async () => {
    try {
      const fresh = await fetcher();
      memSetLeased(key, fresh, leaseDurationSecs, maxStaleSecs);
      return fresh;
    } finally {
      inFlightClientRequests.delete(key);
    }
  })();

  inFlightClientRequests.set(key, promise);
  return promise;
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
