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
import { Palmtree, Plus, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { ILeaveRequest, LeaveType, SessionPayload } from '@/types';

export default function EmployeeLeavesPage() {
  const [user, setUser] = useState<SessionPayload | null>(null);
  const [leaves, setLeaves] = useState<ILeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
    setIsLoading(true);
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (meData.success) setUser(meData.data);

      const res = await fetch('/api/leaves');
      const data = await res.json();
      if (data.success) {
        setLeaves(data.data.leaves || []);
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
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Failed to submit leave request', 'error');
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
              <Card key={leave._id} className="p-4 border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                    {leave.startDate} {leave.startDate !== leave.endDate && `→ ${leave.endDate}`}
                  </span>
                  <Badge status={leave.status as any} />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                    {leave.leaveType}
                  </span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
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
                    <tr key={leave._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100 font-mono">
                        {leave.startDate} {leave.startDate !== leave.endDate && `to ${leave.endDate}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                          {leave.leaveType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate">{leave.reason}</td>
                      <td className="py-3.5 px-4">
                        <Badge status={leave.status as any} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 italic text-[11px]">
                        {leave.reviewNotes ? `"${leave.reviewNotes}" by ${leave.reviewedBy}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{formatDate(leave.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

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
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
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
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

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

