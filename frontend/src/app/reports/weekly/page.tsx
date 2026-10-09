'use client';

import React from 'react';
import { WeeklyReportView } from '@/components/analytics/WeeklyReportView';

export default function EmployeeWeeklyReportPage() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <WeeklyReportView isEmployeeSelf={true} titleTag="h1" />
    </div>
  );
}
