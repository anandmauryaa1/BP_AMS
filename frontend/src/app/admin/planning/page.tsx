'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import {
  CalendarDays,
  Calendar,
  CheckSquare,
  Target,
  Plus,
  Tv,
  User,
  AlertCircle,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

export default function AdminPlanningPage() {
  const [activeTab, setActiveTab] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  
  // Data
  const [channels, setChannels] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  
  // Daily Plans state
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [dailyPlans, setDailyPlans] = useState<any[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [dailyForm, setDailyForm] = useState({
    userId: '',
    date: new Date().toISOString().split('T')[0],
    focusGoal: '',
    assignedTaskIds: [] as string[],
  });

  // Weekly Plans state
  const [weeklyPlans, setWeeklyPlans] = useState<any[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  // Monthly Plans state
  const [monthlyPlans, setMonthlyPlans] = useState<any[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [monthlyForm, setMonthlyForm] = useState({
    channelId: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    targetLongformVideos: '8',
    targetShortsReels: '20',
    primaryFocus: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('auth_token') || localStorage.getItem('token')) : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchMeta = async () => {
    try {
      const authHeaders = getAuthHeaders();
      const [chanRes, empRes, taskRes] = await Promise.all([
        fetch('/api/channels', { headers: authHeaders, credentials: 'include' }),
        fetch('/api/admin/employees', { headers: authHeaders, credentials: 'include' }),
        fetch('/api/tasks', { headers: authHeaders, credentials: 'include' }),
      ]);
      const chanData = await chanRes.json();
      const empData = await empRes.json();
      const taskData = await taskRes.json();

      // successResponse wraps data under .data
      const chans = chanData.data?.channels || chanData.channels || [];
      const emps = empData.data?.employees || empData.employees || [];
      const tsk = taskData.data?.tasks || taskData.tasks || [];

      setChannels(chans);
      setEmployees(emps);
      setTasks(tsk);
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  };

  const fetchDailyPlans = async () => {
    try {
      setDailyLoading(true);
      const res = await fetch(`/api/plans/daily?date=${selectedDate}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      const plans = data.data?.dailyPlans || data.dailyPlans || [];
      setDailyPlans(plans);
    } catch (err) {
      console.error('Failed to load daily plans:', err);
    } finally {
      setDailyLoading(false);
    }
  };

  const fetchWeeklyPlans = async () => {
    try {
      setWeeklyLoading(true);
      const res = await fetch('/api/plans/weekly', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      const plans = data.data?.weeklyPlans || data.weeklyPlans || [];
      setWeeklyPlans(plans);
    } catch (err) {
      console.error('Failed to load weekly plans:', err);
    } finally {
      setWeeklyLoading(false);
    }
  };

  const fetchMonthlyPlans = async () => {
    try {
      setMonthlyLoading(true);
      const res = await fetch('/api/plans/monthly', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      const plans = data.data?.monthlyPlans || data.monthlyPlans || [];
      setMonthlyPlans(plans);
    } catch (err) {
      console.error('Failed to load monthly plans:', err);
    } finally {
      setMonthlyLoading(false);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    if (activeTab === 'DAILY') fetchDailyPlans();
    if (activeTab === 'WEEKLY') fetchWeeklyPlans();
    if (activeTab === 'MONTHLY') fetchMonthlyPlans();
  }, [activeTab, selectedDate]);

  const handleCreateDailyPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/plans/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify(dailyForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch daily plan');

      setIsDailyModalOpen(false);
      setDailyForm({
        userId: '',
        date: selectedDate,
        focusGoal: '',
        assignedTaskIds: [],
      });
      await fetchDailyPlans();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMonthlyPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        channelId: monthlyForm.channelId,
        year: Number(monthlyForm.year),
        month: Number(monthlyForm.month),
        targetLongformVideos: Number(monthlyForm.targetLongformVideos),
        targetShortsReels: Number(monthlyForm.targetShortsReels),
        primaryFocus: monthlyForm.primaryFocus || undefined,
      };

      const res = await fetch('/api/plans/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save monthly plan');

      setIsMonthlyModalOpen(false);
      await fetchMonthlyPlans();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col">
      <Navbar />
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-red-500" />
              Production Planning
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Daily queues, weekly production schedules, and monthly channel targets.
            </p>
          </div>

          {/* Planning View Switcher */}
          <div className="flex items-center p-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm">
            <button
              onClick={() => setActiveTab('DAILY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'DAILY'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Daily Queue
            </button>
            <button
              onClick={() => setActiveTab('WEEKLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'WEEKLY'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Weekly Sprint
            </button>
            <button
              onClick={() => setActiveTab('MONTHLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'MONTHLY'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly Targets
            </button>
          </div>
        </div>

        {/* TAB 1: DAILY QUEUES */}
        {activeTab === 'DAILY' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900/40 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Select Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchDailyPlans}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    setDailyForm((prev) => ({ ...prev, date: selectedDate }));
                    setIsDailyModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition shadow-md shadow-red-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Dispatch Daily Queue
                </button>
              </div>
            </div>

            {dailyLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 bg-white dark:bg-zinc-900/40 rounded-xl border border-slate-200 dark:border-zinc-800 animate-pulse" />
                ))}
              </div>
            ) : dailyPlans.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900/40 rounded-2xl border border-slate-200 dark:border-zinc-800 p-12 text-center text-slate-400 dark:text-zinc-500 shadow-sm">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400 dark:text-zinc-400" />
                <p className="text-base font-medium text-slate-700 dark:text-zinc-400">No daily work queues dispatched for this date.</p>
                <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">Assign focused task queues to employees so they see prioritized work upon check-in.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dailyPlans.map((plan) => (
                  <div
                    key={plan._id}
                    className="p-5 rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 space-y-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-zinc-100 text-sm flex items-center gap-1.5">
                          <User className="w-4 h-4 text-red-500" />
                          {plan.userId?.name}
                        </span>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-500">{plan.userId?.designation || plan.userId?.role}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-transparent">
                        {plan.assignedTaskIds?.length || 0} tasks
                      </span>
                    </div>

                    {plan.focusGoal && (
                      <div className="text-xs text-amber-700 dark:text-amber-400/90 bg-amber-50 dark:bg-amber-500/10 p-2 rounded-lg border border-amber-200 dark:border-amber-500/20">
                        🎯 {plan.focusGoal}
                      </div>
                    )}

                    <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-zinc-800/60">
                      {plan.assignedTaskIds?.map((t: any) => (
                        <div
                          key={t._id}
                          className="flex items-center justify-between gap-2 text-xs p-1.5 rounded bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800/60"
                        >
                          <span className="text-slate-800 dark:text-zinc-300 font-medium line-clamp-1">{t.title}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-400 shrink-0">
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WEEKLY SPRINTS */}
        {activeTab === 'WEEKLY' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900/40 rounded-2xl border border-slate-200 dark:border-zinc-800 p-8 text-center text-slate-600 dark:text-zinc-400 space-y-2 shadow-sm">
              <CalendarDays className="w-10 h-10 mx-auto text-red-500 opacity-80" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Weekly Production Sprints</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-500 max-w-md mx-auto">
                Organize Monday-to-Sunday shoots, editorial deadlines, and batch review cycles.
              </p>
              {weeklyPlans.length === 0 && (
                <div className="pt-4 text-xs text-slate-400 dark:text-zinc-500">
                  Sprint schedules update dynamically as deliverables and tasks are scheduled for the current week.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MONTHLY TARGETS */}
        {activeTab === 'MONTHLY' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Channel Output Targets
              </h2>
              <button
                onClick={() => { setError(null); setIsMonthlyModalOpen(true); }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition shadow-md shadow-red-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                Set Monthly Target
              </button>
            </div>

            {monthlyLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-44 bg-white dark:bg-zinc-900/40 rounded-xl border border-slate-200 dark:border-zinc-800 animate-pulse" />
                ))}
              </div>
            ) : monthlyPlans.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900/40 rounded-2xl border border-slate-200 dark:border-zinc-800 p-12 text-center text-slate-400 dark:text-zinc-500 shadow-sm">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400 dark:text-zinc-400" />
                <p className="text-base font-medium text-slate-700 dark:text-zinc-400">No monthly channel targets set.</p>
                <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">Set targets for longform episodes and shorts/reels per channel.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {monthlyPlans.map((plan) => (
                  <div
                    key={plan._id}
                    className="p-5 rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 space-y-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-zinc-100 text-base flex items-center gap-1.5">
                          <Tv className="w-4 h-4 text-red-500" />
                          {plan.channelId?.name}
                        </span>
                        <div className="text-xs text-slate-500 dark:text-zinc-500">
                          {new Date(plan.year, plan.month - 1).toLocaleString('default', { month: 'long' })} {plan.year}
                        </div>
                      </div>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-400 font-bold border border-slate-200 dark:border-transparent">
                        {plan.channelId?.platform}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/60">
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800">
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-semibold">Longform Goal</div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{plan.targetLongformVideos} <span className="text-xs font-normal text-slate-500 dark:text-zinc-500">vids</span></div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800">
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-semibold">Shorts / Reels</div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{plan.targetShortsReels} <span className="text-xs font-normal text-slate-500 dark:text-zinc-500">posts</span></div>
                      </div>
                    </div>

                    {plan.primaryFocus && (
                      <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2">
                        💡 Focus: {plan.primaryFocus}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dispatch Daily Modal */}
        {isDailyModalOpen && (
          <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-red-500" />
                  Dispatch Daily Queue
                </h3>
                <button
                  onClick={() => setIsDailyModalOpen(false)}
                  className="text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 text-sm"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCreateDailyPlan} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                    Employee
                  </label>
                  <select
                    required
                    value={dailyForm.userId}
                    onChange={(e) => setDailyForm({ ...dailyForm, userId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-red-500"
                  >
                    <option value="">Select Employee...</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} ({emp.designation || emp.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dailyForm.date}
                    onChange={(e) => setDailyForm({ ...dailyForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                    Primary Focus / Goal
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Deliver rough cut for Project X by 4 PM"
                    value={dailyForm.focusGoal}
                    onChange={(e) => setDailyForm({ ...dailyForm, focusGoal: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase">
                      Assign Existing Tasks ({dailyForm.assignedTaskIds.length} selected)
                    </label>
                    {tasks.length > 0 && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setDailyForm({ ...dailyForm, assignedTaskIds: tasks.map((t) => t._id) })}
                          className="text-red-500 hover:underline font-medium"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300 dark:text-zinc-700">|</span>
                        <button
                          type="button"
                          onClick={() => setDailyForm({ ...dailyForm, assignedTaskIds: [] })}
                          className="text-slate-500 hover:underline font-medium"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 p-2 space-y-1.5">
                    {tasks.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 dark:text-zinc-500">
                        No available tasks found.
                      </div>
                    ) : (
                      tasks.map((task) => {
                        const isSelected = dailyForm.assignedTaskIds.includes(task._id);
                        return (
                          <div
                            key={task._id}
                            onClick={() => {
                              const updated = isSelected
                                ? dailyForm.assignedTaskIds.filter((id) => id !== task._id)
                                : [...dailyForm.assignedTaskIds, task._id];
                              setDailyForm({ ...dailyForm, assignedTaskIds: updated });
                            }}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition ${
                              isSelected
                                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-slate-900 dark:text-zinc-100'
                                : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 rounded border-slate-300 dark:border-zinc-700 text-red-600 focus:ring-red-500 shrink-0 accent-red-600 cursor-pointer"
                              />
                              <span className="font-medium truncate">{task.title}</span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 shrink-0">
                              {task.status}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDailyModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium transition"
                  >
                    {saving ? 'Dispatching...' : 'Dispatch Queue'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Set Monthly Modal */}
        {isMonthlyModalOpen && (
          <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-red-500" />
                  Set Monthly Target
                </h3>
                <button
                  onClick={() => setIsMonthlyModalOpen(false)}
                  className="text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 text-sm"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCreateMonthlyPlan} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                    Channel
                  </label>
                  <select
                    required
                    value={monthlyForm.channelId}
                    onChange={(e) => setMonthlyForm({ ...monthlyForm, channelId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-red-500"
                  >
                    <option value="">Select Channel...</option>
                    {channels.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.platform})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Target Longform
                    </label>
                    <input
                      type="number"
                      required
                      value={monthlyForm.targetLongformVideos}
                      onChange={(e) => setMonthlyForm({ ...monthlyForm, targetLongformVideos: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Target Shorts/Reels
                    </label>
                    <input
                      type="number"
                      required
                      value={monthlyForm.targetShortsReels}
                      onChange={(e) => setMonthlyForm({ ...monthlyForm, targetShortsReels: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                    Strategic Focus
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Launch 2 new series, boost CTR to 9%"
                    value={monthlyForm.primaryFocus}
                    onChange={(e) => setMonthlyForm({ ...monthlyForm, primaryFocus: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsMonthlyModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium transition"
                  >
                    {saving ? 'Saving...' : 'Save Target'}
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
