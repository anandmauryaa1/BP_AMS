import { getAdminSettings } from '@/lib/server-api';
import AdminSettingsClient from './AdminSettingsClient';

export const metadata = {
  title: 'Admin System Settings | BP AMS',
  description: 'Manage corporate entity, shift timings, payroll rules, leave quotas & portal controls.',
};

export default async function AdminSettingsPage() {
  const data = await getAdminSettings();

  return (
    <AdminSettingsClient
      initialSettings={data.settings}
      initialUser={data.user}
    />
  );
}
