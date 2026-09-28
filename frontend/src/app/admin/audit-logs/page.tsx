import type { Metadata } from 'next';
import { getAuditLogs } from '@/lib/server-api';
import AdminAuditLogsClient from './AdminAuditLogsClient';

export const metadata: Metadata = {
  title: 'Audit Logs — BP AMS',
  description: 'Security audit trail of all administrative actions.',
};

export default async function AdminAuditLogsPage() {
  const logs = await getAuditLogs();
  return <AdminAuditLogsClient initialLogs={logs} />;
}
