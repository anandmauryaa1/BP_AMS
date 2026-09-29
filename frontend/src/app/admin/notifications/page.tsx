import type { Metadata } from 'next';
import AdminNotificationsClient from './AdminNotificationsClient';

export const metadata: Metadata = {
  title: 'Notifications & Alerts Hub — BP AMS',
  description: 'Manage real-time system alerts, leave requests, shift duty notifications, and Web Push subscriptions.',
};

export default function AdminNotificationsPage() {
  return <AdminNotificationsClient />;
}
