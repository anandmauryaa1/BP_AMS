'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileNav } from '@/components/MobileNav';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { getTodayDateString, formatDate } from '@/lib/utils';
import { Palmtree, Plus, CheckCircle2, AlertCircle, Calendar, Clock, XCircle } from 'lucide-react';

import { ILeaveRequest, LeaveType, SessionPayload } from '@/types';

interface LeaveBalanceItem {
  leaveType: string;
  title: string;
  annualQuota: number;
  accruedToDate: number;
  takenThisYear: number;
  remainingBalance: number;
}

export default function EmployeeLeavesClient({ initialLeaves = [] }: { initialLeaves?: any[] }) {
  const [user, setUser] = useState<SessionPayload | null>(null);
  const [leaves, setLeaves] = useState<ILeaveRequest[]>(initialLeaves);
  const [balances, setBalances] = useState<LeaveBalanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(initialLeaves.length === 0);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<ILeaveRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const getLeaveDays = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return 0;
    return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };


  const [form, setForm] = useState({
    startDate: getTodayDateString(),
    endDate: getTodayDateString(),
    leaveType: 'CASUAL' as LeaveType,
    reason: '',
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchLeaves = useCallback(async () => {
    if (leaves.length === 0) setIsLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [meRes, res, balRes] = await Promise.all([
        fetch('/api/auth/me', { headers: authHeaders, credentials: 'include' }),
        fetch('/api/leaves', { headers: authHeaders, credentials: 'include' }),
        fetch('/api/leaves/balances', { headers: authHeaders, credentials: 'include' }),
      ]);
      const [meData, data, balData] = await Promise.all([meRes.json(), res.json(), balRes.json()]);
      if (meData.success) setUser(meData.data);

      if (data.success) {
        const found = Array.isArray(data.data) ? data.data : (data.data?.leaves || data.leaves || []);
        setLeaves(found);
      }
      if (balData.success && Array.isArray(balData.data)) {
        setBalances(balData.data);
      }
    } catch (err) {
      console.error('Error fetching leaves:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate || form.endDate < form.startDate) {
      showToast('End date cannot be earlier than start date', 'error');
      return;
    }
    setIsSubmitting(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          leaveType: form.leaveType,
          type: form.leaveType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || data.message || 'Failed to submit leave request', 'error');
      } else {
        showToast('Leave request submitted for review', 'success');
        setIsApplyModalOpen(false);
        setForm({
          startDate: getTodayDateString(),
          endDate: getTodayDateString(),
          leaveType: 'CASUAL',
          reason: '',
        });
        fetchLeaves();
      }
    } catch {
      showToast('Network error submitting leave request', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelPendingLeave = async (leaveId: string) => {
    setCancellingId(leaveId);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`/api/leaves/${leaveId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to cancel leave request', 'error');
        return;
      }

      showToast('Pending leave request cancelled', 'success');
      setSelectedLeave(null);
      fetchLeaves();
    } catch {
      showToast('Network error cancelling leave request', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 md:pb-8 transition-colors">
      <Navbar user={user} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`fixed top-20 right-4 z-[9999] p-4 rounded-xl shadow-2xl border text-sm font-semibold flex items-center gap-2.5 animate-in slide-in-from-top-3 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/40'
                : 'bg-rose-600 text-white border-rose-500 shadow-rose-950/40'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-white shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Palmtree className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              Leave Applications
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Submit planned leave requests and view approval decisions.
            </p>
          </div>

          <Button onClick={() => setIsApplyModalOpen(true)} size="md" className="gap-1.5 font-semibold self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            Apply for Leave
          </Button>
        </div>

        {/* Annual Leave Balances Strip (if LeavePolicy configured) */}
        {balances.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {balances.map((bal) => (
              <div
                key={bal.leaveType}
                className="p-3.5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {bal.title || bal.leaveType}
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {bal.remainingBalance} <span className="text-[11px] font-medium text-slate-400">left</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    {bal.takenThisYear}/{bal.accruedToDate} used
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mobile View: Clean Leave Request Cards (sm:hidden) */}
        <div className="sm:hidden space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <Card key={idx} className="p-4 border-slate-200 dark:border-slate-800 animate-pulse space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-48" />
              </Card>
            ))
          ) : leaves.length === 0 ? (
            <Card className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs border-slate-200 dark:border-slate-800">
              No leave requests submitted.
            </Card>
          ) : (
            leaves.map((leave) => (
              <Card
                key={leave._id}
                onClick={() => setSelectedLeave(leave)}
                className="p-4 border-slate-200 dark:border-slate-800 space-y-3 shadow-sm cursor-pointer hover:border-rose-400 dark:hover:border-rose-500/50 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                    {leave.startDate} {leave.startDate !== leave.endDate && `-> ${leave.endDate}`}
                  </span>
                  <Badge status={leave.status as any} />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                    {leave.leaveType || (leave as any).type}
                  </span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">
                    {leave.reason}
                  </span>
                </div>

                {leave.reviewNotes && (
                  <div className="text-[11px] bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 italic">
                    Review note: &ldquo;{leave.reviewNotes}&rdquo;
                  </div>
                )}

                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
                  <span>Applied on {formatDate(leave.createdAt)}</span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">View details &rarr;</span>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Desktop Leaves Table (hidden on mobile) */}
        <Card className="hidden sm:block border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Leave Duration</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reviewer Notes</th>
                  <th className="py-3 px-4">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-5 w-16 rounded" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-40" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-20" /></td>
                    </tr>
                  ))
                ) : leaves.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      No leave requests submitted.
                    </td>
                  </tr>
                ) : (
                  leaves.map((leave) => (
                    <tr
                      key={leave._id}
                      onClick={() => setSelectedLeave(leave)}
                      className="hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100 font-mono">
                        {leave.startDate} {leave.startDate !== leave.endDate && `to ${leave.endDate}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                          {leave.leaveType || (leave as any).type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate">{leave.reason}</td>
                      <td className="py-3.5 px-4">
                        <Badge status={leave.status as any} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 italic text-[11px]">
                        {leave.reviewNotes ? `"${leave.reviewNotes}"${leave.reviewedBy ? ` by ${leave.reviewedBy}` : ''}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{formatDate(leave.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Modal: View Leave Application Details */}
        {selectedLeave && (
          <Modal
            isOpen={!!selectedLeave}
            onClose={() => setSelectedLeave(null)}
            title="Leave Application Details"
            description={`Applied on ${formatDate(selectedLeave.createdAt)}`}
            maxWidth="lg"
          >
            <div className="space-y-5">
              {/* Header Info Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Leave Type:</span>
                  <span className="text-xs font-mono font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 px-3 py-1 rounded-lg border border-rose-200 dark:border-rose-800/80">
                    {selectedLeave.leaveType || (selectedLeave as any).type || 'CASUAL'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status:</span>
                  <Badge status={selectedLeave.status as any} />
                </div>
              </div>

              {/* Dates & Duration Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-rose-500" />
                    Start Date
                  </div>
                  <div className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
                    {selectedLeave.startDate}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-rose-500" />
                    End Date
                  </div>
                  <div className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
                    {selectedLeave.endDate}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-rose-500" />
                    Total Duration
                  </div>
                  <div className="text-sm font-bold font-mono text-rose-700 dark:text-rose-300">
                    {getLeaveDays(selectedLeave.startDate, selectedLeave.endDate)} Day(s)
                  </div>
                </div>
              </div>

              {/* Reason Box */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Reason for Leave
                </label>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedLeave.reason || 'No reason provided.'}
                </div>
              </div>

              {/* Reviewer / Decision Details */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Reviewer & Decision Information
                </label>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                  {selectedLeave.status === 'PENDING' ? (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>Your leave application is currently pending review by your manager.</span>
                    </div>
                  ) : (
                    <>
                      {selectedLeave.reviewedBy && (
                        <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                          <span className="font-medium text-slate-500 dark:text-slate-400">Reviewed By:</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedLeave.reviewedBy}</span>
                        </div>
                      )}
                      {selectedLeave.reviewedAt && (
                        <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                          <span className="font-medium text-slate-500 dark:text-slate-400">Reviewed On:</span>
                          <span>{formatDate(selectedLeave.reviewedAt)}</span>
                        </div>
                      )}
                      {selectedLeave.updatedBy && (
                        <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                          <span className="font-medium text-slate-500 dark:text-slate-400">Last Updated By:</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedLeave.updatedBy}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
                        <span className="font-medium text-slate-500 dark:text-slate-400 block mb-1">Review Notes:</span>
                        <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 italic">
                          {selectedLeave.reviewNotes ? `"${selectedLeave.reviewNotes}"` : 'No reviewer notes added.'}
                        </div>
                      </div>
                      {selectedLeave.editNotes && (
                        <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
                          <span className="font-medium text-slate-500 dark:text-slate-400 block mb-1">Admin Update Note:</span>
                          <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-blue-800 dark:text-blue-300 italic">
                            &ldquo;{selectedLeave.editNotes}&rdquo;
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                {selectedLeave.status === 'PENDING' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    isLoading={cancellingId === selectedLeave._id}
                    onClick={() => handleCancelPendingLeave(selectedLeave._id)}
                    className="text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel Request
                  </Button>
                ) : (
                  <span />
                )}
                <Button variant="outline" size="sm" onClick={() => setSelectedLeave(null)}>
                  Close
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal: Apply for Leave */}

        <Modal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          title="Apply for Leave"
          description="Submit a planned leave request to your manager."
        >
          <form onSubmit={handleApplyLeave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => {
                    const nextStart = e.target.value;
                    setForm({
                      ...form,
                      startDate: nextStart,
                      endDate: form.endDate < nextStart ? nextStart : form.endDate,
                    });
                  }}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  min={form.startDate}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {getLeaveDays(form.startDate, form.endDate) > 0 && (
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/70 px-3 py-1.5 rounded-lg inline-block">
                Duration: <strong>{getLeaveDays(form.startDate, form.endDate)} Day(s)</strong>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                Leave Type *
              </label>
              <select
                value={form.leaveType}
                onChange={(e) => setForm({ ...form, leaveType: e.target.value as LeaveType })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="CASUAL">Casual Leave</option>
                <option value="SICK">Sick Leave</option>
                <option value="EMERGENCY">Emergency Leave</option>
                <option value="UNPAID">Unpaid Leave</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                Reason *
              </label>
              <textarea
                required
                rows={3}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Please state the purpose of your leave"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsApplyModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isSubmitting} className="font-semibold">
                Submit Application
              </Button>
            </div>
          </form>
        </Modal>
      </main>

      <MobileNav />
    </div>
  );
}



