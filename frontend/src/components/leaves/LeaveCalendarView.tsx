'use client';

import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  User,
} from 'lucide-react';
import { cn, formatDate, getTodayDateString } from '@/lib/utils';

interface LeaveCalendarViewProps {
  leaves: any[];
  onSelectDateToCreate: (dateStr: string) => void;
  onSelectLeave: (leave: any) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getStatusPillStyles(status: string) {
  switch (status) {
    case 'APPROVED':
      return {
        pill: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        dot: 'bg-emerald-500',
      };
    case 'PENDING':
      return {
        pill: 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/30',
        dot: 'bg-amber-500',
      };
    case 'REJECTED':
      return {
        pill: 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border-rose-500/30',
        dot: 'bg-rose-500',
      };
    default:
      return {
        pill: 'bg-slate-500/15 hover:bg-slate-500/25 text-slate-600 dark:text-zinc-300 border-slate-500/30',
        dot: 'bg-slate-400',
      };
  }
}

export const LeaveCalendarView: React.FC<LeaveCalendarViewProps> = ({
  leaves,
  onSelectDateToCreate,
  onSelectLeave,
}) => {
  const todayStr = getTodayDateString();
  const [cursorDate, setCursorDate] = useState<Date>(() => new Date());
  const [selectedMobileDate, setSelectedMobileDate] = useState<string>(todayStr);

  const year = cursorDate.getFullYear();
  const month = cursorDate.getMonth(); // 0-indexed
  const monthStr = String(month + 1).padStart(2, '0');
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  // Map YYYY-MM-DD -> array of active leaves covering that day
  const { leavesByDay, monthLeaveCount } = useMemo(() => {
    const map = new Map<string, any[]>();
    const monthStart = `${year}-${monthStr}-01`;
    const monthEnd = `${year}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;
    let count = 0;

    for (const leave of leaves) {
      if (leave.isDeleted) continue;
      const start = String(leave.startDate || '').slice(0, 10);
      const end = String(leave.endDate || leave.startDate || '').slice(0, 10);
      if (!start || !end) continue;
      if (end < monthStart || start > monthEnd) continue;

      count++;
      const clampedStartDay = start < monthStart ? 1 : Number(start.slice(8, 10));
      const clampedEndDay = end > monthEnd ? daysInMonth : Number(end.slice(8, 10));

      for (let d = clampedStartDay; d <= clampedEndDay; d++) {
        const key = `${year}-${monthStr}-${String(d).padStart(2, '0')}`;
        const list = map.get(key) || [];
        list.push(leave);
        map.set(key, list);
      }
    }

    return { leavesByDay: map, monthLeaveCount: count };
  }, [leaves, year, monthStr, daysInMonth]);

  const goToPrevMonth = () => setCursorDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCursorDate(new Date(year, month + 1, 1));
  const goToToday = () => {
    setCursorDate(new Date());
    setSelectedMobileDate(todayStr);
  };

  const leadingBlanks = Array.from({ length: firstDayOfWeek });
  const dayNumbers = Array.from({ length: daysInMonth }, (_, idx) => idx + 1);
  const mobileDayLeaves = leavesByDay.get(selectedMobileDate) || [];

  return (
    <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Calendar Header Toolbar */}
      <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-0.5">
            <button
              type="button"
              onClick={goToPrevMonth}
              aria-label="Previous month"
              className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 transition"
            >
              Today
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              aria-label="Next month"
              className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight ml-1">
            {MONTH_NAMES[month]} {year}
          </h2>
          <span className="text-[11px] font-mono font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 px-2 py-0.5 rounded-full">
            {monthLeaveCount} {monthLeaveCount === 1 ? 'leave' : 'leaves'}
          </span>
        </div>

        {/* Status Color Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Approved
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Pending
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            Rejected
          </span>
        </div>
      </div>

      {/* Helper Tip */}
      <div className="px-4 py-2 bg-slate-50/80 dark:bg-zinc-950/60 border-b border-slate-100 dark:border-zinc-800/80 text-[11px] text-slate-500 dark:text-zinc-400 flex items-center justify-between gap-2">
        <span>Click any date cell to record a leave on that day, or click a leave badge to view, edit, or delete it.</span>
      </div>

      {/* Desktop & Tablet Full 7-Column Calendar Grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/80">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 text-center border-r last:border-r-0 border-slate-200 dark:border-zinc-800"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {leadingBlanks.map((_, idx) => (
            <div
              key={`blank-${idx}`}
              className="min-h-[118px] bg-slate-50/40 dark:bg-zinc-950/30 border-b border-r border-slate-200/80 dark:border-zinc-800/70"
            />
          ))}

          {dayNumbers.map((day) => {
            const dateStr = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;
            const dayLeaves = leavesByDay.get(dateStr) || [];
            const isToday = dateStr === todayStr;

            return (
              <div
                key={dateStr}
                onClick={() => onSelectDateToCreate(dateStr)}
                className={cn(
                  'group min-h-[118px] p-2 border-b border-r border-slate-200/80 dark:border-zinc-800/70 cursor-pointer transition-colors flex flex-col gap-1.5',
                  isToday
                    ? 'bg-rose-50/40 dark:bg-rose-950/15'
                    : 'hover:bg-slate-50 dark:hover:bg-zinc-800/40'
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center font-mono',
                      isToday
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-zinc-300'
                    )}
                  >
                    {day}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDateToCreate(dateStr);
                    }}
                    title={`Record leave starting ${dateStr}`}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-rose-600/10 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white transition"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-1 max-h-[82px] overflow-y-auto pr-0.5">
                  {dayLeaves.map((leave) => {
                    const styles = getStatusPillStyles(leave.status);
                    const empName = leave.userId?.name || leave.employeeName || leave.employeeId;
                    return (
                      <button
                        key={`${leave._id}-${dateStr}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectLeave(leave);
                        }}
                        title={`${empName} (${leave.leaveType || leave.type}) - ${leave.status}`}
                        className={cn(
                          'w-full text-left px-2 py-1 rounded-md border text-[11px] font-medium truncate flex items-center justify-between gap-1 transition',
                          styles.pill
                        )}
                      >
                        <span className="truncate font-semibold">{empName}</span>
                        <span className="text-[9px] font-mono uppercase opacity-80 shrink-0">
                          {(leave.leaveType || leave.type || 'CAS').slice(0, 4)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Compact Month Grid + Selected Day Agenda */}
      <div className="md:hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/80">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2 text-[10px] font-bold uppercase text-slate-500 dark:text-zinc-400 text-center">
              {day.slice(0, 2)}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-slate-200/70 dark:bg-zinc-800/70">
          {leadingBlanks.map((_, idx) => (
            <div key={`m-blank-${idx}`} className="h-12 bg-slate-50/70 dark:bg-zinc-950/60" />
          ))}

          {dayNumbers.map((day) => {
            const dateStr = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;
            const dayLeaves = leavesByDay.get(dateStr) || [];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedMobileDate;

            return (
              <button
                key={`m-${dateStr}`}
                type="button"
                onClick={() => setSelectedMobileDate(dateStr)}
                className={cn(
                  'h-12 flex flex-col items-center justify-center gap-1 transition bg-white dark:bg-zinc-900',
                  isSelected && 'bg-rose-50 dark:bg-rose-950/40 ring-2 ring-inset ring-rose-500'
                )}
              >
                <span
                  className={cn(
                    'text-xs font-bold font-mono w-6 h-6 rounded-full flex items-center justify-center',
                    isToday ? 'bg-rose-600 text-white' : 'text-slate-800 dark:text-zinc-200'
                  )}
                >
                  {day}
                </span>
                <div className="flex items-center gap-0.5 h-1.5">
                  {dayLeaves.slice(0, 3).map((leave) => (
                    <span
                      key={`${leave._id}-dot`}
                      className={cn('w-1.5 h-1.5 rounded-full', getStatusPillStyles(leave.status).dot)}
                    />
                  ))}
                  {dayLeaves.length > 3 && (
                    <span className="text-[8px] font-bold text-slate-400 leading-none">+</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Mobile Selected Day Agenda */}
        <div className="p-4 border-t border-slate-200 dark:border-zinc-800 space-y-3 bg-slate-50/60 dark:bg-zinc-950/40">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-zinc-200">
              <CalendarIcon className="w-3.5 h-3.5 text-rose-500" />
              <span>{formatDate(selectedMobileDate)}</span>
            </div>
            <button
              type="button"
              onClick={() => onSelectDateToCreate(selectedMobileDate)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Record Leave
            </button>
          </div>

          {mobileDayLeaves.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-zinc-400 py-3 text-center">
              No leaves scheduled on {formatDate(selectedMobileDate)}.
            </p>
          ) : (
            <div className="space-y-2">
              {mobileDayLeaves.map((leave) => {
                const styles = getStatusPillStyles(leave.status);
                const empName = leave.userId?.name || leave.employeeName || leave.employeeId;
                return (
                  <div
                    key={`agenda-${leave._id}`}
                    onClick={() => onSelectLeave(leave)}
                    className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2 cursor-pointer shadow-sm"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">{empName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                        {leave.leaveType || leave.type} &bull; {formatDate(leave.startDate)} -&gt; {formatDate(leave.endDate)}
                      </div>
                    </div>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded border shrink-0', styles.pill)}>
                      {leave.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

