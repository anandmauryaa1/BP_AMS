'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  CalendarOff,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatTime, getTodayDateString } from '@/lib/utils';
import {
  CalendarLayer,
  MONTH_NAMES,
  WEEKDAYS,
  getMonthDaysMatrix,
  getAuthHeaders,
  toDateKey,
  formatShortName,
} from './operationsCalendarHelpers';

interface AllInOneCalendarWidgetProps {
  mode?: 'admin' | 'employee';
}

export const AllInOneCalendarWidget: React.FC<AllInOneCalendarWidgetProps> = ({
  mode = 'admin',
}) => {
  const todayStr = getTodayDateString();
  const initialNow = new Date();
  const [year, setYear] = useState<number>(initialNow.getFullYear());
  const [month, setMonth] = useState<number>(initialNow.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [layers, setLayers] = useState<Record<CalendarLayer, boolean>>({
    TASK: true,
    LEAVE: true,
    ATTENDANCE: true,
  });

  const [tasks, setTasks] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStartStr = `${monthStr}-01`;
  const monthEndStr = `${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const headers = getAuthHeaders();
    try {
      const leaveUrl =
        mode === 'admin' ? '/api/leaves?includeDeleted=false' : '/api/leaves/my';
      const attUrl =
        mode === 'admin'
          ? `/api/admin/attendance?month=${monthStr}`
          : `/api/attendance/monthly?year=${year}&month=${month + 1}`;

      const [tasksRes, leavesRes, attRes] = await Promise.all([
        fetch(`/api/tasks?startDate=${monthStartStr}&endDate=${monthEndStr}`, {
          credentials: 'include',
          headers,
        }),
        fetch(leaveUrl, { credentials: 'include', headers }),
        fetch(attUrl, { credentials: 'include', headers }),
      ]);

      const [tasksJson, leavesJson, attJson] = await Promise.all([
        tasksRes.json().catch(() => ({})),
        leavesRes.json().catch(() => ({})),
        attRes.json().catch(() => ({})),
      ]);

      const rawTasks =
        tasksJson?.data?.tasks ||
        tasksJson?.tasks ||
        (Array.isArray(tasksJson?.data) ? tasksJson.data : []);
      const rawLeaves = Array.isArray(leavesJson?.data)
        ? leavesJson.data
        : leavesJson?.leaves || [];
      const rawAtt =
        attJson?.data?.records ||
        attJson?.data?.attendances ||
        (Array.isArray(attJson?.data) ? attJson.data : []);

      setTasks(Array.isArray(rawTasks) ? rawTasks : []);
      setLeaves(Array.isArray(rawLeaves) ? rawLeaves : []);
      setAttendances(Array.isArray(rawAtt) ? rawAtt : []);
    } catch {
      // Non-fatal dashboard preview error
    } finally {
      setLoading(false);
    }
  }, [mode, monthStr, monthStartStr, monthEndStr, year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calendarCells = useMemo(() => getMonthDaysMatrix(year, month), [year, month]);

  const dayBuckets = useMemo(() => {
    const map = new Map<string, { tasks: any[]; leaves: any[]; attendances: any[] }>();
    const ensure = (key: string) => {
      if (!map.has(key)) {
        map.set(key, { tasks: [], leaves: [], attendances: [] });
      }
      return map.get(key)!;
    };

    if (layers.TASK) {
      for (const t of tasks) {
        const key = toDateKey(t.dueDate || t.scheduledDate || t.createdAt);
        if (key && key >= monthStartStr && key <= monthEndStr) {
          ensure(key).tasks.push(t);
        }
      }
    }

    if (layers.LEAVE) {
      for (const lv of leaves) {
        if (lv.isDeleted || lv.status === 'CANCELLED' || lv.status === 'REJECTED') continue;
        const s = String(lv.startDate || '').slice(0, 10);
        const e = String(lv.endDate || s).slice(0, 10);
        if (!s || e < monthStartStr || s > monthEndStr) continue;

        const clampedStart = s > monthStartStr ? s : monthStartStr;
        const clampedEnd = e < monthEndStr ? e : monthEndStr;
        const [sy, sm, sd] = clampedStart.split('-').map(Number);
        const [ey, em, ed] = clampedEnd.split('-').map(Number);
        const cursor = new Date(Date.UTC(sy, sm - 1, sd));
        const endUtc = new Date(Date.UTC(ey, em - 1, ed));
        let guard = 0;
        while (cursor <= endUtc && guard < 35) {
          const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(
            2,
            '0'
          )}-${String(cursor.getUTCDate()).padStart(2, '0')}`;
          ensure(key).leaves.push(lv);
          cursor.setUTCDate(cursor.getUTCDate() + 1);
          guard++;
        }
      }
    }

    if (layers.ATTENDANCE) {
      for (const att of attendances) {
        if (att.status === 'NOT_CHECKED_IN') continue;
        const key = String(att.date || '').slice(0, 10);
        if (key && key >= monthStartStr && key <= monthEndStr) {
          ensure(key).attendances.push(att);
        }
      }
    }

    return map;
  }, [tasks, leaves, attendances, layers, monthStartStr, monthEndStr]);

  const selectedBucket = dayBuckets.get(selectedDate) || {
    tasks: [],
    leaves: [],
    attendances: [],
  };

  const handlePrevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelectedDate(getTodayDateString(now));
  };

  const toggleLayer = (layer: CalendarLayer) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden mb-6 shadow-sm">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-rose-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/20">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CalendarDays className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              All-In-One Calendar
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/20">
              Tasks · Leaves · Attendance
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Unified view of scheduled tasks, leave requests, check-ins, late marks, and absences.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Layer Filters */}
          <button
            type="button"
            onClick={() => toggleLayer('TASK')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
              layers.TASK
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
            }`}
          >
            <CheckSquare className="w-3 h-3" />
            Tasks
          </button>
          <button
            type="button"
            onClick={() => toggleLayer('LEAVE')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
              layers.LEAVE
                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
            }`}
          >
            <CalendarOff className="w-3 h-3" />
            Leaves
          </button>
          <button
            type="button"
            onClick={() => toggleLayer('ATTENDANCE')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
              layers.ATTENDANCE
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
            }`}
          >
            <Clock className="w-3 h-3" />
            Attendance
          </button>

          {mode === 'admin' && (
            <Link
              href="/admin/operations-calendar"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition"
            >
              Open Full Calendar
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Main Split Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
        {/* Left: Compact Month Calendar Grid */}
        <div className="lg:col-span-7 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {MONTH_NAMES[month]} {year}
              </h3>
              <button
                type="button"
                onClick={handleJumpToday}
                className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Today
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={fetchData}
                title="Refresh calendar"
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-rose-500' : ''}`} />
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="h-14 rounded-lg bg-slate-50/40 dark:bg-slate-900/30" />;
              }
              const key = `${monthStr}-${String(day).padStart(2, '0')}`;
              const bucket = dayBuckets.get(key);
              const isToday = key === todayStr;
              const isSelected = key === selectedDate;
              const taskCount = bucket?.tasks.length || 0;
              const leaveCount = bucket?.leaves.length || 0;
              const attCount = bucket?.attendances.length || 0;
              const hasAbsent = bucket?.attendances.some((a) => a.status === 'ABSENT');

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className={`h-14 p-1.5 rounded-xl border text-left flex flex-col justify-between transition ${
                    isSelected
                      ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/30 ring-1 ring-rose-500/40'
                      : isToday
                      ? 'border-indigo-400 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/20'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-bold ${
                        isSelected
                          ? 'text-rose-700 dark:text-rose-300'
                          : isToday
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {day}
                    </span>
                    {hasAbsent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Absent recorded" />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    {taskCount > 0 && (
                      <span className="px-1 rounded text-[9px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300">
                        {taskCount}T
                      </span>
                    )}
                    {leaveCount > 0 && (
                      <span className="px-1 rounded text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                        {leaveCount}L
                      </span>
                    )}
                    {attCount > 0 && (
                      <span className="px-1 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                        {attCount}A
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Day Unified Agenda */}
        <div className="lg:col-span-5 p-4 flex flex-col justify-between bg-slate-50/50 dark:bg-slate-950/30">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Selected Date Agenda
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedDate}
                </h4>
              </div>
              {mode === 'admin' && (
                <Link
                  href={`/admin/operations-calendar?date=${selectedDate}`}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Manage Day →
                </Link>
              )}
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {selectedBucket.tasks.length === 0 &&
              selectedBucket.leaves.length === 0 &&
              selectedBucket.attendances.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500">
                  No tasks, leaves, or attendance events recorded on {selectedDate}.
                </div>
              ) : (
                <>
                  {selectedBucket.tasks.slice(0, 6).map((t: any) => (
                    <div
                      key={`t-${t._id}`}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200/70 dark:border-rose-900/40 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {t.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Task • {t.assignedTo?.name || t.assigneeName || 'Assigned'}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 shrink-0">
                        {t.status}
                      </span>
                    </div>
                  ))}

                  {selectedBucket.leaves.slice(0, 6).map((lv: any) => (
                    <div
                      key={`l-${lv._id}`}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/70 dark:border-indigo-900/40 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {formatShortName(lv.employeeName, lv.employeeId)} — {lv.leaveType || 'LEAVE'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {lv.reason || `${lv.startDate} to ${lv.endDate}`}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shrink-0">
                        {lv.status}
                      </span>
                    </div>
                  ))}

                  {selectedBucket.attendances.slice(0, 8).map((att: any) => (
                    <div
                      key={`a-${att._id || att.employeeId}`}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/70 dark:border-emerald-900/40 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {formatShortName(att.employeeName, att.employeeId)}
                          {att.isLate ? ` (Late +${att.lateMinutes || 0}m)` : ''}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {att.status === 'ABSENT'
                            ? `Absent Reason: ${att.notes || 'Not specified'}`
                            : `${att.checkIn ? formatTime(att.checkIn) : '--'} → ${
                                att.checkOut ? formatTime(att.checkOut) : 'Active'
                              }`}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          att.status === 'ABSENT'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {att.status}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">
              {selectedBucket.tasks.length} Tasks • {selectedBucket.leaves.length} Leaves •{' '}
              {selectedBucket.attendances.length} Attendance
            </span>
            {mode === 'admin' ? (
              <div className="flex items-center gap-3">
                <Link href="/admin/attendance" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                  Mark Attendance
                </Link>
                <Link href="/admin/operations-calendar?layer=LEAVE" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                  Create Leave
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/leaves" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                  My Leaves
                </Link>
                <Link href="/attendance" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                  Attendance Log
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

