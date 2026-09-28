'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils';
import { ShieldAlert, Search, ShieldCheck, Filter } from 'lucide-react';
import { IAuditLog } from '@/types';

export default function AdminAuditLogsClient({ initialLogs = [] }: { initialLogs?: any[] }) {
  const [logs, setLogs] = useState<IAuditLog[]>(initialLogs as IAuditLog[]);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(initialLogs.length === 0);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = `/api/admin/audit-logs?limit=100`;
      if (actionFilter !== 'ALL') url += `&action=${actionFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data.logs || []);
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

  const actions = [
    'ALL',
    'USER_LOGIN',
    'EMPLOYEE_CREATED',
    'EMPLOYEE_EDITED',
    'EMPLOYEE_ACTIVATED',
    'EMPLOYEE_DEACTIVATED',
    'ADMIN_PASSWORD_RESET',
    'PASSWORD_CHANGED',
    'PASSWORD_RESET_COMPLETED',
    'ATTENDANCE_CORRECTED',
    'ATTENDANCE_APPROVED',
    'ATTENDANCE_REJECTED',
    'SYSTEM_SETUP_INITIALIZED',
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors">
      <Navbar />
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Security Audit Trail
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Immutable chronological record of administrative actions and access events.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <Card className="border-slate-200 dark:border-slate-800 mb-6 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search actor, target, IP, or details..."
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
                {actions.map((act) => (
                  <option key={act} value={act}>
                    {act === 'ALL' ? 'All Audit Actions' : act}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Audit Logs Table */}
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Metadata</th>
                  <th className="py-3 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
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
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      No audit events found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{log.actorName}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{log.actorRole}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {log.targetType ? `${log.targetType}: ` : ''}
                        <span className="text-slate-900 dark:text-white font-semibold">{log.targetId || 'â€”'}</span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="truncate text-slate-600 dark:text-slate-400 font-mono text-[10px]">
                          {log.metadata && Object.keys(log.metadata).length > 0
                            ? JSON.stringify(log.metadata)
                            : 'â€”'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                        {log.ipAddress || '127.0.0.1'}
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


