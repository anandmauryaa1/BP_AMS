'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User as UserIcon,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  CheckSquare,
  Video,
  ThumbsUp,
  BarChart2,
  TrendingUp,
  ArrowLeft,
  FileText,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { IUser } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { DailyReportView } from '@/components/analytics/DailyReportView';
import { WeeklyReportView } from '@/components/analytics/WeeklyReportView';
import { MonthlyReportView } from '@/components/analytics/MonthlyReportView';
import { DeepAnalysisView } from '@/components/analytics/DeepAnalysisView';

export default function AdminEmployeeProfileProgressPage({ params }: { params: { id: string } }) {
  const [employee, setEmployee] = useState<IUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'weekly' | 'monthly' | 'analysis'>('overview');

  // Overview quick stats
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchEmployeeDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/employees/${params.id}`);
        const data = await res.json();
        if (data.success && data.data) {
          setEmployee(data.data);
        } else {
          throw new Error(data.message || 'Failed to load employee details');
        }
      } catch (err: any) {
        setError(err.message || 'Error fetching employee profile');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeDetails();
  }, [params.id]);

  useEffect(() => {
    const fetchOverviewAnalytics = async () => {
      setAnalyticsLoading(true);
      try {
        const res = await fetch(`/api/analytics/deep-analysis?employeeId=${params.id}`);
        const data = await res.json();
        if (data.success && data.data?.analysis) {
          setAnalytics(data.data.analysis);
        }
      } catch (err) {
        console.error('Failed to load overview analytics:', err);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    if (activeTab === 'overview') {
      fetchOverviewAnalytics();
    }
  }, [params.id, activeTab]);

  const formatHours = (mins: number) => {
    return `${Math.round((mins / 60) * 10) / 10}h`;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Back Button */}
      <div>
        <Link
          href="/admin/employees"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Team List
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Loading employee progress profile...
          </p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center text-rose-600 dark:text-rose-400">
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : employee ? (
        <>
          {/* Employee Header Profile Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-400 text-white font-bold text-2xl flex items-center justify-center shadow-lg shadow-rose-600/20 flex-shrink-0">
                  {employee.name ? employee.name.charAt(0).toUpperCase() : 'E'}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {employee.name}
                    </h1>
                    <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                      {employee.employeeId}
                    </span>
                    <Badge status={employee.role} />
                    <Badge status={employee.status} />
                  </div>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
                    @{employee.username} &bull; {employee.designation || 'Team Member'}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 mt-3">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {employee.department}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {employee.email}
                    </span>
                    {employee.phone && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {employee.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 dark:border-slate-800 pt-4 scrollbar-none">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'overview'
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Activity className="w-4 h-4" />
                Progress Overview & Graphs
              </button>

              <button
                onClick={() => setActiveTab('daily')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'daily'
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Daily Report
              </button>

              <button
                onClick={() => setActiveTab('weekly')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'weekly'
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <BarChart2 className="w-4 h-4" />
                Weekly Report
              </button>

              <button
                onClick={() => setActiveTab('monthly')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'monthly'
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Monthly Report
              </button>

              <button
                onClick={() => setActiveTab('analysis')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'analysis'
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Deep Analytics
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {analyticsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-xs font-medium text-slate-500">Calculating overview graphs...</p>
                </div>
              ) : analytics ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                      <span className="text-xs text-slate-500">Attendance Consistency</span>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                        {analytics.attendance?.attendanceConsistency || 0}%
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {analytics.attendance?.presentDays || 0} Present Days
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                      <span className="text-xs text-slate-500">Task Completion Rate</span>
                      <div className="text-2xl font-bold text-emerald-600 mt-2">
                        {analytics.workload?.completionRate || 0}%
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {analytics.workload?.completedTasksCount || 0} of{' '}
                        {analytics.workload?.assignedTasksCount || 0} completed
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                      <span className="text-xs text-slate-500">Deliverables Output</span>
                      <div className="text-2xl font-bold text-blue-600 mt-2">
                        {analytics.output?.deliverablesCompletedCount || 0}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        YT: {analytics.output?.youtubeOutput || 0} | IG:{' '}
                        {analytics.output?.instagramOutput || 0} | FB:{' '}
                        {analytics.output?.facebookOutput || 0}
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                      <span className="text-xs text-slate-500">On-Time & First-Pass</span>
                      <div className="text-2xl font-bold text-rose-600 mt-2">
                        {analytics.deadlines?.onTimeRate || 0}%
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        First-pass: {analytics.review?.firstPassApprovalRate || 0}%
                      </p>
                    </div>
                  </div>

                  {/* Visual Progress Graphs & Distributions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Platform Breakdown Cards */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Video className="w-4 h-4 text-rose-600" />
                        Platform Deliverable Progress Breakdown
                      </h3>

                      <div className="space-y-4">
                        {analytics.platformMatrix?.map((pm: any) => {
                          const totalDelivs = Math.max(1, analytics.output?.deliverablesCompletedCount || 1);
                          const pct = Math.round((pm.deliverablesCount / totalDelivs) * 100);

                          return (
                            <div key={pm.platform} className="space-y-1.5">
                              <div className="flex justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                                <span>{pm.platform}</span>
                                <span>
                                  {pm.deliverablesCount} deliverables ({pct}%)
                                </span>
                              </div>
                              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full bg-rose-600 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Task Type Breakdown */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                        Task Workload & Status Distribution
                      </h3>

                      <div className="space-y-3">
                        <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <span>Completed Tasks</span>
                          <span className="text-emerald-600">
                            {analytics.workload?.completedTasksCount || 0}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{
                              width: `${
                                analytics.workload?.assignedTasksCount > 0
                                  ? (analytics.workload.completedTasksCount /
                                      analytics.workload.assignedTasksCount) *
                                    100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>

                        <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <span>Open / In Progress Tasks</span>
                          <span className="text-blue-600">
                            {analytics.workload?.openTasksCount || 0}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{
                              width: `${
                                analytics.workload?.assignedTasksCount > 0
                                  ? (analytics.workload.openTasksCount /
                                      analytics.workload.assignedTasksCount) *
                                    100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>

                        <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <span>Blocked Tasks</span>
                          <span className="text-amber-600">
                            {analytics.workload?.blockedTasksCount || 0}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{
                              width: `${
                                analytics.workload?.assignedTasksCount > 0
                                  ? (analytics.workload.blockedTasksCount /
                                      analytics.workload.assignedTasksCount) *
                                    100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Project Contribution Table */}
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-600" />
                      Project Contribution & Time Spent Breakdown
                    </h3>

                    {analytics.projectContributions?.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">
                        No project contribution data available yet.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                          <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white uppercase">
                            <tr>
                              <th className="px-4 py-3">Project Title</th>
                              <th className="px-4 py-3">Time Spent</th>
                              <th className="px-4 py-3">Tasks</th>
                              <th className="px-4 py-3">Deliverables</th>
                              <th className="px-4 py-3">Contribution</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {analytics.projectContributions?.map((p: any) => (
                              <tr key={p.project}>
                                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                                  {p.project}
                                </td>
                                <td className="px-4 py-3">{p.timeSpentHours}h</td>
                                <td className="px-4 py-3">{p.tasksCount} tasks</td>
                                <td className="px-4 py-3">{p.deliverablesCount} deliverables</td>
                                <td className="px-4 py-3 font-bold text-rose-600">
                                  {p.contributionPercentage}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {activeTab === 'daily' && <DailyReportView employeeId={employee.employeeId || employee._id} />}
          {activeTab === 'weekly' && <WeeklyReportView employeeId={employee.employeeId || employee._id} />}
          {activeTab === 'monthly' && <MonthlyReportView employeeId={employee.employeeId || employee._id} />}
          {activeTab === 'analysis' && <DeepAnalysisView employeeId={employee.employeeId || employee._id} />}
        </>
      ) : null}
    </div>
  );
}
