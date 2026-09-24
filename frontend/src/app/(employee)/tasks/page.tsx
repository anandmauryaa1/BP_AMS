'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileNav } from '@/components/MobileNav';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  CheckSquare,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FolderGit2,
  FileText,
  Filter,
} from 'lucide-react';
import { ITask, SessionPayload, TaskStatus } from '@/types';

export default function EmployeeTasksPage() {
  const [user, setUser] = useState<SessionPayload | null>(null);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<ITask | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('TODO');
  const [taskNotes, setTaskNotes] = useState('');
  const [actualMinutes, setActualMinutes] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (meData.success) setUser(meData.data);

      let url = '/api/tasks?myTasks=true';
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTasks(data.data.tasks || []);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const openEditModal = (task: ITask) => {
    setEditingTask(task);
    setTaskStatus(task.status);
    setTaskNotes(task.notes || '');
    setActualMinutes(task.actualMinutes || 0);
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/tasks/${editingTask._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: taskStatus,
          notes: taskNotes,
          actualMinutes: Number(actualMinutes),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Failed to update task', 'error');
      } else {
        showToast('Task updated successfully', 'success');
        setEditingTask(null);
        fetchTasks();
      }
    } catch {
      showToast('Network error updating task', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 md:pb-8 transition-colors">
      <Navbar user={user} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`fixed top-20 right-4 z-50 p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-3 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              My Production Tasks
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Production assignments across video editing, scripting, thumbnails, and channel deliverables.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2">
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

        {/* Task Cards Grid */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx} className="p-4 border-slate-200 dark:border-slate-800 animate-pulse space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-64" />
              </Card>
            ))
          ) : tasks.length === 0 ? (
            <Card className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs border-slate-200 dark:border-slate-800">
              No tasks match your selected filter.
            </Card>
          ) : (
            tasks.map((task) => (
              <Card
                key={task._id}
                className="border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold bg-slate-900 dark:bg-slate-800 text-white px-2 py-0.5 rounded border border-slate-800 dark:border-slate-700">
                      {task.taskType}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{task.title}</span>
                    <Badge status={task.status} />
                    <Badge status={task.priority} />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                      <FolderGit2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      {(task.projectId as any)?.title || 'Master Project'}
                    </div>
                    {task.deliverableId && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        Target: {(task.deliverableId as any)?.title || 'Deliverable'}
                      </div>
                    )}
                    {task.dueDate && (
                      <div className="flex items-center gap-1 text-[11px] font-mono text-rose-700 dark:text-rose-400">
                        <Calendar className="w-3 h-3" />
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    )}
                    {task.actualMinutes ? (
                      <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                        Logged: {task.actualMinutes} mins
                      </div>
                    ) : null}
                  </div>

                  {task.description && <p className="text-xs text-slate-600 dark:text-slate-400 pt-1">{task.description}</p>}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <Button size="sm" variant="outline" onClick={() => openEditModal(task)} className="text-xs font-semibold">
                    Update Status
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Modal: Update Task Status & Notes */}
        <Modal
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          title={`Update Task (${editingTask?.taskId})`}
          description={editingTask?.title || 'Production Task'}
        >
          {editingTask && (
            <form onSubmit={handleTaskSubmit} className="space-y-4">
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
                  Production Notes / Links
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
      </main>

      <MobileNav />
    </div>
  );
}

