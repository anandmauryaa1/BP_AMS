'use client';

import React, { memo } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  FolderGit2,
  Calendar,
  ExternalLink,
  HardDrive,
  FileText,
  Video,
  Figma,
  Github,
  Globe,
  Plus,
  Link as LinkIcon,
} from 'lucide-react';
import { ITask } from '@/types';
import { formatDate } from '@/lib/utils';
import { normalizeTaskLinks, INormalizedLink } from '@/lib/taskUtils';

interface EmployeeTaskCardProps {
  task: ITask;
  activeTab: 'MY_TASKS' | 'UNASSIGNED';
  onPickTask: (taskId: string) => void;
  onOpenEditModal: (task: ITask) => void;
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

export const EmployeeTaskCard = memo(function EmployeeTaskCard({
  task,
  activeTab,
  onPickTask,
  onOpenEditModal,
  onManageLinks,
}: EmployeeTaskCardProps) {
  const links = normalizeTaskLinks(task);

  return (
    <Card className="border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono font-bold bg-slate-900 dark:bg-slate-800 text-white px-2 py-0.5 rounded border border-slate-800 dark:border-slate-700 shrink-0">
            {task.taskId || task.taskType}
          </span>
          <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-md">
            {task.title}
          </span>
          <Badge status={task.status} />
          <Badge status={task.priority} />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200 shrink-0">
            <FolderGit2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            {(task.projectId as any)?.title || 'Master Project'}
          </div>
          {task.deliverableId && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono shrink-0">
              Target: {(task.deliverableId as any)?.title || 'Deliverable'}
            </div>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-rose-700 dark:text-rose-400 shrink-0">
              <Calendar className="w-3 h-3" />
              Due: {formatDate(task.dueDate)}
            </div>
          )}
          {Boolean(task.actualMinutes) && (
            <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 shrink-0">
              Logged: {task.actualMinutes}m
            </div>
          )}
        </div>

        {task.description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 pt-1 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Multi-links rendering */}
        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 shrink-0">
            Links ({links.length}):
          </span>

          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition group"
              title={link.url}
            >
              {getCategoryIcon(link.category)}
              <span className="truncate max-w-[130px]">{link.title}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
            </a>
          ))}

          <button
            type="button"
            onClick={() => onManageLinks(task)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed border-slate-300 dark:border-zinc-700 hover:border-blue-500 text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 text-[11px] font-medium transition"
          >
            <Plus className="w-3 h-3" />
            {links.length === 0 ? 'Add Links' : 'Manage Links'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        {activeTab === 'UNASSIGNED' || !(task as any).assignedTo ? (
          <Button
            size="sm"
            onClick={() => onPickTask(task._id)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1"
          >
            Pick / Claim Task
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onManageLinks(task)}
              className="text-xs font-semibold gap-1"
            >
              <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
              Links
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => onOpenEditModal(task)}
              className="text-xs font-semibold"
            >
              Update Status
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
});
export default EmployeeTaskCard;
