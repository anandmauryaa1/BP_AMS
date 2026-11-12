import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { getEmployees, getProjects } from '@/lib/server-api';
import { CommonOperationsCalendar } from '@/components/calendar/CommonOperationsCalendar';

export const metadata: Metadata = {
  title: 'All-In-One Calendar — BP AMS',
  description: 'Unified All-In-One Calendar for production tasks, employee leaves, and attendance check-in/out & late tracking.',
};

export default async function AdminOperationsCalendarPage() {
  const [employees, projects] = await Promise.all([getEmployees(), getProjects()]);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center text-sm text-slate-500">
          Loading All-In-One Calendar...
        </div>
      }
    >
      <CommonOperationsCalendar
        initialEmployees={Array.isArray(employees) ? employees : []}
        initialProjects={Array.isArray(projects) ? projects : []}
      />
    </Suspense>
  );
}

