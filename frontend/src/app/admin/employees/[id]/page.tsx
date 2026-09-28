import type { Metadata } from 'next';
import { getEmployee } from '@/lib/server-api';
import EmployeeDetailClient from './EmployeeDetailClient';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const employee = await getEmployee(id);
  return {
    title: employee
      ? `${employee.name} — BP AMS`
      : 'Employee Profile — BP AMS',
    description: employee
      ? `Profile, attendance, and production analytics for ${employee.name}.`
      : 'Employee profile page.',
  };
}

export default async function AdminEmployeeDetailPage({ params }: Props) {
  const { id } = await params;
  const employee = await getEmployee(id);
  if (!employee) notFound();
  return <EmployeeDetailClient params={{ id }} initialEmployee={employee} />;
}
