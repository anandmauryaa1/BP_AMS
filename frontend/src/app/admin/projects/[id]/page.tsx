'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import {
  FolderKanban,
  ArrowLeft,
  Plus,
  Tv,
  CheckCircle2,
  Clock,
  AlertCircle,
  Video,
  FileText,
  Share2,
  CheckSquare,
  User,
  Calendar,
  Layers,
  ChevronDown,
  X,
} from 'lucide-react';
import {
  ProjectStatus,
  DeliverableType,
  DeliverableStatus,
  TaskType,
  TaskStatus,
  Priority,
} from '@/types';

export default function AdminProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isDeliverableModalOpen, setIsDeliverableModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deliverable form
  const [deliverableForm, setDeliverableForm] = useState({
    title: '',
    type: 'YOUTUBE_MAIN_VIDEO',
    platform: 'YOUTUBE',
    aspectRatio: '16:9',
    scheduledReleaseDate: '',
    targetDurationSeconds: '',
  });

  // Task form
  const [taskForm, setTaskForm] = useState({
    title: '',
    type: 'VIDEO_EDITING',
    priority: 'MEDIUM',
    assigneeId: '',
    estimatedMinutes: '120',
    dueDate: '',
    description: '',
  });

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const [projRes, delivRes, taskRes, empRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/deliverables?projectId=${projectId}`),
        fetch(`/api/tasks?projectId=${projectId}`),
        fetch('/api/admin/employees'),
      ]);

      const projData = await projRes.json();
      const delivData = await delivRes.json();
      const taskData = await taskRes.json();
      const empData = await empRes.json();

      const foundProject = projData.data?.project || projData.project || projData.data;
      if (foundProject) setProject(foundProject);
      
      const foundDeliverables = delivData.data?.deliverables || delivData.deliverables || (Array.isArray(delivData.data) ? delivData.data : []);
      if (foundDeliverables) setDeliverables(foundDeliverables);

      const foundTasks = taskData.data?.tasks || taskData.tasks || (Array.isArray(taskData.data) ? taskData.data : []);
      if (foundTasks) setTasks(foundTasks);

      const foundEmployees = empData.data?.employees || empData.employees || (Array.isArray(empData.data) ? empData.data : []);
      if (foundEmployees) setEmployees(foundEmployees);
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchProjectData();
  }, [projectId]);

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setProject((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleUpdateLeadAssignee = async (leadAssigneeId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadAssigneeId: leadAssigneeId || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setProject(data.data || { ...project, leadAssigneeId: employees.find((e) => e._id === leadAssigneeId) });
      }
    } catch (err) {
      console.error('Failed to update lead assignee:', err);
    }
  };

  const handleCreateDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        projectId,
        title: deliverableForm.title,
        type: deliverableForm.type,
        platform: deliverableForm.platform,
        aspectRatio: deliverableForm.aspectRatio,
        targetDurationSeconds: deliverableForm.targetDurationSeconds
          ? parseInt(deliverableForm.targetDurationSeconds, 10)
          : undefined,
        scheduledReleaseDate: deliverableForm.scheduledReleaseDate
          ? new Date(deliverableForm.scheduledReleaseDate)
          : undefined,
      };

      const res = await fetch('/api/deliverables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to create deliverable');

      setDeliverableForm({
        title: '',
        type: 'YOUTUBE_MAIN_VIDEO',
        platform: 'YOUTUBE',
        aspectRatio: '16:9',
        scheduledReleaseDate: '',
        targetDurationSeconds: '',
      });
      setIsDeliverableModalOpen(false);
      await fetchProjectData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        projectId,
        title: taskForm.title,
        type: taskForm.type,
        priority: taskForm.priority,
        assigneeId: taskForm.assigneeId || undefined,
        estimatedMinutes: taskForm.estimatedMinutes ? parseInt(taskForm.estimatedMinutes, 10) : undefined,
        dueDate: taskForm.dueDate ? new Date(taskForm.dueDate) : undefined,
        description: taskForm.description || undefined,
      };

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to create task');

      setTaskForm({
        title: '',
        type: 'VIDEO_EDITING',
        priority: 'MEDIUM',
        assigneeId: '',
        estimatedMinutes: '120',
        dueDate: '',
        description: '',
      });
      setIsTaskModalOpen(false);
      await fetchProjectData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
        );
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <AdminNav />
        <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-6">
          <div className="h-32 bg-muted/60 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-muted/40 rounded-xl animate-pulse" />
            <div className="h-64 bg-muted/40 rounded-xl animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <AdminNav />
        <main className="flex-1 max-w-7xl w-full mx-auto p-8 text-center space-y-4">
          <p className="text-muted-foreground">Project not found.</p>
          <Link href="/admin/projects" className="text-red-500 hover:underline text-sm font-semibold">
            &larr; Back to Projects
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Back Link */}
        <Link
          href="/admin/projects"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>

        {/* Project Header Banner */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-foreground font-bold border border-border">
                  {project.code || project.projectId}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Tv className="w-3.5 h-3.5 text-red-500" />
                  {project.channelId?.name || (Array.isArray(project.channelIds) && project.channelIds[0]?.name)}
                  {project.seriesId && <span>/ {project.seriesId.name}</span>}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                {project.title}
              </h1>
            </div>

            {/* Pipeline Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-medium">Lead:</span>
                <select
                  value={project.leadAssigneeId?._id || project.leadAssigneeId || ''}
                  onChange={(e) => handleUpdateLeadAssignee(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">👤 Unassigned Lead</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      👤 {emp.name} ({emp.role || 'Crew'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-medium">Stage:</span>
                <select
                  value={project.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="IDEA">Idea</option>
                  <option value="RESEARCH">Research</option>
                  <option value="SCRIPTING">Scripting</option>
                  <option value="PRE_PRODUCTION">Pre-Production</option>
                  <option value="SHOOTING">Shooting</option>
                  <option value="POST_PRODUCTION">Post-Production</option>
                  <option value="REVIEW">Review</option>
                  <option value="READY_FOR_RELEASE">Ready for Release</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>
          </div>

          {project.description && (
            <p className="text-sm text-foreground/80 bg-muted/40 p-3 rounded-lg border border-border/60">
              {project.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
            {project.leadAssigneeId && (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Lead: <b className="text-foreground">{project.leadAssigneeId.name}</b></span>
              </div>
            )}
            {project.targetReleaseDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Target: <b className="text-foreground">{new Date(project.targetReleaseDate).toLocaleDateString()}</b></span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span>Priority: <b className="text-red-500 font-semibold">{project.priority}</b></span>
            </div>
          </div>
        </div>

        {/* 2-Column Split: Deliverables & Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Deliverables Section (Left 5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Share2 className="w-5 h-5 text-red-500" />
                Deliverables ({deliverables.length})
              </h2>
              <button
                onClick={() => { setError(null); setIsDeliverableModalOpen(true); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Output
              </button>
            </div>

            {deliverables.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
                <Video className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No deliverables configured.</p>
                <p className="text-xs text-muted-foreground mt-1">Add formats like YouTube Longform, Shorts, or Reels.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deliverables.map((deliv) => (
                  <div
                    key={deliv._id}
                    className="p-4 rounded-xl bg-card border border-border space-y-2 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-foreground text-sm">{deliv.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-muted text-foreground text-[10px] font-mono border border-border">
                            {deliv.platform}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span>{deliv.aspectRatio}</span>
                          {deliv.targetDurationSeconds && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span>{Math.round(deliv.targetDurationSeconds / 60)}m</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                        {deliv.status}
                      </span>
                    </div>

                    {deliv.scheduledReleaseDate && (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Release: {new Date(deliv.scheduledReleaseDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tasks Section (Right 7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-red-500" />
                Production Tasks ({tasks.length})
              </h2>
              <button
                onClick={() => { setError(null); setIsTaskModalOpen(true); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Task
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
                <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No tasks assigned to this project yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Break down work into Editing, Thumbnail, Script, etc.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task._id}
                    className="p-4 rounded-xl bg-card border border-border hover:border-border/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{task.title}</span>
                        <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-foreground font-mono border border-border">
                          {task.type?.replace(/_/g, ' ') || task.taskType?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {task.assigneeId || task.assignedTo ? (
                          <span className="text-foreground font-medium">👤 {task.assigneeId?.name || task.assignedTo?.name || 'Assigned'}</span>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                        {(task.estimatedMinutes || task.estimatedHours) && (
                          <span>⏱️ {task.estimatedMinutes ? `${task.estimatedMinutes}m` : `${task.estimatedHours}h`}</span>
                        )}
                        {task.priority === 'URGENT' && (
                          <span className="text-red-500 font-bold">URGENT</span>
                        )}
                      </div>
                    </div>

                    {/* Task Status Dropdown */}
                    <div className="flex items-center gap-2">
                      <select
                        value={task.status}
                        onChange={(e) => handleUpdateTaskStatus(task._id, e.target.value)}
                        className="px-2.5 py-1 rounded-lg bg-background border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-red-500"
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
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Deliverable Modal */}
        {isDeliverableModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-red-500" />
                  Add Deliverable Output
                </h3>
                <button
                  onClick={() => setIsDeliverableModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-semibold"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCreateDeliverable} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                    Deliverable Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Main Video 4K, 30s Viral Hook Reel"
                    value={deliverableForm.title}
                    onChange={(e) => setDeliverableForm({ ...deliverableForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                      Platform
                    </label>
                    <select
                      value={deliverableForm.platform}
                      onChange={(e) => setDeliverableForm({ ...deliverableForm, platform: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="YOUTUBE">YouTube</option>
                      <option value="INSTAGRAM">Instagram</option>
                      <option value="FACEBOOK">Facebook</option>
                      <option value="TIKTOK">TikTok</option>
                      <option value="TWITTER_X">X (Twitter)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                      Type
                    </label>
                    <select
                      value={deliverableForm.type}
                      onChange={(e) => setDeliverableForm({ ...deliverableForm, type: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="YOUTUBE_MAIN_VIDEO">Main Video</option>
                      <option value="YOUTUBE_SHORTS">Shorts</option>
                      <option value="INSTAGRAM_REEL">IG Reel</option>
                      <option value="INSTAGRAM_POST">IG Post</option>
                      <option value="INSTAGRAM_STORY">IG Story</option>
                      <option value="FACEBOOK_VIDEO">FB Video</option>
                      <option value="FACEBOOK_REEL">FB Reel</option>
                      <option value="COMMUNITY_POST">Community Post</option>
                      <option value="THUMBNAIL_PRIMARY">Thumbnail</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                      Aspect Ratio
                    </label>
                    <select
                      value={deliverableForm.aspectRatio}
                      onChange={(e) => setDeliverableForm({ ...deliverableForm, aspectRatio: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="16:9">16:9 (Landscape)</option>
                      <option value="9:16">9:16 (Vertical)</option>
                      <option value="1:1">1:1 (Square)</option>
                      <option value="4:5">4:5 (Portrait)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                      Target Seconds
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 600 (10 mins)"
                      value={deliverableForm.targetDurationSeconds}
                      onChange={(e) => setDeliverableForm({ ...deliverableForm, targetDurationSeconds: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                    Scheduled Release Date
                  </label>
                  <input
                    type="date"
                    value={deliverableForm.scheduledReleaseDate}
                    onChange={(e) => setDeliverableForm({ ...deliverableForm, scheduledReleaseDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDeliverableModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium transition shadow-sm"
                  >
                    {saving ? 'Adding...' : 'Add Deliverable'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Task Modal */}
        {isTaskModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-red-500" />
                  Add Production Task
                </h3>
                <button
                  onClick={() => setIsTaskModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-semibold"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                    Task Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., A-roll Assembly, Color Grade & Audio Polish"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                      Task Type
                    </label>
                    <select
                      value={taskForm.type}
                      onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
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
                    <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                      Priority
                    </label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
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
                    <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                      Assignee
                    </label>
                    <select
                      value={taskForm.assigneeId}
                      onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
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
                    <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                      Est. Minutes
                    </label>
                    <input
                      type="number"
                      value={taskForm.estimatedMinutes}
                      onChange={(e) => setTaskForm({ ...taskForm, estimatedMinutes: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium transition shadow-sm"
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
