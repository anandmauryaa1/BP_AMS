'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Tv,
  Video,
  Share2,
  Clock,
  RefreshCw,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  PlaySquare,
  Sparkles,
  User,
  FolderKanban,
  ExternalLink,
  Tag,
  X,
  Edit3,
  HardDrive,
  FileText,
  Globe,
  Link as LinkIcon,
  Copy,
  Check,
} from 'lucide-react';
import { useRealTimeEvent } from '@/context/RealTimeContext';

export default function AdminCalendarClient({ initialDeliverables = [], initialChannels = [], initialProjects = [], initialEmployees = [] }: { initialDeliverables?: any[]; initialChannels?: any[]; initialProjects?: any[]; initialEmployees?: any[] }) {
  const [deliverables, setDeliverables] = useState<any[]>(initialDeliverables);
  const [channels, setChannels] = useState<any[]>(initialChannels);
  const [projects, setProjects] = useState<any[]>(initialProjects);
  const [employees, setEmployees] = useState<any[]>(initialEmployees);

  // Filters
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Date State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(initialDeliverables.length === 0);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDayForCreate, setSelectedDayForCreate] = useState<string>('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeDeliverable, setActiveDeliverable] = useState<any>(null);
  const [isEditingDetailLinks, setIsEditingDetailLinks] = useState(false);
  const [detailLinksForm, setDetailLinksForm] = useState({
    driveLink: '',
    docLink: '',
    outputUrl: '',
    publishedUrl: '',
    outputNotes: '',
  });
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingLinks, setSavingLinks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedLink(id);
      setTimeout(() => setCopiedLink(null), 2000);
    }
  };

  const handleOpenDetailModal = (deliv: any) => {
    setActiveDeliverable(deliv);
    setDetailLinksForm({
      driveLink: deliv.driveLink || '',
      docLink: deliv.docLink || '',
      outputUrl: deliv.outputUrl || '',
      publishedUrl: deliv.publishedUrl || '',
      outputNotes: deliv.outputNotes || '',
    });
    setIsEditingDetailLinks(false);
    setIsDetailModalOpen(true);
  };

  const handleSaveDetailLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeliverable) return;
    setSavingLinks(true);
    try {
      const res = await fetch(`/api/deliverables/${activeDeliverable._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveLink: detailLinksForm.driveLink.trim() || undefined,
          docLink: detailLinksForm.docLink.trim() || undefined,
          outputUrl: detailLinksForm.outputUrl.trim() || undefined,
          publishedUrl: detailLinksForm.publishedUrl.trim() || undefined,
          outputNotes: detailLinksForm.outputNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update deliverable links');

      const updated = data.data || { ...activeDeliverable, ...detailLinksForm };
      setActiveDeliverable(updated);
      setIsEditingDetailLinks(false);
      await fetchCalendarData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingLinks(false);
    }
  };

  // Form State for New Deliverable
  const [saving, setSaving] = useState(false);
  const [newForm, setNewForm] = useState({
    title: '',
    projectId: '',
    channelId: '',
    platform: 'YOUTUBE',
    format: 'FULL_VIDEO',
    scheduledAt: '',
    status: 'SCHEDULED',
    caption: '',
    driveLink: '',
    docLink: '',
    outputUrl: '',
    publishedUrl: '',
    outputNotes: '',
  });

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const [delivRes, chanRes, projRes, empRes] = await Promise.all([
        fetch('/api/deliverables'),
        fetch('/api/channels'),
        fetch('/api/projects'),
        fetch('/api/admin/employees'),
      ]);

      const delivData = await delivRes.json();
      const chanData = await chanRes.json();
      const projData = await projRes.json();
      const empData = await empRes.json();

      const foundDelivs = Array.isArray(delivData.data) ? delivData.data : (delivData.data?.deliverables || delivData.deliverables || []);
      const foundChans = Array.isArray(chanData.data) ? chanData.data : (chanData.data?.channels || chanData.channels || []);
      const foundProjs = Array.isArray(projData.data) ? projData.data : (projData.data?.projects || projData.projects || []);
      const foundEmps = Array.isArray(empData.data) ? empData.data : (empData.data?.employees || empData.employees || []);

      setDeliverables(foundDelivs);
      setChannels(foundChans);
      setProjects(foundProjs);
      setEmployees(foundEmps);
    } catch (err) {
      console.error('Failed to load calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  // Real-time synchronization
  useRealTimeEvent('DELIVERABLE_CREATED', (newDeliv) => {
    if (!newDeliv) return;
    setDeliverables((prev) => {
      const exists = prev.some((d) => d._id === newDeliv._id);
      if (exists) return prev.map((d) => (d._id === newDeliv._id ? { ...d, ...newDeliv } : d));
      return [...prev, newDeliv];
    });
  });

  useRealTimeEvent('DELIVERABLE_UPDATED', (updatedDeliv) => {
    if (!updatedDeliv) return;
    setDeliverables((prev) =>
      prev.map((d) => (d._id === updatedDeliv._id ? { ...d, ...updatedDeliv } : d))
    );
    if (activeDeliverable && activeDeliverable._id === updatedDeliv._id) {
      setActiveDeliverable((prev: any) => ({ ...prev, ...updatedDeliv }));
    }
  });

  useRealTimeEvent('DELIVERABLE_DELETED', (deletedDeliv) => {
    const delivId = deletedDeliv?._id || deletedDeliv?.deliverableId;
    if (delivId) {
      setDeliverables((prev) => prev.filter((d) => d._id !== delivId));
    }
  });

  useRealTimeEvent('PROJECT_CREATED', () => {
    fetchCalendarData();
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

  // Helper for Local Date YYYY-MM-DD
  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Get calendar days matrix
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }

  // Extract scheduled date string safely
  const getDeliverableDateStr = (deliv: any) => {
    const rawDate = deliv.scheduledAt || deliv.scheduledReleaseDate;
    if (!rawDate) return null;
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return null;
    return formatLocalDate(d);
  };

  const getDeliverablesForDate = (date: Date) => {
    const dateStr = formatLocalDate(date);
    return deliverables.filter((deliv) => {
      const delivDateStr = getDeliverableDateStr(deliv);
      if (delivDateStr !== dateStr) return false;

      // Channel Filter
      const chanId = deliv.channelId?._id || deliv.channelId || deliv.projectId?.channelId?._id || deliv.projectId?.channelId;
      if (selectedChannel !== 'ALL' && chanId !== selectedChannel) return false;

      // Platform Filter
      if (selectedPlatform !== 'ALL' && deliv.platform !== selectedPlatform) return false;

      // Status Filter
      if (selectedStatus !== 'ALL' && deliv.status !== selectedStatus) return false;

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = deliv.title?.toLowerCase().includes(query);
        const codeMatch = deliv.deliverableId?.toLowerCase().includes(query);
        if (!titleMatch && !codeMatch) return false;
      }

      return true;
    });
  };

  // Month Statistics
  const monthDeliverables = deliverables.filter((deliv) => {
    const delivDateStr = getDeliverableDateStr(deliv);
    if (!delivDateStr) return false;
    const [dYear, dMonth] = delivDateStr.split('-').map(Number);
    return dYear === year && dMonth === month + 1;
  });

  const totalMonthScheduled = monthDeliverables.length;
  const monthPublishedCount = monthDeliverables.filter((d) => d.status === 'PUBLISHED').length;
  const monthScheduledCount = monthDeliverables.filter((d) => d.status === 'SCHEDULED' || d.status === 'APPROVED').length;
  const monthInProductionCount = monthDeliverables.filter((d) => d.status === 'PLANNED' || d.status === 'IN_PRODUCTION' || d.status === 'READY_FOR_REVIEW').length;

  const handleOpenCreateModal = (date?: Date) => {
    setError(null);
    const dateStr = date ? formatLocalDate(date) : formatLocalDate(new Date());
    setSelectedDayForCreate(dateStr);
    setNewForm({
      title: '',
      projectId: String(projects[0]?._id || projects[0]?.id || ''),
      channelId: String(channels[0]?._id || channels[0]?.id || ''),
      platform: 'YOUTUBE',
      format: 'FULL_VIDEO',
      scheduledAt: dateStr,
      status: 'SCHEDULED',
      caption: '',
      driveLink: '',
      docLink: '',
      outputUrl: '',
      publishedUrl: '',
      outputNotes: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!newForm.projectId) {
      setError('Please select a project');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/deliverables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newForm,
          scheduledAt: newForm.scheduledAt ? new Date(newForm.scheduledAt).toISOString() : undefined,
          driveLink: newForm.driveLink?.trim() || undefined,
          docLink: newForm.docLink?.trim() || undefined,
          outputUrl: newForm.outputUrl?.trim() || undefined,
          publishedUrl: newForm.publishedUrl?.trim() || undefined,
          outputNotes: newForm.outputNotes?.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule content');

      setIsCreateModalOpen(false);
      await fetchCalendarData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (delivId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/deliverables/${delivId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      setActiveDeliverable(data.data || { ...activeDeliverable, status: newStatus });
      await fetchCalendarData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getPlatformStyle = (platform: string) => {
    switch (platform) {
      case 'YOUTUBE':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50';
      case 'INSTAGRAM':
        return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-900/50';
      case 'FACEBOOK':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-zinc-800';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'SCHEDULED':
      case 'APPROVED':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'READY_FOR_REVIEW':
      case 'IN_PRODUCTION':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      default:
        return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col">
      <Navbar />
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Header & Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-red-500" />
              Content Release Calendar
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Multi-channel broadcast schedule across YouTube, Instagram, and Facebook.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleOpenCreateModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              Schedule Content
            </button>
            <button
              onClick={fetchCalendarData}
              className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition shadow-sm"
              title="Refresh Calendar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase">Monthly Releases</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{totalMonthScheduled}</div>
            </div>
            <PlaySquare className="w-6 h-6 text-slate-400 dark:text-zinc-600" />
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase">Published</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{monthPublishedCount}</div>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-500/60" />
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-blue-600 dark:text-blue-400 uppercase">Scheduled</div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">{monthScheduledCount}</div>
            </div>
            <Clock className="w-6 h-6 text-blue-500/60" />
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase">In Production</div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{monthInProductionCount}</div>
            </div>
            <Video className="w-6 h-6 text-amber-500/60" />
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white dark:bg-zinc-900/50 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Search content release title or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-300 text-xs focus:outline-none focus:border-red-500"
              >
                <option value="ALL">All Channels</option>
                {channels.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.platform})
                  </option>
                ))}
              </select>

              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-300 text-xs focus:outline-none focus:border-red-500"
              >
                <option value="ALL">All Platforms</option>
                <option value="YOUTUBE">YouTube</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="OTHER">Other</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-300 text-xs focus:outline-none focus:border-red-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="PUBLISHED">Published</option>
                <option value="APPROVED">Approved</option>
                <option value="IN_PRODUCTION">In Production</option>
                <option value="PLANNED">Planned</option>
                <option value="READY_FOR_REVIEW">Ready For Review</option>
              </select>
            </div>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900/60 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-semibold transition"
            >
              Today
            </button>
          </div>

          <div className="text-lg font-bold text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-red-500" />
            {monthName} {year}
          </div>

          <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
            {monthDeliverables.length} Releases Scheduled
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white dark:bg-zinc-900/40 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm dark:shadow-xl">
          {/* Day Names Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 bg-slate-100/70 dark:bg-zinc-900/80 text-center py-2.5 text-xs font-semibold text-slate-600 dark:text-zinc-400">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200 dark:divide-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/40">
            {days.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="min-h-32 bg-slate-100/30 dark:bg-zinc-950/20" />;
              }

              const isToday = formatLocalDate(new Date()) === formatLocalDate(date);
              const dayDeliverables = getDeliverablesForDate(date);

              return (
                <div
                  key={date.toISOString()}
                  className={`min-h-32 p-2 space-y-1.5 transition group relative ${
                    isToday ? 'bg-red-500/5 dark:bg-red-950/10' : 'hover:bg-slate-100/50 dark:hover:bg-zinc-900/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ${
                        isToday
                          ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                          : 'text-slate-700 dark:text-zinc-400'
                      }`}
                    >
                      {date.getDate()}
                    </span>

                    <button
                      onClick={() => handleOpenCreateModal(date)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 transition"
                      title="Schedule release for this day"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Scheduled Items in Day */}
                  <div className="space-y-1.5">
                    {dayDeliverables.map((deliv) => (
                      <div
                        key={deliv._id}
                        onClick={() => handleOpenDetailModal(deliv)}
                        className={`p-2 rounded-lg border cursor-pointer transition shadow-sm hover:scale-[1.02] ${getPlatformStyle(
                          deliv.platform
                        )}`}
                      >
                        <div className="font-semibold text-xs line-clamp-1">
                          {deliv.title}
                        </div>
                        <div className="flex items-center justify-between text-[10px] mt-1 opacity-90">
                          <span className="font-mono uppercase font-bold">{deliv.format || deliv.platform}</span>
                          <span className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold ${getStatusBadge(deliv.status)}`}>
                            {deliv.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedule Content Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-red-500" />
                  Schedule Content Release
                </h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCreateDeliverable} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                    Content Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Episode 12 - Behind the Scenes"
                    value={newForm.title}
                    onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Project
                    </label>
                    <select
                      required
                      value={newForm.projectId}
                      onChange={(e) => setNewForm({ ...newForm, projectId: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-red-500"
                    >
                      <option value="">Select Project...</option>
                      {projects.map((p: any) => {
                        const pid = String(p._id || p.id || '');
                        return (
                          <option key={pid} value={pid}>
                            {p.title || p.name || 'Untitled Project'}{p.projectId || p.code ? ` (${p.projectId || p.code})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Channel
                    </label>
                    <select
                      value={newForm.channelId}
                      onChange={(e) => setNewForm({ ...newForm, channelId: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-red-500"
                    >
                      <option value="">Select Channel...</option>
                      {channels.map((c: any) => {
                        const cid = String(c._id || c.id || '');
                        return (
                          <option key={cid} value={cid}>
                            {c.name} ({c.platform})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Platform
                    </label>
                    <select
                      value={newForm.platform}
                      onChange={(e) => setNewForm({ ...newForm, platform: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-red-500"
                    >
                      <option value="YOUTUBE">YouTube</option>
                      <option value="INSTAGRAM">Instagram</option>
                      <option value="FACEBOOK">Facebook</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Format
                    </label>
                    <select
                      value={newForm.format}
                      onChange={(e) => setNewForm({ ...newForm, format: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-red-500"
                    >
                      <option value="FULL_VIDEO">Full Video</option>
                      <option value="SHORT_VIDEO">Short Video</option>
                      <option value="REEL">Reel</option>
                      <option value="POST">Post</option>
                      <option value="CAROUSEL">Carousel</option>
                      <option value="STORY">Story</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Scheduled Release Date
                    </label>
                    <input
                      type="date"
                      required
                      value={newForm.scheduledAt}
                      onChange={(e) => setNewForm({ ...newForm, scheduledAt: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Initial Status
                    </label>
                    <select
                      value={newForm.status}
                      onChange={(e) => setNewForm({ ...newForm, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-red-500"
                    >
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="PLANNED">Planned</option>
                      <option value="IN_PRODUCTION">In Production</option>
                      <option value="READY_FOR_REVIEW">Ready For Review</option>
                      <option value="APPROVED">Approved</option>
                      <option value="PUBLISHED">Published</option>
                    </select>
                  </div>
                </div>

                {/* Output Links in Calendar Schedule Form */}
                <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-red-500" />
                    Asset & Deliverable Links (Optional)
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                      📂 Google Drive Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={newForm.driveLink}
                      onChange={(e) => setNewForm({ ...newForm, driveLink: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                      📄 Google Doc / Script Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://docs.google.com/..."
                      value={newForm.docLink}
                      onChange={(e) => setNewForm({ ...newForm, docLink: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                      🔗 Output File / Video URL (Dropbox, Frame.io)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newForm.outputUrl}
                      onChange={(e) => setNewForm({ ...newForm, outputUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                    Caption / Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Add release caption or editorial notes..."
                    value={newForm.caption}
                    onChange={(e) => setNewForm({ ...newForm, caption: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium transition shadow-md shadow-red-600/20"
                  >
                    {saving ? 'Scheduling...' : 'Schedule Deliverable'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Deliverable Details & Quick Edit Modal */}
        {isDetailModalOpen && activeDeliverable && (
          <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-bold uppercase">
                    {activeDeliverable.deliverableId || 'DELIVERABLE'}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {activeDeliverable.title}
                  </h3>
                </div>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-semibold">Platform & Format</div>
                  <div className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5">
                    {activeDeliverable.platform} • {activeDeliverable.format}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-semibold">Release Date</div>
                  <div className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5">
                    {getDeliverableDateStr(activeDeliverable) || 'Not Set'}
                  </div>
                </div>
              </div>

              {/* Deliverable Output Links Showcase */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-red-500" />
                    Deliverable Output Links
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingDetailLinks(!isEditingDetailLinks)}
                    className="text-xs text-red-600 dark:text-red-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    {isEditingDetailLinks ? 'Close Edit' : 'Edit Links'}
                  </button>
                </div>

                {isEditingDetailLinks ? (
                  <form onSubmit={handleSaveDetailLinks} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                        Google Drive Link
                      </label>
                      <input
                        type="url"
                        placeholder="https://drive.google.com/..."
                        value={detailLinksForm.driveLink}
                        onChange={(e) => setDetailLinksForm({ ...detailLinksForm, driveLink: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                        Google Doc / Script Link
                      </label>
                      <input
                        type="url"
                        placeholder="https://docs.google.com/..."
                        value={detailLinksForm.docLink}
                        onChange={(e) => setDetailLinksForm({ ...detailLinksForm, docLink: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                        Output Master File URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={detailLinksForm.outputUrl}
                        onChange={(e) => setDetailLinksForm({ ...detailLinksForm, outputUrl: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                        Published Video URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://youtube.com/..."
                        value={detailLinksForm.publishedUrl}
                        onChange={(e) => setDetailLinksForm({ ...detailLinksForm, publishedUrl: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingDetailLinks(false)}
                        className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingLinks}
                        className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-500 disabled:opacity-50"
                      >
                        {savingLinks ? 'Saving...' : 'Save Links'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-2">
                    {activeDeliverable.driveLink || activeDeliverable.docLink || activeDeliverable.outputUrl || activeDeliverable.publishedUrl ? (
                      <div className="flex flex-wrap gap-2">
                        {/* Google Drive */}
                        {activeDeliverable.driveLink && (
                          <div className="inline-flex items-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs px-2.5 py-1.5 gap-1.5 shadow-sm">
                            <HardDrive className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="font-semibold">Google Drive</span>
                            <a
                              href={activeDeliverable.driveLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold underline ml-1 flex items-center gap-0.5"
                            >
                              Open <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(activeDeliverable.driveLink, 'cal-drive')}
                              className="p-0.5 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 rounded"
                              title="Copy Link"
                            >
                              {copiedLink === 'cal-drive' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-emerald-600/70" />}
                            </button>
                          </div>
                        )}

                        {/* Google Doc / Script */}
                        {activeDeliverable.docLink && (
                          <div className="inline-flex items-center rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs px-2.5 py-1.5 gap-1.5 shadow-sm">
                            <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="font-semibold">Doc / Script</span>
                            <a
                              href={activeDeliverable.docLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold underline ml-1 flex items-center gap-0.5"
                            >
                              Open <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(activeDeliverable.docLink, 'cal-doc')}
                              className="p-0.5 hover:bg-blue-200/50 dark:hover:bg-blue-800/50 rounded"
                              title="Copy Link"
                            >
                              {copiedLink === 'cal-doc' ? <Check className="w-3 h-3 text-blue-600" /> : <Copy className="w-3 h-3 text-blue-600/70" />}
                            </button>
                          </div>
                        )}

                        {/* Output Master File */}
                        {activeDeliverable.outputUrl && (
                          <div className="inline-flex items-center rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs px-2.5 py-1.5 gap-1.5 shadow-sm">
                            <LinkIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                            <span className="font-semibold">Output Asset</span>
                            <a
                              href={activeDeliverable.outputUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold underline ml-1 flex items-center gap-0.5"
                            >
                              Open <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(activeDeliverable.outputUrl, 'cal-out')}
                              className="p-0.5 hover:bg-purple-200/50 dark:hover:bg-purple-800/50 rounded"
                              title="Copy Link"
                            >
                              {copiedLink === 'cal-out' ? <Check className="w-3 h-3 text-purple-600" /> : <Copy className="w-3 h-3 text-purple-600/70" />}
                            </button>
                          </div>
                        )}

                        {/* Published Live Video */}
                        {activeDeliverable.publishedUrl && (
                          <div className="inline-flex items-center rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs px-2.5 py-1.5 gap-1.5 shadow-sm">
                            <Globe className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="font-semibold">Live URL</span>
                            <a
                              href={activeDeliverable.publishedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold underline ml-1 flex items-center gap-0.5"
                            >
                              Open <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(activeDeliverable.publishedUrl, 'cal-pub')}
                              className="p-0.5 hover:bg-amber-200/50 dark:hover:bg-amber-800/50 rounded"
                              title="Copy Link"
                            >
                              {copiedLink === 'cal-pub' ? <Check className="w-3 h-3 text-amber-600" /> : <Copy className="w-3 h-3 text-amber-600/70" />}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 dark:text-zinc-500 italic">
                        No Drive, Doc, or Asset links attached yet. Click "Edit Links" to attach.
                      </div>
                    )}

                    {activeDeliverable.outputNotes && (
                      <div className="text-xs text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800">
                        <span className="font-bold text-[10px] uppercase text-slate-400 block mb-0.5">Notes:</span>
                        {activeDeliverable.outputNotes}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {activeDeliverable.caption && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs">
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-semibold mb-1">Caption / Notes</div>
                  <p className="text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">{activeDeliverable.caption}</p>
                </div>
              )}

              {/* Status Update Actions */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase">
                  Quick Update Release Status:
                </label>
                <div className="flex flex-wrap gap-2">
                  {['PLANNED', 'IN_PRODUCTION', 'READY_FOR_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED'].map((st) => (
                    <button
                      key={st}
                      disabled={updatingStatus || activeDeliverable.status === st}
                      onClick={() => handleUpdateStatus(activeDeliverable._id, st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                        activeDeliverable.status === st
                          ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/20'
                          : 'bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-sm font-medium transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


