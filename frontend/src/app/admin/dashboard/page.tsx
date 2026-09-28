import type { Metadata } from 'next';
import { getDashboardMetrics, getMe } from '@/lib/server-api';
import AdminDashboardClient from './AdminDashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard — BP AMS',
  description: 'Live production and attendance monitoring for admin.',
};

export default async function AdminDashboardPage() {
  const [dashData, me] = await Promise.all([
    getDashboardMetrics(),
    getMe(),
  ]);

  return (
    <AdminDashboardClient
      initialMetrics={dashData.metrics}
      initialProdMetrics={dashData.prodMetrics}
      initialRecords={dashData.records}
      initialUser={me}
    />
  );
}
