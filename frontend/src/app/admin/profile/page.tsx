import type { Metadata } from 'next';
import { getMe } from '@/lib/server-api';
import AdminProfileClient from './AdminProfileClient';

export const metadata: Metadata = {
  title: 'My Profile — BP AMS',
  description: 'View and update your administrator profile.',
};

export default async function AdminProfilePage() {
  const profile = await getMe();
  return <AdminProfileClient initialProfile={profile} />;
}
