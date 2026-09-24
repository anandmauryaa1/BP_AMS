'use client';

import React from 'react';
import { DailyReportView } from '@/components/analytics/DailyReportView';

export default function ManagerEmployeeDailyPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <DailyReportView employeeId={params.id} />
    </div>
  );
}
