'use client';

import React from 'react';
import { WeeklyReportView } from '@/components/analytics/WeeklyReportView';

export default function ManagerEmployeeWeeklyPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <WeeklyReportView employeeId={params.id} />
    </div>
  );
}
