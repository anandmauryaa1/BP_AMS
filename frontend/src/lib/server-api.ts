/**
 * Server-side API helpers with Next.js caching.
 * Only import these in Server Components (no 'use client').
 */
import { cache } from 'react';
import { cookies, headers } from 'next/headers';

const BACKEND_URL = (
  process.env.API_PROXY_URL || process.env.NEXT_PUBLIC_API_URL || ''
).replace(/\/+$/, '');

/** Extract auth token from the incoming request (server-side only). */
async function getServerToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('auth_token')?.value;
    if (cookieToken) return cookieToken;

    const headerStore = await headers();
    const authHeader = headerStore.get('authorization');
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  } catch {
    // not in a request context
  }
  return null;
}

/**
 * Server-Side Lease Cache Entry
 */
interface CacheLeaseEntry<T = any> {
  data: T;
  cacheToken?: string;      // Token generated when data was created or updated on server
  leaseExpiresAt: number;   // Soft expiration (lease renewal deadline)
  staleExpiresAt: number;   // Hard expiration (maximum stale limit)
  isLeased: boolean;        // Whether a lease renewal lock is held
  leaseLockedUntil: number; // Expiry of the renewal lease lock
}

// In-memory Lease Cache Store for Server Components
const serverLeaseCache = new Map<string, CacheLeaseEntry>();
const inFlightRequests = new Map<string, Promise<any>>();

