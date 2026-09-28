'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  User,
  Calendar,
  Clock,
  FolderKanban,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import { TaskStatus, Priority, TaskType } from '@/types';
import { formatDate } from '@/lib/utils';

export default function AdminTasksClient({ initialTasks = [], initialProjects = [], initialEmployees = [] }: { initialTasks?: any[]; initialProjects?: any[]; initialEmployees?: any[] }) {
  const [tasks, setTasks] = useState<any[]>(initialTasks);
  const [projects, setProjects] = useState<any[]>(initialProjects);
  const [employees, setEmployees] = useState<any[]>(initialEmployees);
  const [loading, setLoading] = useState(initialTasks.length === 0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    projectId: '',
    title: '',
    type: 'VIDEO_EDITING',
    priority: 'MEDIUM',
    assigneeId: '',
    estimatedMinutes: '120',
    dueDate: '',
    description: '',
  });

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? (localStorage.getItem('auth_token')) : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      let url = '/api/tasks';
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (assigneeFilter !== 'ALL') params.append('assigneeId', assigneeFilter);
      if (projectFilter !== 'ALL') params.append('projectId', projectFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, { credentials: 'include', headers });
      const data = await res.json();
      const list = data.data?.tasks || data.tasks || (Array.isArray(data.data) ? data.data : []);
      setTasks(list);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('auth_token')) : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [projRes, empRes] = await Promise.all([
        fetch('/api/projects', { credentials: 'include', headers }),
        fetch('/api/admin/employees', { credentials: 'include', headers }),
      ]);
      const projData = await projRes.json();
      const empData = await empRes.json();
      const projList = projData.data?.projects || projData.projects || (Array.isArray(projData.data) ? projData.data : []);
      const empList = empData.data?.employees || empData.employees || (Array.isArray(empData.data) ? empData.data : []);
      setProjects(projList);
      setEmployees(empList);
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, assigneeFilter, projectFilter]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('auth_token')) : null;

      const payload: any = {
        projectId: form.projectId || undefined,
        title: form.title.trim(),
        taskType: form.type,
        type: form.type,
        priority: form.priority,
        assignedTo: form.assigneeId || undefined,
        assigneeId: form.assigneeId || undefined,
        estimatedMinutes: form.estimatedMinutes ? parseInt(form.estimatedMinutes, 10) : 60,
        dueDate: form.dueDate || undefined,
        description: form.description?.trim() || undefined,
      };

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to create task');
      }

      setForm({
        projectId: '',
        title: '',
        type: 'VIDEO_EDITING',
        priority: 'MEDIUM',
        assigneeId: '',
        estimatedMinutes: '120',
        dueDate: '',
        description: '',
      });
      setIsModalOpen(false);
      await fetchTasks();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the task');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('auth_token')) : null;
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleUpdateAssignee = async (taskId: string, newAssigneeId: string) => {
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('auth_token')) : null;
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ assignedTo: newAssigneeId || 'unassigned', assigneeId: newAssigneeId || 'unassigned' }),
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to update assignee:', err);
    }
  };

  const handleUpdateTaskProject = async (taskId: string, newProjectId: string) => {
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('auth_token')) : null;
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ projectId: newProjectId || null }),
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to update task project:', err);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const assigneeName = (t.assignedTo?.name || t.assigneeId?.name || '').toLowerCase();
    const projectTitle = (t.projectId?.title || t.projectId?.name || '').toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      projectTitle.includes(q) ||
      assigneeName.includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-rose-600 dark:text-red-500" />
              Production Tasks
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Manage multi-discipline production assignments across research, editing, design, and audio.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchTasks}
              className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setError(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm transition shadow-lg shadow-rose-600/20"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-zinc-900/40 p-3 rounded-xl border border-slate-200 dark:border-zinc-800/80 shadow-sm">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search task, project, assignee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="CHANGES_REQUESTED">Changes Requested</option>
              <option value="APPROVED">Approved</option>
              <option value="COMPLETED">Completed</option>
              <option value="BLOCKED">Blocked</option>
            </select>

            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="ALL">All Crew Members</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name}
                </option>
              ))}
            </select>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p: any) => {
                const pid = String(p._id || p.id || '');
                return (
                  <option key={pid} value={pid}>
                    {p.title || p.name}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Task List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-slate-100 dark:bg-zinc-900/40 rounded-xl border border-slate-200 dark:border-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900/40 rounded-2xl border border-slate-200 dark:border-zinc-800 p-12 text-center text-slate-500 dark:text-zinc-500 shadow-sm">
            <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
            <p className="text-base font-medium text-slate-700 dark:text-zinc-400">No production tasks match your filter.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map((task) => {
              const currentAssigneeId = task.assignedTo?._id || task.assignedTo || task.assigneeId?._id || task.assigneeId || '';
              const currentProjectId = task.projectId?._id || task.projectId || '';
              const assigneeName = task.assignedTo?.name || task.assigneeId?.name || 'Unassigned';

              return (
                <div
                  key={task._id}
                  className="p-4 rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-sm dark:hover:bg-zinc-900/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-zinc-100 text-sm">{task.title}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] font-mono text-slate-700 dark:text-zinc-400 font-medium">
                        {(task.type || task.taskType || 'TASK').replace(/_/g, ' ')}
                      </span>
                      {task.priority === 'URGENT' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-500 dark:text-red-400">
                          URGENT
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
                      {task.projectId && (
                        <Link
                          href={`/admin/projects/${task.projectId._id || task.projectId}`}
                          className="text-slate-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-red-400 flex items-center gap-1 font-medium transition"
                        >
                          <FolderKanban className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                          {task.projectId.title || task.projectId.name || 'Project'}
                        </Link>
                      )}
                      <span className="flex items-center gap-1 text-slate-600 dark:text-zinc-400">
                        <User className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                        {assigneeName}
                      </span>
                      {task.estimatedMinutes && (
                        <span className="flex items-center gap-1 text-slate-400 dark:text-zinc-500">
                          <Clock className="w-3.5 h-3.5" />
                          {task.estimatedMinutes}m
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="flex items-center gap-1 text-slate-400 dark:text-zinc-500">
                          <Calendar className="w-3.5 h-3.5" />
                          Due {formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inline Assignment & Status Controls */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Project Selector */}
                    <select
                      value={String(currentProjectId)}
                      onChange={(e) => handleUpdateTaskProject(task._id, e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500 max-w-[140px] truncate"
                      title="Assign Project"
                    >
                      <option value="">📁 General / No Project</option>
                      {projects.map((p: any) => {
                        const pid = String(p._id || p.id || '');
                        return (
                          <option key={pid} value={pid}>
                            📁 {p.title || p.name}
                          </option>
                        );
                      })}
                    </select>

                    {/* Crew Assignee Selector */}
                    <select
                      value={String(currentAssigneeId)}
                      onChange={(e) => handleUpdateAssignee(task._id, e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500 max-w-[140px] truncate"
                      title="Assign Crew Member"
                    >
                      <option value="">👤 Unassigned</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          👤 {emp.name}
                        </option>
                      ))}
                    </select>

                    {/* Task Status Dropdown */}
                    <select
                      value={task.status}
                      onChange={(e) => handleUpdateStatus(task._id, e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="CHANGES_REQUESTED">Changes Req.</option>
                      <option value="APPROVED">Approved</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="BLOCKED">Blocked</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-rose-600 dark:text-red-500" />
                  Create Task
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 text-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                    Task Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Final Color Correction, Create CTR Thumbnail"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                    Project (Optional)
                  </label>
                  <select
                    value={form.projectId}
                    onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="">None / General Task</option>
                    {projects.map((p: any) => {
                      const pid = String(p._id || p.id || '');
                      return (
                        <option key={pid} value={pid}>
                          {p.title || p.name || 'Untitled Project'}{p.code || p.projectId ? ` (${p.code || p.projectId})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Task Type
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      <option value="IDEA_RESEARCH">Research</option>
                      <option value="SCRIPT_WRITING">Scriptwriting</option>
                      <option value="STUDIO_SHOOT">Studio Shoot</option>
                      <option value="VIDEO_EDITING">Video Editing</option>
                      <option value="THUMBNAIL_DESIGN">Thumbnail</option>
                      <option value="SOUND_DESIGN">Sound Design</option>
                      <option value="MOTION_GRAPHICS">Motion Graphics</option>
                      <option value="SEO_METADATA">SEO / Metadata</option>
                      <option value="PUBLISHING_DISTRIBUTION">Publishing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Priority
                    </label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Assignee
                    </label>
                    <select
                      value={form.assigneeId}
                      onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      <option value="">Unassigned</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name} ({emp.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Est. Minutes
                    </label>
                    <input
                      type="number"
                      value={form.estimatedMinutes}
                      onChange={(e) => setForm({ ...form, estimatedMinutes: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-medium transition"
                  >
                    {saving ? 'Creating...' : 'Create Task'}
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



