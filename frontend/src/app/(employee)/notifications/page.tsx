import type { Metadata } from 'next';
import { getNotifications } from '@/lib/server-api';
import EmployeeNotificationsClient from './EmployeeNotificationsClient';

export const metadata: Metadata = {
  title: 'My Notifications — BP AMS',
  description: 'View your real-time notification alerts, task assignments, leave decision updates, and web push settings.',
};

export default async function EmployeeNotificationsPage() {
  const data = await getNotifications();

  return (
    <EmployeeNotificationsClient
      initialNotifications={data.notifications}
      initialUser={data.user}
    />
  );
}
