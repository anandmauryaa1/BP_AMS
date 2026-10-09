'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  User,
  Clock,
  Calendar,
  ExternalLink,
  HardDrive,
  FileText,
  Video,
  Figma,
  Github,
  Globe,
  Link as LinkIcon,
  Plus,
} from 'lucide-react';
import { ITask } from '@/types';
import { formatDate } from '@/lib/utils';
import { normalizeTaskLinks, INormalizedLink } from '@/lib/taskUtils';

interface AdminTaskRowProps {
  task: ITask;
  projects: any[];
  employees: any[];
  onUpdateProject: (taskId: string, projectId: string) => void;
  onUpdateAssignee: (taskId: string, assigneeId: string) => void;
  onUpdateStatus: (taskId: string, status: string) => void;
  onManageLinks: (task: ITask) => void;
}

const getCategoryIcon = (category: INormalizedLink['category']) => {
  switch (category) {
    case 'drive':
      return <HardDrive className="w-3 h-3 text-emerald-500" />;
    case 'docs':
      return <FileText className="w-3 h-3 text-blue-500" />;
    case 'youtube':
      return <Video className="w-3 h-3 text-red-500" />;
    case 'figma':
      return <Figma className="w-3 h-3 text-purple-500" />;
    case 'github':
      return <Github className="w-3 h-3 text-slate-700 dark:text-slate-300" />;
    default:
      return <Globe className="w-3 h-3 text-slate-400" />;
  }
};

export const AdminTaskRow = memo(function AdminTaskRow({
  task,
  projects,
  employees,
  onUpdateProject,
  onUpdateAssignee,
  onUpdateStatus,
  onManageLinks,
}: AdminTaskRowProps) {
  const currentAssigneeId =
    (typeof task.assignedTo === 'object' ? task.assignedTo?._id : task.assignedTo) ||
    (task as any).assigneeId?._id ||
    (task as any).assigneeId ||
    '';

  const currentProjectId =
    (typeof task.projectId === 'object' ? task.projectId?._id : task.projectId) || '';

  const assigneeName =
    (typeof task.assignedTo === 'object' ? task.assignedTo?.name : task.assignedToName) ||
    (task as any).assigneeId?.name ||
    'Unassigned';

  const links = normalizeTaskLinks(task);

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-sm dark:hover:bg-zinc-900/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-900 dark:text-zinc-100 text-sm truncate max-w-md">
            {task.title}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] font-mono text-slate-700 dark:text-zinc-400 font-medium shrink-0">
            {task.taskId || (task.taskType || 'TASK').replace(/_/g, ' ')}
          </span>
          {task.priority === 'URGENT' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-500 dark:text-red-400 shrink-0">
              URGENT
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
          {task.projectId && (
            <Link
              href={`/admin/projects/${currentProjectId}`}
              className="text-slate-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-red-400 flex items-center gap-1 font-medium transition shrink-0"
            >
              <FolderKanban className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
              {(typeof task.projectId === 'object' && ((task.projectId as any).title || (task.projectId as any).name)) || 'Project'}
            </Link>
          )}
          <span className="flex items-center gap-1 text-slate-600 dark:text-zinc-400 shrink-0">
            <User className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
            {assigneeName}
          </span>
          {Boolean(task.estimatedMinutes) && (
            <span className="flex items-center gap-1 text-slate-400 dark:text-zinc-500 shrink-0">
              <Clock className="w-3.5 h-3.5" />
              {task.estimatedMinutes}m
            </span>
          )}
          {task.dueDate && (
            <span className="flex items-center gap-1 text-slate-400 dark:text-zinc-500 shrink-0">
              <Calendar className="w-3.5 h-3.5" />
              Due {formatDate(task.dueDate)}
            </span>
          )}
        </div>

        {/* Multi-links rendering & Quick Manage button */}
        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 shrink-0">
            Links ({links.length}):
          </span>

          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-medium transition group"
              title={link.url}
            >
              {getCategoryIcon(link.category)}
              <span className="truncate max-w-[140px]">{link.title}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
            </a>
          ))}

          <button
            type="button"
            onClick={() => onManageLinks(task)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 hover:border-rose-500 text-slate-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-red-400 text-[11px] font-medium transition"
          >
            <Plus className="w-3 h-3" />
            {links.length === 0 ? 'Add Links' : 'Manage'}
          </button>

          {task.notes && (
            <span className="text-slate-500 dark:text-zinc-400 text-[11px] italic truncate max-w-xs">
              "{task.notes}"
            </span>
          )}
        </div>
      </div>

      {/* Inline Assignment & Status Controls */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {/* Project Selector */}
        <select
          value={String(currentProjectId)}
          onChange={(e) => onUpdateProject(task._id, e.target.value)}
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
          onChange={(e) => onUpdateAssignee(task._id, e.target.value)}
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
          onChange={(e) => onUpdateStatus(task._id, e.target.value)}
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
});
export default AdminTaskRow;
