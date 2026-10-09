'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CheckSquare,
  Video,
  ThumbsUp,
  Download,
  TrendingUp,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { IEmployeeWeeklyReport } from '@/types';
import { DrillDownModal, DrillDownItem } from './DrillDownModal';

interface WeeklyReportViewProps {
  employeeId?: string;
  isEmployeeSelf?: boolean;
  titleTag?: 'h1' | 'h2';
}

export const WeeklyReportView: React.FC<WeeklyReportViewProps> = ({
  employeeId,
  isEmployeeSelf = false,
  titleTag = 'h2',
}) => {
  // Get current Monday
  const getMonday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };

  const [weekStart, setWeekStart] = useState<string>(getMonday());
  const [report, setReport] = useState<IEmployeeWeeklyReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<boolean>(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalItems, setModalItems] = useState<DrillDownItem[]>([]);

  const fetchReport = async (wStart: string, force = false) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({ weekStart: wStart });
      if (employeeId) queryParams.set('employeeId', employeeId);
      if (force) queryParams.set('forceRegenerate', 'true');

      const res = await fetch(`/api/analytics/reports/weekly?${queryParams.toString()}`);
      if (!res.ok) {
        let errMsg = `Server returned status ${res.status}`;
        try {
          const errData = await res.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {
          if (res.status === 500 || res.status === 502 || res.status === 503) {
            errMsg = 'Unable to reach backend service. Please ensure the backend server is running on port 5000.';
          }
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || data.message || 'Failed to load weekly report');
      }

      setReport(data.data?.report || data.data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching weekly report');
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  useEffect(() => {
    fetchReport(weekStart);
  }, [weekStart, employeeId]);

  const handleRegenerate = () => {
    setRegenerating(true);
    fetchReport(weekStart, true);
  };

  const handleExportCSV = () => {
    const queryParams = new URLSearchParams({
      reportType: 'weekly',
      weekStart,
    });
    if (employeeId) queryParams.set('employeeId', employeeId);
    window.open(`/api/analytics/export?${queryParams.toString()}`, '_blank');
  };

  const openDrillDown = (title: string, items: DrillDownItem[]) => {
    setModalTitle(title);
    setModalItems(items);
    setModalOpen(true);
  };

  const formatHours = (mins: number) => {
    return `${Math.round((mins / 60) * 10) / 10}h`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          {titleTag === 'h1' ? (
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-rose-600" />
              {isEmployeeSelf ? 'This Week Progress' : 'Employee Weekly Report'}
            </h1>
          ) : (
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-rose-600" />
              {isEmployeeSelf ? 'This Week Progress' : 'Employee Weekly Report'}
            </h2>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Aggregated weekly performance and measured trend metrics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <span>Week Starting:</span>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          {!isEmployeeSelf && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating || loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-sm shadow-rose-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Aggregating weekly daily reports and trends...
          </p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-80" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : report ? (
        <>
          {/* Key Weekly Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              onClick={() =>
                openDrillDown('Weekly Attendance', [
                  {
                    id: 'att-w-1',
                    title: `Present: ${report.attendance.presentDays} / ${report.attendance.workingDays} Days`,
                    subtitle: `Leaves: ${report.attendance.leaveDays} | Absences: ${report.attendance.absentDays}`,
                    badgeText: `${formatHours(report.attendance.totalWorkingMinutes)} Total`,
                    badgeVariant: 'info',
                    meta: {
                      'Avg Daily': `${report.attendance.averageDailyWorkingMinutes}m`,
                      Late: report.attendance.lateCount,
                      'Missed Checkout': report.attendance.missedCheckoutCount,
                    },
                  },
                ])
              }
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 cursor-pointer transition-all shadow-sm"
            >
              <span className="text-xs text-slate-500">Working Time</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {formatHours(report.attendance.totalWorkingMinutes)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Avg {report.attendance.averageDailyWorkingMinutes}m / day
              </p>
            </div>

            <div
              onClick={() =>
                openDrillDown('Weekly Tasks & Completion', [
                  {
                    id: 'task-w-1',
                    title: `Tasks Completed: ${report.work.totalTasksCompleted}`,
                    subtitle: `Total Assigned: ${report.work.totalTasksAssigned}`,
                    badgeText: `${report.work.completionRate}% Rate`,
                    badgeVariant: 'success',
                    meta: {
                      'In Progress': report.work.totalTasksInProgress,
                      Blocked: report.work.totalBlockedTasks,
                    },
                  },
                ])
              }
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 cursor-pointer transition-all shadow-sm"
            >
              <span className="text-xs text-slate-500">Tasks Completed</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {report.work.totalTasksCompleted} / {report.work.totalTasksAssigned}
              </div>
              <p className="text-xs text-emerald-600 font-semibold mt-1">
                {report.work.completionRate}% Completion Rate
              </p>
            </div>

            <div
              onClick={() =>
                openDrillDown('Weekly Output & Deliverables', [
                  {
                    id: 'deliv-w-1',
                    title: `Deliverables: ${report.output.totalDeliverables}`,
                    subtitle: `Across ${report.work.totalProjects} active projects`,
                    badgeText: 'Platform Deliverables',
                    badgeVariant: 'info',
                    meta: {
                      YouTube: report.output.youtubeDeliverables,
                      Instagram: report.output.instagramDeliverables,
                      Facebook: report.output.facebookDeliverables,
                    },
                  },
                ])
              }
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 cursor-pointer transition-all shadow-sm"
            >
              <span className="text-xs text-slate-500">Platform Deliverables</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {report.output.totalDeliverables}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                YT: {report.output.youtubeDeliverables} | IG: {report.output.instagramDeliverables} | FB:{' '}
                {report.output.facebookDeliverables}
              </p>
            </div>

            <div
              onClick={() =>
                openDrillDown('Weekly Deadlines & Quality', [
                  {
                    id: 'qual-w-1',
                    title: `On-Time Rate: ${report.deadlines.onTimeRate}%`,
                    subtitle: `On Time: ${report.deadlines.onTimeCount} | Late: ${report.deadlines.lateCount} | Overdue: ${report.deadlines.overdueCount}`,
                    badgeText: `${report.review.firstPassApprovalRate}% First Pass`,
                    badgeVariant: 'success',
                    meta: {
                      Submitted: report.review.submitted,
                      Approved: report.review.approved,
                      Revisions: report.review.revisionRequired,
                    },
                  },
                ])
              }
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 cursor-pointer transition-all shadow-sm"
            >
              <span className="text-xs text-slate-500">Quality & On-Time</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {report.deadlines.onTimeRate}%
              </div>
              <p className="text-xs text-slate-500 mt-1">
                First Pass: {report.review.firstPassApprovalRate}% | Rev Rate:{' '}
                {report.review.revisionRate}%
              </p>
            </div>
          </div>

          {/* Daily Trend Chart Visualization */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-rose-600" />
              Daily Working Time & Task Completion Trend
            </h3>

            <div className="grid grid-cols-7 gap-2 pt-4">
              {report.dailyTrend.map((d) => {
                const maxMins = 480; // 8h standard
                const pct = Math.min(Math.round((d.workingMinutes / maxMins) * 100), 100);
                const dateLabel = new Date(d.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  day: 'numeric',
                });

                return (
                  <div key={d.date} className="flex flex-col items-center gap-2 text-center">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {d.tasksCompleted} tasks
                    </span>
                    <div className="w-full h-32 bg-slate-100 dark:bg-slate-800 rounded-xl relative overflow-hidden flex items-end p-1">
                      <div
                        className="w-full bg-rose-600 rounded-lg transition-all"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-500">{dateLabel}</span>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      {formatHours(d.workingMinutes)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      <DrillDownModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        items={modalItems}
      />
    </div>
  );
};
