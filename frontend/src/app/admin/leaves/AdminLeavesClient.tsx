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
  X,
  Pencil,
  Trash2,
  Mail,
  History,
  LayoutList,
} from 'lucide-react';

import { formatDate } from '@/lib/utils';
import { LeaveCalendarView } from '@/components/leaves/LeaveCalendarView';

interface Props {
  initialLeaves?: any[];
  initialEmployees?: any[];
}

type FilterTab = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL' | 'DELETED';

interface LeaveFormState {
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  reviewNotes: string;
  editNotes: string;
}

const DEFAULT_FORM: LeaveFormState = {
  employeeId: '',
  type: 'CASUAL',
  startDate: '',
  endDate: '',
  reason: '',
  status: 'APPROVED',
  reviewNotes: '',
  editNotes: '',
};

const QUICK_DELETE_REASONS = [
  'Created by mistake',
  'Duplicate leave entry',
  'Wrong dates selected',
  'Employee worked on these dates',
];

function calculateLeaveDays(startDate: string, endDate: string): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return null;
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AdminLeavesClient({ initialLeaves = [], initialEmployees = [] }: Props) {
  const [leaves, setLeaves] = useState<any[]>(initialLeaves);
  const [employees, setEmployees] = useState<any[]>(initialEmployees);
  const [loading, setLoading] = useState(initialLeaves.length === 0);
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  const [filter, setFilter] = useState<FilterTab>('PENDING');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create / Edit Modal States
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT' | null>(null);
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  const [leaveForm, setLeaveForm] = useState<LeaveFormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail / Review Modal
  const [selectedLeave, setSelectedLeave] = useState<any | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deletionReason, setDeletionReason] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast Feedback
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const authHeaders = getAuthHeaders();

      const [leaveRes, empRes] = await Promise.all([
        fetch('/api/leaves?includeDeleted=true', { headers: authHeaders, credentials: 'include' }),
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

    const openCreateModal = (presetDate?: string) => {
      setError(null);
      setEditingLeaveId(null);
      setLeaveForm({
        ...DEFAULT_FORM,
        startDate: presetDate || '',
        endDate: presetDate || '',
      });
      setModalMode('CREATE');
    };

    const openEditModal = (leave: any) => {
      const matchedEmp = employees.find(
        (e) =>
          String(e._id) === String(leave.employeeId) ||
          String(e.employeeId) === String(leave.employeeId) ||
          String(e.username) === String(leave.employeeId)
      );
      setError(null);
      setEditingLeaveId(leave._id);
      setLeaveForm({
        employeeId: matchedEmp?._id || leave.employeeId || '',
        type: leave.leaveType || leave.type || 'CASUAL',
        startDate: leave.startDate ? String(leave.startDate).slice(0, 10) : '',
        endDate: leave.endDate ? String(leave.endDate).slice(0, 10) : '',
        reason: leave.reason || '',
        status: leave.status || 'APPROVED',
        reviewNotes: leave.reviewNotes || '',
        editNotes: '',
      });
      setSelectedLeave(null);
      setModalMode('EDIT');
    };

    const openDeleteModal = (leave: any) => {
      setDeleteError(null);
      setDeletionReason('');
      setSelectedLeave(null);
      setDeleteTarget(leave);
    };

    const handleAction = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
      try {
        setActionLoading(leaveId);
        const res = await fetch(`/api/leaves/${leaveId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          credentials: 'include',
          body: JSON.stringify({ status, reviewNotes }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || data.message || 'Failed to update leave status');
        }

        setLeaves((prev) =>
          prev.map((l) => (l._id === leaveId ? { ...l, ...(data.data || {}), status, reviewNotes } : l))
        );
        setSelectedLeave(null);
        setReviewNotes('');
        showToast(data.message || `Leave marked as ${status} and employee emailed.`);
      } catch (err: any) {
        showToast(err.message || 'Failed to update leave status', 'error');
      } finally {
        setActionLoading(null);
      }
    };

    const handleSubmitLeaveForm = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!leaveForm.employeeId) {
        setError('Please select an employee');
        return;
      }
      if (!leaveForm.startDate || !leaveForm.endDate) {
        setError('Start and end dates are required');
        return;
      }
      if (leaveForm.endDate < leaveForm.startDate) {
        setError('End date cannot be earlier than start date');
        return;
      }
      if (!leaveForm.reason.trim()) {
        setError('Reason is required');
        return;
      }

      setSaving(true);
      setError(null);
      try {
        const selectedEmp = employees.find(
          (emp) => emp._id === leaveForm.employeeId || emp.employeeId === leaveForm.employeeId
        );

        const payload: Record<string, any> = {
          employeeId: selectedEmp?.employeeId || leaveForm.employeeId,
          employeeName: selectedEmp?.name,
          leaveType: leaveForm.type,
          type: leaveForm.type,
          startDate: leaveForm.startDate,
          endDate: leaveForm.endDate,
          reason: leaveForm.reason.trim(),
          status: leaveForm.status,
          reviewNotes: leaveForm.reviewNotes.trim(),
        };

        if (modalMode === 'EDIT' && leaveForm.editNotes.trim()) {
          payload.editNotes = leaveForm.editNotes.trim();
        }

        const url = modalMode === 'EDIT' && editingLeaveId ? `/api/leaves/${editingLeaveId}` : '/api/leaves';
        const method = modalMode === 'EDIT' ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Failed to ${modalMode === 'EDIT' ? 'update' : 'record'} leave`);
        }

        setModalMode(null);
        setEditingLeaveId(null);
        setLeaveForm(DEFAULT_FORM);
        await fetchLeaves();
        showToast(
          data.message ||
          (modalMode === 'EDIT'
            ? 'Leave updated and reminder email sent to employee.'
            : 'Leave recorded and reminder email sent to employee.')
        );
      } catch (err: any) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    };

    const handleConfirmDelete = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!deleteTarget) return;

      const trimmed = deletionReason.trim();
      if (trimmed.length < 3) {
        setDeleteError('Please write a short message (at least 3 characters) explaining what happened.');
        return;
      }

      setDeleting(true);
      setDeleteError(null);
      try {
        const res = await fetch(`/api/leaves/${deleteTarget._id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          credentials: 'include',
          body: JSON.stringify({ deletionReason: trimmed }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to remove leave');
        }

        setDeleteTarget(null);
        setDeletionReason('');
        await fetchLeaves();
        showToast(data.message || 'Leave removed with reason logged and employee notified via email.');
      } catch (err: any) {
        setDeleteError(err.message);
      } finally {
        setDeleting(false);
      }
    };

    const activeLeaves = leaves.filter((l) => !l.isDeleted);
    const deletedLeaves = leaves.filter((l) => Boolean(l.isDeleted));

    const filteredLeaves = leaves.filter((l) => {
      if (filter === 'DELETED') {
        if (!l.isDeleted) return false;
      } else {
        if (l.isDeleted) return false;
        if (filter !== 'ALL' && l.status !== filter) return false;
      }

      if (typeFilter !== 'ALL' && l.type !== typeFilter && l.leaveType !== typeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const empName = (l.userId?.name || l.employeeName || '').toLowerCase();
        const empId = (l.userId?.employeeId || l.employeeId || '').toLowerCase();
        const reason = (l.reason || '').toLowerCase();
        const delMsg = (l.deletionReason || '').toLowerCase();
        if (!empName.includes(q) && !empId.includes(q) && !reason.includes(q) && !delMsg.includes(q)) {
          return false;
        }
      }

      return true;
    });

    const pendingCount = activeLeaves.filter((l) => l.status === 'PENDING').length;
    const approvedCount = activeLeaves.filter((l) => l.status === 'APPROVED').length;
    const rejectedCount = activeLeaves.filter((l) => l.status === 'REJECTED').length;
    const formDaysCount = calculateLeaveDays(leaveForm.startDate, leaveForm.endDate);

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col transition-colors">
        <Navbar />
        <AdminNav />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Toast Banner */}
          {toast && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-sm ${toast.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                }`}
            >
              <div className="flex items-center gap-2">
                {toast.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{toast.text}</span>
              </div>
              <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarOff className="w-6 h-6 text-rose-600 dark:text-red-500" />
                Leave Management
              </h1>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                Create, edit, approve, or remove mistaken leaves — automatic email updates sent to staff.
              </p>
            </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* List vs Calendar Switcher */}
                <div className="flex items-center p-1 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setViewMode('LIST')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode === 'LIST'
                        ? 'bg-slate-900 dark:bg-zinc-800 text-white shadow-sm'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (filter === 'DELETED' || (filter === 'PENDING' && pendingCount === 0)) {
                        setFilter('ALL');
                      }
                      setViewMode('CALENDAR');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode === 'CALENDAR'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Calendar
                  </button>
                </div>

                <button
                  onClick={() => openCreateModal()}
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
                  <div className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase">Active Leaves</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{activeLeaves.length}</div>
                </div>
                <CalendarOff className="w-6 h-6 text-slate-400 dark:text-zinc-600" />
              </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="bg-white dark:bg-zinc-900/50 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search by employee name, ID, reason, or deletion note..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center p-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl gap-0.5">
                  {(['PENDING', 'APPROVED', 'REJECTED', 'ALL', 'DELETED'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setFilter(st);
                        if (st === 'DELETED') setViewMode('LIST');
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${filter === st
                          ? st === 'DELETED'
                            ? 'bg-zinc-800 dark:bg-zinc-700 text-white shadow-sm'
                            : 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      {st === 'DELETED' && <History className="w-3 h-3" />}
                      <span>{st}</span>
                      {st === 'DELETED' && deletedLeaves.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0 rounded-full bg-rose-500/20 text-rose-400 font-mono">
                          {deletedLeaves.length}
                        </span>
                      )}
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

            {/* Requests List or Interactive Calendar */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-slate-100 dark:bg-zinc-900/40 rounded-xl border border-slate-200 dark:border-zinc-800 animate-pulse" />
                ))}
              </div>
            ) : viewMode === 'CALENDAR' ? (
              <LeaveCalendarView
                leaves={filteredLeaves}
                onSelectDateToCreate={(dateStr) => openCreateModal(dateStr)}
                onSelectLeave={(leave) => setSelectedLeave(leave)}
              />
            ) : filteredLeaves.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900/40 rounded-2xl border border-slate-200 dark:border-zinc-800 p-12 text-center text-slate-500 dark:text-zinc-500 shadow-sm">
                <CalendarOff className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
                <p className="text-base font-medium text-slate-700 dark:text-zinc-400">
                  {filter === 'DELETED' ? 'No deleted leave records found.' : 'No leave requests found.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLeaves.map((leave) => (
                  <div
                    key={leave._id}
                    onClick={() => setSelectedLeave(leave)}
                    className={`p-4 sm:p-5 rounded-xl bg-white dark:bg-zinc-900/50 border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm cursor-pointer hover:shadow-md transition-all ${leave.isDeleted
                        ? 'border-rose-200/80 dark:border-rose-900/40 opacity-90'
                        : 'border-slate-200 dark:border-zinc-800/80 hover:border-rose-400 dark:hover:border-rose-500/50'
                      }`}
                  >
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-zinc-100 text-sm flex items-center gap-1.5">
                          <User className="w-4 h-4 text-rose-600 dark:text-red-500 shrink-0" />
                          {leave.userId?.name || leave.employeeName || 'Staff Member'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-500">
                          ({leave.userId?.employeeId || leave.employeeId})
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-400 font-mono font-medium">
                          {leave.leaveType || leave.type}
                        </span>
                        {leave.isDeleted ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border-zinc-500/20">
                            DELETED
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${leave.status === 'APPROVED'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : leave.status === 'REJECTED'
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                                  : leave.status === 'CANCELLED'
                                    ? 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              }`}
                          >
                            {leave.status}
                          </span>
                        )}
                        {leave.updatedBy && !leave.isDeleted && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
                            Edited by {leave.updatedBy}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-zinc-300">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                          {formatDate(leave.startDate)} -&gt; {formatDate(leave.endDate)}
                        </span>
                        <span className="truncate max-w-md">
                          Reason: <b className="text-slate-800 dark:text-zinc-300 font-normal">{leave.reason}</b>
                        </span>
                      </div>

                      {leave.isDeleted && leave.deletionReason && (
                        <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300">
                          <span className="font-semibold">Why deleted:</span> &ldquo;{leave.deletionReason}&rdquo;
                          <span className="text-[11px] text-rose-500 dark:text-rose-400 ml-2">
                            — Removed by {leave.deletedBy || 'Admin'}
                            {leave.deletedAt ? ` on ${formatDate(leave.deletedAt)}` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Controls */}
                    {!leave.isDeleted ? (
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {leave.status === 'PENDING' && (
                          <>
                            <button
                              disabled={actionLoading === leave._id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAction(leave._id, 'APPROVED');
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              disabled={actionLoading === leave._id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAction(leave._id, 'REJECTED');
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-red-600 dark:text-red-400 text-xs font-semibold border border-slate-200 dark:border-zinc-700 transition disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(leave);
                          }}
                          title="Edit leave"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-zinc-700 text-xs font-medium transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal(leave);
                          }}
                          title="Delete mistaken leave"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-zinc-700 text-xs font-medium transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-zinc-400 font-semibold shrink-0">
                        View Log &rarr;
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Selected Leave Detail / Review Modal */}
            {selectedLeave && (
              <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-5 shadow-2xl my-4 max-h-[92vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <User className="w-5 h-5 text-rose-600 dark:text-red-500" />
                        {selectedLeave.userId?.name || selectedLeave.employeeName || 'Staff Member'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                        Employee ID: {selectedLeave.userId?.employeeId || selectedLeave.employeeId}
                      </p>
                    </div>
                    <button
                      onClick={() => { setSelectedLeave(null); setReviewNotes(''); }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                      <span className="font-semibold text-slate-600 dark:text-zinc-400">Leave Type:</span>
                      <span className="font-mono font-bold px-2.5 py-1 rounded bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300">
                        {selectedLeave.leaveType || selectedLeave.type || 'CASUAL'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                        <span className="text-[11px] text-slate-400 font-medium block mb-1 uppercase">Start Date</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                          {formatDate(selectedLeave.startDate)}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                        <span className="text-[11px] text-slate-400 font-medium block mb-1 uppercase">End Date</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                          {formatDate(selectedLeave.endDate)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-600 dark:text-zinc-400 uppercase block mb-1">Reason for Leave</span>
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                        {selectedLeave.reason || 'No reason provided.'}
                      </div>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-600 dark:text-zinc-400 uppercase block mb-1">Status & Audit Info</span>
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Status:</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {selectedLeave.isDeleted ? 'DELETED' : selectedLeave.status}
                          </span>
                        </div>
                        {selectedLeave.reviewedBy && (
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Reviewed By:</span>
                            <span className="font-semibold text-slate-800 dark:text-zinc-200">
                              {employees?.find(e => String(e._id) === String(selectedLeave.reviewedBy) || String(e.employeeId) === String(selectedLeave.reviewedBy) || String(e.username) === String(selectedLeave.reviewedBy))?.name || selectedLeave.reviewedBy}
                            </span>
                          </div>
                        )}
                        {selectedLeave.updatedBy && (
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Last Edited By:</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedLeave.updatedBy}</span>
                          </div>
                        )}
                        {selectedLeave.reviewNotes && (
                          <div className="pt-2 border-t border-slate-200 dark:border-zinc-800">
                            <span className="text-slate-500 block mb-1">Review Notes:</span>
                            <p className="italic text-slate-700 dark:text-zinc-300">&ldquo;{selectedLeave.reviewNotes}&rdquo;</p>
                          </div>
                        )}
                        {selectedLeave.editNotes && (
                          <div className="pt-2 border-t border-slate-200 dark:border-zinc-800">
                            <span className="text-slate-500 block mb-1">Edit Note:</span>
                            <p className="italic text-blue-700 dark:text-blue-300">&ldquo;{selectedLeave.editNotes}&rdquo;</p>
                          </div>
                        )}
                        {selectedLeave.isDeleted && (
                          <div className="pt-2 border-t border-rose-200 dark:border-rose-900/50 space-y-1">
                            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                              <span>Deleted By:</span>
                              <span className="font-semibold">{selectedLeave.deletedBy || 'Admin'}</span>
                            </div>
                            {selectedLeave.deletionReason && (
                              <div>
                                <span className="text-rose-500 block mb-0.5">What happened:</span>
                                <p className="font-medium text-rose-700 dark:text-rose-300">&ldquo;{selectedLeave.deletionReason}&rdquo;</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {!selectedLeave.isDeleted && selectedLeave.status === 'PENDING' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                          Add Reviewer Notes (Optional)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Provide reason for approval or rejection..."
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500 resize-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => { setSelectedLeave(null); setReviewNotes(''); }}
                      className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-medium transition"
                    >
                      Close
                    </button>

                    {!selectedLeave.isDeleted && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(selectedLeave)}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(selectedLeave)}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                        {selectedLeave.status === 'PENDING' && (
                          <>
                            <button
                              disabled={actionLoading === selectedLeave._id}
                              onClick={() => handleAction(selectedLeave._id, 'REJECTED')}
                              className="px-3.5 py-2 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 text-xs font-semibold border border-red-500/20 transition disabled:opacity-50"
                            >
                              Reject Leave
                            </button>
                            <button
                              disabled={actionLoading === selectedLeave._id}
                              onClick={() => handleAction(selectedLeave._id, 'APPROVED')}
                              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
                            >
                              Approve Leave
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Unified Create / Edit Leave Modal */}
            {modalMode && (
              <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl my-4 max-h-[92vh] overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {modalMode === 'EDIT' ? (
                        <Pencil className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <CalendarOff className="w-5 h-5 text-rose-600 dark:text-red-500" />
                      )}
                      {modalMode === 'EDIT' ? 'Edit Employee Leave' : 'Record Staff Leave'}
                    </h3>
                    <button
                      onClick={() => setModalMode(null)}
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

                  <form onSubmit={handleSubmitLeaveForm} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                        Employee
                      </label>
                      <select
                        required
                        value={leaveForm.employeeId}
                        onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}
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
                          value={leaveForm.type}
                          onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
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
                          value={leaveForm.status}
                          onChange={(e) => setLeaveForm({ ...leaveForm, status: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500"
                        >
                          <option value="APPROVED">Approved</option>
                          <option value="PENDING">Pending</option>
                          <option value="REJECTED">Rejected</option>
                          {modalMode === 'EDIT' && <option value="CANCELLED">Cancelled</option>}
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
                          value={leaveForm.startDate}
                          onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
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
                          value={leaveForm.endDate}
                          onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500"
                        />
                      </div>
                    </div>

                    {formDaysCount !== null && (
                      <div className="text-[11px] font-mono text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800/70 px-3 py-1.5 rounded-lg inline-block">
                        Duration: <strong>{formDaysCount} {formDaysCount === 1 ? 'day' : 'days'}</strong>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                        Reason / Notes
                      </label>
                      <textarea
                        rows={2}
                        required
                        placeholder="Provide reason for time-off..."
                        value={leaveForm.reason}
                        onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                        Admin / Review Notes (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Optional notes included in leave record..."
                        value={leaveForm.reviewNotes}
                        onChange={(e) => setLeaveForm({ ...leaveForm, reviewNotes: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    {modalMode === 'EDIT' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                          What changed? (Optional short note for employee)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Adjusted end date per schedule update"
                          value={leaveForm.editNotes}
                          onChange={(e) => setLeaveForm({ ...leaveForm, editNotes: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500"
                        />
                      </div>
                    )}

                    <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span>An automatic email notification/reminder will be sent to the employee.</span>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setModalMode(null)}
                        className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-sm font-medium transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-medium transition shadow-md shadow-rose-600/20"
                      >
                        {saving
                          ? modalMode === 'EDIT' ? 'Saving...' : 'Recording...'
                          : modalMode === 'EDIT' ? 'Save Changes & Email' : 'Record Leave & Email'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Delete Mistaken Leave Modal (Mandatory Short Message) */}
            {deleteTarget && (
              <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl my-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                      Delete Mistaken Leave
                    </h3>
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs space-y-1">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {deleteTarget.userId?.name || deleteTarget.employeeName} ({deleteTarget.employeeId})
                    </div>
                    <div className="text-slate-500 dark:text-zinc-400 font-mono">
                      {deleteTarget.leaveType || deleteTarget.type} &bull; {formatDate(deleteTarget.startDate)} -&gt; {formatDate(deleteTarget.endDate)} &bull; {deleteTarget.status}
                    </div>
                  </div>

                  {deleteError && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{deleteError}</span>
                    </div>
                  )}

                  <form onSubmit={handleConfirmDelete} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1.5">
                        Short Message (What Happened?) <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {QUICK_DELETE_REASONS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setDeletionReason(preset)}
                            className={`px-2 py-1 rounded-md text-[11px] font-medium border transition ${deletionReason === preset
                                ? 'bg-rose-600 text-white border-rose-600'
                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-rose-400'
                              }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                      <textarea
                        rows={3}
                        required
                        placeholder="Explain briefly why this leave is being removed (e.g. 'Created by mistake for wrong dates')..."
                        value={deletionReason}
                        onChange={(e) => setDeletionReason(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500 resize-none"
                      />
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span>This will remove the leave from active counts/payroll and email the employee with your explanation.</span>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(null)}
                        className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-sm font-medium transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={deleting}
                        className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold transition shadow-md shadow-rose-600/20"
                      >
                        {deleting ? 'Deleting...' : 'Confirm Delete & Email'}
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
