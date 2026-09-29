import AdminSettingsClient from './AdminSettingsClient';

export const metadata = {
  title: 'Admin System Settings | BP AMS',
  description: 'Manage corporate entity, shift timings, payroll rules, leave quotas & portal controls.',
};

export default function AdminSettingsPage() {
  return <AdminSettingsClient />;
}
