'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cachedFetch } from '@/lib/client-cache';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatTime, formatMinutes, getTodayDateString } from '@/lib/utils';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Coffee,
  CheckCircle2,
  RefreshCw,
  Search,
  FolderGit2,
  CheckSquare,
  AlertTriangle,
  CalendarCheck,
} from 'lucide-react';
import { SessionPayload } from '@/types';

interface Props {
  initialMetrics: any;
  initialProdMetrics: any;
  initialRecords: any[];
  initialUser: SessionPayload | null;
}

const defaultMetrics = {
  totalEmployees: 0,
  presentToday: 0,
  absentToday: 0,
  currentlyWorking: 0,
  currentlyOnBreak: 0,
  completedAttendance: 0,
  pendingCorrectionsCount: 0,
};

const defaultProdMetrics = {
  activeProjectsCount: 0,
  publishedProjectsCount: 0,
  totalTasksCount: 0,
  pendingTasksCount: 0,
  tasksDueTodayCount: 0,
  overdueTasksCount: 0,
  scheduledDeliverablesCount: 0,
  publishedDeliverablesCount: 0,
  productionOutput: { youtubeVideos: 0, youtubeShorts: 0, instagramReels: 0, facebookReels: 0 },
};

export default function AdminDashboardClient({
  initialMetrics,
  initialProdMetrics,
  initialRecords,
  initialUser,
}: Props) {
  const [currentUser, setCurrentUser] = useState<SessionPayload | null>(initialUser);
  const [metrics, setMetrics] = useState({ ...defaultMetrics, ...(initialMetrics || {}) });
  const [prodMetrics, setProdMetrics] = useState({ ...defaultProdMetrics, ...(initialProdMetrics || {}) });
  const [records, setRecords] = useState<any[]>(initialRecords ?? []);
  // Start as false when we have SSR data, true only if no initial data
  const [isLoading, setIsLoading] = useState(!initialMetrics && !initialRecords.length);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  const fetchDashboardData = useCallback(async (bust = false) => {
    try {
      const opts = { credentials: 'include' as const };
      const today = getTodayDateString();

      const [meData, data, attData] = await Promise.all([
        cachedFetch('dashboard-me', () => fetch('/api/auth/me', opts).then(r => r.json()), bust ? 0 : 300),
        cachedFetch('dashboard-reports', () => fetch('/api/admin/reports', opts).then(r => r.json()), bust ? 0 : 30),
        cachedFetch(`dashboard-att-${today}`, () => fetch(`/api/admin/attendance?date=${today}`, opts).then(r => r.json()), bust ? 0 : 15),
      ]);

      if (meData.success) setCurrentUser(meData.data);

      if (data.success && data.data) {
        if (data.data.dashboardMetrics) setMetrics(data.data.dashboardMetrics);
        if (data.data.productionMetrics) setProdMetrics(data.data.productionMetrics);
      }

      if (attData.success && attData.data) {
        const fetchedRecords = attData.data.records || [];
        setRecords(fetchedRecords);

        if (fetchedRecords.length > 0) {
          const present = fetchedRecords.filter((r: any) => ['PRESENT', 'ON_BREAK', 'COMPLETED'].includes(r.status)).length;
          const working = fetchedRecords.filter((r: any) => r.status === 'PRESENT').length;
          const onBreak = fetchedRecords.filter((r: any) => r.status === 'ON_BREAK').length;
          const completed = fetchedRecords.filter((r: any) => r.status === 'COMPLETED').length;
          const total = fetchedRecords.length;

          setMetrics((prev: any) => ({
            totalEmployees: prev.totalEmployees > 0 ? prev.totalEmployees : total,
            presentToday: prev.presentToday > 0 ? prev.presentToday : present,
            absentToday: prev.absentToday > 0 ? prev.absentToday : Math.max(0, total - present),
            currentlyWorking: prev.currentlyWorking > 0 ? prev.currentlyWorking : working,
            currentlyOnBreak: prev.currentlyOnBreak > 0 ? prev.currentlyOnBreak : onBreak,
            completedAttendance: prev.completedAttendance > 0 ? prev.completedAttendance : completed,
            pendingCorrectionsCount: prev.pendingCorrectionsCount,
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching admin overview data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Only poll; initial data already provided by SSR
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData(true);
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
      r.employeeId?.toLowerCase().includes(search.toLowerCase());
    const matchesDept = departmentFilter === 'ALL' || r.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const departments = [
    'ALL',
    'Video Production',
    'Post-Production / Editing',
    'Creative & Scripting',
    'Motion Graphics & VFX',
    'Sound Design',
    'Management & Operations',
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar user={currentUser} />
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Production &amp; Attendance Console
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live operations monitoring, shift presence, and channel deliverable metrics ({getTodayDateString()}).
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-rose-600' : ''}`} />
            Refresh Data
          </button>
        </div>

        {/* 1. Production Pipeline Metrics Grid */}
        <div className="mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
            <FolderGit2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            Media Production Overview
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
                Active Projects
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
                {isLoading ? <Skeleton className="h-8 w-12" /> : prodMetrics.activeProjectsCount}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">In production pipeline</span>
            </Card>

            <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5 text-rose-500" />
                Tasks Due Today
              </span>
              <div className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1.5">
                {isLoading ? <Skeleton className="h-8 w-12" /> : prodMetrics.tasksDueTodayCount}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Requiring completion</span>
            </Card>

            <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Overdue Tasks
              </span>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1.5">
                {isLoading ? <Skeleton className="h-8 w-12" /> : prodMetrics.overdueTasksCount}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Past scheduled deadline</span>
            </Card>

            <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" />
                Scheduled Deliverables
              </span>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1.5">
                {isLoading ? <Skeleton className="h-8 w-12" /> : prodMetrics.scheduledDeliverablesCount}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Ready for distribution</span>
            </Card>
          </div>
        </div>

        {/* 2. Staff Attendance Metrics Grid */}
        <div className="mb-8">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            Today&apos;s Team Attendance
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {[
              { label: 'Total Staff', value: metrics.totalEmployees, icon: <Users className="w-3.5 h-3.5 text-slate-400" />, color: 'text-slate-900 dark:text-white' },
              { label: 'Present Today', value: metrics.presentToday, icon: <UserCheck className="w-3.5 h-3.5" />, color: 'text-emerald-700 dark:text-emerald-400' },
              { label: 'Absent Today', value: metrics.absentToday, icon: <UserX className="w-3.5 h-3.5" />, color: 'text-rose-700 dark:text-rose-400' },
              { label: 'Working Now', value: metrics.currentlyWorking, icon: <Clock className="w-3.5 h-3.5" />, color: 'text-sky-700 dark:text-sky-400' },
              { label: 'On Break', value: metrics.currentlyOnBreak, icon: <Coffee className="w-3.5 h-3.5" />, color: 'text-amber-700 dark:text-amber-400' },
              { label: 'Completed', value: metrics.completedAttendance, icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-purple-700 dark:text-purple-400' },
            ].map(({ label, value, icon, color }) => (
              <Card key={label} className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  {icon} {label}
                </span>
                <div className={`text-2xl font-bold mt-1.5 ${color}`}>
                  {isLoading ? <Skeleton className="h-8 w-12" /> : value}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 3. Live Attendance Roster */}
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Today&apos;s Live Employee Roster</h2>
              <span className="text-xs bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-semibold">
                {filteredRecords.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 w-44"
                />
              </div>

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d === 'ALL' ? 'All Departments' : d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4">Check In</th>
                  <th className="py-3 px-4">Check Out</th>
                  <th className="py-3 px-4">Total Worked</th>
                  <th className="py-3 px-4">Total Breaks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-28 mb-1" /><Skeleton className="h-3 w-16" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-16" /></td>
                    </tr>
                  ))
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      No matching attendance records found for today.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{record.employeeName}</div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{record.employeeId}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                        {record.department || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge status={record.status} />
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {formatTime(record.checkIn)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {formatTime(record.checkOut)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {formatMinutes(record.totalWorkingMinutes)}
                      </td>
                      <td className="py-3 px-4 font-mono text-amber-700 dark:text-amber-400">
                        {formatMinutes(record.totalBreakMinutes)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
