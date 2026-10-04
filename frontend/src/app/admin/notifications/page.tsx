import type { Metadata } from 'next';
import { getNotifications } from '@/lib/server-api';
import AdminNotificationsClient from './AdminNotificationsClient';

export const metadata: Metadata = {
  title: 'Notifications & Alerts Hub — BP AMS',
  description: 'Manage real-time system alerts, leave requests, shift duty notifications, and Web Push subscriptions.',
};

export default async function AdminNotificationsPage() {
  const data = await getNotifications();

  return (
    <AdminNotificationsClient
      initialNotifications={data.notifications}
      initialUser={data.user}
    />
  );
}
