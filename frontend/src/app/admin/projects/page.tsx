import type { Metadata } from 'next';
import { getProjects, getChannels, getEmployees } from '@/lib/server-api';
import AdminProjectsClient from './AdminProjectsClient';

export const metadata: Metadata = {
  title: 'Projects — BP AMS',
  description: 'Manage video production projects.',
};

export default async function AdminProjectsPage() {
  const [projects, channels, employees] = await Promise.all([
    getProjects(),
    getChannels(),
    getEmployees(),
  ]);
  return (
    <AdminProjectsClient
      initialProjects={projects}
      initialChannels={channels}
      initialEmployees={employees}
    />
  );
}
