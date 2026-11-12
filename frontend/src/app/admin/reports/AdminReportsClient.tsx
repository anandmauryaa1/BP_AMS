'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatTime, formatMinutes, getTodayDateString } from '@/lib/utils';
import { Download, Calendar, BarChart3, Building2, Timer, RefreshCw } from 'lucide-react';

export default function AdminReportsClient() {
  const today = getTodayDateString();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return getTodayDateString(d);
  });
  const [endDate, setEndDate] = useState(today);
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (data.success && data.data.rangeAnalytics) {
        setReportData(data.data.rangeAnalytics);
      }
    } catch (err) {
      console.error('Error fetching report analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExportCSV = () => {
    if (!reportData || !reportData.records || reportData.records.length === 0) return;

    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Date',
      'Status',
      'Check In',
      'Check Out',
      'Is Late',
      'Late Minutes',
      'Working Duration (Minutes)',
      'Working Duration (Hours)',
      'Break Duration (Minutes)',
      'Notes / Reason',
    ];

    const rows = reportData.records.map((r: any) => [
      `"${r.employeeId}"`,
      `"${r.employeeName || ''}"`,
      `"${r.department || ''}"`,
      `"${r.date}"`,
      `"${r.status}"`,
      `"${formatTime(r.checkIn)}"`,
      `"${formatTime(r.checkOut)}"`,
      r.isLate ? 'Yes' : 'No',
      r.lateMinutes || 0,
      r.totalWorkingMinutes || 0,
      ((r.totalWorkingMinutes || 0) / 60).toFixed(2),
      r.totalBreakMinutes || 0,
      `"${String(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Blindera_Productions_Attendance_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(getTodayDateString(start));
    setEndDate(getTodayDateString(end));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors">
      <Navbar />
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Reports & Payroll Export
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Aggregate working hours across departments and download clean attendance summaries.
            </p>
          </div>

          <Button
            onClick={handleExportCSV}
            disabled={!reportData || reportData.records.length === 0}
            size="md"
            className="gap-2 font-semibold self-start sm:self-auto bg-slate-900 dark:bg-rose-600 hover:bg-slate-800 dark:hover:bg-rose-500 text-white"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Date Selector Card */}
        <Card className="border-slate-200 dark:border-slate-800 mb-6 p-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchReports}
                isLoading={isLoading}
                className="mt-4 md:mt-0 font-semibold text-xs"
              >
                Apply Range
              </Button>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5 self-start md:self-auto">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mr-1">Presets:</span>
              <button
                onClick={() => setPreset(0)}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                Today
              </button>
              <button
                onClick={() => setPreset(7)}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setPreset(30)}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                Last 30 Days
              </button>
            </div>
          </div>
        </Card>

        {/* Aggregated Department & Leave Overview */}
        {reportData && (
          <div className="mb-8 space-y-6">
            {reportData.leaveSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <Card className="p-4 border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Approved Leave Days</div>
                  <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mt-1">{reportData.leaveSummary.approvedLeaveDays || 0}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Paid: {reportData.leaveSummary.approvedPaidLeaveDays || 0} • LWP: {reportData.leaveSummary.unpaidLeaveDays || 0}</div>
                </Card>
                <Card className="p-4 border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending Leave Days</div>
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{reportData.leaveSummary.pendingLeaveDays || 0}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Awaiting review in range</div>
                </Card>
                <Card className="p-4 border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Late Check-Ins</div>
                  <div className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">
                    {(reportData.records || []).filter((r: any) => r.isLate).length}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {(reportData.records || []).reduce((s: number, r: any) => s + Number(r.lateMinutes || 0), 0)} total late mins
                  </div>
                </Card>
                <Card className="p-4 border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Marked Absent Entries</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {(reportData.records || []).filter((r: any) => r.status === 'ABSENT').length}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">From {reportData.records?.length || 0} logged records</div>
                </Card>
              </div>
            )}

            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                Department Hours Summary
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {reportData.departmentBreakdown.map((dept: any) => (
                  <Card key={dept.department} className="p-4 border-slate-200 dark:border-slate-800">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      {dept.department}
                    </div>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">{dept.totalHours} hrs</span>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        {formatMinutes(dept.totalMinutes)}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {Array.isArray(reportData.employeeBreakdown) && reportData.employeeBreakdown.length > 0 && (
              <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Employee Attendance &amp; Leave Summary ({reportData.employeeBreakdown.length} staff)
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/75 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4">Employee</th>
                        <th className="py-2.5 px-4">Present</th>
                        <th className="py-2.5 px-4">Absent</th>
                        <th className="py-2.5 px-4">Late (Mins)</th>
                        <th className="py-2.5 px-4">Paid Leave</th>
                        <th className="py-2.5 px-4">Unpaid Leave</th>
                        <th className="py-2.5 px-4">Pending Leave</th>
                        <th className="py-2.5 px-4">Worked Hrs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {reportData.employeeBreakdown.map((emp: any) => (
                        <tr key={emp.employeeId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 px-4">
                            <span className="font-bold text-slate-900 dark:text-white">{emp.employeeName}</span>
                            <span className="ml-2 font-mono text-[11px] text-slate-500">{emp.employeeId}</span>
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-emerald-700 dark:text-emerald-400">{emp.presentDays}</td>
                          <td className="py-2.5 px-4 font-semibold text-rose-700 dark:text-rose-400">{emp.absentDays}</td>
                          <td className="py-2.5 px-4 font-mono text-amber-700 dark:text-amber-400">{emp.lateDays} ({emp.totalLateMinutes}m)</td>
                          <td className="py-2.5 px-4 font-semibold text-indigo-700 dark:text-indigo-400">{emp.paidLeaveDays}d</td>
                          <td className="py-2.5 px-4 font-semibold text-rose-600 dark:text-rose-400">{emp.unpaidLeaveDays}d</td>
                          <td className="py-2.5 px-4 text-amber-600 dark:text-amber-400">{emp.pendingLeaveDays}d</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">{((emp.totalWorkingMinutes || 0) / 60).toFixed(1)}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Detailed Records Table */}
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Aggregated Attendance Logs ({reportData?.records?.length || 0} entries)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Check In</th>
                  <th className="py-3 px-4">Check Out</th>
                  <th className="py-3 px-4">Late</th>
                  <th className="py-3 px-4">Hours Worked</th>
                  <th className="py-3 px-4">Notes / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-28" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-14" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-24" /></td>
                    </tr>
                  ))
                ) : !reportData || reportData.records.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      No attendance data found in the selected date range.
                    </td>
                  </tr>
                ) : (
                  reportData.records.map((r: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{r.date}</td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">{r.employeeId}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{r.employeeName}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">{r.department}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          r.status === 'ABSENT'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">{formatTime(r.checkIn)}</td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">{formatTime(r.checkOut)}</td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {r.isLate ? (
                          <span className="text-amber-700 dark:text-amber-400 font-semibold">Late (+{r.lateMinutes || 0}m)</span>
                        ) : (
                          <span className="text-slate-400">On Time</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {((r.totalWorkingMinutes || 0) / 60).toFixed(1)} hrs ({formatMinutes(r.totalWorkingMinutes)})
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-[200px] truncate" title={r.notes || ''}>
                        {r.notes || '—'}
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

