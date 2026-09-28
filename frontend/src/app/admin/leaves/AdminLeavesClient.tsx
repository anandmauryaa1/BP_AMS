'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import {
  CalendarOff,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  AlertCircle,
  RefreshCw,
  Plus,
  Search,
  Check,
  X,
  FileText,
} from 'lucide-react';

import { formatDate } from '@/lib/utils';

interface Props {
  initialLeaves?: any[];
  initialEmployees?: any[];
}

export default function AdminLeavesClient({ initialLeaves = [], initialEmployees = [] }: Props) {
  const [leaves, setLeaves] = useState<any[]>(initialLeaves);
  const [employees, setEmployees] = useState<any[]>(initialEmployees);
  const [loading, setLoading] = useState(initialLeaves.length === 0);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Review / Create Modal States
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [reviewingLeave, setReviewingLeave] = useState<any | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Apply Leave Form
  const [applyForm, setApplyForm] = useState({
    employeeId: '',
    type: 'CASUAL',
    startDate: '',
    endDate: '',
    reason: '',
    status: 'APPROVED',
  });

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [leaveRes, empRes] = await Promise.all([
        fetch('/api/leaves', { headers: authHeaders, credentials: 'include' }),
        fetch('/api/admin/employees', { headers: authHeaders, credentials: 'include' }),
      ]);

      const leaveData = await leaveRes.json();
      const empData = await empRes.json();

      const foundLeaves = Array.isArray(leaveData.data)
        ? leaveData.data
        : (leaveData.data?.leaves || leaveData.leaves || []);
      const foundEmps = Array.isArray(empData.data)
        ? empData.data
        : (empData.data?.employees || empData.employees || []);

      setLeaves(foundLeaves);
      setEmployees(foundEmps);
    } catch (err) {
      console.error('Failed to load leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleAction = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setActionLoading(leaveId);
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`/api/leaves/${leaveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify({ status, reviewNotes }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update leave status');
      }

      setLeaves((prev) =>
        prev.map((l) => (l._id === leaveId ? { ...l, status, reviewNotes } : l))
      );
      setReviewingLeave(null);
      setReviewNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to update leave status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyForm.employeeId) {
      setError('Please select an employee');
      return;
    }
    if (!applyForm.startDate || !applyForm.endDate) {
      setError('Start and end dates are required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const selectedEmp = employees.find((emp) => emp._id === applyForm.employeeId || emp.employeeId === applyForm.employeeId);
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify({
          ...applyForm,
          leaveType: applyForm.type,
          type: applyForm.type,
          employeeId: selectedEmp?.employeeId || applyForm.employeeId,
          employeeName: selectedEmp?.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply leave');

      setIsApplyModalOpen(false);
      setApplyForm({
        employeeId: '',
        type: 'CASUAL',
        startDate: '',
        endDate: '',
        reason: '',
        status: 'APPROVED',
      });
      await fetchLeaves();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredLeaves = leaves.filter((l) => {
    if (filter !== 'ALL' && l.status !== filter) return false;
    if (typeFilter !== 'ALL' && l.type !== typeFilter && l.leaveType !== typeFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const empName = (l.userId?.name || l.employeeName || '').toLowerCase();
      const empId = (l.userId?.employeeId || l.employeeId || '').toLowerCase();
      const reason = l.reason?.toLowerCase() || '';
      if (!empName.includes(q) && !empId.includes(q) && !reason.includes(q)) return false;
    }

    return true;
  });

  const pendingCount = leaves.filter((l) => l.status === 'PENDING').length;
  const approvedCount = leaves.filter((l) => l.status === 'APPROVED').length;
  const rejectedCount = leaves.filter((l) => l.status === 'REJECTED').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarOff className="w-6 h-6 text-rose-600 dark:text-red-500" />
              Leave Management
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Review crew time-off requests, authorize leave, and prevent shoot bottlenecks.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => { setError(null); setIsApplyModalOpen(true); }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              Record Leave
            </button>
            <button
              onClick={fetchLeaves}
              className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition shadow-sm"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase">Pending Review</div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{pendingCount}</div>
            </div>
            <Clock className="w-6 h-6 text-amber-500/60" />
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase">Approved</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{approvedCount}</div>
            </div>
            <CheckCircle className="w-6 h-6 text-emerald-500/60" />
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-rose-600 dark:text-red-400 uppercase">Rejected</div>
              <div className="text-xl font-bold text-rose-600 dark:text-red-400 mt-0.5">{rejectedCount}</div>
            </div>
            <XCircle className="w-6 h-6 text-rose-500/60" />
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase">Total Requests</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{leaves.length}</div>
            </div>
            <CalendarOff className="w-6 h-6 text-slate-400 dark:text-zinc-600" />
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white dark:bg-zinc-900/50 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search by employee name, ID, or leave reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl">
              {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    filter === st
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-300 text-xs focus:outline-none focus:border-rose-500"
            >
              <option value="ALL">All Types</option>
              <option value="CASUAL">Casual</option>
              <option value="SICK">Sick</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="UNPAID">Unpaid</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-100 dark:bg-zinc-900/40 rounded-xl border border-slate-200 dark:border-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900/40 rounded-2xl border border-slate-200 dark:border-zinc-800 p-12 text-center text-slate-500 dark:text-zinc-500 shadow-sm">
            <CalendarOff className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
            <p className="text-base font-medium text-slate-700 dark:text-zinc-400">No leave requests found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLeaves.map((leave) => (
              <div
                key={leave._id}
                className="p-5 rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-zinc-100 text-sm flex items-center gap-1.5">
                      <User className="w-4 h-4 text-rose-600 dark:text-red-500" />
                      {leave.userId?.name || leave.employeeName || 'Staff Member'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-500">
                      ({leave.userId?.employeeId || leave.employeeId})
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-400 font-mono font-medium">
                      {leave.leaveType || leave.type}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        leave.status === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : leave.status === 'REJECTED'
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {leave.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-zinc-300">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                      {formatDate(leave.startDate)} -&gt;{' '}
                      {formatDate(leave.endDate)}
                    </span>
                    <span>
                      Reason: <b className="text-slate-800 dark:text-zinc-300 font-normal">{leave.reason}</b>
                    </span>
                  </div>
                </div>

                {leave.status === 'PENDING' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      disabled={actionLoading === leave._id}
                      onClick={() => handleAction(leave._id, 'APPROVED')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition disabled:opacity-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      disabled={actionLoading === leave._id}
                      onClick={() => handleAction(leave._id, 'REJECTED')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-red-600 dark:text-red-400 text-xs font-semibold border border-slate-200 dark:border-zinc-700 transition disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Record Leave Modal (Admin on behalf of Employee) */}
        {isApplyModalOpen && (
          <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarOff className="w-5 h-5 text-rose-600 dark:text-red-500" />
                  Record Staff Leave
                </h3>
                <button
                  onClick={() => setIsApplyModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleApplyLeave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                    Employee
                  </label>
                  <select
                    required
                    value={applyForm.employeeId}
                    onChange={(e) => setApplyForm({ ...applyForm, employeeId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500"
                  >
                    <option value="">Select Employee...</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Leave Type
                    </label>
                    <select
                      value={applyForm.type}
                      onChange={(e) => setApplyForm({ ...applyForm, type: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500"
                    >
                      <option value="CASUAL">Casual Leave</option>
                      <option value="SICK">Sick Leave</option>
                      <option value="EMERGENCY">Emergency</option>
                      <option value="UNPAID">Unpaid Leave</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Status
                    </label>
                    <select
                      value={applyForm.status}
                      onChange={(e) => setApplyForm({ ...applyForm, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500"
                    >
                      <option value="APPROVED">Approved</option>
                      <option value="PENDING">Pending</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={applyForm.startDate}
                      onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={applyForm.endDate}
                      onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                    Reason / Notes
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Provide reason for time-off..."
                    value={applyForm.reason}
                    onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsApplyModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-medium transition shadow-md shadow-rose-600/20"
                  >
                    {saving ? 'Recording...' : 'Record Leave'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

