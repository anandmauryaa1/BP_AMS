import type { Metadata } from 'next';
import { getMyTasks } from '@/lib/server-api';
import EmployeeTasksClient from './EmployeeTasksClient';

export const metadata: Metadata = {
  title: 'My Tasks — BP AMS',
  description: 'Your assigned production tasks and progress.',
};

export default async function EmployeeTasksPage() {
  const tasks = await getMyTasks();
  return <EmployeeTasksClient initialTasks={tasks} />;
}