async function executeNetworkFetch<T = any>(
  path: string,
  token: string | null,
  cachedToken?: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string; cacheToken?: string; isNotModified?: boolean; [key: string]: any }> {
  const url = `${BACKEND_URL}${path.startsWith('/') ? path : '/' + path}`;
  const { next, cache: _c, ...restOptions } = (options as any) || {};
  try {
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cachedToken ? {
        'If-None-Match': cachedToken,
        'X-Verify-Cache-Token': cachedToken,
      } : {}),
      ...(options.headers as any || {}),
    };

    const res = await fetch(url, {
      ...restOptions,
      headers: reqHeaders,
      cache: 'no-store', // Bypass default Next.js HTTP cache in favor of our Token-Verified Lease Cache
    });

    // 304 Not Modified -> Server verified that data matches the cached token exactly!
    if (res.status === 304) {
      return { success: true, isNotModified: true, cacheToken: cachedToken };
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { success: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    const json = await res.json();
    const serverToken = res.headers.get('x-cache-token') || res.headers.get('etag')?.replace(/"/g, '') || json._cacheToken || json.dataVersion;
    return {
      ...json,
      cacheToken: serverToken || undefined,
    };
  } catch (err: any) {
    console.error(`[ServerAPI:Leased] ${path}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Generic server-side fetch with Token-Verified Lease Caching semantics:
 * 1. Checks memory cache for existing data + version token.
 * 2. If within lease window: immediately returns cached data.
 * 3. When lease expires: grants a lease lock to ONE request to verify token with server.
 *    - If token is verified (304 Not Modified): keeps cached data and extends lease.
 *    - If token changed (200 OK with fresh data): automatically updates cache & token.
 * 4. Concurrent requests during verification receive cached data with zero latency & no stampede.
 */
export async function serverFetch<T = any>(
  path: string,
  options: RequestInit & { leaseDurationSecs?: number; maxStaleSecs?: number; tags?: string[]; next?: any } = {}
): Promise<{ success: boolean; data?: T; error?: string; [key: string]: any }> {
  const token = await getServerToken();
  const cacheKey = `${token ? 'auth:' + token.slice(-16) + ':' : 'anon:'}${path}`;
  const leaseDurationMs = (options.leaseDurationSecs || 30) * 1000;
  const maxStaleMs = (options.maxStaleSecs || 3600) * 1000;
  const now = Date.now();

  const entry = serverLeaseCache.get(cacheKey);

  // 1. Fresh Lease Hit: Within active lease window
  if (entry && now < entry.leaseExpiresAt) {
    return entry.data;
  }

  // 2. Stale Lease Available: Lease expired, but within maxStale tolerance
  if (entry && now < entry.staleExpiresAt) {
    const isLockHeld = entry.isLeased && now < entry.leaseLockedUntil;
    if (isLockHeld) {
      // Another worker holds the lease lock -> return cached copy immediately
      return entry.data;
    }

    // Acquire renewal lease lock for this worker
    entry.isLeased = true;
    entry.leaseLockedUntil = now + 10000;

    // Non-blocking background verification with server token check
    executeNetworkFetch<T>(path, token, entry.cacheToken, options)
      .then((res) => {
        if (res.isNotModified) {
          // Token verified by server -> data is up-to-date, renew lease!
          entry.leaseExpiresAt = Date.now() + leaseDurationMs;
          entry.staleExpiresAt = Date.now() + maxStaleMs;
          entry.isLeased = false;
        } else if (res && res.success !== false) {
          // Data updated on server -> update cache and store fresh token!
          serverLeaseCache.set(cacheKey, {
            data: res,
            cacheToken: res.cacheToken,
            leaseExpiresAt: Date.now() + leaseDurationMs,
            staleExpiresAt: Date.now() + maxStaleMs,
            isLeased: false,
            leaseLockedUntil: 0,
          });
        } else {
          entry.isLeased = false;
        }
      })
      .catch(() => {
        entry.isLeased = false;
      });

    // Return current cached value instantly (0ms waiting)
    return entry.data;
  }

  // 3. Cold Cache / Past Max Stale -> Single-flight fetch with token initialization
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = executeNetworkFetch<T>(path, token, undefined, options)
    .then((fresh) => {
      inFlightRequests.delete(cacheKey);
      if (fresh && fresh.success !== false) {
        serverLeaseCache.set(cacheKey, {
          data: fresh,
          cacheToken: fresh.cacheToken,
          leaseExpiresAt: Date.now() + leaseDurationMs,
          staleExpiresAt: Date.now() + maxStaleMs,
          isLeased: false,
          leaseLockedUntil: 0,
        });
      }
      return fresh;
    })
    .catch((err) => {
      inFlightRequests.delete(cacheKey);
      throw err;
    });

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

// ─── Cached data fetchers (deduplicated per request via React cache()) ────────

/** Fetch current user session — revalidates every 60s */
export const getMe = cache(async () => {
  const res = await serverFetch('/api/auth/me', { next: { revalidate: 60, tags: ['me'] } });
  return res.data || null;
});

/** Fetch dashboard metrics — revalidates every 30s */
export const getDashboardMetrics = cache(async () => {
  const today = new Date().toISOString().split('T')[0];
  const [reports, attendance] = await Promise.all([
    serverFetch('/api/admin/reports', { next: { revalidate: 30, tags: ['reports'] } }),
    serverFetch(`/api/admin/attendance?date=${today}`, { next: { revalidate: 15, tags: ['attendance'] } }),
  ]);
  return {
    metrics: reports.data?.dashboardMetrics ?? null,
    prodMetrics: reports.data?.productionMetrics ?? null,
    records: attendance.data?.records ?? [],
  };
});

/** Fetch all projects — revalidates every 60s */
export const getProjects = cache(async (status?: string) => {
  const qs = status && status !== 'ALL' ? `?status=${status}` : '';
  const res = await serverFetch(`/api/projects${qs}`, { next: { revalidate: 60, tags: ['projects'] } });
  return (
    res.data?.projects ||
    res.projects ||
    (Array.isArray(res.data) ? res.data : [])
  );
});

/** Fetch single project — revalidates every 30s */
export const getProject = cache(async (id: string) => {
  const res = await serverFetch(`/api/projects/${id}`, { next: { revalidate: 30, tags: [`project-${id}`] } });
  return res.data?.project || res.project || res.data || null;
});

/** Fetch deliverables for a project — revalidates every 30s */
export const getDeliverables = cache(async (projectId?: string) => {
  const qs = projectId ? `?projectId=${projectId}` : '';
  const res = await serverFetch(`/api/deliverables${qs}`, { next: { revalidate: 30, tags: ['deliverables'] } });
  return Array.isArray(res.data) ? res.data : (res.data?.deliverables || []);
});

/** Fetch tasks — revalidates every 30s */
export const getTasks = cache(async (projectId?: string) => {
  const qs = projectId ? `?projectId=${projectId}` : '';
  const res = await serverFetch(`/api/tasks${qs}`, { next: { revalidate: 30, tags: ['tasks'] } });
  return res.data?.tasks || res.tasks || (Array.isArray(res.data) ? res.data : []);
});

/** Fetch employees — revalidates every 120s */
export const getEmployees = cache(async () => {
  const res = await serverFetch('/api/admin/employees', { next: { revalidate: 120, tags: ['employees'] } });
  return (
    res.data?.employees ||
    res.employees ||
    (Array.isArray(res.data) ? res.data : [])
  );
});

/** Fetch single employee — revalidates every 60s */
export const getEmployee = cache(async (id: string) => {
  const res = await serverFetch(`/api/admin/employees/${id}`, { next: { revalidate: 60, tags: [`employee-${id}`] } });
  return res.data?.employee || res.employee || res.data || null;
});

/** Fetch channels — revalidates every 120s */
export const getChannels = cache(async () => {
  const res = await serverFetch('/api/channels', { next: { revalidate: 120, tags: ['channels'] } });
  return (
    res.data?.channels ||
    res.channels ||
    (Array.isArray(res.data) ? res.data : [])
  );
});

/** Fetch leaves — revalidates every 30s */
export const getLeaves = cache(async (status?: string) => {
  const qs = status && status !== 'ALL' ? `?status=${status}` : '';
  const res = await serverFetch(`/api/leaves${qs}`, { next: { revalidate: 30, tags: ['leaves'] } });
  return Array.isArray(res.data) ? res.data : (res.data?.leaves || res.leaves || []);
});

/** Fetch daily plans — revalidates every 30s */
export const getDailyPlans = cache(async (date: string) => {
  const res = await serverFetch(`/api/plans/daily?date=${date}`, { next: { revalidate: 30, tags: ['plans-daily'] } });
  return res.data?.dailyPlans || res.dailyPlans || [];
});

/** Fetch weekly plans — revalidates every 60s */
export const getWeeklyPlans = cache(async () => {
  const res = await serverFetch('/api/plans/weekly', { next: { revalidate: 60, tags: ['plans-weekly'] } });
  return res.data?.weeklyPlans || res.weeklyPlans || [];
});

/** Fetch monthly plans — revalidates every 60s */
export const getMonthlyPlans = cache(async () => {
  const res = await serverFetch('/api/plans/monthly', { next: { revalidate: 60, tags: ['plans-monthly'] } });
  return res.data?.monthlyPlans || res.monthlyPlans || [];
});

/** Fetch calendar deliverables — revalidates every 60s */
export const getCalendarDeliverables = cache(async () => {
  const res = await serverFetch('/api/deliverables', { next: { revalidate: 60, tags: ['calendar'] } });
  return Array.isArray(res.data) ? res.data : (res.data?.deliverables || []);
});

/** Fetch attendance records for a date — revalidates every 15s */
export const getAttendanceRecords = cache(async (date: string) => {
  const res = await serverFetch(`/api/admin/attendance?date=${date}&limit=100`, {
    next: { revalidate: 15, tags: [`attendance-${date}`] },
  });
  return res.data?.records || [];
});

/** Fetch audit logs — revalidates every 30s */
export const getAuditLogs = cache(async () => {
  const res = await serverFetch('/api/admin/audit-logs?limit=100', { next: { revalidate: 30, tags: ['audit-logs'] } });
  return res.data?.logs || res.logs || (Array.isArray(res.data) ? res.data : []);
});

/** Fetch employee daily plan queue (for employee dashboard) — revalidates every 30s */
export const getEmployeeDailyQueue = cache(async () => {
  const res = await serverFetch('/api/plans/daily', { next: { revalidate: 30 } });
  return {
    myQueue: res.data?.myQueue || [],
    myTasksToday: res.data?.myTasksToday || [],
  };
});

/** Fetch today's attendance for an employee — revalidates every 15s */
export const getEmployeeAttendanceToday = cache(async () => {
  const res = await serverFetch('/api/attendance/today', { next: { revalidate: 15, tags: ['attendance-today'] } });
  return res.data?.attendance || res.data || null;
});

/** Fetch current work session — revalidates every 15s */
export const getCurrentWorkSession = cache(async () => {
  const res = await serverFetch('/api/work-sessions/current', { next: { revalidate: 15 } });
  const currentSession = res.data?.currentSession !== undefined
    ? res.data.currentSession
    : (res.data?._id ? res.data : null);

  let activeProjects = res.data?.activeProjects;
  if (!Array.isArray(activeProjects) || activeProjects.length === 0) {
    activeProjects = await getProjects('ALL');
  }

  return {
    currentSession,
    activeProjects: Array.isArray(activeProjects) ? activeProjects : [],
  };
});

/** Fetch employee tasks — revalidates every 30s */
export const getMyTasks = cache(async () => {
  const res = await serverFetch('/api/tasks/my', { next: { revalidate: 30, tags: ['my-tasks'] } });
  return res.data?.tasks || res.tasks || (Array.isArray(res.data) ? res.data : []);
});

/** Fetch employee leaves — revalidates every 30s */
export const getMyLeaves = cache(async () => {
  const res = await serverFetch('/api/leaves/my', { next: { revalidate: 30, tags: ['my-leaves'] } });
  return Array.isArray(res.data) ? res.data : (res.data?.leaves || []);
});

/** Fetch employee profile — revalidates every 60s */
export const getMyProfile = cache(async () => {
  const res = await serverFetch('/api/auth/me', { next: { revalidate: 60, tags: ['profile'] } });
  return res.data || null;
});

/** Fetch full Employee Payroll data server-side — revalidates every 30s */
export const getMyPayroll = cache(async () => {
  const [structRes, declRes, payslipsRes, loansRes, me] = await Promise.all([
    serverFetch('/api/payroll/my-structure', { next: { revalidate: 30, tags: ['my-payroll-structure'] } }),
    serverFetch('/api/payroll/tax-declaration', { next: { revalidate: 60, tags: ['my-tax-declaration'] } }),
    serverFetch('/api/payroll/my-payslips', { next: { revalidate: 30, tags: ['my-payslips'] } }),
    serverFetch('/api/payroll/loans', { next: { revalidate: 30, tags: ['my-loans'] } }),
    getMe(),
  ]);

  return {
    structure: structRes.data?.structure || structRes.structure || structRes.data || null,
    declaration: declRes.data?.declaration || declRes.declaration || declRes.data || null,
    payslips: payslipsRes.data?.records || payslipsRes.records || payslipsRes.data || payslipsRes.runs || [],
    loans: Array.isArray(loansRes.data?.loans) ? loansRes.data.loans : (Array.isArray(loansRes.loans) ? loansRes.loans : (Array.isArray(loansRes.data) ? loansRes.data : [])),
    user: me,
  };
});

/** Fetch Admin Payroll data server-side — revalidates every 30s */
export const getAdminPayroll = cache(async () => {
  const [empRes, runsRes, loansRes, me] = await Promise.all([
    serverFetch('/api/admin/employees', { next: { revalidate: 60, tags: ['employees'] } }),
    serverFetch('/api/payroll/runs', { next: { revalidate: 30, tags: ['payroll-runs'] } }),
    serverFetch('/api/payroll/loans', { next: { revalidate: 30, tags: ['admin-loans'] } }),
    getMe(),
  ]);

  return {
    employees: empRes.data?.employees || empRes.employees || (Array.isArray(empRes.data) ? empRes.data : []),
    payrollRuns: runsRes.data?.runs || runsRes.runs || (Array.isArray(runsRes.data) ? runsRes.data : []),
    loans: Array.isArray(loansRes.data?.loans) ? loansRes.data.loans : (Array.isArray(loansRes.loans) ? loansRes.loans : (Array.isArray(loansRes.data) ? loansRes.data : [])),
    user: me,
  };
});

/** Fetch monthly attendance history for an employee — revalidates every 15s */
export const getMyAttendanceHistory = cache(async (month?: string) => {
  const d = new Date();
  const currentMonth = month || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const [res, me] = await Promise.all([
    serverFetch(`/api/attendance/history?month=${currentMonth}`, { next: { revalidate: 15, tags: [`attendance-history-${currentMonth}`] } }),
    getMe(),
  ]);
  return {
    records: res.data?.records || [],
    summary: res.data?.summary || null,
    user: me,
  };
});

/** Fetch notifications server-side — revalidates every 15s */
export const getNotifications = cache(async () => {
  const [res, me] = await Promise.all([
    serverFetch('/api/notifications', { next: { revalidate: 15, tags: ['notifications'] } }),
    getMe(),
  ]);
  const list = Array.isArray(res.data) ? res.data : (res.data?.notifications || []);
  return {
    notifications: list,
    user: me,
  };
});

/** Fetch admin settings server-side — revalidates every 120s */
export const getAdminSettings = cache(async () => {
  const [res, me] = await Promise.all([
    serverFetch('/api/settings/admin', { next: { revalidate: 120, tags: ['admin-settings'] } }),
    getMe(),
  ]);
  return {
    settings: res.data?.settings || res.data || null,
    user: me,
  };
});
