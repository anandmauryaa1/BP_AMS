'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  CheckSquare,
  Video,
  ThumbsUp,
  RotateCcw,
  Sparkles,
  Download,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { IEmployeeDailyReport } from '@/types';
import { DrillDownModal, DrillDownItem } from './DrillDownModal';

interface DailyReportViewProps {
  employeeId?: string;
  isEmployeeSelf?: boolean;
}

export const DailyReportView: React.FC<DailyReportViewProps> = ({
  employeeId,
  isEmployeeSelf = false,
}) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<IEmployeeDailyReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<boolean>(false);

  // Drill-down modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalItems, setModalItems] = useState<DrillDownItem[]>([]);

  const fetchReport = async (targetDate: string, force = false) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({ date: targetDate });
      if (employeeId) queryParams.set('employeeId', employeeId);
      if (force) queryParams.set('forceRegenerate', 'true');

      const res = await fetch(`/api/analytics/reports/daily?${queryParams.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to load daily report');
      }

      setReport(data.data.report);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching the report');
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  useEffect(() => {
    fetchReport(date);
  }, [date, employeeId]);

  const handleRegenerate = () => {
    setRegenerating(true);
    fetchReport(date, true);
  };

  const handleExportCSV = () => {
    const queryParams = new URLSearchParams({
      reportType: 'daily',
      date,
    });
    if (employeeId) queryParams.set('employeeId', employeeId);
    window.open(`/api/analytics/export?${queryParams.toString()}`, '_blank');
  };

  const openDrillDown = (title: string, items: DrillDownItem[]) => {
    setModalTitle(title);
    setModalItems(items);
    setModalOpen(true);
  };

  const formatMins = (mins: number) => {
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    if (hrs === 0) return `${m}m`;
    return `${hrs}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-rose-600" />
            {isEmployeeSelf ? 'Today & Daily Progress' : 'Employee Daily Report'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Transparent, raw activity breakdown for {date}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />

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
            Calculating measured activity metrics...
          </p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-80" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : report ? (
        <>
          {/* System Summary Banner */}
          {report.notes?.systemSummary && (
            <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-blue-500/10 border border-rose-500/20 p-5 rounded-2xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs uppercase tracking-wider font-bold text-rose-600 dark:text-rose-400">
                  System Measured Activity Summary
                </h4>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1">
                  {report.notes.systemSummary}
                </p>
              </div>
            </div>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Attendance */}
            <div
              onClick={() =>
                openDrillDown('Attendance Raw Activity', [
                  {
                    id: 'att-1',
                    title: `Attendance Status: ${report.attendance.status}`,
                    subtitle: `Check-in: ${
                      report.attendance.checkIn
                        ? new Date(report.attendance.checkIn).toLocaleTimeString()
                        : 'None'
                    } | Check-out: ${
                      report.attendance.checkOut
                        ? new Date(report.attendance.checkOut).toLocaleTimeString()
                        : 'None'
                    }`,
                    badgeText: report.attendance.status,
                    badgeVariant: report.attendance.status === 'COMPLETED' ? 'success' : 'warning',
                    meta: {
                      'Working Minutes': report.attendance.workingMinutes,
                      'Break Minutes': report.attendance.breakMinutes,
                      'Late Minutes': report.attendance.lateMinutes,
                      'Early Checkout': report.attendance.earlyCheckoutMinutes,
                    },
                  },
                ])
              }
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 cursor-pointer transition-all shadow-sm group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Working Time</span>
                <Clock className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {formatMins(report.attendance.workingMinutes)}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2">
                <span>Status:</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {report.attendance.status}
                </span>
              </div>
            </div>

            {/* Tasks Completed */}
            <div
              onClick={() =>
                openDrillDown('Task Allocation & Completion', [
                  {
                    id: 'task-comp-1',
                    title: `Tasks Completed Today: ${report.work.tasksCompleted}`,
                    subtitle: `Out of ${report.work.tasksAssigned} assigned tasks`,
                    badgeText: `${report.work.tasksCompleted}/${report.work.tasksAssigned}`,
                    badgeVariant: 'success',
                    meta: {
                      'In Progress': report.work.tasksInProgress,
                      Blocked: report.work.tasksBlocked,
                    },
                  },
                ])
              }
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 cursor-pointer transition-all shadow-sm group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Task Activity</span>
                <CheckSquare className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {report.work.tasksCompleted} / {report.work.tasksAssigned}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2">
                <span>Blocked:</span>
                <span className="font-semibold text-amber-600">
                  {report.work.tasksBlocked}
                </span>
              </div>
            </div>

            {/* Output */}
            <div
              onClick={() =>
                openDrillDown('Deliverables & Platform Output', [
                  {
                    id: 'deliv-1',
                    title: `Deliverables Produced: ${report.output.deliverablesCompleted}`,
                    subtitle: `Across ${report.output.projectsContributed} contributed projects`,
                    badgeText: 'Completed Output',
                    badgeVariant: 'info',
                    meta: {
                      YouTube: report.output.youtubeOutput,
                      Instagram: report.output.instagramOutput,
                      Facebook: report.output.facebookOutput,
                    },
                  },
                ])
              }
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 cursor-pointer transition-all shadow-sm group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Platform Deliverables</span>
                <Video className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {report.output.deliverablesCompleted}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2">
                <span>YT: {report.output.youtubeOutput}</span>
                <span>IG: {report.output.instagramOutput}</span>
                <span>FB: {report.output.facebookOutput}</span>
              </div>
            </div>

            {/* Deadlines & Review */}
            <div
              onClick={() =>
                openDrillDown('Review & Deadline Status', [
                  {
                    id: 'rev-1',
                    title: `Review Submissions: ${report.review.submittedForReview}`,
                    subtitle: `Approved: ${report.review.approved} | Revision Required: ${report.review.revisionRequired}`,
                    badgeText: `First Pass: ${report.review.firstPassApproved}`,
                    badgeVariant: 'success',
                    meta: {
                      'Completed On Time': report.deadlines.completedOnTime,
                      'Completed Late': report.deadlines.completedLate,
                      Overdue: report.deadlines.overdue,
                    },
                  },
                ])
              }
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 cursor-pointer transition-all shadow-sm group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>On-Time & Review</span>
                <ThumbsUp className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {report.deadlines.completedOnTime} / {report.work.tasksCompleted}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2">
                <span>Revisions:</span>
                <span className="font-semibold text-rose-500">
                  {report.review.revisionRequired}
                </span>
              </div>
            </div>
          </div>

          {/* Time & Task Allocation Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Time Distribution */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-600" />
                Project Time Allocation
              </h3>

              {report.timeAllocation.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No work-session time logged for projects today.
                </p>
              ) : (
                <div className="space-y-3">
                  {report.timeAllocation.map((p) => {
                    const pct =
                      report.attendance.workingMinutes > 0
                        ? Math.round((p.minutes / report.attendance.workingMinutes) * 100)
                        : 0;
                    return (
                      <div key={p.projectId} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <span>{p.projectTitle}</span>
                          <span>
                            {formatMins(p.minutes)} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-rose-600 rounded-full transition-all"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Task Time Distribution */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                Task Activity Distribution
              </h3>

              {report.taskAllocation.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No task activity tracked today.
                </p>
              ) : (
                <div className="space-y-3">
                  {report.taskAllocation.map((t) => {
                    const pct =
                      report.attendance.workingMinutes > 0
                        ? Math.round((t.minutes / report.attendance.workingMinutes) * 100)
                        : 0;
                    return (
                      <div key={t.taskId} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <span>{t.taskTitle}</span>
                          <span>
                            {formatMins(t.minutes)} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}

      {/* Drill Down Modal */}
      <DrillDownModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        items={modalItems}
      />
    </div>
  );
};
