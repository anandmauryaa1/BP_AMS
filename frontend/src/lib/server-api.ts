/**
 * Server-side API helpers with Next.js caching.
 * Only import these in Server Components (no 'use client').
 */
import { cache } from 'react';
import { cookies, headers } from 'next/headers';

const BACKEND_URL = (
  process.env.API_PROXY_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
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

/** Generic server-side fetch with auth. */
export async function serverFetch<T = any>(
  path: string,
  options: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {}
): Promise<{ success: boolean; data?: T; error?: string; [key: string]: any }> {
  const token = await getServerToken();
  const url = `${BACKEND_URL}${path.startsWith('/') ? path : '/' + path}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      next: { revalidate: 30, ...options.next },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { success: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    const json = await res.json();
    return json;
  } catch (err: any) {
    console.error(`[ServerAPI] ${path}:`, err.message);
    return { success: false, error: err.message };
  }
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
  return res.data?.logs || [];
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
  return {
    currentSession: res.data?.currentSession || null,
    activeProjects: res.data?.activeProjects || [],
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
