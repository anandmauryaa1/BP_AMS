import type { Metadata } from 'next';
import {
  getEmployeeAttendanceToday,
  getCurrentWorkSession,
  getEmployeeDailyQueue,
  getMe,
} from '@/lib/server-api';
import EmployeeDashboardClient from './EmployeeDashboardClient';

export const metadata: Metadata = {
  title: 'My Dashboard — BP AMS',
  description: 'Your attendance, tasks, and daily work queue.',
};

export default async function EmployeeDashboardPage() {
  const [attendance, ws, queue, me] = await Promise.all([
    getEmployeeAttendanceToday(),
    getCurrentWorkSession(),
    getEmployeeDailyQueue(),
    getMe(),
  ]);
  return (
    <EmployeeDashboardClient
      initialAttendance={attendance}
      initialWorkSession={ws.currentSession}
      initialActiveProjects={ws.activeProjects}
      initialQueue={queue.myQueue}
      initialTasksToday={queue.myTasksToday}
      initialUser={me}
    />
  );
}
