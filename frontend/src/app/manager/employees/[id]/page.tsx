'use client';

import React from 'react';
import AdminEmployeeProfileProgressPage from '@/app/admin/employees/[id]/page';

export default function ManagerEmployeeProfileProgressPage({ params }: { params: { id: string } }) {
  return <AdminEmployeeProfileProgressPage params={params} />;
}
