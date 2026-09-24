'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileNav } from '@/components/MobileNav';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { formatTime, formatMinutes, formatDate } from '@/lib/utils';
import { Calendar, Clock, Coffee, AlertCircle, FileEdit, Check, Filter } from 'lucide-react';
import { IAttendance, SessionPayload } from '@/types';

export default function EmployeeAttendancePage() {
  const [user, setUser] = useState<SessionPayload | null>(null);
  const [records, setRecords] = useState<IAttendance[]>([]);
  const [summary, setSummary] = useState({
    totalDays: 0,
    presentDays: 0,
    completedDays: 0,
    totalWorkingMinutes: 0,
    totalBreakMinutes: 0,
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Correction Modal State
  const [selectedRecord, setSelectedRecord] = useState<IAttendance | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [requestedCheckIn, setRequestedCheckIn] = useState('');
  const [requestedCheckOut, setRequestedCheckOut] = useState('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [correctionMessage, setCorrectionMessage] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (meData.success) setUser(meData.data);

      const res = await fetch(`/api/attendance/history?month=${selectedMonth}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data.records || []);
        if (data.data.summary) {
          setSummary(data.data.summary);
        }
      }
    } catch (err) {
      console.error('Error fetching attendance history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const openCorrectionModal = (record: IAttendance) => {
    setSelectedRecord(record);
    setCorrectionReason('');
    setRequestedCheckIn(
      record.checkIn ? new Date(record.checkIn).toISOString().slice(0, 16) : ''
    );
    setRequestedCheckOut(
      record.checkOut ? new Date(record.checkOut).toISOString().slice(0, 16) : ''
    );
    setCorrectionMessage(null);
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setIsSubmittingCorrection(true);
    setCorrectionMessage(null);

    try {
      const res = await fetch('/api/attendance/correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId: selectedRecord._id,
          reason: correctionReason,
          requestedCheckIn: requestedCheckIn ? new Date(requestedCheckIn).toISOString() : undefined,
          requestedCheckOut: requestedCheckOut ? new Date(requestedCheckOut).toISOString() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setCorrectionMessage(data.message || 'Failed to submit correction request');
        setIsSubmittingCorrection(false);
        return;
      }

      setCorrectionMessage('Correction request submitted for Admin review');
      setTimeout(() => {
        setSelectedRecord(null);
        fetchHistory();
      }, 1500);
    } catch {
      setCorrectionMessage('Error submitting correction');
      setIsSubmittingCorrection(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 md:pb-8 transition-colors">
      <Navbar user={user} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Page Header & Month Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Attendance History
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review your daily working shifts, break logs, and submit corrections.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm self-start sm:self-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-transparent border-none focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Monthly Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
          <Card className="p-4 border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Days Logged
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{summary.totalDays}</div>
          </Card>

          <Card className="p-4 border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Completed Shifts
            </span>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{summary.completedDays}</div>
          </Card>

          <Card className="p-4 border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Total Hours Worked
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {(summary.totalWorkingMinutes / 60).toFixed(1)} hrs
            </div>
          </Card>

          <Card className="p-4 border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Total Break Time
            </span>
            <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">
              {formatMinutes(summary.totalBreakMinutes)}
            </div>
          </Card>
        </div>

        {/* Mobile View: Dedicated Thumb-Friendly Cards (sm:hidden) */}
        <div className="sm:hidden space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <Card key={idx} className="p-4 border-slate-200 dark:border-slate-800 animate-pulse space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-40" />
              </Card>
            ))
          ) : records.length === 0 ? (
            <Card className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs border-slate-200 dark:border-slate-800">
              No attendance records found for {selectedMonth}.
            </Card>
          ) : (
            records.map((record) => (
              <Card key={record._id} className="p-4 border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {formatDate(record.date)}
                  </span>
                  <Badge status={record.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">In / Out</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {formatTime(record.checkIn)} - {formatTime(record.checkOut)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Worked</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatMinutes(record.totalWorkingMinutes)}
                    </span>
                    <span className="text-slate-400 text-[10px] ml-1">
                      ({formatMinutes(record.totalBreakMinutes)} brk)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    {record.correction ? (
                      <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                        Correction: <Badge status={record.correction.status} />
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Regular shift</span>
                    )}
                  </div>
                  <button
                    onClick={() => openCorrectionModal(record)}
                    className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/40 active:scale-95 transition-transform"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    Correct
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Desktop Attendance Records Table (hidden on mobile) */}
        <Card className="hidden sm:block border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Check In</th>
                  <th className="py-3 px-4">Check Out</th>
                  <th className="py-3 px-4">Worked</th>
                  <th className="py-3 px-4">Breaks</th>
                  <th className="py-3 px-4">Correction</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-12" /></td>
                      <td className="py-3.5 px-4 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                    </tr>
                  ))
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      No attendance records found for {selectedMonth}.
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {formatDate(record.date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge status={record.status} />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {formatTime(record.checkIn)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {formatTime(record.checkOut)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                        {formatMinutes(record.totalWorkingMinutes)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-amber-700 dark:text-amber-400">
                        {formatMinutes(record.totalBreakMinutes)}
                      </td>
                      <td className="py-3.5 px-4">
                        {record.correction ? (
                          <Badge status={record.correction.status} />
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openCorrectionModal(record)}
                          className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline inline-flex items-center gap-1"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          Correct
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Correction Request Modal */}
        <Modal
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title={`Request Correction (${selectedRecord?.date})`}
          description="Submit an attendance adjustment request to your administrator."
        >
          {selectedRecord && (
            <form onSubmit={handleCorrectionSubmit} className="space-y-4">
              {correctionMessage && (
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium">
                  {correctionMessage}
                </div>
              )}

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div className="text-slate-500 dark:text-slate-400">Current Logged Times:</div>
                <div className="font-mono text-slate-800 dark:text-slate-200">
                  In: {formatTime(selectedRecord.checkIn)} | Out: {formatTime(selectedRecord.checkOut)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Adjusted Check-In (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={requestedCheckIn}
                  onChange={(e) => setRequestedCheckIn(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Adjusted Check-Out (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={requestedCheckOut}
                  onChange={(e) => setRequestedCheckOut(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Reason for Correction *
                </label>
                <textarea
                  required
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Forgot to clock out before off-site shoot / network outage during morning check-in"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRecord(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isSubmittingCorrection}>
                  Submit Request
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </main>

      <MobileNav />
    </div>
  );
}

