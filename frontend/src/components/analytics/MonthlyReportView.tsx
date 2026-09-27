'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckSquare,
  Video,
  ThumbsUp,
  Download,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { IEmployeeMonthlyReport } from '@/types';
import { DrillDownModal, DrillDownItem } from './DrillDownModal';

interface MonthlyReportViewProps {
  employeeId?: string;
  isEmployeeSelf?: boolean;
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  employeeId,
  isEmployeeSelf = false,
}) => {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  const [report, setReport] = useState<IEmployeeMonthlyReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<boolean>(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalItems, setModalItems] = useState<DrillDownItem[]>([]);

  const fetchReport = async (yr: number, mth: number, force = false) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        year: String(yr),
        month: String(mth),
      });
      if (employeeId) queryParams.set('employeeId', employeeId);
      if (force) queryParams.set('forceRegenerate', 'true');

      const res = await fetch(`/api/analytics/reports/monthly?${queryParams.toString()}`);
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
        throw new Error(data.error || data.message || 'Failed to load monthly report');
      }

      setReport(data.data?.report || data.data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching monthly report');
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  useEffect(() => {
    fetchReport(year, month);
  }, [year, month, employeeId]);

  const handleRegenerate = () => {
    setRegenerating(true);
    fetchReport(year, month, true);
  };

  const handleExportCSV = () => {
    const queryParams = new URLSearchParams({
      reportType: 'monthly',
      year: String(year),
      month: String(month),
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
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-rose-600" />
            {isEmployeeSelf ? 'This Month Progress' : 'Employee Monthly Report'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Comprehensive monthly performance snapshot & historical comparison
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
          >
            {[
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
            ].map((mName, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {mName}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

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
            Generating monthly report & weekly trends...
          </p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-80" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : report ? (
        <>
          {/* Month Over Month Comparison Banner */}
          {report.comparison && (
            <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider font-bold text-rose-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Month-Over-Month Comparison
                </h3>
                {report.comparison.previousMonth && (
                  <span className="text-xs text-slate-400">
                    Compared to {report.comparison.previousMonth.year}/
                    {report.comparison.previousMonth.month}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2">
                <div>
                  <span className="text-[11px] text-slate-400">Work Time</span>
                  <div className="text-lg font-bold flex items-center gap-1 mt-0.5">
                    {report.comparison.changeInWorkingTime >= 0 ? '+' : ''}
                    {report.comparison.changeInWorkingTime}%
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400">Tasks Completed</span>
                  <div className="text-lg font-bold flex items-center gap-1 mt-0.5">
                    {report.comparison.changeInTaskCompletion >= 0 ? '+' : ''}
                    {report.comparison.changeInTaskCompletion}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400">Output</span>
                  <div className="text-lg font-bold flex items-center gap-1 mt-0.5">
                    {report.comparison.changeInOutput >= 0 ? '+' : ''}
                    {report.comparison.changeInOutput}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400">On-Time Rate</span>
                  <div className="text-lg font-bold flex items-center gap-1 mt-0.5">
                    {report.comparison.changeInOnTimeRate >= 0 ? '+' : ''}
                    {report.comparison.changeInOnTimeRate}%
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400">Revision Rate</span>
                  <div className="text-lg font-bold flex items-center gap-1 mt-0.5">
                    {report.comparison.changeInRevisionRate >= 0 ? '+' : ''}
                    {report.comparison.changeInRevisionRate}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500">Total Work Time</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {formatHours(report.attendance.totalWorkingMinutes)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {report.attendance.presentDays} / {report.attendance.workingDays} days present
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500">Tasks Completed</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {report.work.tasksCompleted} / {report.work.tasksAssigned}
              </div>
              <p className="text-xs text-emerald-600 font-semibold mt-1">
                {report.work.completionRate}% Completion Rate
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500">Deliverables</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {report.output.deliverablesCompleted}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                YT: {report.output.youtube} | IG: {report.output.instagram} | FB: {report.output.facebook}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500">Quality & Deadlines</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {report.deadlines.onTimeRate}%
              </div>
              <p className="text-xs text-slate-500 mt-1">
                First Pass: {report.review.firstPassApprovalRate}% | Rev Rate: {report.review.revisionRate}%
              </p>
            </div>
          </div>

          {/* Weekly Trends Matrix */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-rose-600" />
              Weekly Performance Trends Breakdown
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              {report.trends.weeklyCompletion.map((w, idx) => (
                <div
                  key={w.week}
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 space-y-2"
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{w.week}</span>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {w.count} Tasks Completed
                  </div>
                  <div className="text-xs text-slate-500">
                    {report.trends.weeklyWorkingHours[idx]?.hours || 0} Working Hours
                  </div>
                  <div className="text-xs text-slate-500">
                    {report.trends.weeklyOutput[idx]?.count || 0} Deliverables
                  </div>
                  <div className="text-xs font-semibold text-emerald-600">
                    {report.trends.weeklyDeadlinePerformance[idx]?.onTimeRate || 100}% On-Time
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
