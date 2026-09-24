'use client';

import React from 'react';
import { MonthlyReportView } from '@/components/analytics/MonthlyReportView';

export default function EmployeeMonthlyReportPage() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <MonthlyReportView isEmployeeSelf={true} />
    </div>
  );
}
