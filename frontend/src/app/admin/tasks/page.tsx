import type { Metadata } from 'next';
import { getTasks, getProjects, getEmployees } from '@/lib/server-api';
import AdminTasksClient from './AdminTasksClient';

export const metadata: Metadata = {
  title: 'Tasks — BP AMS',
  description: 'Manage production tasks across all projects.',
};

export default async function AdminTasksPage() {
  const [tasks, projects, employees] = await Promise.all([
    getTasks(),
    getProjects(),
    getEmployees(),
  ]);
  return (
    <AdminTasksClient
      initialTasks={tasks}
      initialProjects={projects}
      initialEmployees={employees}
    />
  );
}
