import type { Metadata } from 'next';
import { getMyLeaves } from '@/lib/server-api';
import EmployeeLeavesClient from './EmployeeLeavesClient';

export const metadata: Metadata = {
  title: 'My Leaves — BP AMS',
  description: 'View and apply for leave requests.',
};

export default async function EmployeeLeavesPage() {
  const leaves = await getMyLeaves();
  return <EmployeeLeavesClient initialLeaves={leaves} />;
}
