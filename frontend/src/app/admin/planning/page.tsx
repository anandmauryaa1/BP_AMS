import type { Metadata } from 'next';
import { getChannels, getEmployees, getTasks, getDailyPlans } from '@/lib/server-api';
import AdminPlanningClient from './AdminPlanningClient';

export const metadata: Metadata = {
  title: 'Production Planning — BP AMS',
  description: 'Manage daily, weekly, and monthly production plans.',
};

export default async function AdminPlanningPage() {
  const today = new Date().toISOString().split('T')[0];
  const [channels, employees, tasks, dailyPlans] = await Promise.all([
    getChannels(),
    getEmployees(),
    getTasks(),
    getDailyPlans(today),
  ]);
  return (
    <AdminPlanningClient
      initialChannels={channels}
      initialEmployees={employees}
      initialTasks={tasks}
      initialDailyPlans={dailyPlans}
    />
  );
}
