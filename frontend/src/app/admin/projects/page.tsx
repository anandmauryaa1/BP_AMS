'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  Calendar,
  Layers,
  ChevronRight,
  Tv,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { ProjectStatus, Priority } from '@/types';

interface IProject {
  _id: string;
  title: string;
  code?: string;
  projectId?: string;
  description?: string;
  status: ProjectStatus;
  priority: Priority;
  channelId?: { _id: string; name: string; code?: string; platform?: string };
  channelIds?: { _id: string; name: string; code?: string; platform?: string }[];
  seriesId?: { _id: string; name: string; code?: string };
  leadAssigneeId?: { _id: string; name: string; email?: string };
  targetReleaseDate?: string;
  tags?: string[];
  createdAt: string;
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<IProject[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    code: '',
    description: '',
    channelId: '',
    seriesId: '',
    leadAssigneeId: '',
    priority: 'MEDIUM',
    targetReleaseDate: '',
    tags: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      let url = '/api/projects';
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (channelFilter !== 'ALL') params.append('channelId', channelFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      const list = data.data?.projects || data.projects || (Array.isArray(data.data) ? data.data : []);
      setProjects(list);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [chanRes, empRes] = await Promise.all([
        fetch('/api/channels'),
        fetch('/api/admin/employees'),
      ]);
      const chanData = await chanRes.json();
      const empData = await empRes.json();
      const chanList = chanData.data?.channels || chanData.channels || [];
      const empList = empData.data?.employees || empData.employees || [];
      setChannels(chanList);
      setEmployees(empList);
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [statusFilter, channelFilter]);

  const handleChannelChangeInModal = async (channelId: string) => {
    setForm({ ...form, channelId, seriesId: '' });
    if (!channelId) {
      setSeriesList([]);
      return;
    }
    try {
      const res = await fetch(`/api/series?channelId=${channelId}`);
      const data = await res.json();
      const list = data.data?.series || data.series || [];
      setSeriesList(list);
    } catch (err) {
      console.error('Failed to fetch series for channel:', err);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        title: form.title.trim(),
        code: form.code.trim().toUpperCase(),
        projectId: form.code.trim().toUpperCase(),
        description: form.description?.trim() || undefined,
        channelId: form.channelId,
        channelIds: [form.channelId],
        seriesId: form.seriesId || undefined,
        leadAssigneeId: form.leadAssigneeId || undefined,
        priority: form.priority,
        targetReleaseDate: form.targetReleaseDate || undefined,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to create project');
      }

      setForm({
        title: '',
        code: '',
        description: '',
        channelId: '',
        seriesId: '',
        leadAssigneeId: '',
        priority: 'MEDIUM',
        targetReleaseDate: '',
        tags: '',
      });
      setIsModalOpen(false);
      await fetchProjects();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the project');
    } finally {
      setSaving(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const title = (p.title || '').toLowerCase();
    const code = (p.code || p.projectId || '').toLowerCase();
    const channelName = (p.channelId?.name || (Array.isArray(p.channelIds) && p.channelIds[0]?.name) || '').toLowerCase();
    return title.includes(q) || code.includes(q) || channelName.includes(q);
  });

  const getStatusBadge = (status?: string) => {
    const safeStatus = status || 'PLANNED';
    const map: Record<string, { bg: string; text: string; border: string }> = {
      IDEA: { bg: 'bg-zinc-800', text: 'text-zinc-400', border: 'border-zinc-700' },
      PLANNED: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
      RESEARCH: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
      SCRIPTING: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
      PRE_PRODUCTION: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
      SHOOTING: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
      EDITING: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
      POST_PRODUCTION: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
      REVIEW: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
      READY_FOR_RELEASE: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
      APPROVED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
      PUBLISHED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
      ARCHIVED: { bg: 'bg-zinc-900', text: 'text-zinc-500', border: 'border-zinc-800' },
    };
    const style = map[safeStatus] || map.PLANNED;
    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${style.bg} ${style.text} ${style.border}`}>
        {safeStatus.replace(/_/g, ' ')}
      </span>
    );
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'URGENT':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-500">URGENT</span>;
      case 'HIGH':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-500">HIGH</span>;
      case 'LOW':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">LOW</span>;
      case 'MEDIUM':
      default:
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">MED</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <FolderKanban className="w-6 h-6 text-rose-600 dark:text-red-500" />
              Content Projects
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Master content pipeline: planning, shooting, post-production, and multi-format deliverables.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchProjects}
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
              New Project
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-zinc-900/40 p-3 rounded-xl border border-slate-200 dark:border-zinc-800/80 shadow-sm">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search title, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Channel filter */}
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="ALL">All Channels</option>
              {channels.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.platform})
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="ALL">All Pipeline Stages</option>
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

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-44 bg-slate-100 dark:bg-zinc-900/40 rounded-xl border border-slate-200 dark:border-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900/40 rounded-2xl border border-slate-200 dark:border-zinc-800 p-12 text-center text-slate-500 dark:text-zinc-500 shadow-sm">
            <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
            <p className="text-base font-medium text-slate-700 dark:text-zinc-400">No content projects match the current filter.</p>
            <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">Create a new project to start tracking media deliverables and tasks.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <Link
                key={project._id}
                href={`/admin/projects/${project._id}`}
                className="group block p-5 rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 hover:border-rose-500/50 hover:shadow-md dark:hover:border-red-500/50 dark:hover:bg-zinc-900 transition relative space-y-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-400 font-semibold">
                        {project.code || project.projectId}
                      </span>
                      {getPriorityBadge(project.priority)}
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-zinc-100 group-hover:text-rose-600 dark:group-hover:text-red-400 transition line-clamp-1 text-base">
                      {project.title}
                    </h3>
                  </div>
                  {getStatusBadge(project.status)}
                </div>

                {project.description && (
                  <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2">{project.description}</p>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
                    <span className="text-slate-700 dark:text-zinc-300 font-medium">
                      {project.channelId?.name || (Array.isArray(project.channelIds) && project.channelIds[0]?.name) || 'Blindarea'}
                    </span>
                    {project.seriesId && (
                      <span className="text-slate-400 dark:text-zinc-500">/ {project.seriesId.name}</span>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 dark:text-zinc-600 group-hover:text-rose-600 dark:group-hover:text-red-400 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Create Project Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl my-8">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-rose-600 dark:text-red-500" />
                  Create Master Content Project
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 text-sm"
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

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                    Project Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., iPhone 17 Pro Max 30-Day Honest Review"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Project Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., IPH17-REV"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Channel *
                    </label>
                    <select
                      required
                      value={form.channelId}
                      onChange={(e) => handleChannelChangeInModal(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      <option value="">Select Channel...</option>
                      {channels.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} ({c.platform})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Series (Optional)
                    </label>
                    <select
                      value={form.seriesId}
                      disabled={!form.channelId || seriesList.length === 0}
                      onChange={(e) => setForm({ ...form, seriesId: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50"
                    >
                      <option value="">None / Standalone</option>
                      {seriesList.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Lead Producer / Assignee
                    </label>
                    <select
                      value={form.leadAssigneeId}
                      onChange={(e) => setForm({ ...form, leadAssigneeId: e.target.value })}
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
                      Target Release Date
                    </label>
                    <input
                      type="date"
                      value={form.targetReleaseDate}
                      onChange={(e) => setForm({ ...form, targetReleaseDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                    Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Tech, Flagship, Comparison, Sponsor"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                    Description / Concept Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Outline, sponsor requirements, or production references..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
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
                    {saving ? 'Creating...' : 'Create Project'}
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
