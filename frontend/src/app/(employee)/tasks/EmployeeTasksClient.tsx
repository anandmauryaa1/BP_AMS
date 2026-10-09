'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileNav } from '@/components/MobileNav';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  CheckSquare,
  Plus,
  Trash2,
  ExternalLink,
  Link as LinkIcon,
} from 'lucide-react';
import { ITask, ITaskLink, SessionPayload, TaskStatus } from '@/types';
import { useRealTimeEvent } from '@/context/RealTimeContext';
import { soundService } from '@/lib/audioSound';
import { EmployeeTaskCard } from '@/components/tasks/EmployeeTaskCard';
import { VirtualTaskList } from '@/components/tasks/VirtualTaskList';
import {
  filterTasksList,
  normalizeTaskLinks,
  sanitizeTaskUrl,
  isValidWebUrl,
  detectLinkCategory,
} from '@/lib/taskUtils';

// Code-splitting via lazy loading for Links Modal
const TaskLinksModal = lazy(() => import('@/components/tasks/TaskLinksModal'));

export default function EmployeeTasksClient({ initialTasks = [] }: { initialTasks?: any[] }) {
  const [user, setUser] = useState<SessionPayload | null>(null);
  const [tasks, setTasks] = useState<ITask[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<'MY_TASKS' | 'UNASSIGNED'>('MY_TASKS');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(initialTasks.length === 0);
  const isInitialMount = React.useRef(true);

  // Edit status modal state
  const [editingTask, setEditingTask] = useState<ITask | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('TODO');
  const [taskNotes, setTaskNotes] = useState('');
  const [modalLinks, setModalLinks] = useState<{ title: string; url: string }[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [actualMinutes, setActualMinutes] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Dedicated multi-link modal state
  const [linksModalTask, setLinksModalTask] = useState<ITask | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const fetchTasks = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      let url = activeTab === 'MY_TASKS' ? '/api/tasks?myTasks=true' : '/api/tasks?assignedTo=unassigned';
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        const list = data.data?.tasks || data.tasks || (Array.isArray(data.data) ? data.data : []);
        setTasks(list);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, activeTab]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUser(data.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialTasks.length > 0 && activeTab === 'MY_TASKS' && statusFilter === 'ALL') {
        return;
      }
    }
    fetchTasks(tasks.length === 0);
  }, [fetchTasks]);

  // Real-time synchronization
  useRealTimeEvent('TASK_CREATED', (newTask) => {
    if (!newTask) return;
    const currentUserId = (user as any)?._id || user?.userId || (user as any)?.id;
    const assignedId = newTask.assignedTo?._id || newTask.assignedTo || newTask.assigneeId;
    if (assignedId && currentUserId && assignedId.toString() === currentUserId.toString()) {
      soundService.playTaskAlertSound();
      showToast(`⚡ New task assigned to you: "${newTask.title}"`, 'success');
    }
    fetchTasks(false);
  });

  useRealTimeEvent('TASK_ASSIGNED', (assignedTask) => {
    if (!assignedTask) return;
    const currentUserId = (user as any)?._id || user?.userId || (user as any)?.id;
    const assignedId = assignedTask.assignedTo?._id || assignedTask.assignedTo || assignedTask.assigneeId;
    if (assignedId && currentUserId && assignedId.toString() === currentUserId.toString()) {
      soundService.playTaskAlertSound();
      showToast(`⚡ You were assigned task: "${assignedTask.title}"`, 'success');
    }
    fetchTasks(false);
  });

  useRealTimeEvent('TASK_UPDATED', () => {
    fetchTasks(false);
  });

  useRealTimeEvent('TASK_DELETED', () => {
    fetchTasks(false);
  });

  // Stabilized task picking handler
  const handlePickTask = useCallback(async (taskId: string) => {
    try {
      const userId = (user as any)?._id || user?.userId || (user as any)?.id;
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: userId, assigneeId: userId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Failed to pick task', 'error');
      } else {
        showToast('Task picked successfully! Added to your queue.', 'success');
        fetchTasks(false);
      }
    } catch {
      showToast('Network error picking task', 'error');
    }
  }, [user, showToast, fetchTasks]);

  // Open Edit status modal
  const openEditModal = useCallback((task: ITask) => {
    setEditingTask(task);
    setTaskStatus(task.status);
    setTaskNotes(task.notes || '');
    setActualMinutes(task.actualMinutes || 0);

    const normalized = normalizeTaskLinks(task);
    setModalLinks(normalized.map((l) => ({ title: l.title, url: l.url })));
    setNewLinkTitle('');
    setNewLinkUrl('');
    setModalError(null);
  }, []);

  // Open dedicated links modal
  const handleManageLinks = useCallback((task: ITask) => {
    setLinksModalTask(task);
  }, []);

  const handleLinksUpdated = useCallback((taskId: string, updatedLinks: ITaskLink[]) => {
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, links: updatedLinks } : t))
    );
    showToast('Task links updated successfully', 'success');
  }, [showToast]);

  const handleAddModalLink = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newLinkUrl.trim()) return;
    const sanitized = sanitizeTaskUrl(newLinkUrl.trim());
    if (!isValidWebUrl(sanitized)) {
      setModalError('Please enter a valid URL');
      return;
    }
    const { iconLabel } = detectLinkCategory(sanitized);
    setModalLinks((prev) => [
      ...prev,
      {
        title: newLinkTitle.trim() || iconLabel || 'Deliverable Link',
        url: sanitized,
      },
    ]);
    setNewLinkTitle('');
    setNewLinkUrl('');
    setModalError(null);
  }, [newLinkTitle, newLinkUrl]);

  const handleRemoveModalLink = useCallback((index: number) => {
    setModalLinks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setIsSubmitting(true);
    setModalError(null);

    try {
      const payloadLinks: ITaskLink[] = modalLinks
        .map((l) => ({
          title: l.title.trim(),
          url: sanitizeTaskUrl(l.url),
        }))
        .filter((l) => isValidWebUrl(l.url));

      const firstDrive = payloadLinks.find((l) => detectLinkCategory(l.url).category === 'drive');
      const firstDoc = payloadLinks.find((l) => detectLinkCategory(l.url).category === 'docs');
      const firstOut = payloadLinks[0]?.url || '';

      const res = await fetch(`/api/tasks/${editingTask._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: taskStatus,
          notes: taskNotes,
          links: payloadLinks,
          outputUrl: firstOut || undefined,
          driveLink: firstDrive ? firstDrive.url : firstOut || undefined,
          docLink: firstDoc ? firstDoc.url : undefined,
          actualMinutes: Number(actualMinutes),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setModalError(data.message || 'Failed to update task');
      } else {
        showToast('Task updated successfully', 'success');
        setEditingTask(null);
        fetchTasks(false);
      }
    } catch {
      setModalError('Network error updating task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Memoized task item renderer for virtualized list
  const renderTaskItem = useCallback(
    (task: ITask) => {
      return (
        <EmployeeTaskCard
          task={task}
          activeTab={activeTab}
          onPickTask={handlePickTask}
          onOpenEditModal={openEditModal}
          onManageLinks={handleManageLinks}
        />
      );
    },
    [activeTab, handlePickTask, openEditModal, handleManageLinks]
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <Navbar />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-20 right-4 sm:right-8 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold border transition-all animate-in slide-in-from-bottom-5 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 border-emerald-500 text-emerald-100 shadow-emerald-950/50'
              : 'bg-rose-950 border-rose-500 text-rose-100 shadow-rose-950/50'
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header - Strictly single h1 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-rose-600" />
              Task Workspace & Assignments
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Production assignments across video editing, scripting, thumbnails, and channel deliverables.
            </p>
          </div>

          {/* Tab Selector & Status Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-200 dark:bg-slate-800 p-1 rounded-lg flex items-center gap-1">
              <button
                onClick={() => setActiveTab('MY_TASKS')}
                className={`px-3 py-1 text-xs rounded-md font-semibold transition ${
                  activeTab === 'MY_TASKS'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                My Tasks
              </button>
              <button
                onClick={() => setActiveTab('UNASSIGNED')}
                className={`px-3 py-1 text-xs rounded-md font-semibold transition ${
                  activeTab === 'UNASSIGNED'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Available / Unassigned
              </button>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="READY_FOR_REVIEW">READY FOR REVIEW</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>
        </div>

        {/* Task Cards - Virtualized with Stable Element Keys */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx} className="p-4 border-slate-200 dark:border-slate-800 animate-pulse space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-64" />
              </Card>
            ))}
          </div>
        ) : (
          <VirtualTaskList
            items={tasks}
            renderItem={renderTaskItem}
            keyExtractor={(task) => task._id}
            emptyState={
              <Card className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs border-slate-200 dark:border-slate-800">
                {activeTab === 'MY_TASKS'
                  ? 'No tasks assigned to you match your selected filter.'
                  : 'No unassigned tasks currently available.'}
              </Card>
            }
          />
        )}

        {/* Modal: Update Task Status, Notes & Output Links */}
        <Modal
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          title={`Update Task (${editingTask?.taskId})`}
          description={editingTask?.title || 'Production Task'}
        >
          {editingTask && (
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              {modalError && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Progress Status *
                </label>
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="TODO">TODO</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="BLOCKED">BLOCKED</option>
                  <option value="READY_FOR_REVIEW">READY FOR REVIEW</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>

              {/* Multiple Output Links Section */}
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Attached Deliverable Links ({modalLinks.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingTask) {
                        setEditingTask(null);
                        handleManageLinks(editingTask);
                      }
                    }}
                    className="text-[11px] text-rose-600 hover:underline flex items-center gap-1"
                  >
                    <LinkIcon className="w-3 h-3" /> Full Link Manager
                  </button>
                </div>

                {modalLinks.length > 0 && (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {modalLinks.map((l, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
                      >
                        <div className="truncate flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 shrink-0">
                            {l.title}:
                          </span>
                          <span className="font-mono text-slate-500 dark:text-slate-400 truncate">
                            {l.url}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-400 hover:text-blue-500"
                            title="Open link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveModalLink(idx)}
                            className="p-1 text-slate-400 hover:text-red-500"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Label (e.g. Export 4K)"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <input
                    type="url"
                    placeholder="URL (https://drive.google.com/...)"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="sm:col-span-2 px-2.5 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddModalLink}
                  disabled={!newLinkUrl.trim()}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-zinc-300 disabled:opacity-40 flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Link
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Actual Minutes Spent
                </label>
                <input
                  type="number"
                  min={0}
                  step={15}
                  value={actualMinutes}
                  onChange={(e) => setActualMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Production Notes
                </label>
                <textarea
                  rows={3}
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="e.g. Exported ProRes 422 rough cut onto local NAS drive / G-Drive folder"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingTask(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isSubmitting} className="font-semibold">
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* Lazy Loaded Multi-Link Management Modal */}
        {linksModalTask && (
          <Suspense fallback={null}>
            <TaskLinksModal
              isOpen={!!linksModalTask}
              task={linksModalTask}
              onClose={() => setLinksModalTask(null)}
              onLinksUpdated={handleLinksUpdated}
              isAdmin={false}
            />
          </Suspense>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
