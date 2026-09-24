'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatTime, formatMinutes, formatDate, getTodayDateString } from '@/lib/utils';
import {
  Calendar,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileCheck2,
  Edit,
  Filter,
  Check,
} from 'lucide-react';
import { AttendanceStatus, IAttendance } from '@/types';

export default function AdminAttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<string>(getTodayDateString());
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Manual Edit Modal State
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>('PRESENT');
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editReason, setEditReason] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Correction Review Modal State
  const [reviewingRecord, setReviewingRecord] = useState<any | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = `/api/admin/attendance?limit=100`;
      if (dateFilter) url += `&date=${dateFilter}`;
      if (departmentFilter !== 'ALL') url += `&department=${departmentFilter}`;
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      if (search) url += `&employeeId=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data.records || []);
      }
    } catch (err) {
      console.error('Error fetching admin attendance:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter, departmentFilter, statusFilter, search]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const openManualEdit = (rec: any) => {
    setEditingRecord(rec);
    setEditStatus(rec.status);
    setEditCheckIn(rec.checkIn ? new Date(rec.checkIn).toISOString().slice(0, 16) : '');
    setEditCheckOut(rec.checkOut ? new Date(rec.checkOut).toISOString().slice(0, 16) : '');
    setEditReason('');
  };

  const handleManualEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setIsSubmittingEdit(true);

    try {
      const res = await fetch('/api/admin/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId: editingRecord._id,
          status: editStatus,
          checkIn: editCheckIn ? new Date(editCheckIn).toISOString() : null,
          checkOut: editCheckOut ? new Date(editCheckOut).toISOString() : null,
          reason: editReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Failed to update attendance', 'error');
        setIsSubmittingEdit(false);
        return;
      }

      showToast('Attendance record corrected and audited successfully', 'success');
      setEditingRecord(null);
      fetchRecords();
    } catch {
      showToast('Network error saving correction', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const openReviewModal = (rec: any, decision: 'APPROVE' | 'REJECT') => {
    setReviewingRecord(rec);
    setReviewDecision(decision);
    setReviewNotes('');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingRecord) return;
    setIsSubmittingReview(true);

    try {
      const res = await fetch(`/api/admin/attendance/correction/${reviewingRecord._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: reviewDecision,
          reviewNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Failed to process correction review', 'error');
        setIsSubmittingReview(false);
        return;
      }

      showToast(`Correction request ${reviewDecision.toLowerCase()}d successfully`, 'success');
      setReviewingRecord(null);
      fetchRecords();
    } catch {
      showToast('Network error processing review', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const pendingCorrections = records.filter((r) => r.correction && r.correction.status === 'PENDING');

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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors">
      <Navbar />
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`fixed top-20 right-4 z-50 p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-3 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : 'bg-rose-900 text-white border-rose-700'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Attendance Management
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Review records, process employee correction requests, and apply manual adjustments.
            </p>
          </div>
        </div>

        {/* Pending Corrections Alert Section */}
        {pendingCorrections.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300 text-xs uppercase tracking-wider mb-2">
              <FileCheck2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Pending Correction Requests ({pendingCorrections.length})
            </div>
            <div className="divide-y divide-amber-200/60 dark:divide-amber-800/40">
              {pendingCorrections.map((rec) => (
                <div
                  key={rec._id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {rec.employeeName} ({rec.employeeId}) &bull; {formatDate(rec.date)}
                    </div>
                    <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                      <span className="font-medium text-slate-700 dark:text-slate-200">Reason:</span> &ldquo;
                      {rec.correction.reason}&rdquo;
                    </div>
                    {(rec.correction.requestedCheckIn || rec.correction.requestedCheckOut) && (
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                        Requested: In: {formatTime(rec.correction.requestedCheckIn)} | Out:{' '}
                        {formatTime(rec.correction.requestedCheckOut)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => openReviewModal(rec, 'APPROVE')}
                      className="px-3 py-1 text-xs"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => openReviewModal(rec, 'REJECT')}
                      className="px-3 py-1 text-xs"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <Card className="border-slate-200 dark:border-slate-800 mb-6 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Filter Date
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Department
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d === 'ALL' ? 'All Departments' : d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Attendance Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">PRESENT</option>
                <option value="ON_BREAK">ON_BREAK</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="ABSENT">ABSENT</option>
                <option value="MISSED_CHECKOUT">MISSED_CHECKOUT</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Employee Search
              </label>
              <input
                type="text"
                placeholder="ID or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
        </Card>

        {/* Master Attendance Table */}
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Check In</th>
                  <th className="py-3 px-4">Check Out</th>
                  <th className="py-3 px-4">Working Time</th>
                  <th className="py-3 px-4">Break Time</th>
                  <th className="py-3 px-4">Correction</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3.5 px-4">
                        <Skeleton className="h-4 w-28 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-12" /></td>
                      <td className="py-3.5 px-4 text-right"><Skeleton className="h-4 w-10 ml-auto" /></td>
                    </tr>
                  ))
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      No attendance records found matching filters.
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr key={rec._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{rec.date}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{rec.employeeName}</div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{rec.employeeId}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                        {rec.department || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge status={rec.status} />
                        {rec.sessions && rec.sessions.length > 1 && (
                          <div className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-semibold mt-1">
                            {rec.sessions.length} Shift Sessions
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                        <div>{formatTime(rec.checkIn)}</div>
                        {rec.checkInLocation && (
                          <a
                            href={`https://www.google.com/maps?q=${rec.checkInLocation.latitude},${rec.checkInLocation.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5 mt-0.5"
                          >
                            GPS ({rec.checkInLocation.latitude.toFixed(2)}, {rec.checkInLocation.longitude.toFixed(2)})
                          </a>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                        <div>{formatTime(rec.checkOut)}</div>
                        {rec.checkOutLocation && (
                          <a
                            href={`https://www.google.com/maps?q=${rec.checkOutLocation.latitude},${rec.checkOutLocation.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5 mt-0.5"
                          >
                            GPS ({rec.checkOutLocation.latitude.toFixed(2)}, {rec.checkOutLocation.longitude.toFixed(2)})
                          </a>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {formatMinutes(rec.totalWorkingMinutes)}
                      </td>
                      <td className="py-3 px-4 font-mono text-amber-700 dark:text-amber-400">
                        {formatMinutes(rec.totalBreakMinutes)}
                      </td>
                      <td className="py-3 px-4">
                        {rec.correction ? (
                          <Badge status={rec.correction.status} />
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openManualEdit(rec)}
                          className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline inline-flex items-center gap-1"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Modal: Manual Admin Edit */}
        <Modal
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          title={`Manual Attendance Correction (${editingRecord?.employeeId} - ${editingRecord?.date})`}
          description="Directly override attendance record. An immutable audit log will be created."
        >
          {editingRecord && (
            <form onSubmit={handleManualEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-semibold"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="ON_BREAK">ON_BREAK</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="MISSED_CHECKOUT">MISSED_CHECKOUT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Check-In Timestamp
                </label>
                <input
                  type="datetime-local"
                  value={editCheckIn}
                  onChange={(e) => setEditCheckIn(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Check-Out Timestamp
                </label>
                <input
                  type="datetime-local"
                  value={editCheckOut}
                  onChange={(e) => setEditCheckOut(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Reason for Admin Adjustment *
                </label>
                <textarea
                  required
                  rows={2}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Employee forgot to checkout after late studio shoot"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingRecord(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isSubmittingEdit}>
                  Save Correction
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* Modal: Review Correction Request */}
        <Modal
          isOpen={!!reviewingRecord}
          onClose={() => setReviewingRecord(null)}
          title={`${reviewDecision === 'APPROVE' ? 'Approve' : 'Reject'} Correction Request`}
          description={`Review request from ${reviewingRecord?.employeeName} (${reviewingRecord?.date}).`}
        >
          {reviewingRecord && (
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs space-y-1">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Submitted Reason:</span> &ldquo;
                  {reviewingRecord.correction?.reason}&rdquo;
                </div>
                {reviewingRecord.correction?.requestedCheckIn && (
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Requested In:</span>{' '}
                    {formatTime(reviewingRecord.correction.requestedCheckIn)}
                  </div>
                )}
                {reviewingRecord.correction?.requestedCheckOut && (
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Requested Out:</span>{' '}
                    {formatTime(reviewingRecord.correction.requestedCheckOut)}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Admin Review Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Verified with camera operator"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setReviewingRecord(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant={reviewDecision === 'APPROVE' ? 'success' : 'danger'}
                  isLoading={isSubmittingReview}
                >
                  Confirm {reviewDecision === 'APPROVE' ? 'Approval' : 'Rejection'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </main>
    </div>
  );
}
