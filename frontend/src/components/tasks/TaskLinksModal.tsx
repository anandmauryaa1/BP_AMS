'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Link as LinkIcon,
  HardDrive,
  FileText,
  Video,
  Globe,
  AlertCircle,
  Save,
} from 'lucide-react';
import { ITask, ITaskLink } from '@/types';
import { normalizeTaskLinks, detectLinkCategory, sanitizeTaskUrl, isValidWebUrl } from '@/lib/taskUtils';

interface TaskLinksModalProps {
  isOpen: boolean;
  task: ITask | null;
  onClose: () => void;
  onLinksUpdated: (taskId: string, updatedLinks: ITaskLink[]) => void;
  isAdmin?: boolean;
}

interface EditableLinkItem {
  id: string;
  title: string;
  url: string;
}

const PRESET_CHIPS = [
  { label: 'Google Drive', prefix: 'Drive', icon: HardDrive },
  { label: 'Script / Doc', prefix: 'Script Doc', icon: FileText },
  { label: 'Final Output', prefix: 'Export 4K', icon: Video },
];

export default function TaskLinksModal({
  isOpen,
  task,
  onClose,
  onLinksUpdated,
  isAdmin = false,
}: TaskLinksModalProps) {
  const [links, setLinks] = useState<EditableLinkItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize state from task when opened
  useEffect(() => {
    if (task) {
      const normalized = normalizeTaskLinks(task);
      setLinks(
        normalized.map((nl) => ({
          id: nl.id,
          title: nl.title,
          url: nl.url,
        }))
      );
      setNewTitle('');
      setNewUrl('');
      setError(null);
    }
  }, [task]);

  const handleCopy = useCallback((url: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  const handleAddLink = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newUrl.trim()) return;

    const sanitized = sanitizeTaskUrl(newUrl.trim());
    if (!isValidWebUrl(sanitized)) {
      setError('Please enter a valid web URL (e.g., drive.google.com/...)');
      return;
    }

    const { iconLabel } = detectLinkCategory(sanitized);
    const title = newTitle.trim() || iconLabel || 'Resource Link';

    const newItem: EditableLinkItem = {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      url: sanitized,
    };

    setLinks((prev) => [...prev, newItem]);
    setNewTitle('');
    setNewUrl('');
    setError(null);
  }, [newTitle, newUrl]);

  const handleRemoveLink = useCallback((id: string) => {
    setLinks((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleUpdateItem = useCallback((id: string, field: 'title' | 'url', value: string) => {
    setLinks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }, []);

  const handleQuickPreset = useCallback((preset: typeof PRESET_CHIPS[0]) => {
    setNewTitle(preset.prefix);
  }, []);

  const handleSave = async () => {
    if (!task) return;
    setIsSaving(true);
    setError(null);

    try {
      // Clean and sanitize all links
      const payloadLinks: ITaskLink[] = links
        .map((l) => ({
          title: l.title.trim(),
          url: sanitizeTaskUrl(l.url),
        }))
        .filter((l) => isValidWebUrl(l.url));

      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // Legacy fallback mapping
      const firstDrive = payloadLinks.find((l) => detectLinkCategory(l.url).category === 'drive');
      const firstDoc = payloadLinks.find((l) => detectLinkCategory(l.url).category === 'docs');
      const firstOutput = payloadLinks.find((l) => (l.title || '').toLowerCase().includes('output') || (l.title || '').toLowerCase().includes('export')) || payloadLinks[0];

      const bodyPayload = {
        links: payloadLinks,
        driveLink: firstDrive ? firstDrive.url : (payloadLinks[0]?.url || ''),
        docLink: firstDoc ? firstDoc.url : undefined,
        outputUrl: firstOutput ? firstOutput.url : undefined,
      };

      const res = await fetch(`/api/tasks/${task._id}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to update task links');
      }

      onLinksUpdated(task._id, payloadLinks);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving links');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-rose-600 dark:text-red-500" />
              Manage Task Links & Resources
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium line-clamp-1">
              {task.taskId} • {task.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
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

        {/* Existing Links List */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {links.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-dashed border-slate-200 dark:border-zinc-800 text-xs text-slate-500 dark:text-zinc-500">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
              <p className="font-medium">No links added to this task yet.</p>
              <p className="text-[11px] text-slate-400 dark:text-zinc-600 mt-0.5">
                Add Google Drive exports, scripts, or final video deliverable URLs below.
              </p>
            </div>
          ) : (
            links.map((link) => {
              const { category } = detectLinkCategory(link.url);
              return (
                <div
                  key={link.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700 transition space-y-2 group"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Link Label (e.g., Final 4K Render)"
                      value={link.title}
                      onChange={(e) => handleUpdateItem(link.id, 'title', e.target.value)}
                      className="flex-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(link.url, link.id)}
                        className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 text-xs transition"
                        title="Copy link"
                      >
                        {copiedId === link.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-red-400 hover:bg-slate-100 text-xs transition"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(link.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                        title="Remove link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={link.url}
                    onChange={(e) => handleUpdateItem(link.id, 'url', e.target.value)}
                    className="w-full px-2.5 py-1 text-xs font-mono rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Add New Link Section */}
        <form onSubmit={handleAddLink} className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
              Add New Link
            </span>
            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1">
              {PRESET_CHIPS.map((preset) => {
                const IconComponent = preset.icon;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleQuickPreset(preset)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition"
                  >
                    <IconComponent className="w-2.5 h-2.5" />
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Label (e.g. Master Cut)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            <input
              type="text"
              placeholder="Paste URL (e.g. https://drive.google.com/...)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="sm:col-span-2 px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <button
            type="submit"
            disabled={!newUrl.trim()}
            className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 disabled:opacity-40 text-slate-800 dark:text-zinc-200 text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Link to List
          </button>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800">
          <span className="text-[11px] text-slate-400 dark:text-zinc-500">
            {links.length} {links.length === 1 ? 'link' : 'links'} ready to save
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white transition flex items-center gap-1.5 shadow-md shadow-rose-600/20"
            >
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Save All Links
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
