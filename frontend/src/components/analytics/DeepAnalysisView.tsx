'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckSquare,
  Video,
  ThumbsUp,
  Download,
  Filter,
  BarChart3,
  AlertCircle,
  HelpCircle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { DrillDownModal, DrillDownItem } from './DrillDownModal';
import { formatDate, formatMinutes } from '@/lib/utils';

interface DeepAnalysisViewProps {
  employeeId: string;
  titleTag?: 'h1' | 'h2';
}

export const DeepAnalysisView: React.FC<DeepAnalysisViewProps> = ({
  employeeId,
  titleTag = 'h2',
}) => {
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [platform, setPlatform] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalItems, setModalItems] = useState<DrillDownItem[]>([]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({ employeeId });
      if (startDate) queryParams.set('startDate', startDate);
      if (endDate) queryParams.set('endDate', endDate);
      if (platform !== 'ALL') queryParams.set('platform', platform);
      if (status !== 'ALL') queryParams.set('status', status);

      const res = await fetch(`/api/analytics/deep-analysis?${queryParams.toString()}`);
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
        throw new Error(data.message || data.error || 'Failed to compute deep analysis');
      }

      setAnalysis(data.data?.analysis || data.data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading deep analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [employeeId, startDate, endDate, platform, status]);

  const handleExportCSV = () => {
    const queryParams = new URLSearchParams({
      reportType: 'analysis',
      employeeId,
    });
    if (startDate) queryParams.set('startDate', startDate);
    if (endDate) queryParams.set('endDate', endDate);
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
      {/* Header & Global Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          {titleTag === 'h1' ? (
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-600" />
              Deep Analytics & Transparent Diagnostics
            </h1>
          ) : (
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-600" />
              Deep Analytics & Transparent Diagnostics
            </h2>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {analysis?.employee?.name
              ? `${analysis.employee.name} (${analysis.employee.employeeId})`
              : '10-section raw data analysis'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
            />
          </div>

          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold border border-slate-200 dark:border-slate-700"
          >
            <option value="ALL">All Platforms</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="FACEBOOK">Facebook</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-sm"
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
            Analyzing 10 deep analytical sections...
          </p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : analysis ? (
        <div className="space-y-6">
          {/* Section 1: Attendance Analysis */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-600" />
                1. Attendance, Punctuality &amp; Leave Analysis
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {Array.isArray(analysis.attendance.records) && analysis.attendance.records.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      openDrillDown(
                        'Attendance Log Records',
                        analysis.attendance.records.map((r: any, i: number) => ({
                          id: `rec-${r.date}-${i}`,
                          title: `${r.date} — ${r.status}${r.isLate ? ` (Late +${r.lateMinutes}m)` : ''}`,
                          subtitle: r.notes
                            ? `Notes: ${r.notes}`
                            : `Worked: ${formatMinutes(r.workingMinutes || 0)} | Break: ${r.breakMinutes || 0}m`,
                          badgeText: r.status,
                          badgeVariant:
                            r.status === 'ABSENT' || r.status === 'MISSED_CHECKOUT'
                              ? 'danger'
                              : r.isLate
                              ? 'warning'
                              : 'success',
                          meta: {
                            Worked: formatMinutes(r.workingMinutes || 0),
                            Break: `${r.breakMinutes || 0}m`,
                            Late: r.isLate ? `${r.lateMinutes || 0}m` : 'On Time',
                          },
                        }))
                      )
                    }
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    View Attendance Logs ({analysis.attendance.records.length})
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-xs text-slate-500">Attendance Consistency</span>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {analysis.attendance.attendanceConsistency}%
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Across {analysis.attendance.workingDaysInRange || 0} working days
                </div>
              </div>

              <div
                onClick={() => {
                  const absList = analysis.attendance.absentRecordsList || [];
                  if (absList.length === 0) return;
                  openDrillDown(
                    'Marked Absent Records',
                    absList.map((a: any, i: number) => ({
                      id: `abs-${i}`,
                      title: `${a.date} — Absent`,
                      subtitle: a.reason ? `Reason: ${a.reason}` : 'No reason logged',
                      badgeText: 'ABSENT',
                      badgeVariant: 'danger',
                    }))
                  );
                }}
                className={`p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 ${
                  (analysis.attendance.absentRecordsList?.length || 0) > 0
                    ? 'cursor-pointer hover:ring-1 hover:ring-rose-400'
                    : ''
                }`}
              >
                <span className="text-xs text-slate-500">Present / Absent</span>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {analysis.attendance.presentDays} /{' '}
                  <span className={(analysis.attendance.absentDays || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : ''}>
                    {analysis.attendance.absentDays || 0}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {(analysis.attendance.absentRecordsList?.length || 0) > 0
                    ? 'Click to view absent reasons'
                    : 'Days worked vs absent'}
                </div>
              </div>

              <div
                onClick={() =>
                  openDrillDown(
                    'Leave Breakdown in Period',
                    (analysis.attendance.leaveDetails || []).length > 0
                      ? analysis.attendance.leaveDetails.map((lv: any, i: number) => ({
                          id: `lv-${lv._id || i}`,
                          title: `${lv.leaveType} (${lv.days}d) — ${lv.startDate} to ${lv.endDate}`,
                          subtitle: lv.reason || 'No reason provided',
                          badgeText: `${lv.status} • ${lv.isPaid ? 'Paid' : 'LWP'}`,
                          badgeVariant:
                            lv.status === 'APPROVED' ? (lv.isPaid ? 'success' : 'warning') : 'info',
                        }))
                      : [
                          {
                            id: 'lv-none',
                            title: 'No Leave Requests in Selected Period',
                            subtitle: 'Approved Paid, Unpaid (LWP), and Pending leaves appear here.',
                            badgeText: '0 days',
                            badgeVariant: 'default',
                          },
                        ]
                  )
                }
                className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 cursor-pointer hover:border-indigo-400 transition"
              >
                <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">Approved Leaves</span>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {analysis.attendance.leaveDays}d
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Paid: {analysis.attendance.approvedPaidLeaveDays || 0}d • LWP:{' '}
                  {analysis.attendance.unpaidLeaveDays || 0}d
                  {(analysis.attendance.pendingLeaveDays || 0) > 0
                    ? ` • Pending: ${analysis.attendance.pendingLeaveDays}d`
                    : ''}
                </div>
              </div>

              <div
                onClick={() => {
                  const lateItems = (analysis.attendance.lateRecordsList || []).map((lr: any, i: number) => ({
                    id: `late-${i}`,
                    title: `${lr.date} — Late (+${lr.lateMinutes}m)`,
                    subtitle: `Scheduled ${lr.scheduledShiftStart} • Status: ${lr.status}`,
                    badgeText: `+${lr.lateMinutes}m`,
                    badgeVariant: 'warning' as const,
                  }));
                  const missedItems = (analysis.attendance.missedCheckoutList || []).map((mc: any, i: number) => ({
                    id: `mc-${i}`,
                    title: `${mc.date} — Missed Checkout`,
                    subtitle: `Status: ${mc.status}`,
                    badgeText: 'MISSED',
                    badgeVariant: 'danger' as const,
                  }));
                  const combined = [...lateItems, ...missedItems];
                  if (combined.length > 0) openDrillDown('Late Arrivals & Missed Checkouts', combined);
                }}
                className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 cursor-pointer hover:border-amber-400 transition"
              >
                <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">Late / Missed Out</span>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {analysis.attendance.lateArrivals} / {analysis.attendance.missedCheckouts}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  {analysis.attendance.totalLateMinutes || 0} late mins total
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-xs text-slate-500">Avg Working / Break</span>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {formatHours(analysis.attendance.avgWorkingMinutes)} / {analysis.attendance.avgBreakMinutes}m
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Per present day</div>
              </div>
            </div>
          </div>

          {/* Section 2: Workload Analysis */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              2. Workload & Task Completion
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-xs text-slate-500">Assigned Tasks</span>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {analysis.workload.assignedTasksCount}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-xs text-slate-500">Completed Tasks</span>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {analysis.workload.completedTasksCount}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-xs text-slate-500">Open Tasks</span>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {analysis.workload.openTasksCount}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-xs text-slate-500">Blocked Tasks</span>
                <div className="text-xl font-bold text-amber-600 mt-1">
                  {analysis.workload.blockedTasksCount}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-xs text-slate-500">Completion Rate</span>
                <div className="text-xl font-bold text-emerald-600 mt-1">
                  {analysis.workload.completionRate}%
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 & 4: Time Variance & Deadline Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section 3: Time Analysis & Variance */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                3. Time Analysis & Estimation Variance
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Estimated Total Time:</span>
                  <span>{formatHours(analysis.timeAnalysis.estimatedTotalMinutes)}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span>Actual Total Time:</span>
                  <span>{formatHours(analysis.timeAnalysis.actualTotalMinutes)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span>Time Variance (Actual - Estimated):</span>
                  <span
                    className={
                      analysis.timeAnalysis.timeVarianceMinutes > 0
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }
                  >
                    {analysis.timeAnalysis.timeVarianceMinutes >= 0 ? '+' : ''}
                    {formatHours(analysis.timeAnalysis.timeVarianceMinutes)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 italic flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{analysis.timeAnalysis.varianceExplanation}</span>
                </div>
              </div>
            </div>

            {/* Section 4: Deadline Performance */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                4. Deadline Performance
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() =>
                    openDrillDown(
                      'Completed On Time Tasks',
                      analysis.deadlines.onTimeTasksList.map((t: any) => ({
                        id: t._id,
                        title: t.title,
                        subtitle: `Project: ${(t.projectId as any)?.title || 'N/A'}`,
                        badgeText: 'On Time',
                        badgeVariant: 'success',
                        meta: { Status: t.status, Due: formatDate(t.dueDate) },
                      }))
                    )
                  }
                  className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20 transition-colors"
                >
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Completed On Time</span>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {analysis.deadlines.completedOnTimeCount}
                  </div>
                </div>

                <div
                  onClick={() =>
                    openDrillDown(
                      'Completed Late Tasks',
                      analysis.deadlines.lateTasksList.map((t: any) => ({
                        id: t._id,
                        title: t.title,
                        subtitle: `Project: ${(t.projectId as any)?.title || 'N/A'}`,
                        badgeText: 'Completed Late',
                        badgeVariant: 'danger',
                        meta: { Status: t.status, Due: formatDate(t.dueDate) },
                      }))
                    )
                  }
                  className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 cursor-pointer hover:bg-rose-500/20 transition-colors"
                >
                  <span className="text-xs text-rose-700 dark:text-rose-400 font-medium">Completed Late</span>
                  <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                    {analysis.deadlines.completedLateCount}
                  </div>
                </div>
              </div>

              <div
                onClick={() =>
                  openDrillDown(
                    'Currently Overdue Tasks',
                    analysis.deadlines.overdueTasksList.map((t: any) => ({
                      id: t._id,
                      title: t.title,
                      subtitle: `Project: ${(t.projectId as any)?.title || 'N/A'}`,
                      badgeText: 'Overdue',
                      badgeVariant: 'danger',
                      meta: { Status: t.status, Due: formatDate(t.dueDate) },
                    }))
                  )
                }
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 cursor-pointer flex justify-between items-center"
              >
                <div>
                  <span className="text-xs text-slate-500">Currently Overdue Tasks</span>
                  <div className="text-lg font-bold text-rose-600 mt-0.5">
                    {analysis.deadlines.overdueCount} Tasks
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">On-Time Rate</span>
                  <div className="text-lg font-bold text-emerald-600 mt-0.5">
                    {analysis.deadlines.onTimeRate}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 7: Project Contribution Breakdown */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              7. Project Contribution Breakdown
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Project Title</th>
                    <th className="px-4 py-3">Time Spent</th>
                    <th className="px-4 py-3">Tasks</th>
                    <th className="px-4 py-3">Deliverables</th>
                    <th className="px-4 py-3">Contribution %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {analysis.projectContributions.map((p: any) => (
                    <tr key={p.project} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{p.project}</td>
                      <td className="px-4 py-3">{p.timeSpentHours}h</td>
                      <td className="px-4 py-3">{p.tasksCount} tasks</td>
                      <td className="px-4 py-3">{p.deliverablesCount} deliverables</td>
                      <td className="px-4 py-3 font-bold text-rose-600">{p.contributionPercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 8: Platform Contribution Matrix */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Video className="w-4 h-4 text-rose-600" />
              8. Platform Contribution Matrix
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {analysis.platformMatrix.map((pm: any) => (
                <div
                  key={pm.platform}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 space-y-2"
                >
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{pm.platform}</h4>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Deliverables Completed:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{pm.deliverablesCount}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Tasks Performed:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{pm.tasksCount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 9: Trends View */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              9. Multi-Period Trend Analysis (7-Day, 30-Day, 3-Month)
            </h3>

            {!analysis.trends.hasEnoughData ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-60 text-amber-500" />
                <p className="text-sm font-semibold">{analysis.trends.insufficientDataMessage}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analysis.trends.trend7Days && (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">7-Day Trend</h4>
                    <div className="mt-2 text-sm space-y-1">
                      <div>Work: {analysis.trends.trend7Days.workingHours}h</div>
                      <div>Tasks: {analysis.trends.trend7Days.tasksCompleted} completed</div>
                      <div>Deliverables: {analysis.trends.trend7Days.deliverablesCompleted}</div>
                    </div>
                  </div>
                )}

                {analysis.trends.trend30Days && (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">30-Day Trend</h4>
                    <div className="mt-2 text-sm space-y-1">
                      <div>Work: {analysis.trends.trend30Days.workingHours}h</div>
                      <div>Tasks: {analysis.trends.trend30Days.tasksCompleted} completed</div>
                      <div>Deliverables: {analysis.trends.trend30Days.deliverablesCompleted}</div>
                    </div>
                  </div>
                )}

                {analysis.trends.trend90Days ? (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">3-Month Trend</h4>
                    <div className="mt-2 text-sm space-y-1">
                      <div>Work: {analysis.trends.trend90Days.workingHours}h</div>
                      <div>Tasks: {analysis.trends.trend90Days.tasksCompleted} completed</div>
                      <div>Deliverables: {analysis.trends.trend90Days.deliverablesCompleted}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs text-slate-400">
                    Not enough historical data for 3-month trend
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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
