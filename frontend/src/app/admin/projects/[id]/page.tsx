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
  ExternalLink,
  HardDrive,
  Globe,
  Link as LinkIcon,
  Edit3,
  Copy,
  Check,
  FileCode,
} from 'lucide-react';
import {
  ProjectStatus,
  DeliverableType,
  DeliverableStatus,
  TaskType,
  TaskStatus,
  Priority,
} from '@/types';
import { formatDate } from '@/lib/utils';
import { useRealTimeEvent } from '@/context/RealTimeContext';

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
  const [isEditDeliverableModalOpen, setIsEditDeliverableModalOpen] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const copyToClipboard = (text: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedLink(id);
      setTimeout(() => setCopiedLink(null), 2000);
    }
  };

  // Deliverable form
  const [deliverableForm, setDeliverableForm] = useState({
    title: '',
    type: 'YOUTUBE_MAIN_VIDEO',
    platform: 'YOUTUBE',
    aspectRatio: '16:9',
    scheduledReleaseDate: '',
    targetDurationSeconds: '',
    driveLink: '',
    docLink: '',
    outputUrl: '',
    publishedUrl: '',
    outputNotes: '',
    caption: '',
  });

  // Edit Deliverable form
  const [editDeliverableForm, setEditDeliverableForm] = useState({
    title: '',
    platform: 'YOUTUBE',
    format: 'FULL_VIDEO',
    status: 'PLANNED',
    scheduledAt: '',
    driveLink: '',
    docLink: '',
    outputUrl: '',
    publishedUrl: '',
    outputNotes: '',
    caption: '',
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
        fetch(`/api/projects/${projectId}`, { headers: getAuthHeaders(), credentials: 'include' }),
        fetch(`/api/deliverables?projectId=${projectId}`, { headers: getAuthHeaders(), credentials: 'include' }),
        fetch(`/api/tasks?projectId=${projectId}`, { headers: getAuthHeaders(), credentials: 'include' }),
        fetch('/api/admin/employees', { headers: getAuthHeaders(), credentials: 'include' }),
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

  // Real-time synchronization
  useRealTimeEvent('PROJECT_UPDATED', (updatedProj) => {
    if (!updatedProj) return;
    const incomingId = updatedProj._id || updatedProj.id;
    if (incomingId === projectId) {
      setProject((prev: any) => ({ ...prev, ...updatedProj }));
    }
  });

  useRealTimeEvent('PROJECT_DELETED', (deletedData) => {
    const incomingId = deletedData?._id || deletedData?.id || deletedData?.projectId;
    if (incomingId === projectId) {
      router.push('/admin/projects');
    }
  });

  useRealTimeEvent('TASK_CREATED', (newTask) => {
    if (!newTask) return;
    const taskProjId = newTask.project?._id || newTask.project || newTask.projectId;
    if (taskProjId === projectId) {
      setTasks((prev) => {
        const exists = prev.some((t) => t._id === newTask._id);
        if (exists) return prev.map((t) => (t._id === newTask._id ? { ...t, ...newTask } : t));
        return [newTask, ...prev];
      });
    }
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

  useRealTimeEvent('DELIVERABLE_CREATED', (newDeliv) => {
    if (!newDeliv) return;
    const delivProjId = newDeliv.project?._id || newDeliv.project || newDeliv.projectId;
    if (delivProjId === projectId) {
      setDeliverables((prev) => {
        const exists = prev.some((d) => d._id === newDeliv._id);
        if (exists) return prev.map((d) => (d._id === newDeliv._id ? { ...d, ...newDeliv } : d));
        return [...prev, newDeliv];
      });
    }
  });

  useRealTimeEvent('DELIVERABLE_UPDATED', (updatedDeliv) => {
    if (!updatedDeliv) return;
    setDeliverables((prev) =>
      prev.map((d) => (d._id === updatedDeliv._id ? { ...d, ...updatedDeliv } : d))
    );
  });

  useRealTimeEvent('DELIVERABLE_DELETED', (deletedDeliv) => {
    const delivId = deletedDeliv?._id || deletedDeliv?.deliverableId;
    if (delivId) {
      setDeliverables((prev) => prev.filter((d) => d._id !== delivId));
    }
  });

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
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
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ leadAssigneeId: leadAssigneeId || null }),
      });
      if (res.ok) {
        const data = await res.json();
        const updatedLeadObj = employees.find((e) => e._id === leadAssigneeId);
        setProject((prev: any) => ({
          ...prev,
          ...(data.data || {}),
          leadAssigneeId: updatedLeadObj || (leadAssigneeId ? { _id: leadAssigneeId, name: 'Assigned' } : null),
        }));
      }
    } catch (err) {
      console.error('Failed to update lead assignee:', err);
    }
  };

  const handleUpdateTaskAssignee = async (taskId: string, assigneeId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assignedTo: assigneeId || 'unassigned', assigneeId: assigneeId || 'unassigned' }),
      });
      if (res.ok) {
        const assignedEmp = employees.find((e) => e._id === assigneeId);
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, assignedTo: assignedEmp || (assigneeId ? { _id: assigneeId, name: 'Assigned' } : null) } : t))
        );
      }
    } catch (err) {
      console.error('Failed to update task assignee:', err);
    }
  };

  const openEditDeliverableModal = (deliv: any) => {
    setEditingDeliverable(deliv);
    setEditDeliverableForm({
      title: deliv.title || '',
      platform: deliv.platform || 'YOUTUBE',
      format: deliv.format || 'FULL_VIDEO',
      status: deliv.status || 'PLANNED',
      scheduledAt: deliv.scheduledAt ? new Date(deliv.scheduledAt).toISOString().split('T')[0] : '',
      driveLink: deliv.driveLink || '',
      docLink: deliv.docLink || '',
      outputUrl: deliv.outputUrl || '',
      publishedUrl: deliv.publishedUrl || '',
      outputNotes: deliv.outputNotes || '',
      caption: deliv.caption || '',
    });
    setError(null);
    setIsEditDeliverableModalOpen(true);
  };

  const handleUpdateDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeliverable) return;
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        title: editDeliverableForm.title,
        platform: editDeliverableForm.platform,
        format: editDeliverableForm.format,
        status: editDeliverableForm.status,
        scheduledAt: editDeliverableForm.scheduledAt ? new Date(editDeliverableForm.scheduledAt) : undefined,
        driveLink: editDeliverableForm.driveLink.trim() || undefined,
        docLink: editDeliverableForm.docLink.trim() || undefined,
        outputUrl: editDeliverableForm.outputUrl.trim() || undefined,
        publishedUrl: editDeliverableForm.publishedUrl.trim() || undefined,
        outputNotes: editDeliverableForm.outputNotes.trim() || undefined,
        caption: editDeliverableForm.caption.trim() || undefined,
      };

      const res = await fetch(`/api/deliverables/${editingDeliverable._id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to update deliverable');

      setIsEditDeliverableModalOpen(false);
      setEditingDeliverable(null);
      await fetchProjectData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDeliverableStatus = async (delivId: string, status: string) => {
    try {
      const res = await fetch(`/api/deliverables/${delivId}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setDeliverables((prev) =>
          prev.map((d) => (d._id === delivId ? { ...d, status } : d))
        );
      }
    } catch (err) {
      console.error('Failed to update deliverable status:', err);
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
        driveLink: deliverableForm.driveLink.trim() || undefined,
        docLink: deliverableForm.docLink.trim() || undefined,
        outputUrl: deliverableForm.outputUrl.trim() || undefined,
        publishedUrl: deliverableForm.publishedUrl.trim() || undefined,
        outputNotes: deliverableForm.outputNotes.trim() || undefined,
        caption: deliverableForm.caption.trim() || undefined,
      };

      const res = await fetch('/api/deliverables', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
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
        driveLink: '',
        docLink: '',
        outputUrl: '',
        publishedUrl: '',
        outputNotes: '',
        caption: '',
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
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
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
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
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
                <span>
                  Lead:{' '}
                  <b className="text-foreground">
                    {typeof project.leadAssigneeId === 'object'
                      ? project.leadAssigneeId.name || project.leadAssigneeId.employeeId || 'Assigned'
                      : employees.find((e) => e._id === project.leadAssigneeId || e.employeeId === project.leadAssigneeId)?.name || 'Assigned'}
                  </b>
                </span>
              </div>
            )}
            {project.targetReleaseDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Target: <b className="text-foreground">{formatDate(project.targetReleaseDate)}</b></span>
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
                {deliverables.map((deliv) => {
                  const hasAnyLink = deliv.driveLink || deliv.docLink || deliv.outputUrl || deliv.publishedUrl;
                  return (
                    <div
                      key={deliv._id}
                      className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-sm hover:border-border/80 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                              {deliv.deliverableId || 'DEL'}
                            </span>
                            <h4 className="font-semibold text-foreground text-sm">{deliv.title}</h4>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="px-1.5 py-0.5 rounded bg-muted text-foreground text-[10px] font-mono border border-border">
                              {deliv.platform}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-[11px] font-medium">{deliv.format?.replace(/_/g, ' ') || deliv.aspectRatio}</span>
                            {deliv.targetDurationSeconds && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span>{Math.round(deliv.targetDurationSeconds / 60)}m</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => openEditDeliverableModal(deliv)}
                            title="Edit Deliverable & Output Links"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition text-xs flex items-center gap-1 border border-border"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-medium hidden sm:inline">Links & Details</span>
                          </button>
                          <select
                            value={deliv.status}
                            onChange={(e) => handleUpdateDeliverableStatus(deliv._id, e.target.value)}
                            className="px-2 py-1 rounded-lg bg-background border border-border text-[11px] font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <option value="PLANNED">Planned</option>
                            <option value="IN_PRODUCTION">In Production</option>
                            <option value="READY_FOR_REVIEW">Ready Review</option>
                            <option value="APPROVED">Approved</option>
                            <option value="SCHEDULED">Scheduled</option>
                            <option value="PUBLISHED">Published</option>
                            <option value="REVISION">Revision</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        </div>
                      </div>

                      {/* Deliverable Output Links Section */}
                      <div className="pt-2 border-t border-border/60 space-y-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                          <span>Output & Asset Links</span>
                          {!hasAnyLink && (
                            <button
                              onClick={() => openEditDeliverableModal(deliv)}
                              className="text-red-500 hover:underline normal-case text-[11px] font-medium"
                            >
                              + Add Link
                            </button>
                          )}
                        </div>

                        {hasAnyLink ? (
                          <div className="flex flex-wrap gap-1.5">
                            {/* Google Drive Link */}
                            {deliv.driveLink && (
                              <div className="inline-flex items-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs px-2.5 py-1 gap-1.5 shadow-sm">
                                <HardDrive className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <span className="font-semibold text-[11px]">Google Drive</span>
                                <a
                                  href={deliv.driveLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline flex items-center gap-0.5 ml-1 text-emerald-800 dark:text-emerald-200 font-bold"
                                  title={deliv.driveLink}
                                >
                                  Open <ExternalLink className="w-3 h-3" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(deliv.driveLink, `${deliv._id}-drive`)}
                                  className="ml-1 p-0.5 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 rounded"
                                  title="Copy Drive URL"
                                >
                                  {copiedLink === `${deliv._id}-drive` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-emerald-600/70" />
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Google Doc / Script Link */}
                            {deliv.docLink && (
                              <div className="inline-flex items-center rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs px-2.5 py-1 gap-1.5 shadow-sm">
                                <FileText className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                                <span className="font-semibold text-[11px]">Doc / Script</span>
                                <a
                                  href={deliv.docLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline flex items-center gap-0.5 ml-1 text-blue-800 dark:text-blue-200 font-bold"
                                  title={deliv.docLink}
                                >
                                  Open <ExternalLink className="w-3 h-3" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(deliv.docLink, `${deliv._id}-doc`)}
                                  className="ml-1 p-0.5 hover:bg-blue-200/50 dark:hover:bg-blue-800/50 rounded"
                                  title="Copy Doc URL"
                                >
                                  {copiedLink === `${deliv._id}-doc` ? (
                                    <Check className="w-3 h-3 text-blue-600" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-blue-600/70" />
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Output Asset / Master URL */}
                            {deliv.outputUrl && (
                              <div className="inline-flex items-center rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs px-2.5 py-1 gap-1.5 shadow-sm">
                                <LinkIcon className="w-3.5 h-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
                                <span className="font-semibold text-[11px]">Output File</span>
                                <a
                                  href={deliv.outputUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline flex items-center gap-0.5 ml-1 text-purple-800 dark:text-purple-200 font-bold"
                                  title={deliv.outputUrl}
                                >
                                  Open <ExternalLink className="w-3 h-3" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(deliv.outputUrl, `${deliv._id}-out`)}
                                  className="ml-1 p-0.5 hover:bg-purple-200/50 dark:hover:bg-purple-800/50 rounded"
                                  title="Copy Output URL"
                                >
                                  {copiedLink === `${deliv._id}-out` ? (
                                    <Check className="w-3 h-3 text-purple-600" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-purple-600/70" />
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Published Video Link */}
                            {deliv.publishedUrl && (
                              <div className="inline-flex items-center rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs px-2.5 py-1 gap-1.5 shadow-sm">
                                <Globe className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                <span className="font-semibold text-[11px]">Live Link</span>
                                <a
                                  href={deliv.publishedUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline flex items-center gap-0.5 ml-1 text-amber-800 dark:text-amber-200 font-bold"
                                  title={deliv.publishedUrl}
                                >
                                  Open <ExternalLink className="w-3 h-3" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(deliv.publishedUrl, `${deliv._id}-pub`)}
                                  className="ml-1 p-0.5 hover:bg-amber-200/50 dark:hover:bg-amber-800/50 rounded"
                                  title="Copy Live URL"
                                >
                                  {copiedLink === `${deliv._id}-pub` ? (
                                    <Check className="w-3 h-3 text-amber-600" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-amber-600/70" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground italic bg-muted/30 px-2.5 py-1.5 rounded-lg border border-border/50">
                            No Drive / Doc / Output links attached yet.
                          </div>
                        )}

                        {deliv.outputNotes && (
                          <div className="text-[11px] text-foreground/80 bg-muted/40 p-2 rounded-lg border border-border/50">
                            <span className="font-semibold text-muted-foreground uppercase text-[9px] block">Notes / Revisions:</span>
                            {deliv.outputNotes}
                          </div>
                        )}
                      </div>

                      {(deliv.scheduledReleaseDate || deliv.scheduledAt) && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
                          <Calendar className="w-3 h-3" />
                          Release: {formatDate(deliv.scheduledReleaseDate || deliv.scheduledAt)}
                        </div>
                      )}
                    </div>
                  );
                })}
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
              <div className="space-y-3">
                {tasks.map((task) => {
                  const hasTaskOutput = task.outputUrl || task.driveLink || task.docLink;
                  return (
                    <div
                      key={task._id}
                      className="p-4 rounded-xl bg-card border border-border hover:border-border/80 transition space-y-2.5 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">{task.title}</span>
                            <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-foreground font-mono border border-border">
                              {task.type?.replace(/_/g, ' ') || task.taskType?.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-0.5">
                            {/* Assignee Switcher */}
                            <select
                              value={task.assignedTo?._id || task.assignedTo || task.assigneeId?._id || task.assigneeId || ''}
                              onChange={(e) => handleUpdateTaskAssignee(task._id, e.target.value)}
                              className="px-2 py-0.5 rounded bg-muted text-foreground text-[11px] font-medium border border-border focus:outline-none focus:ring-1 focus:ring-red-500"
                            >
                              <option value="">👤 Unassigned</option>
                              {employees.map((emp) => (
                                <option key={emp._id} value={emp._id}>
                                  👤 {emp.name}
                                </option>
                              ))}
                            </select>

                            {(task.estimatedMinutes || task.estimatedHours) && (
                              <span>⏱️ {task.estimatedMinutes ? `${task.estimatedMinutes}m` : `${task.estimatedHours}h`}</span>
                            )}
                            {task.priority && (
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                task.priority === 'URGENT' || task.priority === 'HIGH'
                                  ? 'text-red-500 bg-red-500/10'
                                  : 'text-muted-foreground bg-muted'
                              }`}>
                                {task.priority}
                              </span>
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
                            <option value="READY_FOR_REVIEW">In Review</option>
                            <option value="REVISION">Revision Required</option>
                            <option value="APPROVED">Approved</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="BLOCKED">Blocked</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        </div>
                      </div>

                      {/* Task Deliverable / Output URL Attachment */}
                      {hasTaskOutput && (
                        <div className="pt-2 border-t border-border/50 flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Task Output:</span>
                          {(task.outputUrl || task.driveLink) && (
                            <a
                              href={task.outputUrl || task.driveLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold hover:underline"
                            >
                              <HardDrive className="w-3 h-3" />
                              View Output Link <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          {task.docLink && (
                            <a
                              href={task.docLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold hover:underline"
                            >
                              <FileText className="w-3 h-3" />
                              Doc / Script <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          {task.notes && (
                            <span className="text-muted-foreground text-[11px] italic">
                              "{task.notes}"
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Add Deliverable Modal */}
        {isDeliverableModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
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
                    Deliverable Title *
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

                {/* Output Links Section in Add Modal */}
                <div className="pt-2 border-t border-border space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-red-500" />
                    Asset & Deliverable Links
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">
                      📂 Google Drive Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/drive/folders/..."
                      value={deliverableForm.driveLink}
                      onChange={(e) => setDeliverableForm({ ...deliverableForm, driveLink: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">
                      📄 Google Doc / Script Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://docs.google.com/document/d/..."
                      value={deliverableForm.docLink}
                      onChange={(e) => setDeliverableForm({ ...deliverableForm, docLink: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">
                      🔗 Output Master / Asset URL (Dropbox, Frame.io, S3)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={deliverableForm.outputUrl}
                      onChange={(e) => setDeliverableForm({ ...deliverableForm, outputUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">
                      🌐 Live Published Video URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://youtube.com/watch?v=..."
                      value={deliverableForm.publishedUrl}
                      onChange={(e) => setDeliverableForm({ ...deliverableForm, publishedUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">
                      📝 Output Notes / Editorial Instructions
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Specific instructions, cut notes, or review remarks..."
                      value={deliverableForm.outputNotes}
                      onChange={(e) => setDeliverableForm({ ...deliverableForm, outputNotes: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                    />
                  </div>
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

        {/* Edit Deliverable Modal */}
        {isEditDeliverableModalOpen && editingDeliverable && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border uppercase">
                    {editingDeliverable.deliverableId || 'DEL'}
                  </span>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mt-1">
                    <Edit3 className="w-5 h-5 text-red-500" />
                    Edit Deliverable & Links
                  </h3>
                </div>
                <button
                  onClick={() => setIsEditDeliverableModalOpen(false)}
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

              <form onSubmit={handleUpdateDeliverable} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                    Deliverable Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editDeliverableForm.title}
                    onChange={(e) => setEditDeliverableForm({ ...editDeliverableForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                      Status
                    </label>
                    <select
                      value={editDeliverableForm.status}
                      onChange={(e) => setEditDeliverableForm({ ...editDeliverableForm, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="PLANNED">Planned</option>
                      <option value="IN_PRODUCTION">In Production</option>
                      <option value="READY_FOR_REVIEW">Ready for Review</option>
                      <option value="APPROVED">Approved</option>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="REVISION">Revision Required</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                      Scheduled Date
                    </label>
                    <input
                      type="date"
                      value={editDeliverableForm.scheduledAt}
                      onChange={(e) => setEditDeliverableForm({ ...editDeliverableForm, scheduledAt: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                {/* Output Links Section in Edit Modal */}
                <div className="pt-2 border-t border-border space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-red-500" />
                    Deliverable Output & Media Links
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1"><HardDrive className="w-3 h-3 text-emerald-500" /> Google Drive Link</span>
                      {editDeliverableForm.driveLink && (
                        <a href={editDeliverableForm.driveLink} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline flex items-center gap-0.5 text-[10px]">
                          Open Link <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/drive/folders/..."
                      value={editDeliverableForm.driveLink}
                      onChange={(e) => setEditDeliverableForm({ ...editDeliverableForm, driveLink: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-blue-500" /> Google Doc / Script Link</span>
                      {editDeliverableForm.docLink && (
                        <a href={editDeliverableForm.docLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5 text-[10px]">
                          Open Link <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </label>
                    <input
                      type="url"
                      placeholder="https://docs.google.com/document/d/..."
                      value={editDeliverableForm.docLink}
                      onChange={(e) => setEditDeliverableForm({ ...editDeliverableForm, docLink: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1"><LinkIcon className="w-3 h-3 text-purple-500" /> Master Asset / Output URL</span>
                      {editDeliverableForm.outputUrl && (
                        <a href={editDeliverableForm.outputUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline flex items-center gap-0.5 text-[10px]">
                          Open Link <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={editDeliverableForm.outputUrl}
                      onChange={(e) => setEditDeliverableForm({ ...editDeliverableForm, outputUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1"><Globe className="w-3 h-3 text-amber-500" /> Published Video URL</span>
                      {editDeliverableForm.publishedUrl && (
                        <a href={editDeliverableForm.publishedUrl} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline flex items-center gap-0.5 text-[10px]">
                          Open Link <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </label>
                    <input
                      type="url"
                      placeholder="https://youtube.com/watch?v=..."
                      value={editDeliverableForm.publishedUrl}
                      onChange={(e) => setEditDeliverableForm({ ...editDeliverableForm, publishedUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">
                      📝 Output Notes / Review Remarks
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Add review feedback, revision notes, or output details..."
                      value={editDeliverableForm.outputNotes}
                      onChange={(e) => setEditDeliverableForm({ ...editDeliverableForm, outputNotes: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditDeliverableModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium transition shadow-sm"
                  >
                    {saving ? 'Saving Changes...' : 'Save Deliverable'}
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
