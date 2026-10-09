'use client';

import React from 'react';
import { DeepAnalysisView } from '@/components/analytics/DeepAnalysisView';

export default function AdminEmployeeAnalysisPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <DeepAnalysisView employeeId={params.id} titleTag="h1" />
    </div>
  );
}
