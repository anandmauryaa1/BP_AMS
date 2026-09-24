'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import { Tv, Plus, Layers, ExternalLink, Trash2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface ISeries {
  _id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

interface IChannel {
  _id: string;
  name: string;
  code: string;
  platform: 'YOUTUBE' | 'INSTAGRAM' | 'FACEBOOK' | 'OTHER';
  channelUrl?: string;
  isActive: boolean;
  seriesCount?: number;
  series?: ISeries[];
}

export default function AdminChannelsPage() {
  const [channels, setChannels] = useState<IChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<IChannel | null>(null);
  const [seriesList, setSeriesList] = useState<ISeries[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);

  // Modal states
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  
  // Channel form
  const [channelForm, setChannelForm] = useState({
    name: '',
    code: '',
    platform: 'YOUTUBE',
    channelUrl: '',
  });

  // Series form
  const [seriesForm, setSeriesForm] = useState({
    name: '',
    code: '',
    description: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/channels');
      const data = await res.json();
      const list = data.data?.channels || data.channels || (Array.isArray(data.data) ? data.data : []);
      setChannels(list);
      if (list.length > 0) {
        if (!selectedChannel) {
          setSelectedChannel(list[0]);
        } else {
          const updated = list.find((c: IChannel) => c._id === selectedChannel._id);
          if (updated) setSelectedChannel(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load channels:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeries = async (channelId: string) => {
    try {
      setSeriesLoading(true);
      const res = await fetch(`/api/series?channelId=${channelId}`);
      const data = await res.json();
      const list = data.data?.series || data.series || (Array.isArray(data.data) ? data.data : []);
      setSeriesList(list);
    } catch (err) {
      console.error('Failed to load series:', err);
    } finally {
      setSeriesLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    if (selectedChannel?._id) {
      fetchSeries(selectedChannel._id);
    } else {
      setSeriesList([]);
    }
  }, [selectedChannel?._id]);

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: channelForm.name.trim(),
        code: channelForm.code.trim().toUpperCase(),
        platform: channelForm.platform,
        channelUrl: channelForm.channelUrl.trim() || undefined,
        handle: channelForm.code ? `@${channelForm.code.trim()}` : undefined,
      };

      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to create channel');
      }

      setChannelForm({ name: '', code: '', platform: 'YOUTUBE', channelUrl: '' });
      setIsChannelModalOpen(false);
      await fetchChannels();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the channel');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: seriesForm.name.trim(),
        code: seriesForm.code.trim().toUpperCase(),
        description: seriesForm.description.trim() || undefined,
        channelId: selectedChannel._id,
      };

      const res = await fetch('/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to create series');
      }

      setSeriesForm({ name: '', code: '', description: '' });
      setIsSeriesModalOpen(false);
      await fetchSeries(selectedChannel._id);
      await fetchChannels();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the series');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChannel = async (e: React.MouseEvent, channelId: string, channelName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete channel "${channelName}"?`)) return;
    try {
      const res = await fetch(`/api/channels/${channelId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || 'Failed to delete channel');
        return;
      }
      if (selectedChannel?._id === channelId) {
        setSelectedChannel(null);
      }
      await fetchChannels();
    } catch (err: any) {
      alert(err.message || 'Failed to delete channel');
    }
  };

  const handleDeleteSeries = async (seriesId: string, seriesName: string) => {
    if (!window.confirm(`Are you sure you want to delete series "${seriesName}"?`)) return;
    try {
      const res = await fetch(`/api/series/${seriesId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || 'Failed to delete series');
        return;
      }
      if (selectedChannel) {
        await fetchSeries(selectedChannel._id);
        await fetchChannels();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete series');
    }
  };

  const getPlatformBadge = (platform: string) => {
    switch (platform) {
      case 'YOUTUBE':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-500/10 text-red-500 border border-red-500/20">YouTube</span>;
      case 'INSTAGRAM':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-pink-500/10 text-pink-500 border border-pink-500/20">Instagram</span>;
      case 'FACEBOOK':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">Facebook</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">{platform}</span>;
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
              <Tv className="w-6 h-6 text-rose-600 dark:text-red-500" />
              Channels & Content Series
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Manage multi-channel broadcast properties and episodic content series.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchChannels}
              className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setError(null); setIsChannelModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm transition shadow-lg shadow-rose-600/20"
            >
              <Plus className="w-4 h-4" />
              Add Channel
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Channel List */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wider px-1">
              Channels ({channels.length})
            </h2>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-slate-100 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800 animate-pulse" />
                ))}
              </div>
            ) : channels.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900/40 rounded-xl border border-slate-200 dark:border-zinc-800 p-8 text-center text-slate-500 dark:text-zinc-500 shadow-sm">
                <Tv className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p>No channels registered yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {channels.map((channel) => {
                  const isSelected = selectedChannel?._id === channel._id;
                  return (
                    <div
                      key={channel._id}
                      onClick={() => setSelectedChannel(channel)}
                      className={`cursor-pointer p-4 rounded-xl border transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-rose-50/50 dark:bg-zinc-900 border-rose-500 dark:border-red-500/50 shadow-md shadow-rose-500/5'
                          : 'bg-white dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800/80 hover:bg-slate-50 dark:hover:bg-zinc-900/80 hover:border-slate-300 dark:hover:border-zinc-700 shadow-sm'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-zinc-100">{channel.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-mono font-medium">
                            {channel.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                          {getPlatformBadge(channel.platform)}
                          {channel.channelUrl && (
                            <a
                              href={channel.channelUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-right">
                        <div className="text-xs text-slate-500 dark:text-zinc-500">
                          <span className="font-bold text-slate-800 dark:text-zinc-300">
                            {channel.seriesCount ?? (channel.series ? channel.series.length : 0)}
                          </span>{' '}
                          series
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteChannel(e, channel._id, channel.name)}
                          className="p-1.5 text-slate-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition"
                          title="Delete Channel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Series List under Selected Channel */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
                {selectedChannel ? `Series under "${selectedChannel.name}"` : 'Select a Channel'}
              </h2>
              {selectedChannel && (
                <button
                  onClick={() => { setError(null); setIsSeriesModalOpen(true); }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-medium border border-slate-200 dark:border-zinc-700 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Series
                </button>
              )}
            </div>

            {!selectedChannel ? (
              <div className="bg-white dark:bg-zinc-900/40 rounded-xl border border-slate-200 dark:border-zinc-800 p-12 text-center text-slate-500 dark:text-zinc-500 shadow-sm">
                <Layers className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                <p>Select a channel from the left to view and manage its series.</p>
              </div>
            ) : seriesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-slate-100 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800 animate-pulse" />
                ))}
              </div>
            ) : seriesList.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900/40 rounded-xl border border-slate-200 dark:border-zinc-800 p-12 text-center text-slate-500 dark:text-zinc-500 shadow-sm">
                <Layers className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                <p>No content series created for this channel yet.</p>
                <button
                  onClick={() => { setError(null); setIsSeriesModalOpen(true); }}
                  className="mt-3 text-xs text-rose-600 dark:text-red-400 hover:underline"
                >
                  Create the first series &rarr;
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {seriesList.map((series) => (
                  <div
                    key={series._id}
                    className="p-4 rounded-xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 space-y-2 hover:border-slate-300 dark:hover:border-zinc-700 transition shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-zinc-100 text-sm">{series.name}</span>
                        <div className="text-xs text-slate-500 dark:text-zinc-500 font-mono mt-0.5">Code: {series.code}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSeries(series._id, series.name)}
                          className="p-1 text-slate-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition"
                          title="Delete Series"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {series.description && (
                      <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2">{series.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Channel Modal */}
        {isChannelModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Tv className="w-5 h-5 text-rose-600 dark:text-red-500" />
                  Add New Channel
                </h3>
                <button
                  onClick={() => setIsChannelModalOpen(false)}
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

              <form onSubmit={handleCreateChannel} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                    Channel Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Blindarea Tech"
                    value={channelForm.name}
                    onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., BTECH"
                      value={channelForm.code}
                      onChange={(e) => setChannelForm({ ...channelForm, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      Platform
                    </label>
                    <select
                      value={channelForm.platform}
                      onChange={(e) => setChannelForm({ ...channelForm, platform: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      <option value="YOUTUBE">YouTube</option>
                      <option value="INSTAGRAM">Instagram</option>
                      <option value="FACEBOOK">Facebook</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                    Channel URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/@blindarea"
                    value={channelForm.channelUrl}
                    onChange={(e) => setChannelForm({ ...channelForm, channelUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsChannelModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-medium transition"
                  >
                    {saving ? 'Creating...' : 'Create Channel'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Series Modal */}
        {isSeriesModalOpen && selectedChannel && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-rose-600 dark:text-red-500" />
                    Add Content Series
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">For {selectedChannel.name}</p>
                </div>
                <button
                  onClick={() => setIsSeriesModalOpen(false)}
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

              <form onSubmit={handleCreateSeries} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                    Series Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Tech Reviews, Weekly Breakdown"
                    value={seriesForm.name}
                    onChange={(e) => setSeriesForm({ ...seriesForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                    Series Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., REV, BREAK"
                    value={seriesForm.code}
                    onChange={(e) => setSeriesForm({ ...seriesForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief premise or guidelines for this series..."
                    value={seriesForm.description}
                    onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSeriesModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-medium transition"
                  >
                    {saving ? 'Creating...' : 'Create Series'}
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
