'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import {
  CheckSquare,
  Plus,
  Search,
  RefreshCw,
  X,
  AlertCircle,
  HardDrive,
  FileText,
  Video,
  Figma,
  Github,
  Globe,
  Link as LinkIcon,
  Trash2,
} from 'lucide-react';
import { ITask, ITaskLink } from '@/types';
import { useRealTimeEvent } from '@/context/RealTimeContext';
import { AdminTaskRow } from '@/components/tasks/AdminTaskRow';
import { VirtualTaskList } from '@/components/tasks/VirtualTaskList';
import {
  filterTasksList,
  sanitizeTaskUrl,
  isValidWebUrl,
  detectLinkCategory,
} from '@/lib/taskUtils';

// Code-splitting via lazy loading for modals
const TaskLinksModal = lazy(() => import('@/components/tasks/TaskLinksModal'));

interface AdminTasksClientProps {
  initialTasks?: any[];
  initialProjects?: any[];
  initialEmployees?: any[];
}

export default function AdminTasksClient({
  initialTasks = [],
  initialProjects = [],
  initialEmployees = [],
}: AdminTasksClientProps) {
  const [tasks, setTasks] = useState<any[]>(initialTasks);
  const [projects, setProjects] = useState<any[]>(initialProjects);
  const [employees, setEmployees] = useState<any[]>(initialEmployees);
  const [loading, setLoading] = useState(initialTasks.length === 0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create form initial state
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

  // Multiple links state inside create modal
  const [createLinks, setCreateLinks] = useState<{ title: string; url: string }[]>([]);
  const [linkInputTitle, setLinkInputTitle] = useState('');
  const [linkInputUrl, setLinkInputUrl] = useState('');

  // Selected task for Links Management Modal
  const [linksModalTask, setLinksModalTask] = useState<ITask | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
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
  }, [statusFilter, assigneeFilter, projectFilter]);

  const fetchMeta = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
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
  }, []);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Real-time synchronization
  useRealTimeEvent('TASK_CREATED', (newTask) => {
    if (!newTask) return;
    setTasks((prev) => {
      const exists = prev.some((t) => t._id === newTask._id);
      if (exists) return prev.map((t) => (t._id === newTask._id ? { ...t, ...newTask } : t));
      return [newTask, ...prev];
    });
  });

  useRealTimeEvent('TASK_UPDATED', (updatedTask) => {
    if (!updatedTask) return;
    setTasks((prev) =>
      prev.map((t) => (t._id === updatedTask._id ? { ...t, ...updatedTask } : t))
    );
  });

  useRealTimeEvent('TASK_ASSIGNED', (assignedTask) => {
    if (!assignedTask) return;
    setTasks((prev) =>
      prev.map((t) => (t._id === assignedTask._id ? { ...t, ...assignedTask } : t))
    );
  });

  useRealTimeEvent('TASK_DELETED', (deletedTask) => {
    const taskId = deletedTask?._id || deletedTask?.taskId;
    if (taskId) {
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    }
  });

  useRealTimeEvent('PROJECT_CREATED', () => {
    fetchMeta();
  });

  useRealTimeEvent('PROJECT_UPDATED', (updatedProj) => {
    if (!updatedProj) return;
    setProjects((prev) =>
      prev.map((p) => (p._id === updatedProj._id ? { ...p, ...updatedProj } : p))
    );
  });

  useRealTimeEvent('PROJECT_DELETED', (deletedProj) => {
    const projId = deletedProj?._id || deletedProj?.id || deletedProj?.projectId;
    if (projId) {
      setProjects((prev) => prev.filter((p) => p._id !== projId));
    }
  });

  // Stabilized callbacks for item operations
  const handleUpdateStatus = useCallback(async (taskId: string, newStatus: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
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
  }, []);

  const handleUpdateAssignee = useCallback(async (taskId: string, newAssigneeId: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
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
  }, [fetchTasks]);

  const handleUpdateTaskProject = useCallback(async (taskId: string, newProjectId: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
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
  }, [fetchTasks]);

  const handleManageLinks = useCallback((task: ITask) => {
    setLinksModalTask(task);
  }, []);

  const handleLinksUpdated = useCallback((taskId: string, updatedLinks: ITaskLink[]) => {
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, links: updatedLinks } : t))
    );
  }, []);

  const handleAddCreateLink = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!linkInputUrl.trim()) return;
    const sanitized = sanitizeTaskUrl(linkInputUrl.trim());
    if (!isValidWebUrl(sanitized)) {
      setError('Please enter a valid URL');
      return;
    }
    const { iconLabel } = detectLinkCategory(sanitized);
    setCreateLinks((prev) => [
      ...prev,
      {
        title: linkInputTitle.trim() || iconLabel || 'Resource',
        url: sanitized,
      },
    ]);
    setLinkInputTitle('');
    setLinkInputUrl('');
    setError(null);
  }, [linkInputTitle, linkInputUrl]);

  const handleRemoveCreateLink = useCallback((index: number) => {
    setCreateLinks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

      const firstDrive = createLinks.find((l) => detectLinkCategory(l.url).category === 'drive');
      const firstDoc = createLinks.find((l) => detectLinkCategory(l.url).category === 'docs');

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
        links: createLinks,
        driveLink: firstDrive ? firstDrive.url : undefined,
        docLink: firstDoc ? firstDoc.url : undefined,
        outputUrl: createLinks[0]?.url || undefined,
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
      setCreateLinks([]);
      setLinkInputTitle('');
      setLinkInputUrl('');
      setIsModalOpen(false);
      await fetchTasks();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the task');
    } finally {
      setSaving(false);
    }
  };

  // Memoized task filtering using pure function
  const filteredTasks = useMemo(() => {
    return filterTasksList(tasks, {
      query: searchQuery,
      status: statusFilter,
      assigneeId: assigneeFilter,
      projectId: projectFilter,
    });
  }, [tasks, searchQuery, statusFilter, assigneeFilter, projectFilter]);

  // Memoized item renderer for virtualized list
  const renderTaskItem = useCallback(
    (task: ITask) => {
      return (
        <AdminTaskRow
          task={task}
          projects={projects}
          employees={employees}
          onUpdateProject={handleUpdateTaskProject}
          onUpdateAssignee={handleUpdateAssignee}
          onUpdateStatus={handleUpdateStatus}
          onManageLinks={handleManageLinks}
        />
      );
    },
    [projects, employees, handleUpdateTaskProject, handleUpdateAssignee, handleUpdateStatus, handleManageLinks]
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header - Single h1 */}
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
              onClick={() => {
                setError(null);
                setCreateLinks([]);
                setIsModalOpen(true);
              }}
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
              <option value="unassigned">👤 Unassigned Only</option>
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

        {/* Task List - Virtualized with Stable Element Keys */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-slate-100 dark:bg-zinc-900/40 rounded-xl border border-slate-200 dark:border-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <VirtualTaskList
            items={filteredTasks}
            renderItem={renderTaskItem}
            keyExtractor={(task) => task._id}
            emptyState={
              <div className="bg-white dark:bg-zinc-900/40 rounded-2xl border border-slate-200 dark:border-zinc-800 p-12 text-center text-slate-500 dark:text-zinc-500 shadow-sm">
                <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
                <p className="text-base font-medium text-slate-700 dark:text-zinc-400">No production tasks match your filter.</p>
              </div>
            }
          />
        )}

        {/* Create Task Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-rose-600 dark:text-red-500" />
                  Create Production Task
                </h2>
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

                {/* Optional Links section during creation */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 space-y-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase">
                    Initial Resource Links ({createLinks.length})
                  </label>

                  {createLinks.length > 0 && (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {createLinks.map((l, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-zinc-950 rounded-lg text-xs"
                        >
                          <div className="truncate">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{l.title}: </span>
                            <span className="font-mono text-slate-500 dark:text-slate-400">{l.url}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCreateLink(idx)}
                            className="text-slate-400 hover:text-red-500 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Label (e.g. Drive Assets)"
                      value={linkInputTitle}
                      onChange={(e) => setLinkInputTitle(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="URL (https://...)"
                      value={linkInputUrl}
                      onChange={(e) => setLinkInputUrl(e.target.value)}
                      className="sm:col-span-2 px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCreateLink}
                    disabled={!linkInputUrl.trim()}
                    className="w-full py-1.5 px-3 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-zinc-300 disabled:opacity-40 flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Attach Link
                  </button>
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

        {/* Lazy Loaded Links Management Modal */}
        {linksModalTask && (
          <Suspense fallback={null}>
            <TaskLinksModal
              isOpen={!!linksModalTask}
              task={linksModalTask}
              onClose={() => setLinksModalTask(null)}
              onLinksUpdated={handleLinksUpdated}
              isAdmin={true}
            />
          </Suspense>
        )}
      </main>
    </div>
  );
}
