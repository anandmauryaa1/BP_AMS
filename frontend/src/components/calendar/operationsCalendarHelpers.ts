import { formatTime, getTodayDateString } from '@/lib/utils';

export type CalendarLayer = 'TASK' | 'LEAVE' | 'ATTENDANCE';

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const TASK_TYPE_OPTIONS = [
  'VIDEO_EDITING',
  'SHORT_FORM_EDIT',
  'SHOOT',
  'SCRIPT',
  'RESEARCH',
  'MOTION_GRAPHICS',
  'THUMBNAIL',
  'AUDIO_MIX',
  'COLOR',
  'INTERNAL_REVIEW',
  'SCHEDULING',
  'PUBLISH',
];

export const TASK_STATUS_OPTIONS = [
  'TODO',
  'IN_PROGRESS',
  'READY_FOR_REVIEW',
  'REVISION',
  'COMPLETED',
  'BLOCKED',
  'CANCELLED',
];

export const TASK_PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export const ATTENDANCE_STATUS_OPTIONS = [
  'PRESENT',
  'COMPLETED',
  'ON_BREAK',
  'ABSENT',
  'MISSED_CHECKOUT',
  'NOT_CHECKED_IN',
];

export const LEAVE_TYPE_OPTIONS = ['CASUAL', 'SICK', 'EMERGENCY', 'UNPAID', 'OTHER'];

export const LEAVE_STATUS_OPTIONS = ['APPROVED', 'PENDING', 'REJECTED'];

export function toDateKey(input?: string | Date | null): string | null {
  if (!input) return null;
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}/.test(input)) {
    // Handle pure YYYY-MM-DD directly; for ISO timestamps convert to local YYYY-MM-DD
    if (input.length === 10) return input;
  }
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  return getTodayDateString(d);
}

export function getMonthDaysMatrix(year: number, month: number): (number | null)[] {
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];

  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function formatShortName(fullName?: string, fallback?: string): string {
  const name = (fullName || fallback || 'Staff').trim();
  const parts = name.split(/\s+/);
  if (parts.length <= 1) return name;
  return `${parts[0]} ${parts[1][0]}.`;
}

export function estimateLateFromCheckIn(
  checkInLocalStr: string,
  shiftStartTime = '09:30',
  graceMinutes = 15
): { isLate: boolean; lateMinutes: number } {
  if (!checkInLocalStr) return { isLate: false, lateMinutes: 0 };
  const d = new Date(checkInLocalStr);
  if (isNaN(d.getTime())) return { isLate: false, lateMinutes: 0 };
  const [sh, sm] = shiftStartTime.split(':').map((n) => parseInt(n, 10) || 0);
  const checkMins = d.getHours() * 60 + d.getMinutes();
  const shiftMins = sh * 60 + sm;
  const diff = checkMins - shiftMins;
  if (diff > graceMinutes) {
    return { isLate: true, lateMinutes: diff };
  }
  return { isLate: false, lateMinutes: 0 };
}

export function getTaskPillStyle(status: string, priority?: string): string {
  if (status === 'COMPLETED' || status === 'APPROVED') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60';
  }
  if (status === 'BLOCKED' || priority === 'URGENT') {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60';
  }
  if (status === 'IN_PROGRESS' || status === 'READY_FOR_REVIEW' || status === 'REVISION') {
    return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60';
  }
  return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60';
}

export function getLeavePillStyle(status: string): string {
  switch (status) {
    case 'APPROVED':
      return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800/60';
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60';
    case 'REJECTED':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800/70 dark:text-zinc-400 dark:border-zinc-700';
  }
}

export function getAttendancePillStyle(rec: any): string {
  if (rec?.status === 'ABSENT' || rec?.status === 'MISSED_CHECKOUT') {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60';
  }
  if (rec?.isLate || (rec?.lateMinutes && rec.lateMinutes > 0)) {
    return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/60';
  }
  if (rec?.status === 'COMPLETED' || rec?.status === 'PRESENT' || rec?.status === 'ON_BREAK') {
    return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/60';
  }
  return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700';
}

export function formatAttendanceTimeRange(rec: any): string {
  if (!rec) return '';
  if (rec.status === 'ABSENT') return 'Absent';
  const inStr = rec.checkIn ? formatTime(rec.checkIn) : '--';
  const outStr = rec.checkOut ? formatTime(rec.checkOut) : '';
  return outStr ? `${inStr} - ${outStr}` : inStr;
}

