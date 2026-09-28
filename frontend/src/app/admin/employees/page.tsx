import type { Metadata } from 'next';
import { getEmployees } from '@/lib/server-api';
import AdminEmployeesClient from './AdminEmployeesClient';

export const metadata: Metadata = {
  title: 'Employees — BP AMS',
  description: 'Manage employee accounts, roles, and access.',
};

export default async function AdminEmployeesPage() {
  const employees = await getEmployees();
  return <AdminEmployeesClient initialEmployees={employees} />;
}
