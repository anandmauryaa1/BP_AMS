import { NextRequest } from 'next/server';

interface RateLimitTracker {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitTracker>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export function checkRateLimit(
  req: NextRequest | { headers: { get: (name: string) => string | null } },
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 60000
): RateLimitResult {
  const ip =
    (typeof req.headers.get === 'function' ? req.headers.get('x-forwarded-for') : null) ||
    '127.0.0.1';

  const storeKey = `${key}:${ip}`;
  const now = Date.now();
  const entry = rateLimitStore.get(storeKey);

  if (!entry || now > entry.resetAt) {
    const newEntry: RateLimitTracker = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(storeKey, newEntry);
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetTime: newEntry.resetAt,
    };
  }

  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetAt,
    };
  }

  entry.count += 1;
  rateLimitStore.set(storeKey, entry);

  return {
    allowed: true,
    remaining: Math.max(0, maxAttempts - entry.count),
    resetTime: entry.resetAt,
  };
}
