'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { AdminNav } from '@/components/AdminNav';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  Search,
  RefreshCw,
  Send,
  ExternalLink,
  ShieldAlert,
  Palmtree,
  CheckSquare,
  CalendarCheck,
  Banknote,
  Filter
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { PushNotificationManager } from '@/components/PushNotificationManager';

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
  read: boolean;
  isRead?: boolean;
  createdAt: string;
}

interface AdminNotificationsClientProps {
  initialNotifications?: NotificationItem[];
  initialUser?: any;
}

export default function AdminNotificationsClient({
  initialNotifications = [],
  initialUser = null,
}: AdminNotificationsClientProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications || []);
  const [unreadCount, setUnreadCount] = useState<number>(() => {
    return (initialNotifications || []).filter((n: any) => !n.read && !n.isRead).length;
  });
  const [loading, setLoading] = useState<boolean>(!initialNotifications || initialNotifications.length === 0);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'LEAVE' | 'TASK' | 'SYSTEM'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!initialNotifications || initialNotifications.length === 0) {
      fetchNotifications();
    }
  }, [initialNotifications]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<any>('/api/notifications');
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.notifications || []);
        const unread = typeof res.data.unreadCount === 'number'
          ? res.data.unreadCount
          : list.filter((n: any) => !n.read && !n.isRead).length;
        setNotifications(list);
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    setActionLoading(true);
    try {
      const res = await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
      if (res.success) {
        setMsg({ type: 'success', text: 'All notifications marked as read!' });
        fetchNotifications();
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkSingleRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, read: true, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleSendTestPush = async () => {
    setActionLoading(true);
    try {
      const res = await apiFetch('/api/notifications/test', { method: 'POST' });
      if (res.success) {
        setMsg({ type: 'success', text: 'Test Web Push notification dispatched!' });
        fetchNotifications();
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to dispatch test notification.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const getCategoryIcon = (type?: string) => {
    const t = (type || '').toUpperCase();
    if (t.includes('LEAVE')) return <Palmtree className="w-5 h-5 text-amber-500" />;
    if (t.includes('TASK')) return <CheckSquare className="w-5 h-5 text-blue-500" />;
    if (t.includes('SHIFT') || t.includes('ATTENDANCE')) return <CalendarCheck className="w-5 h-5 text-emerald-500" />;
    if (t.includes('PAYROLL') || t.includes('LOAN')) return <Banknote className="w-5 h-5 text-rose-500" />;
    return <ShieldAlert className="w-5 h-5 text-purple-500" />;
  };

  const filteredNotifications = notifications.filter((n) => {
    const isUnread = !n.read && !n.isRead;
    if (filter === 'UNREAD' && !isUnread) return false;
    if (filter === 'LEAVE' && !n.type?.toUpperCase().includes('LEAVE')) return false;
    if (filter === 'TASK' && !n.type?.toUpperCase().includes('TASK')) return false;
    if (filter === 'SYSTEM' && (n.type?.toUpperCase().includes('LEAVE') || n.type?.toUpperCase().includes('TASK'))) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = (n.title || '').toLowerCase();
      const message = (n.message || '').toLowerCase();
      if (!title.includes(q) && !message.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl relative">
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-600 rounded-full ring-2 ring-white dark:ring-zinc-900" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Operations & System Alerts Feed
              </h1>
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                Real-time Web Push subscriptions, leave alerts, task updates, and audit notifications
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSendTestPush}
              disabled={actionLoading}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              Send Test Web Push
            </button>
            <button
              onClick={handleMarkAllRead}
              disabled={actionLoading || unreadCount === 0}
              className="px-3.5 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-700 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              Mark All Read
            </button>
            <button
              onClick={fetchNotifications}
              className="p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition shadow-sm"
              title="Refresh Feed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {msg && (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${msg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'}`}>
            {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-medium">{msg.text}</span>
          </div>
        )}

        {/* Web Push Subscription Management Banner */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-600" />
            Device Web Push Subscription Status
          </h3>
          <PushNotificationManager variant="full" />
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
            {[
              { id: 'ALL', label: `All (${notifications.length})` },
              { id: 'UNREAD', label: `Unread (${unreadCount})` },
              { id: 'LEAVE', label: 'Leaves' },
              { id: 'TASK', label: 'Tasks' },
              { id: 'SYSTEM', label: 'System & Audit' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition ${
                  filter === f.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Notification Feed Table / List */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-purple-600" />
              <p className="text-xs font-medium">Fetching live notifications feed...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-zinc-500 space-y-2">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-slate-700 dark:text-zinc-300 text-sm">No notifications found</p>
              <p className="text-xs">You are all caught up! No recent alerts matching this filter.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-zinc-800">
              {filteredNotifications.map((n) => {
                const isUnread = !n.read && !n.isRead;
                return (
                  <div
                    key={n._id}
                    className={`p-4 transition flex items-start gap-4 hover:bg-slate-50/70 dark:hover:bg-zinc-800/50 ${
                      isUnread ? 'bg-purple-50/40 dark:bg-purple-950/20' : ''
                    }`}
                  >
                    <div className="p-2.5 bg-slate-100 dark:bg-zinc-800 rounded-xl shrink-0 mt-0.5">
                      {getCategoryIcon(n.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                            {n.title}
                          </h4>
                          {isUnread && (
                            <span className="w-2 h-2 bg-rose-600 rounded-full" title="Unread" />
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono whitespace-nowrap">
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1 leading-relaxed">
                        {n.message}
                      </p>

                      <div className="flex items-center gap-3 mt-3">
                        {n.link && (
                          <a
                            href={n.link}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                          >
                            Open Link <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        {isUnread && (
                          <button
                            onClick={(e) => handleMarkSingleRead(n._id, e)}
                            className="text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white font-medium transition flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
