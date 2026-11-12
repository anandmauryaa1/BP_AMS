'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  Film,
  Palmtree,
  Plus,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import { Badge } from '@/components/ui/Badge';
import { cn, formatMinutes, formatTime, getTodayDateString } from '@/lib/utils';
import { useRealTimeEvent } from '@/context/RealTimeContext';
import {
  CalendarLayer,
  MONTH_NAMES,
  WEEKDAYS,
  formatAttendanceTimeRange,
  formatShortName,
  getAttendancePillStyle,
  getAuthHeaders,
  getLeavePillStyle,
  getMonthDaysMatrix,
  getTaskPillStyle,
  toDateKey,
} from './operationsCalendarHelpers';
import {
  AttendanceCalendarModal,
  LeaveCalendarModal,
  TaskCalendarModal,
} from './OperationsCalendarModals';

interface CommonOperationsCalendarProps {
  initialEmployees?: any[];
  initialProjects?: any[];
}

export const CommonOperationsCalendar: React.FC<CommonOperationsCalendarProps> = ({
  initialEmployees = [],
  initialProjects = [],
}) => {
  const searchParams = useSearchParams();
  const initialLayerParam = (searchParams?.get('layer') || '').toUpperCase();

  const [cursorDate, setCursorDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() => getTodayDateString());

  // Layer Filters
  const [activeLayers, setActiveLayers] = useState<Record<CalendarLayer, boolean>>(() => {
    if (initialLayerParam === 'TASK' || initialLayerParam === 'LEAVE' || initialLayerParam === 'ATTENDANCE') {
      return {
        TASK: initialLayerParam === 'TASK',
        LEAVE: initialLayerParam === 'LEAVE',
        ATTENDANCE: initialLayerParam === 'ATTENDANCE',
      };
    }
    return { TASK: true, LEAVE: true, ATTENDANCE: true };
  });

  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState<string>('ALL'); // stores employeeId or 'ALL'
  const [lateOnlyFilter, setLateOnlyFilter] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data
  const [employees, setEmployees] = useState<any[]>(initialEmployees);
  const [projects, setProjects] = useState<any[]>(initialProjects);
  const [tasks, setTasks] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal States
  const [taskModalState, setTaskModalState] = useState<{ open: boolean; task: any | null; date: string }>({
    open: false,
    task: null,
    date: getTodayDateString(),
  });
  const [leaveModalState, setLeaveModalState] = useState<{ open: boolean; leave: any | null; date: string }>({
    open: false,
    leave: null,
    date: getTodayDateString(),
  });
  const [attendanceModalState, setAttendanceModalState] = useState<{
    open: boolean;
    record: any | null;
    date: string;
  }>({
    open: false,
    record: null,
    date: getTodayDateString(),
  });

  const year = cursorDate.getFullYear();
  const month = cursorDate.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const monthStartStr = `${monthStr}-01`;
  const monthEndStr = `${monthStr}-${String(lastDayOfMonth).padStart(2, '0')}`;
  const todayStr = getTodayDateString();

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchMetaData = useCallback(async () => {
    const headers = getAuthHeaders();
    try {
      const promises: Promise<void>[] = [];
      if (employees.length === 0) {
        promises.push(
          fetch('/api/admin/employees?status=ACTIVE&limit=200', { credentials: 'include', headers })
            .then((r) => r.json())
            .then((d) => {
              const list = d?.data?.employees || d?.employees || (Array.isArray(d?.data) ? d.data : []);
              if (Array.isArray(list)) setEmployees(list);
            })
        );
      }
      if (projects.length === 0) {
        promises.push(
          fetch('/api/projects', { credentials: 'include', headers })
            .then((r) => r.json())
            .then((d) => {
              const list = d?.data?.projects || d?.projects || (Array.isArray(d?.data) ? d.data : []);
              if (Array.isArray(list)) setProjects(list);
            })
        );
      }
      await Promise.all(promises);
    } catch (err) {
      console.error('[CommonCalendar] Metadata fetch error:', err);
    }
  }, [employees.length, projects.length]);

  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    const headers = getAuthHeaders();
    try {
      const [tasksRes, leavesRes, attRes] = await Promise.all([
        fetch(`/api/tasks?startDate=${monthStartStr}&endDate=${monthEndStr}`, {
          credentials: 'include',
          headers,
        }),
        fetch('/api/leaves?includeDeleted=false', { credentials: 'include', headers }),
        fetch(`/api/admin/attendance?month=${monthStr}`, { credentials: 'include', headers }),
      ]);

      const [tasksJson, leavesJson, attJson] = await Promise.all([
        tasksRes.json().catch(() => ({})),
        leavesRes.json().catch(() => ({})),
        attRes.json().catch(() => ({})),
      ]);

      const rawTasks = tasksJson?.data?.tasks || tasksJson?.tasks || (Array.isArray(tasksJson?.data) ? tasksJson.data : []);
      const rawLeaves = Array.isArray(leavesJson?.data) ? leavesJson.data : leavesJson?.leaves || [];
      const rawAtt = attJson?.data?.records || (Array.isArray(attJson?.data) ? attJson.data : []);

      setTasks(Array.isArray(rawTasks) ? rawTasks : []);
      setLeaves(Array.isArray(rawLeaves) ? rawLeaves : []);
      setAttendances(Array.isArray(rawAtt) ? rawAtt : []);
    } catch (err) {
      console.error('[CommonCalendar] Fetch error:', err);
      showToast('Failed to refresh calendar data', 'error');
    } finally {
      setLoading(false);
    }
  }, [monthStr, monthStartStr, monthEndStr, showToast]);

  useEffect(() => {
    fetchMetaData();
  }, [fetchMetaData]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Real-time task updates
  useRealTimeEvent('TASK_CREATED', () => fetchCalendarData());
  useRealTimeEvent('TASK_UPDATED', () => fetchCalendarData());
  useRealTimeEvent('TASK_DELETED', () => fetchCalendarData());

  const employeeLookup = useMemo(() => {
    const byEmpId = new Map<string, any>();
    const byObjId = new Map<string, any>();
    employees.forEach((emp) => {
      if (emp.employeeId) byEmpId.set(String(emp.employeeId).toUpperCase(), emp);
      if (emp._id) byObjId.set(String(emp._id), emp);
    });
    return { byEmpId, byObjId };
  }, [employees]);

  const toggleLayer = (layer: CalendarLayer) => {
    setActiveLayers((prev) => {
      const next = { ...prev, [layer]: !prev[layer] };
      // Prevent turning all 3 off accidentally
      if (!next.TASK && !next.LEAVE && !next.ATTENDANCE) {
        return { TASK: true, LEAVE: true, ATTENDANCE: true };
      }
      return next;
    });
  };

  const selectAllLayers = () => {
    setActiveLayers({ TASK: true, LEAVE: true, ATTENDANCE: true });
    setLateOnlyFilter(false);
  };

  const isAllLayersActive = activeLayers.TASK && activeLayers.LEAVE && activeLayers.ATTENDANCE;

  // Filtered datasets
  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      if (selectedEmployee !== 'ALL') {
        const targetEmp = employeeLookup.byEmpId.get(selectedEmployee);
        const assigneeObjId = t.assignedTo?._id || t.assignedTo;
        const assigneeEmpId = t.assignedTo?.employeeId;
        const matchObj = targetEmp && assigneeObjId && String(assigneeObjId) === String(targetEmp._id);
        const matchEmpId = assigneeEmpId && String(assigneeEmpId).toUpperCase() === selectedEmployee;
        if (!matchObj && !matchEmpId) return false;
      }
      if (q) {
        const title = (t.title || '').toLowerCase();
        const taskId = (t.taskId || '').toLowerCase();
        const assigneeName = (t.assignedTo?.name || t.assignedToName || '').toLowerCase();
        const projName = (t.projectId?.title || '').toLowerCase();
        if (!title.includes(q) && !taskId.includes(q) && !assigneeName.includes(q) && !projName.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, selectedEmployee, searchQuery, employeeLookup]);

  const filteredLeaves = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return leaves.filter((l) => {
      if (l.isDeleted) return false;
      if (l.status === 'CANCELLED') return false;
      const empId = String(l.employeeId || l.userId?.employeeId || '').toUpperCase();
      if (selectedEmployee !== 'ALL' && empId !== selectedEmployee) return false;
      if (q) {
        const name = (l.employeeName || l.userId?.name || '').toLowerCase();
        const type = (l.leaveType || l.type || '').toLowerCase();
        const reason = (l.reason || '').toLowerCase();
        if (!name.includes(q) && !empId.toLowerCase().includes(q) && !type.includes(q) && !reason.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [leaves, selectedEmployee, searchQuery]);

  const filteredAttendances = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return attendances.filter((a) => {
      const empId = String(a.employeeId || '').toUpperCase();
      if (selectedEmployee !== 'ALL' && empId !== selectedEmployee) return false;
      if (lateOnlyFilter && !(a.isLate || (a.lateMinutes && a.lateMinutes > 0))) return false;
      if (q) {
        const name = (a.employeeName || '').toLowerCase();
        const status = (a.status || '').toLowerCase();
        if (!name.includes(q) && !empId.toLowerCase().includes(q) && !status.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [attendances, selectedEmployee, lateOnlyFilter, searchQuery]);

  // Index items by YYYY-MM-DD for the current month
  const dayBuckets = useMemo(() => {
    const map = new Map<string, { tasks: any[]; leaves: any[]; attendances: any[] }>();
    const ensureBucket = (key: string) => {
      let b = map.get(key);
      if (!b) {
        b = { tasks: [], leaves: [], attendances: [] };
        map.set(key, b);
      }
      return b;
    };

    if (activeLayers.TASK) {
      filteredTasks.forEach((task) => {
        const key = toDateKey(task.dueDate || task.startDate);
        if (key && key >= monthStartStr && key <= monthEndStr) {
          ensureBucket(key).tasks.push(task);
        }
      });
    }

    if (activeLayers.LEAVE) {
      filteredLeaves.forEach((leave) => {
        const sKey = toDateKey(leave.startDate);
        const eKey = toDateKey(leave.endDate || leave.startDate);
        if (!sKey || !eKey) return;
        const clampedStart = sKey < monthStartStr ? monthStartStr : sKey;
        const clampedEnd = eKey > monthEndStr ? monthEndStr : eKey;
        if (clampedStart > clampedEnd) return;

        const cur = new Date(`${clampedStart}T00:00:00`);
        const end = new Date(`${clampedEnd}T00:00:00`);
        let guard = 0;
        while (cur <= end && guard < 40) {
          ensureBucket(getTodayDateString(cur)).leaves.push(leave);
          cur.setDate(cur.getDate() + 1);
          guard++;
        }
      });
    }

    if (activeLayers.ATTENDANCE) {
      filteredAttendances.forEach((att) => {
        if (att.date && att.date >= monthStartStr && att.date <= monthEndStr) {
          ensureBucket(att.date).attendances.push(att);
        }
      });
    }

    return map;
  }, [activeLayers, filteredTasks, filteredLeaves, filteredAttendances, monthStartStr, monthEndStr]);

  // Month stats
  const monthStats = useMemo(() => {
    const monthTasks = filteredTasks.filter((t) => {
      const k = toDateKey(t.dueDate || t.startDate);
      return k && k >= monthStartStr && k <= monthEndStr;
    });
    const completedTasks = monthTasks.filter((t) => t.status === 'COMPLETED').length;

    const monthLeaves = filteredLeaves.filter((l) => {
      const s = toDateKey(l.startDate);
      const e = toDateKey(l.endDate || l.startDate);
      return s && e && s <= monthEndStr && e >= monthStartStr;
    });
    const approvedLeaves = monthLeaves.filter((l) => l.status === 'APPROVED').length;
    const pendingLeaves = monthLeaves.filter((l) => l.status === 'PENDING').length;

    const presentOrDoneAtt = filteredAttendances.filter((a) =>
      ['PRESENT', 'ON_BREAK', 'COMPLETED'].includes(a.status)
    ).length;
    const lateAttCount = attendances.filter((a) => {
      if (selectedEmployee !== 'ALL' && String(a.employeeId || '').toUpperCase() !== selectedEmployee) return false;
      return Boolean(a.isLate || (a.lateMinutes && a.lateMinutes > 0));
    }).length;
    const absentAttCount = filteredAttendances.filter(
      (a) => a.status === 'ABSENT' || a.status === 'MISSED_CHECKOUT'
    ).length;

    return {
      tasksTotal: monthTasks.length,
      completedTasks,
      leavesTotal: monthLeaves.length,
      approvedLeaves,
      pendingLeaves,
      attTotal: filteredAttendances.length,
      presentOrDoneAtt,
      lateAttCount,
      absentAttCount,
    };
  }, [filteredTasks, filteredLeaves, filteredAttendances, attendances, selectedEmployee, monthStartStr, monthEndStr]);

  const calendarCells = useMemo(() => getMonthDaysMatrix(year, month), [year, month]);

  const selectedAgenda = dayBuckets.get(selectedDayStr) || { tasks: [], leaves: [], attendances: [] };

  const navigateMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setCursorDate(next);
    const nextPrefix = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    if (todayStr.startsWith(nextPrefix)) {
      setSelectedDayStr(todayStr);
    } else {
      setSelectedDayStr(`${nextPrefix}-01`);
    }
  };

  const jumpToToday = () => {
    const now = new Date();
    setCursorDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDayStr(getTodayDateString(now));
  };

  const handleQuickTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update status');
      showToast(`Task marked ${newStatus.replace(/_/g, ' ')}`);
      fetchCalendarData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update task status', 'error');
    }
  };

  const formattedSelectedDay = useMemo(() => {
    const d = new Date(`${selectedDayStr}T00:00:00`);
    if (isNaN(d.getTime())) return selectedDayStr;
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDayStr]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors">
      <Navbar />
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
        {toast && (
          <div
            className={cn(
              'fixed top-20 right-4 z-[9999] px-4 py-3 rounded-xl shadow-2xl border text-xs sm:text-sm font-semibold flex items-center gap-2',
              toast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-rose-600 text-white border-rose-500'
            )}
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{toast.text}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                Unified Operations Calendar
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/20">
                Tasks · Leaves · Attendance
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Common studio calendar to manage tasks, leaves, and update attendance check-in, check-out & late status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/calendar"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white shadow-sm transition"
            >
              <Film className="w-3.5 h-3.5 text-rose-500" />
              Content Calendar
            </Link>
            <button
              type="button"
              onClick={() => setTaskModalState({ open: true, task: null, date: selectedDayStr })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Task
            </button>
            <button
              type="button"
              onClick={() => setLeaveModalState({ open: true, leave: null, date: selectedDayStr })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Leave
            </button>
            <button
              type="button"
              onClick={() => setAttendanceModalState({ open: true, record: null, date: selectedDayStr })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Attendance
            </button>
            <button
              type="button"
              onClick={fetchCalendarData}
              className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white shadow-sm transition"
              title="Refresh calendar"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Monthly Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
                Tasks ({MONTH_NAMES[month].slice(0, 3)})
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{monthStats.tasksTotal}</div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                {monthStats.completedTasks} completed
              </div>
            </div>
            <CheckSquare className="w-6 h-6 text-indigo-500/60" />
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 uppercase">
                Leaves ({MONTH_NAMES[month].slice(0, 3)})
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{monthStats.leavesTotal}</div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                {monthStats.approvedLeaves} approved · {monthStats.pendingLeaves} pending
              </div>
            </div>
            <Palmtree className="w-6 h-6 text-violet-500/60" />
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 uppercase">
                Attendance Shifts
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{monthStats.attTotal}</div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                {monthStats.presentOrDoneAtt} present/completed
              </div>
            </div>
            <CheckCircle2 className="w-6 h-6 text-teal-500/60" />
          </div>

          <button
            type="button"
            onClick={() => {
              setLateOnlyFilter((prev) => !prev);
              setActiveLayers((prev) => ({ ...prev, ATTENDANCE: true }));
            }}
            className={cn(
              'p-3.5 rounded-xl border shadow-sm flex items-center justify-between text-left transition',
              lateOnlyFilter
                ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-400 dark:border-orange-700 ring-2 ring-orange-400/30'
                : 'bg-white dark:bg-zinc-900/70 border-slate-200 dark:border-zinc-800 hover:border-orange-300'
            )}
          >
            <div>
              <div className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 uppercase">
                Late Check-Ins
              </div>
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                {monthStats.lateAttCount}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                {lateOnlyFilter ? 'Filter active (click to clear)' : `${monthStats.absentAttCount} absent/missed`}
              </div>
            </div>
            <AlertTriangle className="w-6 h-6 text-orange-500/70" />
          </button>
        </div>

        {/* Filter & Navigation Bar */}
        <div className="bg-white dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 rounded-2xl p-3.5 shadow-sm space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Layer Toggles */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={selectAllLayers}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border transition',
                  isAllLayersActive && !lateOnlyFilter
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-zinc-900 dark:border-white'
                    : 'bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:text-slate-900'
                )}
              >
                All Layers
              </button>

              <button
                type="button"
                onClick={() => toggleLayer('TASK')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition',
                  activeLayers.TASK
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800'
                )}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Tasks
              </button>

              <button
                type="button"
                onClick={() => toggleLayer('LEAVE')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition',
                  activeLayers.LEAVE
                    ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800'
                )}
              >
                <Palmtree className="w-3.5 h-3.5" />
                Leaves
              </button>

              <button
                type="button"
                onClick={() => toggleLayer('ATTENDANCE')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition',
                  activeLayers.ATTENDANCE
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800'
                )}
              >
                <Clock className="w-3.5 h-3.5" />
                Attendance
              </button>
            </div>

            {/* Month Controls */}
            <div className="flex items-center justify-between sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => navigateMonth(-1)}
                className="p-2 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="min-w-[140px] text-center text-sm font-bold text-slate-900 dark:text-white">
                {MONTH_NAMES[month]} {year}
              </div>
              <button
                type="button"
                onClick={() => navigateMonth(1)}
                className="p-2 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                aria-label="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={jumpToToday}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition"
              >
                Today
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, employee name/ID, leave reason..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full sm:w-64 px-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg font-medium"
              >
                <option value="ALL">All Team Members ({employees.length})</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={String(emp.employeeId).toUpperCase()}>
                    {emp.name} ({emp.employeeId})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Desktop 7-Column Month Grid */}
        <div className="hidden md:block bg-white dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/60">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400"
              >
                {wd}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-zinc-800/80">
            {calendarCells.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="min-h-[126px] bg-slate-50/40 dark:bg-zinc-950/30" />;
              }

              const dateKey = `${monthStr}-${String(day).padStart(2, '0')}`;
              const bucket = dayBuckets.get(dateKey) || { tasks: [], leaves: [], attendances: [] };
              const isToday = dateKey === todayStr;
              const isSelected = dateKey === selectedDayStr;

              const combinedItems: Array<{ kind: CalendarLayer; item: any }> = [
                ...bucket.leaves.map((item) => ({ kind: 'LEAVE' as const, item })),
                ...bucket.tasks.map((item) => ({ kind: 'TASK' as const, item })),
                ...bucket.attendances.map((item) => ({ kind: 'ATTENDANCE' as const, item })),
              ];
              const visibleItems = combinedItems.slice(0, 4);
              const overflowCount = Math.max(0, combinedItems.length - visibleItems.length);

              return (
                <div
                  key={dateKey}
                  onClick={() => setSelectedDayStr(dateKey)}
                  className={cn(
                    'group min-h-[126px] p-2 cursor-pointer transition-colors flex flex-col',
                    isSelected
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 ring-1 ring-inset ring-rose-500/40'
                      : 'hover:bg-slate-50/80 dark:hover:bg-zinc-800/30'
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={cn(
                        'w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold',
                        isToday
                          ? 'bg-rose-600 text-white shadow-sm'
                          : isSelected
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-900'
                          : 'text-slate-700 dark:text-zinc-300'
                      )}
                    >
                      {day}
                    </span>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDayStr(dateKey);
                          setAttendanceModalState({ open: true, record: null, date: dateKey });
                        }}
                        title="Add Attendance"
                        className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 text-[10px] font-bold hover:bg-teal-500/20"
                      >
                        +A
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDayStr(dateKey);
                          setTaskModalState({ open: true, task: null, date: dateKey });
                        }}
                        title="Add Task"
                        className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold hover:bg-indigo-500/20"
                      >
                        +T
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 flex-1">
                    {visibleItems.map(({ kind, item }, itemIdx) => {
                      if (kind === 'LEAVE') {
                        const empName = formatShortName(item.employeeName || item.userId?.name, item.employeeId);
                        return (
                          <button
                            key={`l-${item._id}-${itemIdx}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLeaveModalState({ open: true, leave: item, date: dateKey });
                            }}
                            className={cn(
                              'w-full text-left px-1.5 py-0.5 rounded border text-[10px] font-semibold truncate flex items-center gap-1 hover:brightness-95 transition',
                              getLeavePillStyle(item.status)
                            )}
                            title={`Leave: ${item.employeeName || item.employeeId} (${item.leaveType || item.type})`}
                          >
                            <Palmtree className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">
                              {empName} · {item.leaveType || item.type}
                            </span>
                          </button>
                        );
                      }

                      if (kind === 'TASK') {
                        return (
                          <button
                            key={`t-${item._id}-${itemIdx}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTaskModalState({ open: true, task: item, date: dateKey });
                            }}
                            className={cn(
                              'w-full text-left px-1.5 py-0.5 rounded border text-[10px] font-semibold truncate flex items-center gap-1 hover:brightness-95 transition',
                              getTaskPillStyle(item.status, item.priority)
                            )}
                            title={`Task: ${item.title} (${item.status})`}
                          >
                            <CheckSquare className="w-2.5 h-2.5 shrink-0" />
                            <span className={cn('truncate', item.status === 'COMPLETED' && 'line-through opacity-75')}>
                              {item.title}
                            </span>
                          </button>
                        );
                      }

                      const empName = formatShortName(item.employeeName, item.employeeId);
                      const isLate = Boolean(item.isLate || (item.lateMinutes && item.lateMinutes > 0));
                      return (
                        <button
                          key={`a-${item._id || item.employeeId}-${itemIdx}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAttendanceModalState({ open: true, record: item, date: dateKey });
                          }}
                          className={cn(
                            'w-full text-left px-1.5 py-0.5 rounded border text-[10px] font-semibold truncate flex items-center justify-between gap-1 hover:brightness-95 transition',
                            getAttendancePillStyle(item)
                          )}
                          title={`Attendance: ${item.employeeName || item.employeeId} — ${formatAttendanceTimeRange(item)}`}
                        >
                          <span className="flex items-center gap-1 truncate">
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">
                              {empName} {item.checkIn ? formatTime(item.checkIn).replace(/\s?(AM|PM)$/i, '') : item.status}
                            </span>
                          </span>
                          {isLate && (
                            <span className="px-1 rounded bg-orange-600 text-white text-[9px] font-bold shrink-0">
                              L+{item.lateMinutes || 0}m
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {overflowCount > 0 && (
                      <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 px-1 pt-0.5">
                        +{overflowCount} more on agenda
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile Compact Month Calendar */}
        <div className="md:hidden bg-white dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 rounded-2xl p-3 shadow-sm">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">
                {wd.slice(0, 2)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((day, idx) => {
              if (!day) return <div key={`m-empty-${idx}`} className="h-11" />;
              const dateKey = `${monthStr}-${String(day).padStart(2, '0')}`;
              const bucket = dayBuckets.get(dateKey) || { tasks: [], leaves: [], attendances: [] };
              const isToday = dateKey === todayStr;
              const isSelected = dateKey === selectedDayStr;
              const hasLate = bucket.attendances.some((a) => a.isLate || (a.lateMinutes && a.lateMinutes > 0));

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDayStr(dateKey)}
                  className={cn(
                    'h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 border text-xs font-bold transition',
                    isSelected
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : isToday
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                      : 'bg-slate-50/70 dark:bg-zinc-950/60 border-slate-200/70 dark:border-zinc-800 text-slate-800 dark:text-zinc-200'
                  )}
                >
                  <span>{day}</span>
                  <div className="flex items-center gap-0.5">
                    {bucket.tasks.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                    {bucket.leaves.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
                    {bucket.attendances.length > 0 && (
                      <span className={cn('w-1.5 h-1.5 rounded-full', hasLate ? 'bg-orange-500' : 'bg-teal-500')} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda & Direct Actions */}
        <section className="bg-white dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Selected Day Workspace
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{formattedSelectedDay}</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTaskModalState({ open: true, task: null, date: selectedDayStr })}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold hover:bg-indigo-100 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Task
              </button>
              <button
                type="button"
                onClick={() => setLeaveModalState({ open: true, leave: null, date: selectedDayStr })}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 text-xs font-semibold hover:bg-violet-100 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Leave
              </button>
              <button
                type="button"
                onClick={() => setAttendanceModalState({ open: true, record: null, date: selectedDayStr })}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-semibold hover:bg-teal-100 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Log / Edit Attendance
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Tasks Column */}
            {activeLayers.TASK && (
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-950/50 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4" />
                    Tasks ({selectedAgenda.tasks.length})
                  </h3>
                </div>

                {selectedAgenda.tasks.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-zinc-500 py-4 text-center">
                    No tasks due on this date.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedAgenda.tasks.map((task) => (
                      <div
                        key={task._id}
                        className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-2 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {task.title}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                              {task.assignedTo?.name || task.assignedToName || 'Unassigned'} · {task.priority || 'MEDIUM'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTaskModalState({ open: true, task, date: selectedDayStr })}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition shrink-0"
                            title="Edit Task"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
                          <select
                            value={task.status}
                            onChange={(e) => handleQuickTaskStatus(task._id, e.target.value)}
                            className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950"
                          >
                            <option value="TODO">TODO</option>
                            <option value="IN_PROGRESS">IN PROGRESS</option>
                            <option value="READY_FOR_REVIEW">READY FOR REVIEW</option>
                            <option value="REVISION">REVISION</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="BLOCKED">BLOCKED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                          {task.estimatedMinutes ? (
                            <span className="text-[10px] font-medium text-slate-400">
                              Est: {formatMinutes(task.estimatedMinutes)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Leaves Column */}
            {activeLayers.LEAVE && (
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-950/50 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                    <Palmtree className="w-4 h-4" />
                    Leaves ({selectedAgenda.leaves.length})
                  </h3>
                </div>

                {selectedAgenda.leaves.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-zinc-500 py-4 text-center">
                    No leave records on this date.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedAgenda.leaves.map((leave) => (
                      <div
                        key={leave._id}
                        className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-1.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {leave.employeeName || leave.userId?.name || leave.employeeId}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                              {leave.leaveType || leave.type} · {toDateKey(leave.startDate)} → {toDateKey(leave.endDate)}
                            </div>
                          </div>
                          <Badge status={leave.status} />
                        </div>

                        {leave.reason && (
                          <p className="text-[11px] text-slate-600 dark:text-zinc-300 line-clamp-2">{leave.reason}</p>
                        )}

                        <div className="flex justify-end pt-1 border-t border-slate-100 dark:border-zinc-800/80">
                          <button
                            type="button"
                            onClick={() => setLeaveModalState({ open: true, leave, date: selectedDayStr })}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                          >
                            <Edit3 className="w-3 h-3" />
                            Edit / Delete Leave
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Attendance Column */}
            {activeLayers.ATTENDANCE && (
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-950/50 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Attendance ({selectedAgenda.attendances.length})
                  </h3>
                </div>

                {selectedAgenda.attendances.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-zinc-500 py-4 text-center">
                    No attendance logs recorded on this date. Use &ldquo;Log / Edit Attendance&rdquo; above to add check-in/out.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedAgenda.attendances.map((att) => {
                      const isLate = Boolean(att.isLate || (att.lateMinutes && att.lateMinutes > 0));
                      return (
                        <div
                          key={att._id || `${att.employeeId}-${att.date}`}
                          className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-2 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {att.employeeName || att.employeeId}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                                {att.employeeId} {att.department ? `· ${att.department}` : ''}
                              </div>
                            </div>
                            <Badge status={att.status} />
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 text-[11px] bg-slate-50 dark:bg-zinc-950 p-2 rounded-lg border border-slate-100 dark:border-zinc-800">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Check In</span>
                              <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                {att.checkIn ? formatTime(att.checkIn) : '--'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Check Out</span>
                              <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                {att.checkOut ? formatTime(att.checkOut) : '--'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Hours</span>
                              <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                {att.totalWorkingMinutes ? formatMinutes(att.totalWorkingMinutes) : '--'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            {isLate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30">
                                Late ({att.lateMinutes || 0}m)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                On Time
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => setAttendanceModalState({ open: true, record: att, date: selectedDayStr })}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                            >
                              <Edit3 className="w-3 h-3" />
                              Edit Check-In / Out / Late
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <TaskCalendarModal
        isOpen={taskModalState.open}
        onClose={() => setTaskModalState((prev) => ({ ...prev, open: false }))}
        task={taskModalState.task}
        defaultDate={taskModalState.date}
        employees={employees}
        projects={projects}
        onSaved={(msg) => {
          showToast(msg);
          fetchCalendarData();
        }}
      />

      <LeaveCalendarModal
        isOpen={leaveModalState.open}
        onClose={() => setLeaveModalState((prev) => ({ ...prev, open: false }))}
        leave={leaveModalState.leave}
        defaultDate={leaveModalState.date}
        employees={employees}
        onSaved={(msg) => {
          showToast(msg);
          fetchCalendarData();
        }}
      />

      <AttendanceCalendarModal
        isOpen={attendanceModalState.open}
        onClose={() => setAttendanceModalState((prev) => ({ ...prev, open: false }))}
        record={attendanceModalState.record}
        defaultDate={attendanceModalState.date}
        employees={employees}
        onSaved={(msg) => {
          showToast(msg);
          fetchCalendarData();
        }}
      />
    </div>
  );
};

