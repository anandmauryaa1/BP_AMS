import type { Metadata } from 'next';
import { getCalendarDeliverables, getChannels, getProjects, getEmployees } from '@/lib/server-api';
import AdminCalendarClient from './AdminCalendarClient';

export const metadata: Metadata = {
  title: 'Calendar — BP AMS',
  description: 'Deliverable scheduling and publication calendar.',
};

export default async function AdminCalendarPage() {
  const [deliverables, channels, projects, employees] = await Promise.all([
    getCalendarDeliverables(),
    getChannels(),
    getProjects(),
    getEmployees(),
  ]);
  return (
    <AdminCalendarClient
      initialDeliverables={deliverables}
      initialChannels={channels}
      initialProjects={projects}
      initialEmployees={employees}
    />
  );
}
