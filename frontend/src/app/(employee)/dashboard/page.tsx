'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileNav } from '@/components/MobileNav';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { formatTime, formatMinutes, formatDate } from '@/lib/utils';
import {
  Clock,
  Play,
  Coffee,
  CheckCircle,
  AlertCircle,
  Timer,
  Check,
  Calendar,
  Layers,
  FolderGit2,
  CheckSquare,
  ArrowRightLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { AttendanceStatus, IBreak, IProject, ITask, IWorkSession, SessionPayload } from '@/types';

export default function EmployeeDashboard() {
  const [user, setUser] = useState<SessionPayload | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [liveStats, setLiveStats] = useState({
    activeBreakDurationMinutes: 0,
    currentWorkingMinutes: 0,
  });
  const [currentWorkSession, setCurrentWorkSession] = useState<IWorkSession | null>(null);
  const [activeProjects, setActiveProjects] = useState<IProject[]>([]);
  const [myQueue, setMyQueue] = useState<any[]>([]);
  const [myTasksToday, setMyTasksToday] = useState<ITask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Project Switch Modal State
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [switchNotes, setSwitchNotes] = useState('');

  // Update clock every second (client side)
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('auth_token') || localStorage.getItem('token')) : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Fetch user info
      const meRes = await fetch('/api/auth/me', { credentials: 'include', headers });
      const meData = await meRes.json();
      if (meData.success) {
        setUser(meData.data);
      }

      // 2. Fetch attendance state
      const attRes = await fetch('/api/attendance/today', { credentials: 'include', headers });
      const attData = await attRes.json();
      if (attData.success && attData.data) {
        setAttendance(attData.data.attendance || attData.data);
        if (attData.data.liveStats) {
          setLiveStats(attData.data.liveStats);
        }
      }

      // 3. Fetch current work session & active projects
      const wsRes = await fetch('/api/work-sessions/current', { credentials: 'include', headers });
      const wsData = await wsRes.json();
      if (wsData.success && wsData.data) {
        setCurrentWorkSession(wsData.data.currentSession || null);
        setActiveProjects(wsData.data.activeProjects || []);
      }

      // 4. Fetch daily plan queue & tasks
      const planRes = await fetch('/api/plans/daily', { credentials: 'include', headers });
      const planData = await planRes.json();
      if (planData.success && planData.data) {
        setMyQueue(planData.data.myQueue || []);
        setMyTasksToday(planData.data.myTasksToday || []);
      }
    } catch (err) {
      console.error('Error fetching employee dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleAttendanceAction = async (endpoint: string, actionName: string) => {
    setActionLoading(actionName);
    try {
      let bodyData: any = {};

      // If action is check-in or re-checkin, get browser GPS latitude and longitude
      if (actionName === 'check-in' || actionName === 're-checkin') {
        try {
          if (navigator.geolocation) {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
              });
            });
            bodyData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            };
          }
        } catch (geoErr) {
          console.warn('Geolocation capture skipped or denied:', geoErr);
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: Object.keys(bodyData).length > 0 ? JSON.stringify(bodyData) : JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Action failed', 'error');
      } else {
        showToast(data.message || 'Updated successfully', 'success');
        await fetchDashboardData();
      }
    } catch {
      showToast('Network error processing attendance action', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartOrSwitchProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      showToast('Please select a project to work on', 'error');
      return;
    }

    setActionLoading('project-switch');
    try {
      const endpoint = currentWorkSession ? '/api/work-sessions/switch' : '/api/work-sessions/start';
      const payload = currentWorkSession
        ? { newProjectId: selectedProjectId, notes: switchNotes }
        : { projectId: selectedProjectId, notes: switchNotes };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Failed to update work session', 'error');
      } else {
        showToast(data.message || 'Work session updated', 'success');
        setIsSwitchModalOpen(false);
        setSwitchNotes('');
        await fetchDashboardData();
      }
    } catch {
      showToast('Network error updating work session', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Task status updated to ${newStatus}`, 'success');
        fetchDashboardData();
      } else {
        showToast(data.message || 'Failed to update task', 'error');
      }
    } catch {
      showToast('Error updating task status', 'error');
    }
  };

  const currentStatus: AttendanceStatus = attendance?.status || 'NOT_CHECKED_IN';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar user={user} />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-[9999] animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/40'
                : 'bg-rose-600 text-white border-rose-500 shadow-rose-950/40'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-white shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-white shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-10">
        {/* Top Header Card */}
        <div className="bg-slate-900 dark:bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 shadow-sm text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60">
                  {user?.department || 'blindarea Production'}
                </span>
                {user?.employeeId && (
                  <span className="text-xs font-mono text-slate-400">ID: {user.employeeId}</span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold mt-1 text-white tracking-tight flex items-center gap-2">
                Good day, {user?.name ? user.name : <Skeleton className="h-7 w-40 bg-slate-700/70" />}
              </h1>
              <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5" suppressHydrationWarning>
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {currentTime ? formatDate(currentTime) : ''}
              </p>
            </div>

            {/* Live Studio Clock */}
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl px-4 py-3 text-right self-start sm:self-auto">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Studio Clock
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-rose-400 tracking-tight" suppressHydrationWarning>
                {currentTime ? currentTime.toLocaleTimeString('en-US', { hour12: true }) : '--:--:--'}
              </div>
            </div>
          </div>
        </div>

        {/* 1. Main Attendance Card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800 gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Shift Attendance Presence
                </span>
                <div className="mt-1 flex items-center gap-3">
                  <Badge status={currentStatus} className="text-sm px-3 py-1 font-bold" />
                  {currentStatus === 'PRESENT' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Actively On Shift
                    </span>
                  )}
                  {currentStatus === 'ON_BREAK' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full">
                      <Coffee className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
                      Break in Progress
                    </span>
                  )}
                  {currentStatus === 'COMPLETED' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2.5 py-1 rounded-full">
                      <Check className="w-3.5 h-3.5" />
                      Shift Completed
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons based on Attendance State */}
              <div className="flex flex-wrap items-center gap-3">
                {currentStatus === 'NOT_CHECKED_IN' && (
                  <Button
                    size="lg"
                    onClick={() => handleAttendanceAction('/api/attendance/check-in', 'check-in')}
                    isLoading={actionLoading === 'check-in'}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 px-8 py-3 text-sm font-bold gap-2"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    CHECK IN
                  </Button>
                )}

                {currentStatus === 'PRESENT' && (
                  <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => handleAttendanceAction('/api/attendance/break/start', 'start-break')}
                      isLoading={actionLoading === 'start-break'}
                      className="border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100/70 font-semibold gap-1.5"
                    >
                      <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      Start Break
                    </Button>
                    <Button
                      variant="danger"
                      size="md"
                      onClick={() => handleAttendanceAction('/api/attendance/check-out', 'check-out')}
                      isLoading={actionLoading === 'check-out'}
                      className="font-semibold gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Check Out
                    </Button>
                  </div>
                )}

                {currentStatus === 'ON_BREAK' && (
                  <Button
                    size="lg"
                    onClick={() => handleAttendanceAction('/api/attendance/break/end', 'end-break')}
                    isLoading={actionLoading === 'end-break'}
                    className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 px-8 py-3 text-sm font-bold gap-2"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    END BREAK & RESUME
                  </Button>
                )}

                {currentStatus === 'COMPLETED' && (
                  <Button
                    size="md"
                    onClick={() => handleAttendanceAction('/api/attendance/check-in', 're-checkin')}
                    isLoading={actionLoading === 're-checkin'}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 px-6 py-2 text-xs font-bold gap-2"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    CHECK IN AGAIN / NEW SESSION
                  </Button>
                )}
              </div>
            </div>

            {/* Shift Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Check In
                </span>
                <div className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1 font-mono">
                  {formatTime(attendance?.checkIn)}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Check Out
                </span>
                <div className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1 font-mono">
                  {formatTime(attendance?.checkOut)}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5 text-slate-400" />
                  Working Duration
                </span>
                <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
                  {currentStatus === 'COMPLETED'
                    ? formatMinutes(attendance?.totalWorkingMinutes || 0)
                    : formatMinutes(liveStats.currentWorkingMinutes)}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <Coffee className="w-3.5 h-3.5 text-slate-400" />
                  Break Time
                </span>
                <div className="text-base font-bold text-amber-700 dark:text-amber-400 mt-1 font-mono">
                  {formatMinutes(
                    (attendance?.totalBreakMinutes || 0) + (liveStats.activeBreakDurationMinutes || 0)
                  )}
                </div>
              </div>
            </div>

            {/* Shift Sessions History (Displays every check-in and check-out on the same day) */}
            {attendance?.sessions && attendance.sessions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span className="uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-rose-500" />
                    Shift Session History ({attendance.sessions.length})
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">Every check-in & check-out logged</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attendance.sessions.map((sess: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          Session #{idx + 1}
                        </span>
                        <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                          {formatTime(sess.checkIn)} → {sess.checkOut ? formatTime(sess.checkOut) : 'Active'}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {sess.checkOut ? formatMinutes(sess.durationMinutes) : 'In Progress'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 2. Active Project Work Session Card */}
        {currentStatus === 'PRESENT' && (
          <Card className="border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 shadow-sm mb-6 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    Current Active Project Session
                  </span>
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                  <FolderGit2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  {currentWorkSession ? (
                    <span>{(currentWorkSession.projectId as any)?.title || currentWorkSession.projectTitle}</span>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400 font-normal italic">No project currently selected</span>
                  )}
                </div>
                {currentWorkSession && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-mono">
                    Session started at {formatTime(currentWorkSession.startTime)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  size="sm"
                  onClick={() => setIsSwitchModalOpen(true)}
                  className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold gap-1.5 text-xs"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  {currentWorkSession ? 'Switch Project' : 'Select Project'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* 3. Today's Production Work Queue (Daily Plan) */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Today&apos;s Assigned Work Queue
                </CardTitle>
              </div>
              <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full font-mono">
                {myQueue.length + myTasksToday.length} items
              </span>
            </div>
            <CardDescription className="text-xs">
              Directives dispatched for you today from manager daily planning.
            </CardDescription>
          </CardHeader>

          {/* Daily Plan Specific Assignments */}
          {myQueue.length > 0 && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800 mb-2">
              <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Daily Plan Schedule
              </div>
              {myQueue.map((item, idx) => (
                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        {item.taskTitle || item.projectTitle || 'Production Assignment'}
                      </span>
                      {item.timeSlot && (
                        <span className="text-[10px] font-mono bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50 px-1.5 py-0.5 rounded">
                          {item.timeSlot}
                        </span>
                      )}
                      <Badge status={item.priority || 'MEDIUM'} />
                    </div>
                    {item.notes && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{item.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active Production Tasks */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {myTasksToday.length === 0 && myQueue.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active tasks assigned to you for today.
              </div>
            ) : (
              myTasksToday.map((task) => (
                <div key={task._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded uppercase">
                        {task.taskType}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white text-xs">{task.title}</span>
                      <Badge status={task.status} />
                      <Badge status={task.priority} />
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Project: <span className="font-semibold text-slate-700 dark:text-slate-300">{(task.projectId as any)?.title || 'Master Production'}</span>
                      {task.dueDate && (
                        <span className="ml-2 font-mono">Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Task Status Quick Selector */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {task.status !== 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleUpdateTaskStatus(task._id, 'IN_PROGRESS')}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        Start
                      </button>
                    )}
                    {task.status !== 'READY_FOR_REVIEW' && (
                      <button
                        onClick={() => handleUpdateTaskStatus(task._id, 'READY_FOR_REVIEW')}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors"
                      >
                        Submit Review
                      </button>
                    )}
                    {task.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleUpdateTaskStatus(task._id, 'COMPLETED')}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Modal: Select or Switch Project */}
        <Modal
          isOpen={isSwitchModalOpen}
          onClose={() => setIsSwitchModalOpen(false)}
          title={currentWorkSession ? 'Switch Current Project' : 'Select Active Project'}
          description="Track your working hours accurately against assigned media productions."
        >
          <form onSubmit={handleStartOrSwitchProject} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                Select Content Project *
              </label>
              <select
                required
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="">-- Choose an active project --</option>
                {activeProjects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.projectId} - {p.title} ({p.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                Session Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={switchNotes}
                onChange={(e) => setSwitchNotes(e.target.value)}
                placeholder="e.g. Editing YouTube main cut rough draft"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsSwitchModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={actionLoading === 'project-switch'} className="font-semibold">
                Confirm Selection
              </Button>
            </div>
          </form>
        </Modal>
      </main>

      <MobileNav />
    </div>
  );
}
