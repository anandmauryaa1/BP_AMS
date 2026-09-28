import type { Metadata } from 'next';
import { getLeaves, getEmployees } from '@/lib/server-api';
import AdminLeavesClient from './AdminLeavesClient';

export const metadata: Metadata = {
  title: 'Leave Management — BP AMS',
  description: 'Review and approve employee leave requests.',
};

export default async function AdminLeavesPage() {
  const [leaves, employees] = await Promise.all([getLeaves(), getEmployees()]);
  return <AdminLeavesClient initialLeaves={leaves} initialEmployees={employees} />;
}
