'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  ShieldAlert,
  Search,
  ShieldCheck,
  Filter,
  RefreshCw,
  Banknote,
  Calendar,
  Users,
  Key,
  FileSpreadsheet,
  Layers,
  ChevronRight
} from 'lucide-react';
import { IAuditLog } from '@/types';

export default function AdminAuditLogsClient({ initialLogs = [] }: { initialLogs?: any[] }) {
  const [logs, setLogs] = useState<IAuditLog[]>(initialLogs as IAuditLog[]);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'PAYROLL' | 'ATTENDANCE' | 'EMPLOYEES' | 'AUTH'>('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(initialLogs.length === 0);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = `/api/admin/audit-logs?limit=150`;
      if (actionFilter !== 'ALL') {
        url += `&action=${encodeURIComponent(actionFilter)}`;
      }
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        const fetchedLogs = data.data?.logs || data.logs || (Array.isArray(data.data) ? data.data : []);
        setLogs(fetchedLogs);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [actionFilter, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const allActions = [
    { value: 'ALL', label: 'All Audit Actions', category: 'ALL' },
    // Payroll & Compensation
    { value: 'PAYROLL_GENERATED', label: 'Payroll Generated / Run', category: 'PAYROLL' },
    { value: 'SALARY_STRUCTURE_UPDATED', label: 'Salary Structure Updated', category: 'PAYROLL' },
    { value: 'SALARY_LOAN_CREATED', label: 'Salary Loan Created', category: 'PAYROLL' },
    { value: 'SALARY_LOAN_APPROVED', label: 'Salary Loan Approved', category: 'PAYROLL' },
    { value: 'SALARY_LOAN_REJECTED', label: 'Salary Loan Rejected', category: 'PAYROLL' },
    { value: 'SALARY_LOAN_REVISED', label: 'Salary Loan Revised', category: 'PAYROLL' },
    { value: 'SALARY_LOAN_CLOSED', label: 'Salary Loan Closed', category: 'PAYROLL' },
    { value: 'TAX_DECLARATION_UPDATED', label: 'Tax Declaration Saved', category: 'PAYROLL' },
    { value: 'COMPLIANCE_EXPORT_DOWNLOADED', label: 'Statutory Export Downloaded', category: 'PAYROLL' },
    // Attendance
    { value: 'ATTENDANCE_CORRECTED', label: 'Attendance Corrected', category: 'ATTENDANCE' },
    { value: 'ATTENDANCE_APPROVED', label: 'Attendance Approved', category: 'ATTENDANCE' },
    { value: 'ATTENDANCE_REJECTED', label: 'Attendance Rejected', category: 'ATTENDANCE' },
    // Employees
    { value: 'EMPLOYEE_CREATED', label: 'Employee Created', category: 'EMPLOYEES' },
    { value: 'EMPLOYEE_EDITED', label: 'Employee Edited', category: 'EMPLOYEES' },
    { value: 'EMPLOYEE_ACTIVATED', label: 'Employee Activated', category: 'EMPLOYEES' },
    { value: 'EMPLOYEE_DEACTIVATED', label: 'Employee Deactivated', category: 'EMPLOYEES' },
    // Auth & Security
    { value: 'USER_LOGIN', label: 'User Login', category: 'AUTH' },
    { value: 'ADMIN_PASSWORD_RESET', label: 'Admin Password Reset', category: 'AUTH' },
    { value: 'PASSWORD_CHANGED', label: 'Password Changed', category: 'AUTH' },
    { value: 'PASSWORD_RESET_COMPLETED', label: 'Password Reset Completed', category: 'AUTH' },
    { value: 'SYSTEM_SETUP_INITIALIZED', label: 'System Setup Initialized', category: 'AUTH' },
  ];

  const filteredLogs = logs.filter((log) => {
    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'PAYROLL') {
      return [
        'PAYROLL_GENERATED',
        'SALARY_STRUCTURE_UPDATED',
        'SALARY_LOAN_CREATED',
        'SALARY_LOAN_APPROVED',
        'SALARY_LOAN_REJECTED',
        'SALARY_LOAN_REVISED',
        'SALARY_LOAN_CLOSED',
        'TAX_DECLARATION_UPDATED',
        'COMPLIANCE_EXPORT_DOWNLOADED',
      ].includes(log.action) || log.targetType?.includes('PAYROLL') || log.targetType?.includes('SALARY') || log.targetType?.includes('TAX');
    }
    if (categoryFilter === 'ATTENDANCE') {
      return log.action.includes('ATTENDANCE') || log.targetType?.includes('ATTENDANCE');
    }
    if (categoryFilter === 'EMPLOYEES') {
      return log.action.includes('EMPLOYEE') || log.targetType?.includes('USER') || log.targetType?.includes('EMPLOYEE');
    }
    if (categoryFilter === 'AUTH') {
      return ['USER_LOGIN', 'ADMIN_PASSWORD_RESET', 'PASSWORD_CHANGED', 'PASSWORD_RESET_COMPLETED', 'SYSTEM_SETUP_INITIALIZED'].includes(log.action);
    }
    return true;
  });

  const getActionBadgeColor = (action: string) => {
    if (action.startsWith('PAYROLL_')) return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    if (action.startsWith('SALARY_LOAN_APPROVED')) return 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800';
    if (action.startsWith('SALARY_LOAN_REJECTED')) return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800';
    if (action.startsWith('SALARY_')) return 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
    if (action.startsWith('TAX_') || action.startsWith('COMPLIANCE_')) return 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800';
    if (action.startsWith('ATTENDANCE_')) return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    if (action.startsWith('EMPLOYEE_')) return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800';
    if (action.includes('PASSWORD') || action.includes('LOGIN')) return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700';
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors">
      <Navbar />
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-rose-500" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Security & Payroll Audit Trail
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Immutable chronological ledger of administrative operations, payroll runs, salary loan actions, and access events.
            </p>
          </div>
          <button
            onClick={() => fetchLogs()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-rose-500' : ''}`} />
            Refresh Trail
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { id: 'ALL', label: 'All Activities', icon: Layers },
            { id: 'PAYROLL', label: 'Payroll & Compensation Audit', icon: Banknote },
            { id: 'ATTENDANCE', label: 'Attendance Audit', icon: Calendar },
            { id: 'EMPLOYEES', label: 'Employee Changes', icon: Users },
            { id: 'AUTH', label: 'Security & Auth', icon: Key },
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setCategoryFilter(cat.id as any);
                  setActionFilter('ALL');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-rose-500 text-white shadow-sm font-semibold'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Filter Bar */}
        <Card className="border-slate-200 dark:border-slate-800 mb-6 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search actor, employee, action, IP, or metadata..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {allActions
                  .filter((a) => categoryFilter === 'ALL' || a.category === 'ALL' || a.category === categoryFilter)
                  .map((act) => (
                    <option key={act.value} value={act.value}>
                      {act.label}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Audit Logs Table */}
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Details / Metadata</th>
                  <th className="py-3 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-28" /></td>
                      <td className="py-3.5 px-4">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-14" />
                      </td>
                      <td className="py-3.5 px-4"><Skeleton className="h-5 w-28 rounded" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-20" /></td>
                    </tr>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                      <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      No audit events matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log: any) => {
                    const dateVal = log.timestamp || log.createdAt;
                    const formattedDate = dateVal ? new Date(dateVal).toLocaleString() : '-';
                    const badgeClass = getActionBadgeColor(log.action);

                    return (
                      <tr key={log._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                          {formattedDate}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{log.actorName}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{log.actorRole}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${badgeClass}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          {log.targetType ? (
                            <span className="text-slate-500 dark:text-slate-400 font-normal">{log.targetType}: </span>
                          ) : null}
                          <span className="text-slate-900 dark:text-white font-semibold">{log.targetId || '-'}</span>
                        </td>
                        <td className="py-3 px-4 max-w-sm">
                          <div className="text-slate-600 dark:text-slate-300 font-mono text-[11px] break-words">
                            {log.metadata && Object.keys(log.metadata).length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(log.metadata).map(([k, v]) => (
                                  <span key={k} className="inline-flex px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-400 mr-1">{k}:</span>
                                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                          {log.ipAddress || '127.0.0.1'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}


