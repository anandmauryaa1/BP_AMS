'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckSquare,
  Clock,
  Mail,
  Palmtree,
  Trash2,
  Wand2,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatMinutes, toLocalDateTimeInput } from '@/lib/utils';
import {
  ATTENDANCE_STATUS_OPTIONS,
  LEAVE_STATUS_OPTIONS,
  LEAVE_TYPE_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  TASK_TYPE_OPTIONS,
  estimateLateFromCheckIn,
  getAuthHeaders,
  toDateKey,
} from './operationsCalendarHelpers';

interface TaskCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: any | null;
  defaultDate: string;
  employees: any[];
  projects: any[];
  onSaved: (message: string) => void;
}

export const TaskCalendarModal: React.FC<TaskCalendarModalProps> = ({
  isOpen,
  onClose,
  task,
  defaultDate,
  employees,
  projects,
  onSaved,
}) => {
  const isEdit = Boolean(task?._id);
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState('VIDEO_EDITING');
  const [status, setStatus] = useState('TODO');
  const [priority, setPriority] = useState('MEDIUM');
  const [assignedTo, setAssignedTo] = useState('');
  const [projectId, setProjectId] = useState('');
  const [dueDate, setDueDate] = useState(defaultDate);
  const [estimatedMinutes, setEstimatedMinutes] = useState('120');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setConfirmDelete(false);
    if (task) {
      setTitle(task.title || '');
      setTaskType(task.taskType || 'VIDEO_EDITING');
      setStatus(task.status || 'TODO');
      setPriority(task.priority || 'MEDIUM');
      const assigneeId = task.assignedTo?._id || task.assignedTo || '';
      setAssignedTo(assigneeId ? String(assigneeId) : '');
      const projId = task.projectId?._id || task.projectId || '';
      setProjectId(projId ? String(projId) : '');
      setDueDate(toDateKey(task.dueDate || task.startDate) || defaultDate);
      setEstimatedMinutes(String(task.estimatedMinutes ?? 120));
      setDescription(task.description || '');
    } else {
      setTitle('');
      setTaskType('VIDEO_EDITING');
      setStatus('TODO');
      setPriority('MEDIUM');
      setAssignedTo('');
      setProjectId('');
      setDueDate(defaultDate);
      setEstimatedMinutes('120');
      setDescription('');
    }
  }, [isOpen, task, defaultDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, any> = {
        title: title.trim(),
        taskType,
        type: taskType,
        status,
        priority,
        assignedTo: assignedTo || undefined,
        assigneeId: assignedTo || undefined,
        projectId: projectId || undefined,
        dueDate: dueDate || undefined,
        estimatedMinutes: Math.max(0, parseInt(estimatedMinutes, 10) || 60),
        description: description.trim() || undefined,
      };

      const url = isEdit ? `/api/tasks/${task._id}` : '/api/tasks';
      const method = isEdit ? 'PATCH' : 'POST';
      if (isEdit && !assignedTo) {
        payload.assignedTo = 'unassigned';
        payload.assigneeId = 'unassigned';
      }
      if (isEdit && !projectId) {
        payload.projectId = null;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to save task');
      }
      onSaved(isEdit ? 'Task updated on calendar.' : 'New task scheduled on calendar.');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task?._id) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete task');
      }
      onSaved('Task deleted from calendar.');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete task');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={isEdit ? `Edit Task (${task.taskId || 'Task'})` : 'Schedule New Production Task'}
      description={isEdit ? 'Update status, assignee, priority, or deadline.' : 'Assign a task on the selected calendar date.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
            Task Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Final color grade for episode 4"
            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold"
            >
              {TASK_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold"
            >
              {TASK_PRIORITY_OPTIONS.map((pr) => (
                <option key={pr} value={pr}>{pr}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
              Task Type
            </label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
            >
              {TASK_TYPE_OPTIONS.map((tp) => (
                <option key={tp} value={tp}>{tp.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
              Assign Employee
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
            >
              <option value="">Unassigned</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
            >
              <option value="">General / No Project</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title || p.name} {p.code ? `(${p.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
              Due Date *
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
              Estimated Minutes
            </label>
            <input
              type="number"
              min={5}
              max={2400}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
            Notes / Instructions
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional production notes or deliverable instructions"
            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          {isEdit ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <Button type="button" variant="danger" size="sm" isLoading={deleting} onClick={handleDelete}>
                  Confirm Delete
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Task
              </Button>
            )
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={saving}>
              <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
              {isEdit ? 'Save Task' : 'Create Task'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

interface LeaveCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  leave: any | null;
  defaultDate: string;
  employees: any[];
  onSaved: (message: string) => void;
}

export const LeaveCalendarModal: React.FC<LeaveCalendarModalProps> = ({
  isOpen,
  onClose,
  leave,
  defaultDate,
  employees,
  onSaved,
}) => {
  const isEdit = Boolean(leave?._id);
  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState('CASUAL');
  const [status, setStatus] = useState('APPROVED');
  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState(defaultDate);
  const [reason, setReason] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showDeleteBox, setShowDeleteBox] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setShowDeleteBox(false);
    setDeletionReason('');
    setEditNotes('');
    if (leave) {
      setEmployeeId(leave.employeeId || leave.userId?.employeeId || '');
      setLeaveType(leave.leaveType || leave.type || 'CASUAL');
      setStatus(leave.status || 'APPROVED');
      setStartDate(toDateKey(leave.startDate) || defaultDate);
      setEndDate(toDateKey(leave.endDate || leave.startDate) || defaultDate);
      setReason(leave.reason || '');
    } else {
      setEmployeeId(employees[0]?.employeeId || '');
      setLeaveType('CASUAL');
      setStatus('APPROVED');
      setStartDate(defaultDate);
      setEndDate(defaultDate);
      setReason('');
    }
  }, [isOpen, leave, defaultDate, employees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      setError('Please select an employee');
      return;
    }
    if (!startDate || !endDate || endDate < startDate) {
      setError('Please choose a valid start and end date');
      return;
    }
    if (!reason.trim()) {
      setError('Leave reason is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const selectedEmp = employees.find((emp) => emp.employeeId === employeeId || emp._id === employeeId);
      const payload: Record<string, any> = {
        employeeId: selectedEmp?.employeeId || employeeId,
        employeeName: selectedEmp?.name,
        leaveType,
        type: leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
        status,
      };
      if (isEdit && editNotes.trim()) {
        payload.editNotes = editNotes.trim();
      }

      const url = isEdit ? `/api/leaves/${leave._id}` : '/api/leaves';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save leave');
      }
      onSaved(
        data.message ||
          (isEdit ? 'Leave updated & reminder email sent to employee.' : 'Leave created & reminder email sent to employee.')
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save leave');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!leave?._id) return;
    if (deletionReason.trim().length < 3) {
      setError('Please write a short message (min 3 characters) explaining why this leave is being removed.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/leaves/${leave._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({ deletionReason: deletionReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove leave');
      }
      onSaved(data.message || 'Leave removed & notification sent to employee.');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete leave');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={isEdit ? `Edit Leave — ${leave.employeeName || leave.userId?.name || leave.employeeId}` : 'Create Employee Leave'}
      description="Changes automatically trigger an email reminder/notice to the employee."
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {showDeleteBox && isEdit ? (
          <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/70 space-y-3">
            <div className="text-xs font-bold text-rose-700 dark:text-rose-300">
              Remove Mistakenly Created Leave
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Provide a short explanation (sent to the employee by email and saved in leave audit logs):
            </p>
            <textarea
              rows={2}
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              placeholder="e.g. Entered by mistake for wrong date; employee worked full shift."
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-rose-300 dark:border-rose-800 rounded-lg"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteBox(false)}>
                Back
              </Button>
              <Button type="button" variant="danger" size="sm" isLoading={saving} onClick={handleDelete}>
                Confirm Delete & Notify
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Employee *
                </label>
                <select
                  value={employeeId}
                  disabled={isEdit}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-60"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp.employeeId}>
                      {emp.name} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                    Leave Type
                  </label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                  >
                    {LEAVE_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold"
                  >
                    {LEAVE_STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                Leave Reason *
              </label>
              <textarea
                rows={2}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for leave"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            {isEdit && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Admin Update Note (emailed to employee)
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Optional short note explaining the change"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              {isEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteBox(true)}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete Mistake
                </Button>
              ) : (
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  Employee email reminder included
                </span>
              )}

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={saving}>
                  <Palmtree className="w-3.5 h-3.5 mr-1.5" />
                  {isEdit ? 'Save Leave' : 'Create Leave'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

interface AttendanceCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: any | null;
  defaultDate: string;
  employees: any[];
  onSaved: (message: string) => void;
}

export const AttendanceCalendarModal: React.FC<AttendanceCalendarModalProps> = ({
  isOpen,
  onClose,
  record,
  defaultDate,
  employees,
  onSaved,
}) => {
  const isEdit = Boolean(record?._id);
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [status, setStatus] = useState('COMPLETED');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [isLate, setIsLate] = useState(false);
  const [lateMinutes, setLateMinutes] = useState('0');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (record) {
      setEmployeeId(record.employeeId || '');
      setDate(record.date || defaultDate);
      setStatus(record.status === 'NOT_CHECKED_IN' ? 'PRESENT' : record.status || 'PRESENT');
      setCheckIn(toLocalDateTimeInput(record.checkIn));
      setCheckOut(toLocalDateTimeInput(record.checkOut));
      setIsLate(Boolean(record.isLate || (record.lateMinutes && record.lateMinutes > 0)));
      setLateMinutes(String(record.lateMinutes || 0));
      setReason(record.notes || '');
    } else {
      setEmployeeId(employees[0]?.employeeId || '');
      setDate(defaultDate);
      setStatus('COMPLETED');
      setCheckIn(`${defaultDate}T09:30`);
      setCheckOut(`${defaultDate}T18:30`);
      setIsLate(false);
      setLateMinutes('0');
      setReason('');
    }
  }, [isOpen, record, defaultDate, employees]);

  const isAbsentMode = status === 'ABSENT';

  const handleSelectMarkMode = (mode: 'PRESENT' | 'ABSENT') => {
    setError(null);
    if (mode === 'ABSENT') {
      setStatus('ABSENT');
      setCheckIn('');
      setCheckOut('');
      setIsLate(false);
      setLateMinutes('0');
    } else {
      const nextStatus = checkOut ? 'COMPLETED' : 'PRESENT';
      setStatus(nextStatus);
      if (!checkIn && date) {
        setCheckIn(`${date}T09:30`);
      }
    }
  };

  const handleAutoCalcLate = () => {
    const shiftStart = record?.scheduledShiftStart || '09:30';
    const grace = record?.lateGraceMinutes ?? 15;
    const calc = estimateLateFromCheckIn(checkIn, shiftStart, grace);
    setIsLate(calc.isLate);
    setLateMinutes(String(calc.lateMinutes));
  };

  const handleCheckInChange = (val: string) => {
    setCheckIn(val);
    if (val) {
      const shiftStart = record?.scheduledShiftStart || '09:30';
      const grace = record?.lateGraceMinutes ?? 15;
      const calc = estimateLateFromCheckIn(val, shiftStart, grace);
      setIsLate(calc.isLate);
      setLateMinutes(String(calc.lateMinutes));
    }
  };

  const previewWorkingMinutes = (() => {
    if (!checkIn || !checkOut) return 0;
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    if (isNaN(diff) || diff <= 0) return 0;
    return Math.max(0, Math.floor(diff / 60000) - (Number(record?.totalBreakMinutes) || 0));
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      setError('Please select an employee');
      return;
    }
    if (isAbsentMode && !reason.trim()) {
      setError('Absent reason is required when marking an employee as Absent.');
      return;
    }
    if (!isAbsentMode && checkIn && checkOut && new Date(checkOut) < new Date(checkIn)) {
      setError('Check-out timestamp cannot be earlier than check-in timestamp');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          attendanceId: record?._id,
          employeeId,
          date,
          status,
          checkIn: isAbsentMode ? null : checkIn ? new Date(checkIn).toISOString() : null,
          checkOut: isAbsentMode ? null : checkOut ? new Date(checkOut).toISOString() : null,
          isLate: isAbsentMode ? false : isLate,
          lateMinutes: isAbsentMode ? 0 : isLate ? Math.max(0, Number(lateMinutes) || 0) : 0,
          reason: reason.trim() || 'Admin calendar attendance update',
          notes: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to update attendance');
      }
      onSaved(
        isEdit
          ? `Attendance updated for ${record.employeeName || employeeId} (${date}).`
          : `Attendance recorded for ${employeeId} (${date}).`
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={
        isEdit
          ? `Update Attendance — ${record.employeeName || record.employeeId} (${record.date})`
          : 'Mark / Update Employee Attendance'
      }
      description="Mark an employee Present or Absent (with reason), or adjust check-in, check-out, and late minutes."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Present / Absent Quick Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
            Attendance Decision
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleSelectMarkMode('PRESENT')}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                !isAbsentMode
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/40'
                  : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              Present / Shift Log
            </button>
            <button
              type="button"
              onClick={() => handleSelectMarkMode('ABSENT')}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                isAbsentMode
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/40'
                  : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              Absent (Reason Required)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
              Employee *
            </label>
            <select
              value={employeeId}
              disabled={isEdit}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-60"
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp.employeeId}>
                  {emp.name} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
              Date *
            </label>
            <input
              type="date"
              required
              disabled={isEdit}
              value={date}
              onChange={(e) => {
                const nextDate = e.target.value;
                setDate(nextDate);
                if (!isEdit && nextDate && !isAbsentMode) {
                  setCheckIn(`${nextDate}T09:30`);
                  setCheckOut(`${nextDate}T18:30`);
                }
              }}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'ABSENT') {
                  handleSelectMarkMode('ABSENT');
                } else {
                  setStatus(val);
                  if (!checkIn && date) setCheckIn(`${date}T09:30`);
                }
              }}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold"
            >
              {ATTENDANCE_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>

        {isAbsentMode ? (
          <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200">
            This employee will be marked <span className="font-bold">ABSENT</span> for {date}. Any check-in, check-out, or late minutes for this day will be cleared. Please provide the reason below.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Check-In Time
                  </label>
                  {checkIn && (
                    <button
                      type="button"
                      onClick={() => handleCheckInChange('')}
                      className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="datetime-local"
                  value={checkIn}
                  onChange={(e) => handleCheckInChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Check-Out Time
                  </label>
                  {checkOut && (
                    <button
                      type="button"
                      onClick={() => setCheckOut('')}
                      className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="datetime-local"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/60 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLate}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsLate(checked);
                      if (!checked) setLateMinutes('0');
                      else if (Number(lateMinutes) <= 0) setLateMinutes('15');
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  Mark Check-In as Late
                </label>
                <button
                  type="button"
                  onClick={handleAutoCalcLate}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline"
                >
                  <Wand2 className="w-3 h-3" />
                  Auto-calc from shift ({record?.scheduledShiftStart || '09:30'})
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Late Minutes
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={720}
                    disabled={!isLate}
                    value={isLate ? lateMinutes : '0'}
                    onChange={(e) => setLateMinutes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-50"
                  />
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 px-3 py-2 rounded-lg border border-amber-200/70 dark:border-amber-900/40 flex items-center justify-between">
                  <span className="font-medium">Working Hours Preview:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {previewWorkingMinutes > 0 ? formatMinutes(previewWorkingMinutes) : '--'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
            {isAbsentMode ? 'Absent Reason *' : 'Audit Reason / Notes'}
          </label>
          <input
            type="text"
            required={isAbsentMode}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              isAbsentMode
                ? 'e.g. Uninformed absence, medical rest, personal emergency'
                : 'e.g. Manual check-in/out correction or waived late penalty'
            }
            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={saving}>
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            {isEdit ? 'Save Attendance Changes' : 'Save Attendance'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

