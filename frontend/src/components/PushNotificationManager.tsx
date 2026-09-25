'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  ShieldCheck,
} from 'lucide-react';
import {
  isPushNotificationSupported,
  getCurrentPushSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  sendTestPushNotification,
  getNotificationPermission,
} from '@/lib/pushClient';

interface PushNotificationManagerProps {
  variant?: 'compact' | 'full' | 'banner';
  className?: string;
  onStatusChange?: (isSubscribed: boolean) => void;
}

export const PushNotificationManager: React.FC<PushNotificationManagerProps> = ({
  variant = 'compact',
  className = '',
  onStatusChange,
}) => {
  const [supported, setSupported] = useState<boolean>(true);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkStatus() {
      const isSupp = isPushNotificationSupported();
      setSupported(isSupp);
      if (!isSupp) {
        setPermission('unsupported');
        setLoading(false);
        return;
      }

      setPermission(getNotificationPermission());
      const sub = await getCurrentPushSubscription();
      const subscribed = !!sub;
      setIsSubscribed(subscribed);
      if (onStatusChange) onStatusChange(subscribed);
      setLoading(false);
    }

    checkStatus();
  }, [onStatusChange]);

  const handleSubscribe = async () => {
    setActionLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await subscribeToPushNotifications();
    setActionLoading(false);

    if (result.success) {
      setIsSubscribed(true);
      setPermission('granted');
      setStatusMessage('Push notifications activated successfully.');
      if (onStatusChange) onStatusChange(true);
    } else {
      setPermission(getNotificationPermission());
      setErrorMessage(result.error || 'Could not enable push notifications.');
    }
  };

  const handleUnsubscribe = async () => {
    setActionLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await unsubscribeFromPushNotifications();
    setActionLoading(false);

    if (result.success) {
      setIsSubscribed(false);
      setStatusMessage('Push notifications turned off for this browser.');
      if (onStatusChange) onStatusChange(false);
    } else {
      setErrorMessage(result.error || 'Failed to unsubscribe.');
    }
  };

  const handleSendTest = async () => {
    setTestLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const result = await sendTestPushNotification();
    setTestLoading(false);

    if (result.success) {
      setStatusMessage('Test notification sent! Check your system notification tray.');
    } else {
      setErrorMessage(result.error || 'Failed to dispatch test notification.');
    }
  };

  if (!supported) {
    if (variant === 'compact') return null;
    return (
      <div className={`p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 ${className}`}>
        Browser push notifications are not supported in this environment.
      </div>
    );
  }

  // Compact Variant: for top navbar notification dropdown
  if (variant === 'compact') {
    return (
      <div className={`p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSubscribed ? (
              <BellRing className="w-4 h-4 text-emerald-500 animate-pulse" />
            ) : (
              <Bell className="w-4 h-4 text-slate-400" />
            )}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Web Push Alerts
            </span>
          </div>
          {isSubscribed ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Active
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Disabled</span>
          )}
        </div>

        {errorMessage && (
          <p className="text-[11px] text-rose-500 leading-tight flex items-start gap-1">
            <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
            {errorMessage}
          </p>
        )}

        {statusMessage && (
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 leading-tight">
            {statusMessage}
          </p>
        )}

        <div className="flex items-center gap-1.5 pt-1">
          {isSubscribed ? (
            <>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testLoading}
                className="flex-1 py-1 px-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded font-medium text-[11px] flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
              >
                {testLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Send Test Alert
              </button>
              <button
                type="button"
                onClick={handleUnsubscribe}
                disabled={actionLoading}
                className="py-1 px-2 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded text-[11px] transition-colors"
                title="Disable notifications"
              >
                {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Turn Off'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={actionLoading || loading}
              className="w-full py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium text-[11px] flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BellRing className="w-3.5 h-3.5" />
              )}
              Enable Task & Shift Push Alerts
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full Variant: for Profile / Settings Cards
  return (
    <div
      className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              isSubscribed
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
            }`}
          >
            {isSubscribed ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                Web Push Notifications
              </h3>
              {isSubscribed ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3" />
                  Active
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
              Receive real-time system alerts on scheduled production tasks, due date updates, leave request decisions, and shift reminders directly in your browser.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isSubscribed ? (
            <>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
              >
                {testLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Send Test Push
              </button>
              <button
                type="button"
                onClick={handleUnsubscribe}
                disabled={actionLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Disable'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={actionLoading || loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20 transition-all disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BellRing className="w-4 h-4" />
              )}
              Enable Web Push Alerts
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className="mt-3.5 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mt-3.5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {permission === 'denied' && (
        <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
          ⚠️ Push permissions were previously blocked for this site. Click the site settings icon in your browser URL bar to allow notifications.
        </p>
      )}
    </div>
  );
};
