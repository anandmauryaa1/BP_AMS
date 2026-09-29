import type { Metadata } from 'next';
import EmployeeNotificationsClient from './EmployeeNotificationsClient';

export const metadata: Metadata = {
  title: 'My Notifications — BP AMS',
  description: 'View your real-time notification alerts, task assignments, leave decision updates, and web push settings.',
};

export default function EmployeeNotificationsPage() {
  return <EmployeeNotificationsClient />;
}
