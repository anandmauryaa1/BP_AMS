import type { Metadata } from 'next';
import { getEmployee } from '@/lib/server-api';
import EmployeeDetailClient from '@/app/admin/employees/[id]/EmployeeDetailClient';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const employee = await getEmployee(id);
  return {
    title: employee ? `${employee.name} — Employee Profile` : 'Employee Profile — BP AMS',
    description: 'View employee attendance and performance analytics.',
  };
}

export default async function ManagerEmployeeDetailPage({ params }: Props) {
  const { id } = await params;
  const employee = await getEmployee(id);
  if (!employee) notFound();
  return <EmployeeDetailClient params={{ id }} initialEmployee={employee} />;
}
